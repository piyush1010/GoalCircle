-- Batch check-in photos and videos move to a private bucket. Files are opened through
-- short-lived signed links, and only by:
--   the student who uploaded it, the batch's mentor, or classmates when the student shared it.
-- Files live under "<student id>/circle-<circle id>/...". A check-in points to one with
-- media_url = 'batch-proof:<path>'. Older check-ins keep their public links. Safe to rerun.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('batch-proof', 'batch-proof', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- The circle a proof file belongs to (second folder, "circle-<uuid>"); null otherwise.
create or replace function public.batch_proof_circle_id(object_name text)
returns uuid language sql immutable set search_path = public as $$
  select case when (storage.foldername(object_name))[2] ~* '^circle-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then substr((storage.foldername(object_name))[2], 8)::uuid end;
$$;
grant execute on function public.batch_proof_circle_id(text) to authenticated;

-- Shared with the batch? (security definer so the storage policy can check the check-in.)
create or replace function public.batch_proof_shared_with_me(object_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_task_checkins c
     where c.media_url = 'batch-proof:' || object_name and c.shared
       and public.is_circle_member(c.circle_id)
  );
$$;
revoke execute on function public.batch_proof_shared_with_me(text) from public, anon;
grant execute on function public.batch_proof_shared_with_me(text) to authenticated;

drop policy if exists "Students upload their own batch proof" on storage.objects;
create policy "Students upload their own batch proof" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'batch-proof'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_circle_member(public.batch_proof_circle_id(name))
);

drop policy if exists "Owner, mentor or batch (if shared) read batch proof" on storage.objects;
create policy "Owner, mentor or batch (if shared) read batch proof" on storage.objects
for select to authenticated
using (
  bucket_id = 'batch-proof' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_circle_admin(public.batch_proof_circle_id(name))
    or public.batch_proof_shared_with_me(name)
  )
);

drop policy if exists "Students delete their own batch proof" on storage.objects;
create policy "Students delete their own batch proof" on storage.objects
for delete to authenticated
using (bucket_id = 'batch-proof' and (storage.foldername(name))[1] = (select auth.uid())::text);
