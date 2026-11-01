-- =============================================================================
-- Tishim — Migration 00013: целостность визита и границы колонок
--
-- 1. update на visits был табличным (00005), а политика проверяла только
--    dentist_id: врач одним PATCH мог перевесить patient_id визита на другого
--    своего пациента — история и долг уезжали в чужую карту. Табличный update
--    снимается и выдаётся по колонкам, которые врачу можно править после приёма.
-- 2. paid_amount — сколько получено фактически: «частично оплачено» без суммы
--    показывало пациенту долг на весь итог.
-- 3. Анониму табличные гранты отдавали все колонки профиля и записи
--    врача-флагмана: телефон, дату рождения, номер лицензии. Лендингу нужны имя,
--    аватар, специализация, био, фото, стаж, рейтинг и клиника — остальное снимается.
--    Запись анонимом в любую таблицу политики и так не пропускали — снимаем явно,
--    чтобы граница была не в одном RLS (как в 00011).
-- 4. Бакет attachments принимал файлы любого типа.
-- 5. Приём сохранялся тремя запросами: при сбое на записях зубов оставался пустой
--    визит с суммой, повтор создавал дубль, а удалить его RLS не даёт.
--    create_visit вставляет визит и все записи одной транзакцией.
-- =============================================================================

-- 1–2. visits ------------------------------------------------------------------
alter table public.visits
  add column paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0);
alter table public.visits
  add constraint visits_paid_amount_le_total check (paid_amount <= total);
update public.visits set paid_amount = total where payment_status = 'paid';

-- Колоночный revoke поверх табличного гранта не работает (см. 00009): снимаем целиком.
revoke update on public.visits from anon, authenticated;
grant update (complaint, diagnosis, treatment, recommendation,
              payment_status, paid_amount, next_visit_date)
  on public.visits to authenticated;

-- 3. аноним ---------------------------------------------------------------------
revoke insert, update, delete on all tables in schema public from anon;
revoke select on public.profiles from anon;
grant select (id, full_name, avatar_url) on public.profiles to anon;
revoke select on public.dentists from anon;
grant select (id, profile_id, clinic_id, specialization, is_featured,
              bio, photo_url, experience_years, rating)
  on public.dentists to anon;

-- 4. storage --------------------------------------------------------------------
-- HEIC/HEIF — фото с iPhone, без них загрузка с телефона врача падала бы.
update storage.buckets
   set allowed_mime_types = array[
     'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'
   ]
 where id = 'attachments';

-- 5. create_visit ---------------------------------------------------------------
-- Функция security definer, поэтому повторяет проверки политик вставки сама:
-- врач — вызывающий, доступ к пациенту активен. created_at у всех записей общий
-- (один insert), порядок внутри приёма задаёт seq по порядку массива.
create or replace function public.create_visit(p_visit jsonb, p_records jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dentist     uuid := public.current_dentist_id();
  v_patient     uuid := nullif(p_visit->>'patient_id', '')::uuid;
  v_visit       uuid;
  v_subtotal    numeric(12, 2);
  v_records_sum numeric(12, 2);
  v_total       numeric(12, 2);
  v_status      public.payment_status;
begin
  if v_dentist is null then
    raise exception 'not_a_dentist' using errcode = '42501';
  end if;
  if v_patient is null or not public.has_active_access(v_patient) then
    raise exception 'no_access' using errcode = '42501';
  end if;
  if jsonb_typeof(p_records) is distinct from 'array' or jsonb_array_length(p_records) = 0 then
    raise exception 'no_records' using errcode = '22023';
  end if;

  select coalesce(sum(coalesce((r->>'price')::numeric, 0)), 0)
    into v_records_sum
    from jsonb_array_elements(p_records) r;
  v_subtotal := coalesce((p_visit->>'subtotal')::numeric, v_records_sum);
  if v_subtotal <> v_records_sum then
    raise exception 'subtotal_mismatch' using errcode = '22023';
  end if;
  v_total := coalesce((p_visit->>'total')::numeric, v_subtotal);
  if v_total > v_subtotal then
    raise exception 'total_exceeds_subtotal' using errcode = '22023';
  end if;
  v_status := coalesce((p_visit->>'payment_status')::public.payment_status, 'unpaid');

  insert into public.visits (
    patient_id, dentist_id, visit_type, visit_date,
    complaint, diagnosis, treatment, recommendation,
    subtotal, discount_percent, total, payment_status, paid_amount, next_visit_date
  ) values (
    v_patient, v_dentist,
    coalesce((p_visit->>'visit_type')::public.visit_type, 'treatment'),
    coalesce((p_visit->>'visit_date')::date, current_date),
    nullif(btrim(p_visit->>'complaint'), ''),
    nullif(btrim(p_visit->>'diagnosis'), ''),
    nullif(btrim(p_visit->>'treatment'), ''),
    nullif(btrim(p_visit->>'recommendation'), ''),
    v_subtotal,
    coalesce((p_visit->>'discount_percent')::numeric, 0),
    v_total,
    v_status,
    coalesce((p_visit->>'paid_amount')::numeric,
             case v_status when 'paid' then v_total else 0 end),
    nullif(p_visit->>'next_visit_date', '')::date
  )
  returning id into v_visit;

  insert into public.tooth_records (visit_id, patient_id, tooth_fdi, surfaces, condition, "procedure", note, price)
  select v_visit, v_patient,
         (r->>'tooth_fdi')::int,
         coalesce(array(select jsonb_array_elements_text(coalesce(r->'surfaces', '[]'::jsonb))), '{}'::text[]),
         (r->>'condition')::public.tooth_condition,
         nullif(btrim(r->>'procedure'), ''),
         nullif(btrim(r->>'note'), ''),
         coalesce((r->>'price')::numeric, 0)
    from jsonb_array_elements(p_records) with ordinality as t(r, ord)
   order by ord;

  return v_visit;
end $$;

revoke all on function public.create_visit(jsonb, jsonb) from public, anon;
grant execute on function public.create_visit(jsonb, jsonb) to authenticated;
