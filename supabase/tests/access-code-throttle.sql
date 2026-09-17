-- =============================================================================
-- Tishim — ограничение попыток погашения кода доступа (00011)
--
-- Запуск на ЛОКАЛЬНОЙ базе с данными seed.sql (uuid пользователей — оттуда):
--   docker exec -i supabase_db_tishim psql -U postgres -At -F ' => ' -q < supabase/tests/access-code-throttle.sql
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
create function audit_tmp.redeem(code text) returns text language plpgsql as $$
declare r uuid;
begin
  r := public.redeem_access_code(code);
  return coalesce('ДОСТУП ВЫДАН к ' || r::text, 'NULL (код неверен)');
exception when others then
  return 'ИСКЛЮЧЕНИЕ: ' || sqlerrm;
end $$;
grant execute on all functions in schema audit_tmp to authenticated, anon;
create temp table codes (who text, code text);
grant all on codes to authenticated;

-- patient2 и patient3 создают коды
select audit_tmp.as_user('ba000000-0000-4000-8000-000000000002');
insert into codes select 'patient2', code from public.generate_access_code();
reset role;
select audit_tmp.as_user('ba000000-0000-4000-8000-000000000003');
insert into codes select 'patient3', code from public.generate_access_code();
reset role;
select 'T0 коды из шести цифр', bool_and(code ~ '^\d{6}$') from codes;

\echo === dentist1: пять неверных попыток, затем ВЕРНЫЙ код patient2
select audit_tmp.as_user('d0000000-0000-4000-8000-000000000001');
select 'T1 неверная попытка ' || i, audit_tmp.redeem('99999' || (i % 10)::text || 'x') from generate_series(1, 5) i;
select 'T2 шестая попытка — верный код, но врач заблокирован (ждём too_many_attempts)', audit_tmp.redeem((select code from codes where who = 'patient2'));
select 'T3 пустая строка больше не превращается в 000000 (ждём too_many_attempts, а не поиск кода)', audit_tmp.redeem('');
reset role;
select 'T4 неудачи записаны и пережили вызовы (ждём 5)', count(*) from public.access_code_failures where dentist_id = (select id from public.dentists where profile_id = 'd0000000-0000-4000-8000-000000000001');
select 'T5 доступа dentist1 к patient2 не появилось (ждём 0)', count(*) from public.patient_access pa join public.dentists d on d.id = pa.dentist_id where d.profile_id = 'd0000000-0000-4000-8000-000000000001' and pa.patient_id = 'ba000000-0000-4000-8000-000000000002';

\echo === dentist2 не пострадал от чужой блокировки: опечатка, затем верный код patient3
select audit_tmp.as_user('d0000000-0000-4000-8000-000000000002');
select 'T6 опечатка (ждём NULL)', audit_tmp.redeem('12');
select 'T7 верный код patient3 (ждём доступ)', audit_tmp.redeem((select code from codes where who = 'patient3'));
select 'T8 тот же код второй раз (ждём NULL: код одноразовый)', audit_tmp.redeem((select code from codes where who = 'patient3'));
reset role;
select 'T9 после верного кода счётчик dentist2 обнулён, осталась неудача T8 (ждём 1)', count(*) from public.access_code_failures where dentist_id = (select id from public.dentists where profile_id = 'd0000000-0000-4000-8000-000000000002');

\echo === окно: через 15 минут dentist1 снова может вводить код
update public.access_code_failures set failed_at = failed_at - interval '16 minutes';
select audit_tmp.as_user('d0000000-0000-4000-8000-000000000001');
select 'T10 после окна верный код patient2 проходит (ждём доступ)', audit_tmp.redeem((select code from codes where who = 'patient2'));
reset role;

\echo === таблица неудач закрыта для клиентов
create function audit_tmp.try(q text) returns text language plpgsql as $$
declare n bigint;
begin execute q; get diagnostics n = row_count; return 'ok, rows=' || n; exception when others then return 'DENIED: ' || sqlerrm; end $$;
grant execute on all functions in schema audit_tmp to authenticated, anon;
select audit_tmp.as_user('d0000000-0000-4000-8000-000000000001');
select 'T11 врач читает таблицу неудач (ждём DENIED)', audit_tmp.try('select * from public.access_code_failures');
select 'T12 врач чистит неудачи (ждём DENIED)', audit_tmp.try('delete from public.access_code_failures');
select 'T13 врач вставляет неудачу другому (ждём DENIED)', audit_tmp.try('insert into public.access_code_failures (dentist_id) select id from public.dentists limit 1');
reset role;

rollback;
