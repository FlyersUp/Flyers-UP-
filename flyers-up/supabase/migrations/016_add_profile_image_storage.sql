-- Create a public bucket for profile media and allow users to manage
-- only the files inside their own user-id folder.
--
-- Folder convention:
--   <auth.uid()>/<subfolder>/<filename>
--
-- Example paths:
--   123e4567-e89b-12d3-a456-426614174000/avatar/1700000000000.png
--   123e4567-e89b-12d3-a456-426614174000/logo/1700000000000.jpg
--   123e4567-e89b-12d3-a456-426614174000/work/1700000000000.webp

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'profile-images') then
    insert into storage.buckets (id, name, public)
    values ('profile-images', 'profile-images', true);
  end if;
end $$;

-- Public read access (the bucket is public, but we still add an explicit select policy).
drop policy if exists "Public read profile images" on storage.objects;
create policy "Public read profile images"
on storage.objects
for select
using (bucket_id = 'profile-images');

-- Users can insert only into their own folder.
drop policy if exists "Users upload own profile images" on storage.objects;
create policy "Users upload own profile images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update only objects in their own folder.
drop policy if exists "Users update own profile images" on storage.objects;
create policy "Users update own profile images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete only objects in their own folder.
drop policy if exists "Users delete own profile images" on storage.objects;
create policy "Users delete own profile images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

