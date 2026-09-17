-- =============================================================================
-- Tishim — аудит RLS: кто что видит и может
--
-- Запуск на ЛОКАЛЬНОЙ базе с данными seed.sql (uuid пользователей — оттуда):
--   docker exec -i supabase_db_tishim psql -U postgres -At -F ' => ' -q < supabase/tests/rls-audit.sql
-- Всё идёт в одной транзакции и заканчивается ROLLBACK — база не меняется.
-- Роль и пользователь подменяются так же, как это делает PostgREST:
-- request.jwt.claims + set local role. Читать вывод: в каждой строке написано,
-- чего ждём; «DENIED» и «rows=0» для запрещённых действий — норма.
-- Гонять после любой миграции, которая трогает политики, гранты или RPC.
-- =============================================================================
\set ON_ERROR_STOP off
begin;

create schema audit_tmp;
grant usage on schema audit_tmp to authenticated, anon;

create function audit_tmp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create function audit_tmp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

-- Пытается выполнить запрос; возвращает 'DENIED: ...' либо число затронутых строк
create function audit_tmp.try(q text) returns text language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok, rows=' || n;
exception when others then
  return 'DENIED: ' || sqlerrm;
end $$;
grant execute on all functions in schema audit_tmp to authenticated, anon;

\echo === ПАЦИЕНТ patient2 (чужие данные должны быть не видны)
select audit_tmp.as_user('ba000000-0000-4000-8000-000000000002');
select 'P1 чужие профили пациентов (ждём 0)', count(*) from public.profiles where role = 'patient' and id <> auth.uid();
select 'P2 визиты patient1 (ждём 0)', count(*) from public.visits where patient_id = 'ba000000-0000-4000-8000-000000000001';
select 'P3 записи зубов patient1 (ждём 0)', count(*) from public.tooth_records where patient_id = 'ba000000-0000-4000-8000-000000000001';
select 'P4 чужие коды доступа (ждём 0)', count(*) from public.access_codes where patient_id <> auth.uid();
select 'P5 чужие доступы (ждём 0)', count(*) from public.patient_access where patient_id <> auth.uid();
select 'P6 заявки с лендинга (ждём 0)', count(*) from public.mapping_requests;
select 'P7 сделать себя админом (ждём DENIED/rows=0)', audit_tmp.try($q$update public.profiles set role = 'admin' where id = auth.uid()$q$);
select 'P8 сделать себя врачом (ждём DENIED/rows=0)', audit_tmp.try($q$update public.profiles set role = 'dentist' where id = auth.uid()$q$);
select 'P9 вставить визит самому себе (ждём DENIED)', audit_tmp.try($q$insert into public.visits (patient_id, dentist_id, visit_date) select auth.uid(), id, current_date from public.dentists limit 1$q$);
select 'P10 вставить запись зуба (ждём DENIED)', audit_tmp.try($q$insert into public.tooth_records (visit_id, patient_id, tooth_fdi, condition) select id, patient_id, 11, 'healthy' from public.visits limit 1$q$);
select 'P11 выдать себе доступ врача напрямую (ждём DENIED)', audit_tmp.try($q$insert into public.patient_access (patient_id, dentist_id, status) select 'ba000000-0000-4000-8000-000000000001', id, 'active' from public.dentists limit 1$q$);
select 'P12 статистика админа (ждём DENIED)', audit_tmp.try($q$select public.get_admin_stats()$q$);
select 'P13 назначить флагмана (ждём DENIED)', audit_tmp.try($q$select public.set_featured_dentist((select id from public.dentists limit 1))$q$);
select 'P14 менять настройки цены (ждём DENIED/rows=0)', audit_tmp.try($q$update public.app_settings set value = '1'::jsonb$q$);
reset role;

\echo === ПАЦИЕНТ patient3 (доступ dentist1 отозван): может ли сам вернуть статус active без кода?
select audit_tmp.as_user('ba000000-0000-4000-8000-000000000003');
select 'P15 вернуть отозванный доступ в active без кода (ждём DENIED/rows=0)', audit_tmp.try($q$update public.patient_access set status = 'active', revoked_at = null where patient_id = auth.uid()$q$);
reset role;

\echo === ВРАЧ dentist1 (доступ: patient1 active; patient3 и newpatient revoked; patient2 — никогда)
select audit_tmp.as_user('d0000000-0000-4000-8000-000000000001');
select 'D1 профиль patient1 (ждём 1)', count(*) from public.profiles where id = 'ba000000-0000-4000-8000-000000000001';
select 'D2 профиль patient2, доступа не было (ждём 0)', count(*) from public.profiles where id = 'ba000000-0000-4000-8000-000000000002';
select 'D3 профиль patient3, доступ отозван (ждём 0)', count(*) from public.profiles where id = 'ba000000-0000-4000-8000-000000000003';
select 'D4 визиты patient2 (ждём 0)', count(*) from public.visits where patient_id = 'ba000000-0000-4000-8000-000000000002';
select 'D5 визиты patient3 после отзыва (ждём 0)', count(*) from public.visits where patient_id = 'ba000000-0000-4000-8000-000000000003';
select 'D6 записи зубов patient3 после отзыва (ждём 0)', count(*) from public.tooth_records where patient_id = 'ba000000-0000-4000-8000-000000000003';
select 'D7 состояние зубов (view) patient3 после отзыва (ждём 0)', count(*) from public.current_tooth_state where patient_id = 'ba000000-0000-4000-8000-000000000003';
select 'D8 коды доступа пациентов (ждём 0)', count(*) from public.access_codes;
select 'D9 визит пациенту без доступа (ждём DENIED)', audit_tmp.try($q$insert into public.visits (patient_id, dentist_id, visit_date) values ('ba000000-0000-4000-8000-000000000002', public.current_dentist_id(), current_date)$q$);
select 'D10 визит от имени ДРУГОГО врача (ждём DENIED)', audit_tmp.try($q$insert into public.visits (patient_id, dentist_id, visit_date) select 'ba000000-0000-4000-8000-000000000001', id, current_date from public.dentists where id <> public.current_dentist_id() limit 1$q$);
select 'D11 запись зуба в визит другого врача (ждём DENIED)', audit_tmp.try($q$insert into public.tooth_records (visit_id, patient_id, tooth_fdi, condition) select v.id, v.patient_id, 11, 'caries' from public.visits v where v.dentist_id <> public.current_dentist_id() limit 1$q$);
select 'D12 править визит другого врача (ждём rows=0)', audit_tmp.try($q$update public.visits set diagnosis = 'взлом' where dentist_id <> public.current_dentist_id()$q$);
select 'D13 удалить записи зубов (ждём DENIED/rows=0)', audit_tmp.try($q$delete from public.tooth_records$q$);
select 'D14 удалить визиты (ждём DENIED/rows=0)', audit_tmp.try($q$delete from public.visits$q$);
select 'D15 подделать created_at записи (ждём DENIED)', audit_tmp.try($q$insert into public.tooth_records (visit_id, patient_id, tooth_fdi, condition, created_at) select v.id, v.patient_id, 11, 'caries', now() - interval '5 years' from public.visits v where v.dentist_id = public.current_dentist_id() and v.patient_id = 'ba000000-0000-4000-8000-000000000001' limit 1$q$);
select 'D16 назначить себя флагманом напрямую (ждём DENIED/rows=0)', audit_tmp.try($q$update public.dentists set is_featured = true where id = public.current_dentist_id()$q$);
select 'D17 назначить себя флагманом через RPC (ждём DENIED)', audit_tmp.try($q$select public.set_featured_dentist(public.current_dentist_id())$q$);
select 'D18 вернуть себе отозванный доступ (ждём DENIED/rows=0)', audit_tmp.try($q$update public.patient_access set status = 'active' where dentist_id = public.current_dentist_id()$q$);
select 'D19 выдать себе доступ напрямую (ждём DENIED)', audit_tmp.try($q$insert into public.patient_access (patient_id, dentist_id, status) values ('ba000000-0000-4000-8000-000000000002', public.current_dentist_id(), 'active')$q$);
select 'D20 сделать себя админом (ждём DENIED/rows=0)', audit_tmp.try($q$update public.profiles set role = 'admin' where id = auth.uid()$q$);
select 'D21 править профиль пациента (ждём rows=0)', audit_tmp.try($q$update public.profiles set full_name = 'взлом' where id = 'ba000000-0000-4000-8000-000000000001'$q$);
select 'D22 флагман ли dentist1', (select is_featured from public.dentists where id = public.current_dentist_id());
select 'D23 заявки с лендинга (флагман видит, остальные 0)', count(*) from public.mapping_requests;
reset role;

\echo === ВРАЧ dentist2 (не флагман?)
select audit_tmp.as_user('d0000000-0000-4000-8000-000000000002');
select 'E1 флагман ли dentist2', (select is_featured from public.dentists where id = public.current_dentist_id());
select 'E2 заявки с лендинга', count(*) from public.mapping_requests;
select 'E3 менять статус заявки', audit_tmp.try($q$update public.mapping_requests set status = 'done'$q$);
reset role;

\echo === АНОНИМ
select audit_tmp.as_anon();
select 'A1 профили (ждём только флагмана, <=1)', count(*) from public.profiles;
select 'A2 профили пациентов (ждём 0)', count(*) from public.profiles where role = 'patient';
select 'A3 врачи (ждём только флагмана, <=1)', count(*) from public.dentists;
select 'A4 визиты (ждём 0)', audit_tmp.try($q$select * from public.visits$q$);
select 'A5 записи зубов (ждём 0)', audit_tmp.try($q$select * from public.tooth_records$q$);
select 'A6 доступы (ждём 0)', audit_tmp.try($q$select * from public.patient_access$q$);
select 'A7 коды (ждём 0)', audit_tmp.try($q$select * from public.access_codes$q$);
select 'A8 заявки (ждём 0)', audit_tmp.try($q$select * from public.mapping_requests$q$);
select 'A9 прямая вставка заявки мимо RPC (ждём DENIED)', audit_tmp.try($q$insert into public.mapping_requests (full_name, phone) values ('spam', '+998900000000')$q$);
select 'A10 погасить код анонимом (ждём DENIED)', audit_tmp.try($q$select public.redeem_access_code('000000')$q$);
select 'A11 настройки читаются (ждём >0)', count(*) from public.app_settings;
select 'A12 ai_screenings (ждём 0)', audit_tmp.try($q$select * from public.ai_screenings$q$);
reset role;

rollback;
