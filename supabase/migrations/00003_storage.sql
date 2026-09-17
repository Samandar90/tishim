-- =============================================================================
-- Tishim — Migration 00003: storage buckets and policies
-- Path convention:
--   avatars/{user_id}/...            public bucket
--   attachments/{patient_id}/{visit_id}/{file}   private
--   ai-images/{patient_id}/{file}                private
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('attachments', 'attachments', false, 20971520, null),
  ('ai-images', 'ai-images', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- avatars: everyone can view (public bucket), owner manages own folder
-- ---------------------------------------------------------------------------
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner writes"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner updates"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner deletes"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- attachments: patient reads own folder; dentist with active access reads
-- and uploads into the patient's folder
-- ---------------------------------------------------------------------------
create policy "attachments: patient reads own"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments: dentist reads with access"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and public.has_active_access(((storage.foldername(name))[1])::uuid)
  );

create policy "attachments: dentist uploads with access"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and public.has_active_access(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- ai-images: strictly the patient's own folder
-- ---------------------------------------------------------------------------
create policy "ai-images: patient reads own"
  on storage.objects for select
  using (
    bucket_id = 'ai-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ai-images: patient uploads own"
  on storage.objects for insert
  with check (
    bucket_id = 'ai-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ai-images: patient deletes own"
  on storage.objects for delete
  using (
    bucket_id = 'ai-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "ai-images: dentist reads with access"
  on storage.objects for select
  using (
    bucket_id = 'ai-images'
    and public.has_active_access(((storage.foldername(name))[1])::uuid)
  );
