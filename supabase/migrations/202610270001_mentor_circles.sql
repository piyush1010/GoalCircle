-- Mentor circles: private batches with invite links, an exam tag, a daily task
-- set by the circle's admins, student check-ins on that task, an admin-only
-- dashboard and nudges.
begin;

-- 1. Circles: exam tag, private visibility, invite codes ----------------------
alter table public.circles add column if not exists exam text;
alter table public.circles add column if not exists invite_code text;
alter table public.circles alter column invite_code set default encode(gen_random_bytes(6), 'hex');
update public.circles set invite_code = encode(gen_random_bytes(6), 'hex') where invite_code is null;
create unique index if not exists circles_invite_code_key on public.circles(invite_code);

alter table public.circles drop constraint if exists circles_visibility_check;
alter table public.circles add constraint circles_visibility_check
  check (visibility in ('public', 'private')) not valid;
alter table public.circles drop constraint if exists circles_exam_check;
alter table public.circles add constraint circles_exam_check
  check (exam is null or exam in ('upsc', 'ssc', 'state_psc', 'banking', 'cat', 'jee', 'neet', 'clat', 'gate', 'sat', 'other'));

-- 2. Membership helpers (security definer avoids policy recursion) ------------
create or replace function public.is_circle_member(target_circle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circles c where c.id = target_circle and c.owner_id = auth.uid())
      or exists (select 1 from public.circle_memberships m where m.circle_id = target_circle and m.user_id = auth.uid());
$$;

create or replace function public.is_circle_admin(target_circle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circles c where c.id = target_circle and c.owner_id = auth.uid())
      or exists (select 1 from public.circle_memberships m
                 where m.circle_id = target_circle and m.user_id = auth.uid() and m.role in ('owner', 'moderator'));
$$;

-- 3. Who can see circles and memberships --------------------------------------
drop policy if exists "Signed-in users can view circles" on public.circles;
drop policy if exists "Signed-in users view public circles and their own" on public.circles;
create policy "Signed-in users view public circles and their own" on public.circles
for select to authenticated
using (visibility = 'public' or owner_id = (select auth.uid()) or public.is_circle_member(id));

drop policy if exists "Circle memberships are visible" on public.circle_memberships;
drop policy if exists "Memberships visible to members and for public circles" on public.circle_memberships;
create policy "Memberships visible to members and for public circles" on public.circle_memberships
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_circle_member(circle_id)
  or exists (select 1 from public.circles c where c.id = circle_id and c.visibility = 'public')
);

-- Joining: anyone may join a public circle as a plain member; the owner adds
-- their own owner row. Private circles are joined only through an invite code.
drop policy if exists "Users join circles" on public.circle_memberships;
drop policy if exists "Users join public circles or add themselves as owner" on public.circle_memberships;
create policy "Users join public circles or add themselves as owner" on public.circle_memberships
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (role = 'member' and exists (select 1 from public.circles c where c.id = circle_id and c.visibility = 'public'))
    or exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = (select auth.uid()))
  )
);

drop policy if exists "Circle admins remove members" on public.circle_memberships;
create policy "Circle admins remove members" on public.circle_memberships
for delete to authenticated
using (
  public.is_circle_admin(circle_id)
  and not exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = circle_memberships.user_id)
);

-- 4. Invite links -------------------------------------------------------------
create or replace function public.circle_invite_preview(code text)
returns table (circle_id uuid, name text, exam text, owner_name text, member_count integer, already_member boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.exam,
         coalesce(p.full_name, p.username, 'Your mentor'),
         (select count(*)::int from public.circle_memberships m where m.circle_id = c.id),
         public.is_circle_member(c.id)
  from public.circles c
  left join public.profiles p on p.id = c.owner_id
  where c.invite_code = lower(trim(code))
    and auth.uid() is not null;
$$;

create or replace function public.join_circle_by_code(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in to join this circle.'; end if;
  select c.id into target from public.circles c where c.invite_code = lower(trim(code));
  if target is null then raise exception 'This invite link is not valid. Ask your mentor for a new one.'; end if;
  insert into public.circle_memberships (circle_id, user_id, role)
  values (target, auth.uid(), 'member')
  on conflict (circle_id, user_id) do nothing;
  return target;
end;
$$;

-- 5. Daily tasks set by circle admins ----------------------------------------
create table if not exists public.circle_tasks (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null,
  title text not null check (char_length(trim(title)) between 3 and 140),
  details text check (details is null or char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (circle_id, task_date)
);
alter table public.circle_tasks enable row level security;

drop policy if exists "Circle members view tasks" on public.circle_tasks;
create policy "Circle members view tasks" on public.circle_tasks
for select to authenticated using (public.is_circle_member(circle_id));
drop policy if exists "Circle admins create tasks" on public.circle_tasks;
create policy "Circle admins create tasks" on public.circle_tasks
for insert to authenticated with check (creator_id = (select auth.uid()) and public.is_circle_admin(circle_id));
drop policy if exists "Circle admins update tasks" on public.circle_tasks;
create policy "Circle admins update tasks" on public.circle_tasks
for update to authenticated using (public.is_circle_admin(circle_id)) with check (public.is_circle_admin(circle_id));
drop policy if exists "Circle admins delete tasks" on public.circle_tasks;
create policy "Circle admins delete tasks" on public.circle_tasks
for delete to authenticated using (public.is_circle_admin(circle_id));

-- 6. Student check-ins on a task (seen by the student and circle admins) ------
create table if not exists public.circle_task_checkins (
  task_id uuid not null references public.circle_tasks(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'done' check (status in ('done', 'partial')),
  hours numeric(4, 1) check (hours is null or (hours >= 0 and hours <= 24)),
  note text check (note is null or char_length(note) <= 500),
  media_url text,
  media_type text check (media_type is null or media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
create index if not exists circle_task_checkins_circle_user_idx
  on public.circle_task_checkins(circle_id, user_id, created_at desc);
alter table public.circle_task_checkins enable row level security;

drop policy if exists "Students and circle admins view check-ins" on public.circle_task_checkins;
create policy "Students and circle admins view check-ins" on public.circle_task_checkins
for select to authenticated using (user_id = (select auth.uid()) or public.is_circle_admin(circle_id));
drop policy if exists "Members check in as themselves" on public.circle_task_checkins;
create policy "Members check in as themselves" on public.circle_task_checkins
for insert to authenticated with check (
  user_id = (select auth.uid())
  and public.is_circle_member(circle_id)
  and exists (select 1 from public.circle_tasks t where t.id = task_id and t.circle_id = circle_task_checkins.circle_id)
);
drop policy if exists "Members update their check-ins" on public.circle_task_checkins;
create policy "Members update their check-ins" on public.circle_task_checkins
for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.circle_tasks t where t.id = task_id and t.circle_id = circle_task_checkins.circle_id)
);
drop policy if exists "Members delete their check-ins" on public.circle_task_checkins;
create policy "Members delete their check-ins" on public.circle_task_checkins
for delete to authenticated using (user_id = (select auth.uid()));

-- 7. Admin dashboard ----------------------------------------------------------
create or replace function public.circle_dashboard(target_circle uuid, on_date date)
returns table (
  user_id uuid, full_name text, username text, avatar_url text, joined_at timestamptz,
  today_status text, today_hours numeric, today_note text, today_media_url text, today_media_type text,
  last_checkin_at timestamptz, days_done_7 integer, tasks_set_7 integer
)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, p.username, p.avatar_url, m.created_at,
         tc.status, tc.hours, tc.note, tc.media_url, tc.media_type,
         (select max(c.updated_at) from public.circle_task_checkins c
           where c.circle_id = target_circle and c.user_id = m.user_id),
         (select count(*)::int from public.circle_task_checkins c
            join public.circle_tasks t2 on t2.id = c.task_id
           where c.circle_id = target_circle and c.user_id = m.user_id
             and t2.task_date > on_date - 7 and t2.task_date <= on_date),
         (select count(*)::int from public.circle_tasks t3
           where t3.circle_id = target_circle and t3.task_date > on_date - 7 and t3.task_date <= on_date)
  from public.circle_memberships m
  left join public.profiles p on p.id = m.user_id
  left join public.circle_tasks t on t.circle_id = target_circle and t.task_date = on_date
  left join public.circle_task_checkins tc on tc.task_id = t.id and tc.user_id = m.user_id
  where m.circle_id = target_circle
    and m.role = 'member'
    and public.is_circle_admin(target_circle);
$$;

-- 8. Notifications: new task and nudges ---------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted',
    'circle_task'
  )
);

create or replace function public.notify_circle_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
  select m.user_id, new.creator_id, 'circle_task', new.circle_id, left('Today''s task: ' || new.title, 200)
  from public.circle_memberships m
  where m.circle_id = new.circle_id and m.user_id <> new.creator_id;
  return new;
end;
$$;
drop trigger if exists circle_task_notification on public.circle_tasks;
create trigger circle_task_notification after insert on public.circle_tasks
for each row execute function public.notify_circle_task();

create or replace function public.nudge_circle_members(target_circle uuid, member_ids uuid[], note text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare sent integer;
begin
  if not public.is_circle_admin(target_circle) then
    raise exception 'Only circle admins can send nudges.';
  end if;
  insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
  select m.user_id, auth.uid(), 'nudge', target_circle,
         left(coalesce(nullif(trim(note), ''), 'Your mentor reminded you to complete today''s task.'), 200)
  from public.circle_memberships m
  where m.circle_id = target_circle
    and m.user_id = any(member_ids)
    and m.user_id <> auth.uid()
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = m.user_id and n.actor_id = auth.uid() and n.kind = 'nudge'
        and n.circle_id = target_circle and n.created_at > now() - interval '3 hours'
    );
  get diagnostics sent = row_count;
  return sent;
end;
$$;

-- 9. Grants (functions are not executable by default in this project) --------
revoke execute on function public.notify_circle_task() from public, anon, authenticated;
grant execute on function public.is_circle_member(uuid) to authenticated;
grant execute on function public.is_circle_admin(uuid) to authenticated;
grant execute on function public.circle_invite_preview(text) to authenticated;
grant execute on function public.join_circle_by_code(text) to authenticated;
grant execute on function public.circle_dashboard(uuid, date) to authenticated;
grant execute on function public.nudge_circle_members(uuid, uuid[], text) to authenticated;
grant select, insert, update, delete on public.circle_tasks to authenticated;
grant select, insert, update, delete on public.circle_task_checkins to authenticated;

notify pgrst, 'reload schema';
commit;
