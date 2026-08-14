-- =============================================================================
-- Tishim — Migration 00006: закрыть утечку справочника врачей анонимам
--
-- Политика "profiles: dentist directory is public to signed-in users" из
-- 00002 была объявлена без TO authenticated, поэтому по умолчанию применялась
-- к роли public — то есть и к anon. Анонимный посетитель получал ФИО и
-- телефоны ВСЕХ врачей, включая нефлагманских. На этапе 1 публичного
-- каталога врачей нет: анонимам виден только флагман (политика из 00004).
-- =============================================================================

drop policy if exists "profiles: dentist directory is public to signed-in users"
  on public.profiles;

create policy "profiles: dentist directory is public to signed-in users"
  on public.profiles for select
  to authenticated
  using (role = 'dentist');

-- Остальные политики 00002 тоже опирались на auth.uid(), который у anon равен
-- null (условие даёт false), поэтому они не протекают. Явно ограничиваем роль
-- у тех, что могут быть прочитаны анонимом как «true для всех строк».
drop policy if exists "clinics: read for signed-in" on public.clinics;
create policy "clinics: read for signed-in"
  on public.clinics for select
  to authenticated
  using (true);

drop policy if exists "dentists: read for signed-in" on public.dentists;
create policy "dentists: read for signed-in"
  on public.dentists for select
  to authenticated
  using (true);
