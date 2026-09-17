-- =============================================================================
-- Tishim — Migration 00007: публичная статистика для лендинга
--
-- Лендинг показывает «сколько карт уже оцифровано». Считать это обычным
-- select'ом нельзя: аноним не видит visits из-за RLS и всегда получает 0.
-- Отдаём один агрегат через security definer — без доступа к самим строкам.
-- =============================================================================

create or replace function public.get_public_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'mapped_patients', (
      select count(distinct patient_id)
      from public.visits
      where visit_type = 'initial_mapping'
    ),
    'visits', (select count(*) from public.visits)
  );
$$;

revoke all on function public.get_public_stats() from public;
grant execute on function public.get_public_stats() to anon, authenticated;
