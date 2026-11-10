\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d1', 'leaving@t'), ('00000000-0000-0000-0000-0000000000d2', 'staying@t'), ('00000000-0000-0000-0000-0000000000d3', 'admin@t') on conflict do nothing;
insert into public.profiles (id, full_name, username) values ('00000000-0000-0000-0000-0000000000d1', 'Leaving', 'leaving_t'), ('00000000-0000-0000-0000-0000000000d2', 'Staying', 'staying_t') on conflict (id) do nothing;
insert into public.app_admins (user_id) values ('00000000-0000-0000-0000-0000000000d3') on conflict do nothing;
set local role authenticated;
-- the leaving user creates data across the app
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
insert into public.goals (user_id, title) values ('00000000-0000-0000-0000-0000000000d1', 'Read daily');
insert into public.prep_plans (template_id, exam_date) select id, current_date + 100 from public.prep_exam_templates where code = 'upsc_cse_v1';
insert into public.prep_events (node_id, kind, occurred_on) select id, 'studied', current_date from public.prep_syllabus_nodes where kind = 'subtopic' and owner_id is null limit 3;
insert into public.prep_mistakes (category, note) values ('other', 'Mixed up Articles 14 and 15');
insert into public.feedback (user_id, message) values ('00000000-0000-0000-0000-0000000000d1', 'Nice app');
-- the staying user's data must survive
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
insert into public.goals (user_id, title) values ('00000000-0000-0000-0000-0000000000d2', 'Run');
-- the leaving user deletes their account
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select public.delete_my_account();
reset role;
do $$ begin
  if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'FAIL: user remains'; end if;
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'FAIL: profile remains'; end if;
  if exists (select 1 from public.goals where user_id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'FAIL: goals remain'; end if;
  if exists (select 1 from public.prep_events where user_id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'FAIL: events remain'; end if;
  if exists (select 1 from public.prep_topic_state where user_id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'FAIL: state remains'; end if;
  if exists (select 1 from public.prep_mistakes where user_id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'FAIL: mistakes remain'; end if;
  if not exists (select 1 from public.goals where user_id = '00000000-0000-0000-0000-0000000000d2') then raise exception 'FAIL: other user lost data'; end if;
end $$;
-- the admin cannot delete themselves; anonymous callers cannot call it
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d3';
do $$ begin
  begin perform public.delete_my_account(); raise exception 'FAIL: admin deleted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.delete_my_account(); raise exception 'FAIL: anon allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'DELETE ACCOUNT CHECKS PASSED';
rollback;
