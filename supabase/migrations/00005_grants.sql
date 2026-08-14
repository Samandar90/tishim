-- =============================================================================
-- Tishim — Migration 00005: table-level grants for API roles
-- Newer Supabase images do not auto-grant privileges on objects created in
-- migrations. Grants mirror hosted-Supabase defaults; RLS (00002/00004)
-- remains the actual security boundary — deny-by-default per row.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;

-- Re-assert the narrow RPC surface from 00002/00004: these functions are
-- security definer, so keep anon locked out explicitly (revoke wins after
-- the broad grant above).
revoke all on function public.generate_access_code() from anon;
revoke all on function public.redeem_access_code(text) from anon;
revoke all on function public.get_admin_stats() from anon;
revoke all on function public.set_featured_dentist(uuid) from anon;
