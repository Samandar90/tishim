-- =============================================================================
-- Tishim — seed data for local development (`supabase db reset` runs this)
-- Users (password for all: password123):
--   admin@tishim.uz      — admin
--   dentist1@tishim.uz   — Азиз Каримов, терапевт
--   dentist2@tishim.uz   — Нилуфар Юсупова, ортопед
--   patient1@tishim.uz   — Малика Азимова (богатая история визитов)
--   patient2@tishim.uz   — Жасур Тошматов (имплант, предстоящий визит)
--   patient3@tishim.uz   — Севара Носирова (отозванный доступ)
-- =============================================================================

-- temporary helper: creates an auth user + identity (password: password123)
create or replace function pg_temp.seed_user(
  p_id uuid, p_email text, p_role text, p_name text, p_phone text
) returns void language plpgsql as $fn$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, crypt('password123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('role', p_role, 'full_name', p_name, 'phone', p_phone),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id, p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );
end;
$fn$;

do $$
declare
  v_admin    uuid := 'a0000000-0000-4000-8000-000000000001';
  v_dprof1   uuid := 'd0000000-0000-4000-8000-000000000001';
  v_dprof2   uuid := 'd0000000-0000-4000-8000-000000000002';
  v_pat1     uuid := 'ba000000-0000-4000-8000-000000000001';
  v_pat2     uuid := 'ba000000-0000-4000-8000-000000000002';
  v_pat3     uuid := 'ba000000-0000-4000-8000-000000000003';
  v_clinic   uuid;
  v_dent1    uuid;
  v_dent2    uuid;
  v_visit    uuid;
begin
  -- users (handle_new_user trigger creates profiles + dentists rows)
  perform pg_temp.seed_user(v_admin,  'admin@tishim.uz',    'patient', 'Администратор Tishim', '+998900000000');
  perform pg_temp.seed_user(v_dprof1, 'dentist1@tishim.uz', 'dentist', 'Азиз Каримов',        '+998901112233');
  perform pg_temp.seed_user(v_dprof2, 'dentist2@tishim.uz', 'dentist', 'Нилуфар Юсупова',     '+998904445566');
  perform pg_temp.seed_user(v_pat1,   'patient1@tishim.uz', 'patient', 'Малика Азимова',      '+998907778899');
  perform pg_temp.seed_user(v_pat2,   'patient2@tishim.uz', 'patient', 'Жасур Тошматов',      '+998903334455');
  perform pg_temp.seed_user(v_pat3,   'patient3@tishim.uz', 'patient', 'Севара Носирова',     '+998906667788');

  update public.profiles set role = 'admin' where id = v_admin;
  update public.profiles set birth_date = '1992-04-15' where id = v_pat1;
  update public.profiles set birth_date = '1987-11-02' where id = v_pat2;
  update public.profiles set birth_date = '2000-06-23' where id = v_pat3;

  -- clinic
  insert into public.clinics (name, address, phone)
  values ('Tishim Dental', 'г. Ташкент, ул. Амира Темура, 15', '+998712001122')
  returning id into v_clinic;

  select id into v_dent1 from public.dentists where profile_id = v_dprof1;
  select id into v_dent2 from public.dentists where profile_id = v_dprof2;

  update public.dentists
  set clinic_id = v_clinic, specialization = 'Терапевт', license_number = 'UZ-DENT-10234',
      is_featured = true,
      bio = 'Врач-стоматолог общей практики. Более 4000 пациентов, приоритет — сохранение своих зубов и понятные планы лечения без навязанных услуг.',
      photo_url = '/doctor-placeholder.svg',
      experience_years = 12,
      rating = 4.9
  where id = v_dent1;
  update public.dentists
  set clinic_id = v_clinic, specialization = 'Ортопед', license_number = 'UZ-DENT-20567'
  where id = v_dent2;

  -- access
  insert into public.patient_access (patient_id, dentist_id, status, granted_at) values
    (v_pat1, v_dent1, 'active', now() - interval '1 year'),
    (v_pat1, v_dent2, 'active', now() - interval '3 months'),
    (v_pat2, v_dent2, 'active', now() - interval '2 months');
  insert into public.patient_access (patient_id, dentist_id, status, granted_at, revoked_at) values
    (v_pat3, v_dent1, 'revoked', now() - interval '6 months', now() - interval '1 month');

  -- ==========================================================================
  -- patient1: год назад — первичная цифровизация карты (заполнены ВСЕ 32 зуба)
  -- ==========================================================================
  insert into public.visits (patient_id, dentist_id, visit_date, visit_type, complaint, diagnosis,
    treatment, recommendation, subtotal, discount_percent, total, payment_status, created_at)
  values (v_pat1, v_dent1, (now() - interval '1 year')::date, 'initial_mapping',
    'Чувствительность к холодному', 'Множественный кариес',
    'Первичная цифровизация карты: осмотр всех зубов, составлен план лечения',
    'Начать лечение кариеса, гигиена полости рта',
    150000, 0, 150000, 'paid', now() - interval '1 year')
  returning id into v_visit;

  insert into public.tooth_records (visit_id, patient_id, tooth_fdi, surfaces, condition, "procedure", price, created_at) values
    (v_visit, v_pat1, 16, '{O}',   'caries', 'Диагностика', 0, now() - interval '1 year'),
    (v_visit, v_pat1, 26, '{O,M}', 'caries', 'Диагностика', 0, now() - interval '1 year'),
    (v_visit, v_pat1, 47, '{O,D}', 'caries', 'Диагностика', 0, now() - interval '1 year'),
    (v_visit, v_pat1, 36, '{}',    'pulpitis', 'Диагностика', 0, now() - interval '1 year'),
    (v_visit, v_pat1, 18, '{}',    'missing', null, 0, now() - interval '1 year');

  -- остальные зубы после цифровизации — здоровы (карта без «неизвестных» зубов)
  insert into public.tooth_records (visit_id, patient_id, tooth_fdi, surfaces, condition, price, created_at)
  select v_visit, v_pat1, fdi, '{}', 'healthy', 0, now() - interval '1 year'
  from unnest(array[
    11,12,13,14,15,17,21,22,23,24,25,27,28,
    31,32,33,34,35,37,38,41,42,43,44,45,46,48
  ]) as fdi;

  -- patient1: полгода назад — лечение
  insert into public.visits (patient_id, dentist_id, visit_date, complaint, diagnosis, treatment,
    recommendation, subtotal, discount_percent, total, payment_status, created_at)
  values (v_pat1, v_dent1, (now() - interval '6 months')::date,
    'Плановое лечение', 'Кариес 16, 26; пульпит 36',
    'Пломбирование 16 и 26, эндодонтическое лечение 36',
    'Контроль через 6 месяцев', 1450000, 10, 1305000, 'paid', now() - interval '6 months')
  returning id into v_visit;

  insert into public.tooth_records (visit_id, patient_id, tooth_fdi, surfaces, condition, "procedure", price, created_at) values
    (v_visit, v_pat1, 16, '{O}',   'filling', 'Световая пломба', 300000, now() - interval '6 months'),
    (v_visit, v_pat1, 26, '{O,M}', 'filling', 'Световая пломба', 350000, now() - interval '6 months'),
    (v_visit, v_pat1, 36, '{}',    'root_canal', 'Лечение каналов', 800000, now() - interval '6 months');

  -- patient1: 2 месяца назад — протезирование у ортопеда
  insert into public.visits (patient_id, dentist_id, visit_date, complaint, diagnosis, treatment,
    recommendation, subtotal, discount_percent, total, payment_status, next_visit_date, created_at)
  values (v_pat1, v_dent2, (now() - interval '2 months')::date,
    'Разрушение зуба 47', 'Коронка на 36, удаление 47',
    'Установлена коронка на 36, удалён зуб 47',
    'Имплантация 47 через 3 месяца', 1900000, 0, 1900000, 'partial',
    (now() + interval '1 month')::date, now() - interval '2 months')
  returning id into v_visit;

  insert into public.tooth_records (visit_id, patient_id, tooth_fdi, surfaces, condition, "procedure", price, created_at) values
    (v_visit, v_pat1, 36, '{}', 'crown', 'Металлокерамическая коронка', 1500000, now() - interval '2 months'),
    (v_visit, v_pat1, 47, '{}', 'extracted', 'Удаление зуба', 400000, now() - interval '2 months');

  -- ==========================================================================
  -- patient2: имплантация
  -- ==========================================================================
  insert into public.visits (patient_id, dentist_id, visit_date, complaint, diagnosis, treatment,
    recommendation, subtotal, discount_percent, total, payment_status, next_visit_date, created_at)
  values (v_pat2, v_dent2, (now() - interval '1 month')::date,
    'Отсутствует зуб', 'Адентия 24',
    'Установлен имплант 24, лечение каналов 15',
    'Контрольный осмотр через 2 недели', 5600000, 5, 5320000, 'unpaid',
    (now() + interval '2 weeks')::date, now() - interval '1 month')
  returning id into v_visit;

  insert into public.tooth_records (visit_id, patient_id, tooth_fdi, surfaces, condition, "procedure", price, created_at) values
    (v_visit, v_pat2, 24, '{}',  'implant', 'Имплантация', 5000000, now() - interval '1 month'),
    (v_visit, v_pat2, 15, '{}',  'root_canal', 'Лечение каналов', 600000, now() - interval '1 month'),
    (v_visit, v_pat2, 11, '{V}', 'veneer', 'Винир (план)', 0, now() - interval '1 month');

  -- ==========================================================================
  -- patient3: старый визит, доступ отозван
  -- ==========================================================================
  insert into public.visits (patient_id, dentist_id, visit_date, complaint, diagnosis, treatment,
    subtotal, discount_percent, total, payment_status, created_at)
  values (v_pat3, v_dent1, (now() - interval '5 months')::date,
    'Боль при накусывании', 'Периодонтит 46', 'Лечение периодонтита 46',
    700000, 0, 700000, 'paid', now() - interval '5 months')
  returning id into v_visit;

  insert into public.tooth_records (visit_id, patient_id, tooth_fdi, surfaces, condition, "procedure", price, created_at) values
    (v_visit, v_pat3, 46, '{}', 'periodontitis', 'Лечение периодонтита', 700000, now() - interval '5 months');

  -- ==========================================================================
  -- заявки на цифровизацию с лендинга
  -- ==========================================================================
  insert into public.mapping_requests (full_name, phone, preferred_date, comment, status, created_at) values
    ('Дилшод Рахимов', '+998 90 123 45 67', (now() + interval '3 days')::date,
     'Удобно после 18:00', 'new', now() - interval '2 hours'),
    ('Гульнора Саидова', '+998 93 765 43 21', null,
     null, 'new', now() - interval '1 day'),
    ('Тимур Алиев', '+998 97 555 12 34', (now() + interval '1 week')::date,
     'Хочу карту для всей семьи, нас четверо', 'contacted', now() - interval '3 days'),
    ('Севинч Каримова', '+998 88 222 33 44', (now() - interval '2 days')::date,
     '[Заявка клиники] Стоматология "Smile", 3 врача', 'done', now() - interval '2 weeks');
end;
$$;

-- цена цифровизации и контактный телефон (перезаписываем дефолты миграции)
insert into public.app_settings (key, value) values
  ('initial_mapping_price', '150000'::jsonb),
  ('contact_phone', '"+998 71 200 11 22"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
