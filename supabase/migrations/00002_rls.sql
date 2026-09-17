-- =============================================================================
-- Tishim — Migration 00002: RLS policies and RPC functions
-- Medical data: everything is deny-by-default, opened per role.
-- No service key is ever used from the client.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (security definer to avoid recursive RLS on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_dentist_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select d.id from public.dentists d where d.profile_id = auth.uid();
$$;

-- Does the current user (as dentist) hold ACTIVE access to this patient?
create or replace function public.has_active_access(p_patient_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_access pa
    join public.dentists d on d.id = pa.dentist_id
    where pa.patient_id = p_patient_id
      and d.profile_id = auth.uid()
      and pa.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.dentists enable row level security;
alter table public.patient_access enable row level security;
alter table public.access_codes enable row level security;
alter table public.visits enable row level security;
alter table public.tooth_records enable row level security;
alter table public.attachments enable row level security;
alter table public.ai_screenings enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: own read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: dentist directory is public to signed-in users"
  on public.profiles for select
  using (role = 'dentist');

create policy "profiles: dentist reads granted patients"
  on public.profiles for select
  using (public.has_active_access(id));

create policy "profiles: admin reads all"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: own update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

create policy "profiles: admin update"
  on public.profiles for update
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- clinics: readable by any signed-in user, managed by admin
-- ---------------------------------------------------------------------------
create policy "clinics: read for signed-in"
  on public.clinics for select
  using (auth.uid() is not null);

create policy "clinics: admin insert"
  on public.clinics for insert
  with check (public.is_admin());

create policy "clinics: admin update"
  on public.clinics for update
  using (public.is_admin());

create policy "clinics: admin delete"
  on public.clinics for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- dentists: directory readable by signed-in users; dentist edits own row
-- ---------------------------------------------------------------------------
create policy "dentists: read for signed-in"
  on public.dentists for select
  using (auth.uid() is not null);

create policy "dentists: own update"
  on public.dentists for update
  using (profile_id = auth.uid());

create policy "dentists: admin update"
  on public.dentists for update
  using (public.is_admin());

create policy "dentists: admin delete"
  on public.dentists for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- patient_access
-- Creation/redemption happens only through RPCs (security definer).
-- ---------------------------------------------------------------------------
create policy "patient_access: patient reads own"
  on public.patient_access for select
  using (patient_id = auth.uid());

create policy "patient_access: dentist reads own"
  on public.patient_access for select
  using (dentist_id = public.current_dentist_id());

create policy "patient_access: admin reads all"
  on public.patient_access for select
  using (public.is_admin());

-- The patient may only revoke (never re-activate silently).
create policy "patient_access: patient revokes"
  on public.patient_access for update
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid() and status = 'revoked');

-- ---------------------------------------------------------------------------
-- access_codes: the patient sees own codes; dentists never read them directly
-- (redemption goes through redeem_access_code RPC).
-- ---------------------------------------------------------------------------
create policy "access_codes: patient reads own"
  on public.access_codes for select
  using (patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- visits
-- ---------------------------------------------------------------------------
create policy "visits: patient reads own"
  on public.visits for select
  using (patient_id = auth.uid());

create policy "visits: dentist reads with active access"
  on public.visits for select
  using (public.has_active_access(patient_id));

create policy "visits: dentist creates with active access"
  on public.visits for insert
  with check (
    dentist_id = public.current_dentist_id()
    and public.has_active_access(patient_id)
  );

create policy "visits: author dentist updates with active access"
  on public.visits for update
  using (
    dentist_id = public.current_dentist_id()
    and public.has_active_access(patient_id)
  )
  with check (dentist_id = public.current_dentist_id());

-- ---------------------------------------------------------------------------
-- tooth_records
-- ---------------------------------------------------------------------------
create policy "tooth_records: patient reads own"
  on public.tooth_records for select
  using (patient_id = auth.uid());

create policy "tooth_records: dentist reads with active access"
  on public.tooth_records for select
  using (public.has_active_access(patient_id));

create policy "tooth_records: dentist writes into own visit"
  on public.tooth_records for insert
  with check (
    public.has_active_access(patient_id)
    and exists (
      select 1 from public.visits v
      where v.id = visit_id
        and v.patient_id = tooth_records.patient_id
        and v.dentist_id = public.current_dentist_id()
    )
  );

-- ---------------------------------------------------------------------------
-- attachments: access follows the parent visit
-- ---------------------------------------------------------------------------
create policy "attachments: read via visit"
  on public.attachments for select
  using (
    exists (
      select 1 from public.visits v
      where v.id = attachments.visit_id
        and (v.patient_id = auth.uid() or public.has_active_access(v.patient_id))
    )
  );

create policy "attachments: dentist adds to own visit"
  on public.attachments for insert
  with check (
    exists (
      select 1 from public.visits v
      where v.id = attachments.visit_id
        and v.dentist_id = public.current_dentist_id()
        and public.has_active_access(v.patient_id)
    )
  );

-- ---------------------------------------------------------------------------
-- ai_screenings
-- ---------------------------------------------------------------------------
create policy "ai_screenings: patient reads own"
  on public.ai_screenings for select
  using (patient_id = auth.uid());

create policy "ai_screenings: patient creates own"
  on public.ai_screenings for insert
  with check (patient_id = auth.uid());

create policy "ai_screenings: dentist reads with active access"
  on public.ai_screenings for select
  using (public.has_active_access(patient_id));

-- =============================================================================
-- RPC functions
-- =============================================================================

-- Patient: generate a fresh 6-digit access code (15 minutes TTL).
-- Any previous unused codes of the patient are invalidated.
create or replace function public.generate_access_code()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code char(6);
  v_expires timestamptz := now() + interval '15 minutes';
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'patient') then
    raise exception 'only_patient_can_generate_code';
  end if;

  -- housekeeping: drop expired unused codes so the unique index stays clean
  delete from public.access_codes ac
  where ac.used_at is null and ac.expires_at < now();

  -- invalidate patient's previous live codes
  delete from public.access_codes ac
  where ac.patient_id = auth.uid() and ac.used_at is null;

  loop
    v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');
    begin
      insert into public.access_codes (patient_id, code, expires_at)
      values (auth.uid(), v_code, v_expires);
      exit;
    exception when unique_violation then
      -- collision with someone else's live code — try again
    end;
  end loop;

  return query select v_code::text, v_expires;
end;
$$;

-- Dentist: redeem a patient's code -> active access. Returns the patient id.
create or replace function public.redeem_access_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dentist_id uuid;
  v_rec public.access_codes%rowtype;
begin
  select d.id into v_dentist_id
  from public.dentists d
  where d.profile_id = auth.uid();

  if v_dentist_id is null then
    raise exception 'only_dentist_can_redeem_code';
  end if;

  select * into v_rec
  from public.access_codes ac
  where ac.code = lpad(regexp_replace(coalesce(p_code, ''), '\D', '', 'g'), 6, '0')
    and ac.used_at is null
    and ac.expires_at > now()
  order by ac.created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'invalid_or_expired_code';
  end if;

  update public.access_codes
  set used_by = v_dentist_id, used_at = now()
  where id = v_rec.id;

  insert into public.patient_access (patient_id, dentist_id, status, granted_at, revoked_at)
  values (v_rec.patient_id, v_dentist_id, 'active', now(), null)
  on conflict (patient_id, dentist_id)
  do update set status = 'active', granted_at = now(), revoked_at = null;

  return v_rec.patient_id;
end;
$$;

-- Admin: aggregate platform stats without exposing raw medical rows.
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_only';
  end if;

  return jsonb_build_object(
    'patients', (select count(*) from public.profiles where role = 'patient'),
    'dentists', (select count(*) from public.dentists),
    'clinics', (select count(*) from public.clinics),
    'visits', (select count(*) from public.visits),
    'visits_last_30d', (select count(*) from public.visits where visit_date >= current_date - 30),
    'revenue_total', coalesce((select sum(total) from public.visits where payment_status = 'paid'), 0),
    'revenue_outstanding', coalesce((select sum(total) from public.visits where payment_status <> 'paid'), 0),
    'ai_screenings', (select count(*) from public.ai_screenings)
  );
end;
$$;

-- Lock down function execution
revoke all on function public.generate_access_code() from public, anon;
revoke all on function public.redeem_access_code(text) from public, anon;
revoke all on function public.get_admin_stats() from public, anon;
grant execute on function public.generate_access_code() to authenticated;
grant execute on function public.redeem_access_code(text) to authenticated;
grant execute on function public.get_admin_stats() to authenticated;
