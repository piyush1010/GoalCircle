\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'runner@t'), ('00000000-0000-0000-0000-0000000000d2', 'walker@t') on conflict do nothing;
insert into public.goals (id, user_id, title, category) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 'Run 5 km', 'fitness'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d2', 'Walk daily', 'fitness');
-- the runner checks in on four different days this week, twice on one of them
insert into public.posts (user_id, goal_id, created_at)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', ((public.community_week_start(public.user_today('00000000-0000-0000-0000-0000000000d1')) + d)::timestamp + interval '12 hours') at time zone 'Asia/Kolkata'
  from unnest(array[0, 1, 1, 2, 3]) d;
set local role authenticated;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select public.community_challenge_set('fitness', true);
do $$ declare r record; begin
  select * into r from public.community_overview() where key = 'fitness';
  if not r.member then raise exception 'FAIL: a fitness goal should make you a member'; end if;
  if r.members < 2 then raise exception 'FAIL: members %', r.members; end if;
  if r.my_progress <> 4 then raise exception 'FAIL: progress % (expected 4 days)', r.my_progress; end if;
  if not r.in_challenge or r.challenge_joined <> 1 or r.challenge_finished <> 1 then raise exception 'FAIL: challenge counts % %', r.challenge_joined, r.challenge_finished; end if;
  begin perform public.community_progress('00000000-0000-0000-0000-0000000000d2', 'fitness', current_date); raise exception 'FAIL: read someone else''s progress';
  exception when insufficient_privilege then null; end;
end $$;

-- leaving hides the community even though the goal is still there; joining brings it back
insert into public.community_members (community, state) values ('fitness', 'hidden');
do $$ begin
  if (select member from public.community_overview() where key = 'fitness') then raise exception 'FAIL: still a member after leaving'; end if;
end $$;
update public.community_members set state = 'joined' where community = 'fitness';
do $$ begin
  if not (select member from public.community_overview() where key = 'fitness') then raise exception 'FAIL: not a member after joining'; end if;
  begin insert into public.community_members (community) values ('knitting'); raise exception 'FAIL: unknown community accepted';
  exception when check_violation then null; end;
end $$;

-- the walker cannot see or change the runner's rows
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
do $$ begin
  if exists (select 1 from public.community_challenge_joins) then raise exception 'FAIL: saw another person''s challenge entry'; end if;
  if (select my_progress from public.community_overview() where key = 'fitness') <> 0 then raise exception 'FAIL: walker progress'; end if;
end $$;
do $$ begin
  perform public.community_challenge_set('fitness', true);
  if (select challenge_joined from public.community_overview() where key = 'fitness') <> 2 then raise exception 'FAIL: walker joined'; end if;
  perform public.community_challenge_set('fitness', false);
  if (select in_challenge from public.community_overview() where key = 'fitness') then raise exception 'FAIL: walker left'; end if;
end $$;
select 'communities passed';
rollback;
