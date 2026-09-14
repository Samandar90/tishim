-- =============================================================================
-- Tishim — Migration 00010: порядок записей карты и правила текущего состояния
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. created_at ставит только сервер.
-- Текущее состояние зуба — последняя запись по created_at, а 00005 выдал
-- authenticated insert во все колонки, и политика вставки время не проверяет.
-- Запись «из будущего» перекрывала бы все следующие приёмы, а удалить или
-- поправить её RLS не даёт. Отказ по правам, а не триггер с подменой: клиент,
-- приславший created_at, должен об этом узнать, а не получить молча другое время.
-- Колоночный revoke поверх табличного гранта не работает (см. 00009), поэтому
-- insert снимается целиком и выдаётся обратно по колонкам.
-- -----------------------------------------------------------------------------
revoke insert on public.tooth_records from anon, authenticated;

grant insert (visit_id, patient_id, tooth_fdi, surfaces, condition, "procedure", note, price)
  on public.tooth_records to authenticated;

-- -----------------------------------------------------------------------------
-- 2. seq — порядок вставки.
-- Записи одного приёма уходят одним insert и получают общий now(), поэтому
-- «кариес O» и «пломба O» из одного приёма раньше сортировались как придётся.
-- При равном created_at побеждает больший seq. generated always — задать его
-- клиент не может.
-- -----------------------------------------------------------------------------
alter table public.tooth_records
  add column seq bigint generated always as identity;

-- -----------------------------------------------------------------------------
-- 3. Текущее состояние по тем же правилам, что buildChartState()
-- в src/components/odontogram/state.ts, — расходиться им нельзя:
--   * корневые состояния живут в слоте 'R', на весь зуб и без поверхностей — в 'W';
--   * в каждом слоте побеждает последняя запись по (created_at, seq);
--   * состояние на весь зуб гасит более ранние поверхности, а удаление,
--     отсутствие и имплант — ещё и корень. Коронка и мост корень оставляют:
--     под ними обычно запломбированные каналы.
-- Прежний view складывал корень в 'W' вместе с коронкой и не гасил поверхности.
-- -----------------------------------------------------------------------------
drop view public.current_tooth_state;

create view public.current_tooth_state
with (security_invoker = on) as
with slotted as (
  select
    tr.patient_id, tr.tooth_fdi, s.surface, tr.condition, tr."procedure", tr.note,
    tr.visit_id, tr.created_at, tr.seq
  from public.tooth_records tr
  cross join lateral unnest(
    case
      when tr.condition in ('root_canal', 'pulpitis', 'periodontitis') then array['R']
      when tr.condition in ('crown', 'bridge', 'implant', 'extracted', 'missing')
        or cardinality(tr.surfaces) = 0 then array['W']
      else tr.surfaces
    end
  ) as s (surface)
),
latest as (
  select distinct on (patient_id, tooth_fdi, surface) *
  from slotted
  order by patient_id, tooth_fdi, surface, created_at desc, seq desc
)
select
  l.patient_id, l.tooth_fdi, l.surface, l.condition, l."procedure", l.note,
  l.visit_id, l.created_at
from latest l
where l.surface = 'W'
  or not exists (
    select 1
    from public.tooth_records r
    where r.patient_id = l.patient_id
      and r.tooth_fdi = l.tooth_fdi
      and (r.created_at, r.seq) > (l.created_at, l.seq)
      and (
        r.condition in ('implant', 'extracted', 'missing')
        or (l.surface <> 'R' and r.condition in ('crown', 'bridge'))
      )
  );

grant select on public.current_tooth_state to authenticated;
