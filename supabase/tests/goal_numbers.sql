\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a9', 'runner2@t') on conflict do nothing;
insert into public.goals (id, user_id, title, category, track_unit) values
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000a9', 'Morning run', 'fitness', 'km'),
  ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000a9', 'Weight', 'health', 'kg'),
  ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000a9', 'Read', 'reading', null);
-- three runs (5, 4.5 and an unmeasured one), two weigh-ins, one reading day, and a missed day that doesn't count
insert into public.posts (user_id, goal_id, amount, checkin_status, created_at) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b8', 5, 'done', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b8', 4.5, 'done', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b8', null, 'done', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b8', 9, 'missed', now() - interval '4 days'),
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b9', 71.2, 'done', now() - interval '3 days'),
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b9', 70.8, 'done', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000ba', null, 'done', now() - interval '1 day');
do $$ declare line text; begin
  line := public.goal_week_message('00000000-0000-0000-0000-0000000000a9', (now() at time zone 'Asia/Kolkata')::date);
  if line <> 'This week: Morning run on 3 days (9.5 km), Weight on 2 days (70.8 kg at the end), Read on 1 day.' then raise exception 'FAIL: %', line; end if;
  begin update public.posts set amount = -1 where goal_id = '00000000-0000-0000-0000-0000000000b8'; raise exception 'FAIL: negative amount';
  exception when check_violation then null; end;
  begin update public.goals set track_unit = '' where id = '00000000-0000-0000-0000-0000000000ba'; raise exception 'FAIL: empty unit';
  exception when check_violation then null; end;
end $$;
-- one summary a week, however often the job runs
select public.notify_goal_weekly();
select public.notify_goal_weekly();
do $$ begin
  if (select count(*) from public.notifications where recipient_id = '00000000-0000-0000-0000-0000000000a9' and kind = 'weekly_recap') <> 1 then raise exception 'FAIL: weekly summary count'; end if;
end $$;
select 'goal numbers ok';
rollback;
