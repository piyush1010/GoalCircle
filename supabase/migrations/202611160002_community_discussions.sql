-- Discussions in communities: people ask questions or share something in a community, and others answer.
-- The person who asked can mark the answer that helped. Safe to rerun.
--
-- Safeguards, all enforced here rather than in the app:
--   * 5 posts and 40 answers a day per person.
--   * No links from accounts younger than 7 days (where most spam comes from).
--   * Three reports from different people hide a post or an answer straight away. Admins can bring it back.
--   * Blocking works both ways: neither person sees the other's posts or answers.

-- 1. Tables ---------------------------------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  community text not null check (community ~ '^(exam:[a-z0-9_]{2,40}|fitness|reading|health|learning|habits|work|cooking|travel)$'),
  kind text not null default 'question' check (kind in ('question', 'post')),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  helpful_comment_id uuid,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists community_posts_feed_idx on public.community_posts(community, created_at desc);
create index if not exists community_posts_user_idx on public.community_posts(user_id, created_at desc);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1500),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at);
create index if not exists community_comments_user_idx on public.community_comments(user_id, created_at desc);

do $$ begin
  alter table public.community_posts add constraint community_posts_helpful_fkey
    foreign key (helpful_comment_id) references public.community_comments(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason text not null default 'other' check (reason in ('spam', 'rude', 'wrong_place', 'other')),
  created_at timestamptz not null default now(),
  check ((post_id is null) <> (comment_id is null))
);
create unique index if not exists community_reports_post_once on public.community_reports(reporter_id, post_id) where post_id is not null;
create unique index if not exists community_reports_comment_once on public.community_reports(reporter_id, comment_id) where comment_id is not null;
alter table public.community_reports enable row level security;
-- No policies: reports are written through community_report() and read by admins only.

-- 2. Helpers --------------------------------------------------------------------------------------
-- Neither person has blocked the other.
create or replace function public.community_can_see(author uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select author = auth.uid() or not exists (
    select 1 from public.blocks b
     where (b.blocker_id = auth.uid() and b.blocked_id = author) or (b.blocker_id = author and b.blocked_id = auth.uid()));
$$;
revoke execute on function public.community_can_see(uuid) from public, anon;
grant execute on function public.community_can_see(uuid) to authenticated;

-- A mentor: runs a private batch with at least three students. Shown as a small label on their answers.
create or replace function public.community_is_mentor(person uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circles c
     where c.owner_id = person and c.visibility = 'private'
       and (select count(*) from public.circle_memberships m where m.circle_id = c.id and m.user_id <> person) >= 3);
$$;
revoke execute on function public.community_is_mentor(uuid) from public, anon;
grant execute on function public.community_is_mentor(uuid) to authenticated;

create or replace function public.community_has_link(body text)
returns boolean language sql immutable as $$
  select body ~* '(https?://|www\.|t\.me/|wa\.me/|bit\.ly/|\m[a-z0-9-]+\.(com|in|net|org|io|me|xyz|co|app|link|info)\M)';
$$;

-- 3. Row-level security -----------------------------------------------------------------------------
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

drop policy if exists "Signed-in people read community posts" on public.community_posts;
create policy "Signed-in people read community posts" on public.community_posts for select to authenticated
  using ((not hidden or user_id = (select auth.uid()) or public.is_app_admin()) and public.community_can_see(user_id));
drop policy if exists "People post as themselves" on public.community_posts;
create policy "People post as themselves" on public.community_posts for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "People edit their own posts" on public.community_posts;
create policy "People edit their own posts" on public.community_posts for update to authenticated
  using (user_id = (select auth.uid()) or public.is_app_admin()) with check (user_id = (select auth.uid()) or public.is_app_admin());
drop policy if exists "People delete their own posts" on public.community_posts;
create policy "People delete their own posts" on public.community_posts for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_app_admin());

-- Answers follow their post: if you can't see the post, you can't see or answer it.
drop policy if exists "Signed-in people read answers" on public.community_comments;
create policy "Signed-in people read answers" on public.community_comments for select to authenticated
  using ((not hidden or user_id = (select auth.uid()) or public.is_app_admin()) and public.community_can_see(user_id)
         and exists (select 1 from public.community_posts p where p.id = post_id));
drop policy if exists "People answer as themselves" on public.community_comments;
create policy "People answer as themselves" on public.community_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.community_posts p where p.id = post_id and not p.hidden));
drop policy if exists "People edit their own answers" on public.community_comments;
create policy "People edit their own answers" on public.community_comments for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "People delete their own answers" on public.community_comments;
create policy "People delete their own answers" on public.community_comments for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_app_admin());

grant select, insert, update, delete on public.community_posts, public.community_comments to authenticated;

-- 4. Guards ----------------------------------------------------------------------------------------
-- Moderation functions set gy.moderating so the guards let them change "hidden".
create or replace function public.community_guard_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  moderating boolean := coalesce(current_setting('gy.moderating', true), '') = 'on';
  joined_at timestamptz;
  next_hidden boolean;
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.hidden := false; new.helpful_comment_id := null; new.created_at := now(); new.edited_at := null;
    new.body := btrim(new.body);
    if (select count(*) from public.community_posts where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
      raise exception 'GY_LIMIT_POSTS' using errcode = 'P0001';
    end if;
  else
    if moderating or (public.is_app_admin() and old.user_id <> auth.uid()) then
      -- Moderators change "hidden" and nothing else.
      next_hidden := new.hidden;
      new := old;
      new.hidden := next_hidden;
      return new;
    end if;
    new.id := old.id; new.user_id := old.user_id; new.community := old.community; new.created_at := old.created_at; new.hidden := old.hidden;
    new.body := btrim(new.body);
    if new.body is distinct from old.body or new.image_url is distinct from old.image_url or new.kind is distinct from old.kind then
      new.edited_at := now();
    else
      new.edited_at := old.edited_at;
    end if;
    if new.helpful_comment_id is distinct from old.helpful_comment_id and new.helpful_comment_id is not null then
      if new.kind <> 'question' or not exists (
        select 1 from public.community_comments c where c.id = new.helpful_comment_id and c.post_id = new.id and c.user_id <> new.user_id
      ) then raise exception 'GY_BAD_HELPFUL' using errcode = 'P0001'; end if;
    end if;
  end if;
  if new.image_url is not null and position('/goal-media/' || new.user_id::text || '/' in new.image_url) = 0 then
    raise exception 'GY_BAD_IMAGE' using errcode = 'P0001';
  end if;
  if public.community_has_link(new.body) and (tg_op = 'INSERT' or new.body is distinct from old.body) then
    select created_at into joined_at from auth.users where id = new.user_id;
    if joined_at > now() - interval '7 days' then raise exception 'GY_NO_LINKS' using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists community_posts_guard on public.community_posts;
create trigger community_posts_guard before insert or update on public.community_posts
  for each row execute function public.community_guard_post();

create or replace function public.community_guard_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  moderating boolean := coalesce(current_setting('gy.moderating', true), '') = 'on';
  joined_at timestamptz;
  next_hidden boolean;
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.hidden := false; new.created_at := now(); new.edited_at := null;
    new.body := btrim(new.body);
    if (select count(*) from public.community_comments where user_id = new.user_id and created_at > now() - interval '1 day') >= 40 then
      raise exception 'GY_LIMIT_ANSWERS' using errcode = 'P0001';
    end if;
  else
    if moderating or (public.is_app_admin() and old.user_id <> auth.uid()) then
      next_hidden := new.hidden;
      new := old;
      new.hidden := next_hidden;
      return new;
    end if;
    new.id := old.id; new.post_id := old.post_id; new.user_id := old.user_id; new.created_at := old.created_at; new.hidden := old.hidden;
    new.body := btrim(new.body);
    new.edited_at := case when new.body is distinct from old.body then now() else old.edited_at end;
  end if;
  if public.community_has_link(new.body) and (tg_op = 'INSERT' or new.body is distinct from old.body) then
    select created_at into joined_at from auth.users where id = new.user_id;
    if joined_at > now() - interval '7 days' then raise exception 'GY_NO_LINKS' using errcode = 'P0001'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists community_comments_guard on public.community_comments;
create trigger community_comments_guard before insert or update on public.community_comments
  for each row execute function public.community_guard_comment();

-- 5. Joining and notifications --------------------------------------------------------------------
alter table public.notifications add column if not exists community_post_id uuid references public.community_posts(id) on delete cascade;
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted',
    'circle_task', 'circle_post', 'circle_leave', 'circle_reply',
    'prep_reminder', 'prep_weekly',
    'community_answer', 'community_helpful'
  )
);

create or replace function public.community_display_name(person uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.display_name), ''), 'Someone') from public.profiles p where p.id = person
  union all select 'Someone' limit 1;
$$;
revoke execute on function public.community_display_name(uuid) from public, anon, authenticated;

-- Posting in a community makes you a member of it, so it shows on your Communities page.
create or replace function public.community_after_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.community_members (user_id, community, state) values (new.user_id, new.community, 'joined')
  on conflict (user_id, community) do update set state = 'joined';
  return new;
end;
$$;
drop trigger if exists community_posts_join on public.community_posts;
create trigger community_posts_join after insert on public.community_posts
  for each row execute function public.community_after_post();

-- An answer tells the person who asked.
create or replace function public.community_after_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.community_posts;
begin
  select * into p from public.community_posts where id = new.post_id;
  if p.user_id is not null and p.user_id <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, kind, community_post_id, message)
    values (p.user_id, new.user_id, 'community_answer', p.id,
            public.community_display_name(new.user_id) || case when p.kind = 'question' then ' answered your question.' else ' replied to your post.' end);
  end if;
  return new;
end;
$$;
drop trigger if exists community_comments_notify on public.community_comments;
create trigger community_comments_notify after insert on public.community_comments
  for each row execute function public.community_after_comment();

-- "This helped" tells the person who answered.
create or replace function public.community_after_helpful()
returns trigger language plpgsql security definer set search_path = public as $$
declare answerer uuid;
begin
  if new.helpful_comment_id is not null and new.helpful_comment_id is distinct from old.helpful_comment_id then
    select user_id into answerer from public.community_comments where id = new.helpful_comment_id;
    if answerer is not null and answerer <> new.user_id then
      insert into public.notifications (recipient_id, actor_id, kind, community_post_id, message)
      values (answerer, new.user_id, 'community_helpful', new.id, public.community_display_name(new.user_id) || ' said your answer helped.');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists community_posts_helpful on public.community_posts;
create trigger community_posts_helpful after update of helpful_comment_id on public.community_posts
  for each row execute function public.community_after_helpful();

-- 6. What the app reads ---------------------------------------------------------------------------
-- Posts with their author and answer count. security_invoker: the policies above still apply.
create or replace view public.community_post_cards with (security_invoker = true) as
  select p.id, p.community, p.user_id, p.kind, p.body, p.image_url, p.helpful_comment_id, p.hidden, p.created_at, p.edited_at,
         (select count(*) from public.community_comments c where c.post_id = p.id)::int as answers,
         coalesce(nullif(btrim(pr.full_name), ''), nullif(btrim(pr.display_name), ''), 'GoalYaar member') as author_name,
         coalesce(nullif(pr.username, ''), nullif(replace(pr.handle, '@', ''), ''), '') as author_username,
         pr.avatar_url as author_avatar,
         public.community_is_mentor(p.user_id) as author_mentor
    from public.community_posts p
    left join public.profiles pr on pr.id = p.user_id;

create or replace view public.community_comment_cards with (security_invoker = true) as
  select c.id, c.post_id, c.user_id, c.body, c.hidden, c.created_at, c.edited_at,
         coalesce(nullif(btrim(pr.full_name), ''), nullif(btrim(pr.display_name), ''), 'GoalYaar member') as author_name,
         coalesce(nullif(pr.username, ''), nullif(replace(pr.handle, '@', ''), ''), '') as author_username,
         pr.avatar_url as author_avatar,
         public.community_is_mentor(c.user_id) as author_mentor
    from public.community_comments c
    left join public.profiles pr on pr.id = c.user_id;

revoke all on public.community_post_cards, public.community_comment_cards from anon;
grant select on public.community_post_cards, public.community_comment_cards to authenticated;

-- 7. Reports and moderation -----------------------------------------------------------------------
-- Report a post or an answer. Three different people reporting it hides it. Returns true when it's now hidden.
create or replace function public.community_report(target_post uuid default null, target_comment uuid default null, why text default 'other')
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  author uuid;
  reporters integer;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if (target_post is null) = (target_comment is null) then raise exception 'report one thing' using errcode = '22023'; end if;
  if target_post is not null then select user_id into author from public.community_posts where id = target_post;
  else select user_id into author from public.community_comments where id = target_comment; end if;
  if author is null then raise exception 'not found' using errcode = 'P0002'; end if;
  if author = me then raise exception 'GY_OWN_REPORT' using errcode = 'P0001'; end if;

  insert into public.community_reports (reporter_id, post_id, comment_id, reason)
  values (me, target_post, target_comment, case when why in ('spam', 'rude', 'wrong_place', 'other') then why else 'other' end)
  on conflict do nothing;

  select count(distinct reporter_id) into reporters from public.community_reports
   where (target_post is not null and post_id = target_post) or (target_comment is not null and comment_id = target_comment);
  if reporters >= 3 then
    perform set_config('gy.moderating', 'on', true);
    if target_post is not null then update public.community_posts set hidden = true where id = target_post;
    else update public.community_comments set hidden = true where id = target_comment; end if;
    perform set_config('gy.moderating', '', true);
    return true;
  end if;
  return false;
end;
$$;
revoke execute on function public.community_report(uuid, uuid, text) from public, anon;
grant execute on function public.community_report(uuid, uuid, text) to authenticated;

-- Admins: hide or bring back a post or an answer.
create or replace function public.community_moderate(target_post uuid default null, target_comment uuid default null, hide boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  perform set_config('gy.moderating', 'on', true);
  if target_post is not null then update public.community_posts set hidden = hide where id = target_post; end if;
  if target_comment is not null then update public.community_comments set hidden = hide where id = target_comment; end if;
  perform set_config('gy.moderating', '', true);
  if not hide then
    delete from public.community_reports where (target_post is not null and post_id = target_post) or (target_comment is not null and comment_id = target_comment);
  end if;
  return hide;
end;
$$;
revoke execute on function public.community_moderate(uuid, uuid, boolean) from public, anon;
grant execute on function public.community_moderate(uuid, uuid, boolean) to authenticated;

-- 8. Phone notifications carry the post, so tapping one opens the right question ---------------------
create or replace function public.send_push_for_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  config private.push_config%rowtype;
  targets jsonb;
begin
  select * into config from private.push_config where id = 1;
  if not found then return new; end if;
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
    into targets from public.push_subscriptions where user_id = new.recipient_id;
  if targets is null then return new; end if;
  perform net.http_post(
    url := config.endpoint_url,
    body := jsonb_build_object(
      'notification', jsonb_build_object('id', new.id, 'kind', new.kind, 'message', new.message,
        'post_id', new.post_id, 'circle_id', new.circle_id, 'goal_id', to_jsonb(new) -> 'goal_id',
        'community_post_id', to_jsonb(new) -> 'community_post_id'),
      'actor', (select coalesce(nullif(full_name, ''), username) from public.profiles where id = new.actor_id),
      'circle', (select name from public.circles where id = new.circle_id),
      'subscriptions', targets),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', config.secret),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  return new; -- a push problem must never stop the notification itself
end; $$;
revoke all on function public.send_push_for_notification() from public, anon, authenticated;

-- 9. Mentors belong to their batch's exam community ---------------------------------------------------
-- Same as community_overview() in 202611160001, plus mentors in the exam their batch prepares for.
create or replace function public.community_overview()
returns table (key text, member boolean, joined boolean, members integer, active_today integer,
               target integer, my_progress integer, in_challenge boolean, challenge_joined integer, challenge_finished integer, topic text)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today date := public.user_today(auth.uid());
  week date := public.community_week_start(public.user_today(auth.uid()));
begin
  if me is null then return; end if;
  return query
  with keys as (
    select unnest(array['fitness', 'reading', 'health', 'learning', 'habits', 'work', 'cooking', 'travel']) as k
    union
    select 'exam:' || t.code from public.prep_plans pl join public.prep_exam_templates t on t.id = pl.template_id where pl.user_id = me and pl.active
    union
    select cm.community from public.community_members cm where cm.user_id = me and cm.community like 'exam:%' and cm.state = 'joined'
    union
    -- Mentors are in the community of the exam their batch prepares for.
    select 'exam:' || c.exam_template from public.circles c where c.owner_id = me and c.exam_template ~ '^[a-z0-9_]{2,40}$'
  ),
  natural_members as (
    -- People whose goals or plans put them in a community.
    select g.category as k, g.user_id from public.goals g where g.status in ('active', 'paused') and g.category is not null
    union
    select 'exam:' || t.code, pl.user_id from public.prep_plans pl join public.prep_exam_templates t on t.id = pl.template_id where pl.active
    union
    select 'exam:' || c.exam_template, c.owner_id from public.circles c where c.exam_template ~ '^[a-z0-9_]{2,40}$'
  ),
  all_members as (
    select nm.k, nm.user_id from natural_members nm
     where not exists (select 1 from public.community_members h where h.user_id = nm.user_id and h.community = nm.k and h.state = 'hidden')
    union
    select cm.community, cm.user_id from public.community_members cm where cm.state = 'joined'
  )
  select keys.k,
         exists (select 1 from all_members a where a.k = keys.k and a.user_id = me),
         exists (select 1 from public.community_members cm where cm.user_id = me and cm.community = keys.k and cm.state = 'joined'),
         (select count(distinct a.user_id)::int from all_members a where a.k = keys.k),
         case when keys.k like 'exam:%' then (
             select count(distinct e.user_id)::int from public.prep_events e
               join public.prep_syllabus_nodes n on n.id = e.node_id
               join public.prep_exam_templates t on t.id = n.template_id
              where t.code = substring(keys.k from 6) and e.occurred_on = today)
           else (
             select count(distinct p.user_id)::int from public.posts p join public.goals g on g.id = p.goal_id
              where g.category = keys.k and (p.created_at at time zone 'Asia/Kolkata')::date = today)
         end,
         public.community_target(keys.k),
         public.community_progress(me, keys.k, week),
         exists (select 1 from public.community_challenge_joins j where j.user_id = me and j.community = keys.k and j.week_start = week),
         (select count(*)::int from public.community_challenge_joins j where j.community = keys.k and j.week_start = week),
         (select count(*)::int from public.community_challenge_joins j where j.community = keys.k and j.week_start = week
             and public.community_progress(j.user_id, keys.k, week) >= public.community_target(keys.k)),
         case when keys.k like 'exam:%' then (
             select r.title from public.prep_exam_templates t cross join lateral public.prep_room_topic(t.id, today) r
              where t.code = substring(keys.k from 6) limit 1)
         end
    from keys;
end;
$$;
revoke execute on function public.community_overview() from public, anon;
grant execute on function public.community_overview() to authenticated;

