-- =============================================================================
-- Tishim — Migration 00014: статистика админа с учётом частичной оплаты
--
-- После 00013 у визита есть paid_amount. «Оплачено» считалось только по визитам со
-- статусом paid, а «к оплате» — по всему итогу остальных, поэтому частично
-- оплаченный приём попадал в долг целиком, а полученные по нему деньги не
-- попадали никуда. Теперь обе суммы — по paid_amount.
-- =============================================================================
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_only';
  end if;

  return jsonb_build_object(
    'patients', (select count(*) from public.profiles where role = 'patient'),
    'dentists', (select count(*) from public.dentists),
    'clinics', (select count(*) from public.clinics),
    'visits', (select count(*) from public.visits),
    'visits_last_30d', (select count(*) from public.visits where visit_date >= current_date - 30),
    'revenue_total', coalesce((select sum(paid_amount) from public.visits), 0),
    'revenue_outstanding', coalesce((select sum(greatest(total - paid_amount, 0)) from public.visits), 0),
    'ai_screenings', (select count(*) from public.ai_screenings)
  );
end;
$$;
