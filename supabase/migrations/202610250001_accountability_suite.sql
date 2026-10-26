begin;

alter table public.posts add column if not exists checkin_status text;
alter table public.posts drop constraint if exists posts_checkin_status_check;
alter table public.posts add constraint posts_checkin_status_check
  check (checkin_status is null or checkin_status in ('done', 'partial', 'missed'));

create table if not exists public.accountability_partners (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> partner_id)
);

create unique index if not exists accountability_partner_unique_goal
  on public.accountability_partners(requester_id, partner_id, coalesce(goal_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.circle_challenges (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 100),
  description text check (description is null or char_length(description) <= 500),
  target_count integer not null default 7 check (target_count between 1 and 365),
  starts_on date not null default current_date,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.challenge_memberships (
  challenge_id uuid not null references public.circle_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_count integer not null default 0 check (progress_count >= 0),
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  social_notifications boolean not null default true,
  challenge_notifications boolean not null default true,
  show_supporter_counts boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in ('boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak', 'accountability_invite', 'challenge_invite', 'weekly_recap')
);

alter table public.accountability_partners enable row level security;
alter table public.circle_challenges enable row level security;
alter table public.challenge_memberships enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "Users create reports" on public.reports;
create policy "Users create reports" on public.reports for insert to authenticated
with check (reporter_id = (select auth.uid()) and target_user_id <> (select auth.uid()));

drop policy if exists "Users manage their blocks" on public.blocks;
create policy "Users manage their blocks" on public.blocks for all to authenticated
using (blocker_id = (select auth.uid()))
with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));

create policy "Participants view accountability partnerships"
on public.accountability_partners for select to authenticated
using (requester_id = (select auth.uid()) or partner_id = (select auth.uid()));

create policy "Users request accountability partnerships"
on public.accountability_partners for insert to authenticated
with check (requester_id = (select auth.uid()));

create policy "Participants update accountability partnerships"
on public.accountability_partners for update to authenticated
using (requester_id = (select auth.uid()) or partner_id = (select auth.uid()))
with check (requester_id = (select auth.uid()) or partner_id = (select auth.uid()));

create policy "Participants delete accountability partnerships"
on public.accountability_partners for delete to authenticated
using (requester_id = (select auth.uid()) or partner_id = (select auth.uid()));

create policy "Signed-in users view circle challenges"
on public.circle_challenges for select to authenticated using (true);

create policy "Circle members create challenges"
on public.circle_challenges for insert to authenticated
with check (
  creator_id = (select auth.uid())
  and exists (
    select 1 from public.circle_memberships membership
    where membership.circle_id = circle_challenges.circle_id
      and membership.user_id = (select auth.uid())
  )
);

create policy "Challenge creators manage challenges"
on public.circle_challenges for update to authenticated
using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));

create policy "Challenge creators delete challenges"
on public.circle_challenges for delete to authenticated
using (creator_id = (select auth.uid()));

create policy "Signed-in users view challenge progress"
on public.challenge_memberships for select to authenticated using (true);

create policy "Users join challenges as themselves"
on public.challenge_memberships for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.circle_challenges challenge
    join public.circle_memberships membership on membership.circle_id = challenge.circle_id
    where challenge.id = challenge_memberships.challenge_id
      and membership.user_id = (select auth.uid())
  )
);

create policy "Users update their challenge progress"
on public.challenge_memberships for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users leave challenges"
on public.challenge_memberships for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Users read their preferences"
on public.user_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users create their preferences"
on public.user_preferences for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users update their preferences"
on public.user_preferences for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.prevent_partnership_identity_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.requester_id <> old.requester_id
    or new.partner_id <> old.partner_id
    or new.goal_id is distinct from old.goal_id then
    raise exception 'Partnership participants and goal cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists accountability_partnership_identity_guard on public.accountability_partners;
create trigger accountability_partnership_identity_guard
before update on public.accountability_partners
for each row execute function public.prevent_partnership_identity_change();

create or replace function public.notify_accountability_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(recipient_id, actor_id, kind, message)
  values(new.partner_id, new.requester_id, 'accountability_invite', 'invited you to become an accountability partner.');
  return new;
end;
$$;

drop trigger if exists accountability_request_notification on public.accountability_partners;
create trigger accountability_request_notification
after insert on public.accountability_partners
for each row execute function public.notify_accountability_request();

revoke execute on function public.notify_accountability_request() from public, anon, authenticated;
revoke execute on function public.prevent_partnership_identity_change() from public, anon, authenticated;

create index if not exists circle_challenges_circle_dates_idx
  on public.circle_challenges(circle_id, starts_on, ends_on);
create index if not exists accountability_partners_partner_status_idx
  on public.accountability_partners(partner_id, status);
create index if not exists posts_goal_status_created_idx
  on public.posts(goal_id, checkin_status, created_at desc);

notify pgrst, 'reload schema';

commit;
