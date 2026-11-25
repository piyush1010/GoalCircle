-- Reports queue for the admin page (Google Play asks that every report is looked at).
-- Lists open reports about people and about community posts and answers, newest first,
-- and lets the admin mark one as dealt with.

alter table public.reports add column if not exists closed_at timestamptz;
alter table public.community_reports add column if not exists closed_at timestamptz;

create or replace function public.admin_reports()
returns table (kind text, id uuid, reason text, created_at timestamptz, reporters bigint,
               about_name text, about_username text, post_id uuid, excerpt text, hidden boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  (
    select 'person'::text, min(r.id::text)::uuid, string_agg(distinct r.reason, ' / '), max(r.created_at), count(distinct r.reporter_id),
           p.full_name, p.username, null::uuid, left(p.bio, 200), false
    from public.reports r left join public.profiles p on p.id = r.target_user_id
    where r.closed_at is null
    group by r.target_user_id, p.id
  )
  union all
  (
    select case when cr.post_id is not null then 'post' else 'answer' end, coalesce(cr.post_id, cr.comment_id),
           string_agg(distinct cr.reason, ' / '), max(cr.created_at), count(distinct cr.reporter_id),
           p.full_name, p.username, coalesce(cr.post_id, cc.post_id),
           left(coalesce(cp.body, cc.body), 200), coalesce(cp.hidden, cc.hidden, false)
    from public.community_reports cr
    left join public.community_posts cp on cp.id = cr.post_id
    left join public.community_comments cc on cc.id = cr.comment_id
    left join public.profiles p on p.id = coalesce(cp.user_id, cc.user_id)
    where cr.closed_at is null
    group by cr.post_id, cr.comment_id, cp.id, cc.id, p.id
  )
  order by 4 desc
  limit 100;
end;
$$;
revoke execute on function public.admin_reports() from public, anon;
grant execute on function public.admin_reports() to authenticated;

-- Mark reports as dealt with: for a person, every open report about them; for a post or answer, its reports.
create or replace function public.admin_close_report(report_kind text, target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if report_kind = 'person' then
    update public.reports set closed_at = now()
    where closed_at is null and target_user_id = (select target_user_id from public.reports where id = target);
  elsif report_kind = 'post' then
    update public.community_reports set closed_at = now() where closed_at is null and post_id = target;
  else
    update public.community_reports set closed_at = now() where closed_at is null and comment_id = target;
  end if;
end;
$$;
revoke execute on function public.admin_close_report(text, uuid) from public, anon;
grant execute on function public.admin_close_report(text, uuid) to authenticated;
