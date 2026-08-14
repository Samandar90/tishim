-- =============================================================================
-- Tishim — Migration 00008: троттлинг публичных заявок на цифровизацию
--
-- До этой миграции политика «mapping_requests: public insert» разрешала
-- анониму вставлять строки напрямую с единственной проверкой status = 'new'.
-- Проверки длины полей от объёма не защищают: скриптом можно за минуту залить
-- админу и флагманскому врачу тысячи заявок.
--
-- Прямая вставка закрывается, вместо неё — security definer RPC с двумя
-- ограничениями: по номеру телефона и по отпечатку клиента. Сырой IP не
-- хранится: в таблицу пишется только md5 первого адреса из x-forwarded-for.
-- =============================================================================

drop policy if exists "mapping_requests: public insert" on public.mapping_requests;

alter table public.mapping_requests
  add column if not exists client_fingerprint text;

comment on column public.mapping_requests.client_fingerprint is
  'md5 первого адреса из x-forwarded-for. Только для троттлинга, сырой IP не хранится.';

-- Троттлинг ищет по нормализованному телефону и по отпечатку за окно времени —
-- обоим запросам нужен свой индекс, mapping_requests_status_idx тут не помогает.
create index if not exists mapping_requests_phone_digits_idx
  on public.mapping_requests ((regexp_replace(phone, '\D', '', 'g')), created_at desc);

create index if not exists mapping_requests_fingerprint_idx
  on public.mapping_requests (client_fingerprint, created_at desc)
  where client_fingerprint is not null;

-- Лимиты: 3 заявки на один номер за сутки, 10 заявок с одного отпечатка за час.
-- Номер — основной ключ дедупликации (его подделка ломает смысл заявки: врач
-- обязан перезвонить). Отпечаток ловит перебор случайных номеров с одного хоста.
create or replace function public.submit_mapping_request(
  p_full_name text,
  p_phone text,
  p_preferred_date date default null,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name    text := btrim(coalesce(p_full_name, ''));
  v_phone   text := btrim(coalesce(p_phone, ''));
  v_digits  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_headers json;
  v_ip      text;
  v_fp      text;
  v_id      uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'invalid_name';
  end if;

  if char_length(v_digits) < 7 or char_length(v_phone) > 30 then
    raise exception 'invalid_phone';
  end if;

  if v_comment is not null then
    v_comment := left(v_comment, 1000);
  end if;

  -- Вне PostgREST (psql, тесты) GUC отсутствует — тогда троттлим только по номеру.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;

  v_ip := btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1));
  if v_ip <> '' then
    v_fp := md5(v_ip);
  end if;

  if (
    select count(*)
    from public.mapping_requests mr
    where regexp_replace(mr.phone, '\D', '', 'g') = v_digits
      and mr.created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception 'rate_limited';
  end if;

  if v_fp is not null and (
    select count(*)
    from public.mapping_requests mr
    where mr.client_fingerprint = v_fp
      and mr.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'rate_limited';
  end if;

  insert into public.mapping_requests
    (full_name, phone, preferred_date, comment, status, client_fingerprint)
  values
    (v_name, v_phone, p_preferred_date, v_comment, 'new', v_fp)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_mapping_request(text, text, date, text) from public;
grant execute on function public.submit_mapping_request(text, text, date, text)
  to anon, authenticated;
