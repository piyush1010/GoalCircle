\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'anyone@t') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin if public.has_feature('prep') is not true then raise exception 'FAIL: tracker not open to a signed-in user'; end if; end $$;
reset role;
set local role anon;
set local request.jwt.claim.sub = '';
do $$ begin
  begin perform public.has_feature('prep'); raise exception 'FAIL: anon can call has_feature';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- a paused plan gets no reminder
insert into public.prep_profiles (user_id, template_id, reminder_hour, active)
values ('00000000-0000-0000-0000-0000000000e1', (select id from public.prep_exam_templates where code = 'upsc_cse_v1'), extract(hour from now() at time zone 'Asia/Kolkata')::int, false);
do $$ begin if public.notify_prep_reminders() <> 0 then raise exception 'FAIL: paused plan was reminded'; end if; end $$;
update public.prep_profiles set active = true where user_id = '00000000-0000-0000-0000-0000000000e1';
do $$ begin if public.notify_prep_reminders() <> 1 then raise exception 'FAIL: active plan without beta not reminded'; end if; end $$;
select 'OPEN-TO-ALL CHECKS PASSED';
rollback;
