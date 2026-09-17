-- =============================================================================
-- Tishim — dental patient card platform
-- Migration 00001: schema (tables, enums, view, triggers)
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('patient', 'dentist', 'admin');
create type public.access_status as enum ('pending', 'active', 'revoked');
create type public.payment_status as enum ('unpaid', 'partial', 'paid');
create type public.attachment_kind as enum ('xray', 'photo', 'document');
create type public.urgency_level as enum ('low', 'medium', 'high');
create type public.tooth_condition as enum (
  'healthy', 'caries', 'filling', 'crown', 'implant', 'extracted', 'missing',
  'root_canal', 'veneer', 'bridge', 'pulpitis', 'periodontitis'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'patient',
  full_name text not null default '',
  phone text,
  birth_date date,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table public.dentists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  clinic_id uuid references public.clinics (id) on delete set null,
  specialization text,
  license_number text,
  created_at timestamptz not null default now()
);

create table public.patient_access (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  dentist_id uuid not null references public.dentists (id) on delete cascade,
  status public.access_status not null default 'pending',
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (patient_id, dentist_id)
);

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  code char(6) not null,
  expires_at timestamptz not null,
  used_by uuid references public.dentists (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Only one live (unused) copy of a code at a time.
create unique index access_codes_active_code_key
  on public.access_codes (code)
  where used_at is null;

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  dentist_id uuid not null references public.dentists (id) on delete restrict,
  visit_date date not null default current_date,
  complaint text,
  diagnosis text,
  treatment text,
  recommendation text,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  total numeric(12, 2) not null default 0 check (total >= 0),
  payment_status public.payment_status not null default 'unpaid',
  next_visit_date date,
  created_at timestamptz not null default now()
);

create table public.tooth_records (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  tooth_fdi int not null check (
    (tooth_fdi between 11 and 18) or (tooth_fdi between 21 and 28) or
    (tooth_fdi between 31 and 38) or (tooth_fdi between 41 and 48) or
    (tooth_fdi between 51 and 55) or (tooth_fdi between 61 and 65) or
    (tooth_fdi between 71 and 75) or (tooth_fdi between 81 and 85)
  ),
  surfaces text[] not null default '{}'::text[]
    check (surfaces <@ array['O', 'I', 'M', 'D', 'V', 'L']),
  condition public.tooth_condition not null,
  "procedure" text,
  note text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  file_url text not null,
  kind public.attachment_kind not null default 'photo',
  created_at timestamptz not null default now()
);

create table public.ai_screenings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  image_urls text[] not null default '{}'::text[],
  result jsonb not null default '{}'::jsonb,
  urgency public.urgency_level not null default 'low',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the hot paths
-- ---------------------------------------------------------------------------
create index patient_access_patient_idx on public.patient_access (patient_id, status);
create index patient_access_dentist_idx on public.patient_access (dentist_id, status);
create index access_codes_patient_idx on public.access_codes (patient_id);
create index visits_patient_idx on public.visits (patient_id, visit_date desc);
create index visits_dentist_idx on public.visits (dentist_id, visit_date desc);
create index tooth_records_patient_idx on public.tooth_records (patient_id, tooth_fdi, created_at desc);
create index tooth_records_visit_idx on public.tooth_records (visit_id);
create index attachments_visit_idx on public.attachments (visit_id);
create index ai_screenings_patient_idx on public.ai_screenings (patient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Current tooth state.
-- The current state is NOT stored: it is the latest tooth_records row per
-- (patient, tooth, surface). Whole-tooth records (empty surfaces) are exposed
-- with surface = 'W'. security_invoker keeps RLS of the querying user.
-- ---------------------------------------------------------------------------
create or replace view public.current_tooth_state
with (security_invoker = on) as
select distinct on (tr.patient_id, tr.tooth_fdi, s.surface)
  tr.patient_id,
  tr.tooth_fdi,
  s.surface,
  tr.condition,
  tr."procedure",
  tr.note,
  tr.visit_id,
  tr.created_at
from public.tooth_records tr
cross join lateral unnest(
  case when cardinality(tr.surfaces) = 0 then array['W'] else tr.surfaces end
) as s (surface)
order by tr.patient_id, tr.tooth_fdi, s.surface, tr.created_at desc;

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile auto-creation on signup.
-- Role comes from raw_user_meta_data.role; 'admin' can never be self-assigned.
-- A dentist gets an empty dentists row to complete during onboarding.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'dentist' then 'dentist'::public.user_role
    else 'patient'::public.user_role
  end;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );

  if v_role = 'dentist' then
    insert into public.dentists (profile_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
