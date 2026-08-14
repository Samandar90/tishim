-- =============================================================================
-- Tishim — Migration 00004: business model, stage 1
-- "Initial mapping" paid service, featured dentist, public landing requests,
-- dentist subscriptions (schema only), app settings.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.visit_type as enum ('initial_mapping', 'treatment', 'checkup');
create type public.subscription_plan as enum ('solo', 'clinic', 'per_patient');
create type public.subscription_status as enum ('trial', 'active', 'expired', 'cancelled');
create type public.mapping_request_status as enum ('new', 'contacted', 'scheduled', 'done', 'cancelled');

-- ---------------------------------------------------------------------------
-- visits: type of visit
-- ---------------------------------------------------------------------------
alter table public.visits
  add column visit_type public.visit_type not null default 'treatment';

-- ---------------------------------------------------------------------------
-- dentists: featured (flagship) dentist profile fields
-- ---------------------------------------------------------------------------
alter table public.dentists
  add column is_featured boolean not null default false,
  add column bio text,
  add column photo_url text,
  add column experience_years int check (experience_years between 0 and 80),
  add column rating numeric(3, 2) check (rating between 0 and 5);

-- at most one featured dentist at a time
create unique index dentists_single_featured_key
  on public.dentists ((true))
  where is_featured;

-- ---------------------------------------------------------------------------
-- subscriptions (stage 2 groundwork: schema + RLS only, no billing)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  dentist_id uuid not null references public.dentists (id) on delete cascade,
  plan public.subscription_plan not null default 'solo',
  status public.subscription_status not null default 'trial',
  price numeric(12, 2) not null default 0 check (price >= 0),
  paid_until date,
  created_at timestamptz not null default now()
);

create index subscriptions_dentist_idx on public.subscriptions (dentist_id, status);

-- ---------------------------------------------------------------------------
-- mapping_requests: public landing form "запись на цифровизацию"
-- ---------------------------------------------------------------------------
create table public.mapping_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone text not null check (char_length(btrim(phone)) between 7 and 30),
  preferred_date date,
  comment text check (char_length(comment) <= 1000),
  status public.mapping_request_status not null default 'new',
  created_at timestamptz not null default now()
);

create index mapping_requests_status_idx on public.mapping_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- app_settings: key/value store (initial_mapping_price, contact_phone, ...)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_featured_dentist()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dentists d
    where d.profile_id = auth.uid() and d.is_featured
  );
$$;

-- Admin: make exactly one dentist featured (or clear with null)
create or replace function public.set_featured_dentist(p_dentist_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_only';
  end if;

  update public.dentists set is_featured = false where is_featured;

  if p_dentist_id is not null then
    update public.dentists set is_featured = true where id = p_dentist_id;
    if not found then
      raise exception 'dentist_not_found';
    end if;
  end if;
end;
$$;

revoke all on function public.set_featured_dentist(uuid) from public, anon;
grant execute on function public.set_featured_dentist(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;
alter table public.mapping_requests enable row level security;
alter table public.app_settings enable row level security;

-- subscriptions: dentist reads own, admin manages all
create policy "subscriptions: dentist reads own"
  on public.subscriptions for select
  using (dentist_id = public.current_dentist_id());

create policy "subscriptions: admin all"
  on public.subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());

-- mapping_requests: anyone (incl. anonymous) can submit; admin and the
-- featured dentist read and update
create policy "mapping_requests: public insert"
  on public.mapping_requests for insert
  to anon, authenticated
  with check (status = 'new');

create policy "mapping_requests: staff read"
  on public.mapping_requests for select
  using (public.is_admin() or public.is_featured_dentist());

create policy "mapping_requests: staff update"
  on public.mapping_requests for update
  using (public.is_admin() or public.is_featured_dentist())
  with check (public.is_admin() or public.is_featured_dentist());

create policy "mapping_requests: admin delete"
  on public.mapping_requests for delete
  using (public.is_admin());

-- app_settings: public read (price/phone shown on the landing), admin writes
create policy "app_settings: public read"
  on public.app_settings for select
  to anon, authenticated
  using (true);

create policy "app_settings: admin insert"
  on public.app_settings for insert
  with check (public.is_admin());

create policy "app_settings: admin update"
  on public.app_settings for update
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public visibility of the featured dentist (landing works without login)
-- ---------------------------------------------------------------------------
create policy "dentists: featured public read"
  on public.dentists for select
  to anon
  using (is_featured);

create policy "profiles: featured dentist public read"
  on public.profiles for select
  to anon
  using (
    exists (
      select 1 from public.dentists d
      where d.profile_id = profiles.id and d.is_featured
    )
  );

create policy "clinics: public read"
  on public.clinics for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- Default settings
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('initial_mapping_price', '150000'::jsonb),
  ('contact_phone', '"+998 71 200 11 22"'::jsonb)
on conflict (key) do nothing;
