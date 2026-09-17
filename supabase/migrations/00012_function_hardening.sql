-- =============================================================================
-- Tishim — Migration 00012: замечания советника безопасности Supabase
--
-- 1. set_updated_at без закреплённого search_path (lint 0011). Функция ничего,
--    кроме now(), не вызывает, но правило одно для всех: путь поиска функции не
--    должен зависеть от того, кто её вызвал.
-- 2. Триггерные функции доступны как RPC (/rest/v1/rpc/handle_new_user) любому,
--    включая анонима (lint 0028/0029). Вызвать их так нельзя — Postgres отвечает
--    «trigger functions can only be called as triggers», — но и в API им делать
--    нечего: право EXECUTE снимается. Триггеру оно не нужно: права на функцию
--    проверяются при создании триггера, а не при срабатывании.
--
-- Остальные предупреждения тех же lint'ов оставлены осознанно: is_admin(),
-- current_dentist_id(), has_active_access(), is_featured_dentist() вызываются из
-- RLS-политик от имени запрашивающей роли, без EXECUTE запросы к таблицам упали бы;
-- о самом вызывающем они сообщают только то, что он и так про себя знает.
-- get_public_stats() и submit_mapping_request() открыты анониму по замыслу —
-- это лендинг.
-- =============================================================================

alter function public.set_updated_at() set search_path = '';

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
