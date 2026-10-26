-- Circle attachments and storage limits: mentors attach several photos, PDFs or short videos to a
-- daily task or a notice. Files live in a private bucket, readable only by
-- members of that circle, under the folder "<circle id>/".
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('circle-files', 'circle-files', false, 52428800,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Photos are now shrunk on the phone before upload; cap videos at 50 MB.
update storage.buckets set file_size_limit = 52428800 where id = 'goal-media' and (file_size_limit is null or file_size_limit > 52428800);

-- First folder of the object name, as a circle id (null when it isn't a uuid).
create or replace function public.circle_file_circle_id(object_name text)
returns uuid language sql immutable set search_path = public as $$
  select case when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then ((storage.foldername(object_name))[1])::uuid end;
$$;
grant execute on function public.circle_file_circle_id(text) to authenticated;

drop policy if exists "Circle members read circle files" on storage.objects;
create policy "Circle members read circle files" on storage.objects
for select to authenticated
using (bucket_id = 'circle-files' and public.is_circle_member(public.circle_file_circle_id(name)));

drop policy if exists "Circle admins upload circle files" on storage.objects;
create policy "Circle admins upload circle files" on storage.objects
for insert to authenticated
with check (bucket_id = 'circle-files' and public.is_circle_admin(public.circle_file_circle_id(name)));

drop policy if exists "Circle admins delete circle files" on storage.objects;
create policy "Circle admins delete circle files" on storage.objects
for delete to authenticated
using (bucket_id = 'circle-files' and public.is_circle_admin(public.circle_file_circle_id(name)));

-- Attachment lists: [{ "path": "...", "name": "...", "type": "application/pdf", "size": 12345 }]
alter table public.circle_tasks add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.circle_posts add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.circle_tasks drop constraint if exists circle_tasks_attachments_check;
alter table public.circle_tasks add constraint circle_tasks_attachments_check
  check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 10);
alter table public.circle_posts drop constraint if exists circle_posts_attachments_check;
alter table public.circle_posts add constraint circle_posts_attachments_check
  check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 10);

-- A notice may now be only attachments.
alter table public.circle_posts drop constraint if exists circle_posts_check;
alter table public.circle_posts drop constraint if exists circle_posts_has_content_check;
alter table public.circle_posts add constraint circle_posts_has_content_check
  check (coalesce(char_length(trim(body)), 0) > 0 or media_url is not null or jsonb_array_length(attachments) > 0);

notify pgrst, 'reload schema';
commit;
