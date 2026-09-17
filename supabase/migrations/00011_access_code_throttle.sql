-- =============================================================================
-- Tishim — Migration 00011: перебор кодов доступа
--
-- redeem_access_code принимала сколько угодно неверных кодов подряд. Код — шесть
-- цифр, а врачом может зарегистрироваться кто угодно: перебором попадаешь в чей-то
-- живой код и получаешь активный доступ к карте пациента, который его не давал.
-- Проверено на локальной базе до миграции: 1000 неверных попыток подряд за 54 мс,
-- ни одной блокировки.
--
-- Теперь неверные попытки считаются по врачу: пять за 15 минут — и функция
-- отказывает, пока самая старая не выйдет из окна. Блокируется только сам
-- перебирающий, общего замка нет: иначе один злоумышленник запер бы код доступа
-- всем врачам сразу.
--
-- Неверный код больше не исключение, а NULL. Это не косметика: исключение
-- откатывает транзакцию вызова вместе с записью о неудаче, и счётчик никогда бы
-- не вырос. Клиент пустой ответ уже понимает как «код неверен или истёк».
-- =============================================================================

create table public.access_code_failures (
  id bigint generated always as identity primary key,
  dentist_id uuid not null references public.dentists (id) on delete cascade,
  failed_at timestamptz not null default now()
);

create index access_code_failures_dentist_idx
  on public.access_code_failures (dentist_id, failed_at desc);

comment on table public.access_code_failures is
  'Неверные попытки погасить код доступа. Пишет и читает только redeem_access_code (security definer).';

-- Политик нет намеренно: строки не видит и не меняет никто, кроме функции.
-- Права по умолчанию из 00005 (grant all) снимаются, чтобы граница была не в одном RLS.
alter table public.access_code_failures enable row level security;
revoke all on public.access_code_failures from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Погашение кода — с ограничением попыток
-- ---------------------------------------------------------------------------
create or replace function public.redeem_access_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c_max_failures constant int := 5;
  c_window constant interval := interval '15 minutes';
  v_dentist_id uuid;
  v_code text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  v_rec public.access_codes%rowtype;
begin
  select d.id into v_dentist_id
  from public.dentists d
  where d.profile_id = auth.uid();

  if v_dentist_id is null then
    raise exception 'only_dentist_can_redeem_code';
  end if;

  -- Параллельные запросы одного врача идут по очереди: иначе пачка одновременных
  -- попыток вся проскочила бы проверку счётчика до первой записи о неудаче.
  perform pg_advisory_xact_lock(hashtextextended('redeem_access_code:' || v_dentist_id::text, 0));

  delete from public.access_code_failures f
  where f.failed_at < now() - interval '1 day';

  if (
    select count(*)
    from public.access_code_failures f
    where f.dentist_id = v_dentist_id and f.failed_at > now() - c_window
  ) >= c_max_failures then
    raise exception 'too_many_attempts';
  end if;

  -- Ровно шесть цифр. Раньше короткий ввод дополнялся нулями слева, и пустая
  -- строка превращалась в настоящий код 000000.
  if length(v_code) = 6 then
    select * into v_rec
    from public.access_codes ac
    where ac.code = v_code
      and ac.used_at is null
      and ac.expires_at > now()
    order by ac.created_at desc
    limit 1
    for update;
  end if;

  if v_rec.id is null then
    insert into public.access_code_failures (dentist_id) values (v_dentist_id);
    return null;
  end if;

  update public.access_codes
  set used_by = v_dentist_id, used_at = now()
  where id = v_rec.id;

  insert into public.patient_access (patient_id, dentist_id, status, granted_at, revoked_at)
  values (v_rec.patient_id, v_dentist_id, 'active', now(), null)
  on conflict (patient_id, dentist_id)
  do update set status = 'active', granted_at = now(), revoked_at = null;

  -- верный код обнуляет счётчик: опечатки до него не должны копиться к следующему пациенту
  delete from public.access_code_failures f
  where f.dentist_id = v_dentist_id;

  return v_rec.patient_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Генерация кода — криптографический источник случайности
-- ---------------------------------------------------------------------------
-- random() — обычный генератор с состоянием на сессию, его вывод предсказуем по
-- нескольким наблюдениям. Для кода, открывающего медицинскую карту, берётся
-- gen_random_bytes из pgcrypto. Смещение от «% 1000000» на 32 битах — доли процента
-- от одной миллионной, на перебор не влияет.
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
    v_code := lpad(
      ((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text,
      6,
      '0'
    );
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

-- create or replace сохраняет права, но узкая поверхность RPC стоит того, чтобы
-- подтвердить её явно (как в 00005): анониму эти функции недоступны.
revoke all on function public.generate_access_code() from public, anon;
revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.generate_access_code() to authenticated;
grant execute on function public.redeem_access_code(text) to authenticated;
