\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'multi@t'), ('00000000-0000-0000-0000-0000000000f2', 'other@t') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
insert into public.prep_plans (template_id, exam_date) select id, current_date + 200 from public.prep_exam_templates where code = 'upsc_cse_v1';
insert into public.prep_plans (template_id, exam_date) select id, current_date + 30 from public.prep_exam_templates where code = 'uppcs_v1';
do $$ begin if (select count(*) from public.prep_plans) <> 2 then raise exception 'FAIL: two plans'; end if; end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin if (select count(*) from public.prep_plans) <> 0 then raise exception 'FAIL: other user sees plans'; end if; end $$;
do $$ begin
  begin insert into public.prep_plans (user_id, template_id) select '00000000-0000-0000-0000-0000000000f1', id from public.prep_exam_templates where code = 'bpsc_v1'; raise exception 'FAIL: wrote someone else''s plan';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- reminder quotes the nearest exam across plans
insert into public.prep_profiles (user_id, template_id, reminder_hour, exam_date)
select '00000000-0000-0000-0000-0000000000f1', id, extract(hour from now() at time zone 'Asia/Kolkata')::int, current_date + 200 from public.prep_exam_templates where code = 'upsc_cse_v1';
do $$ begin if public.notify_prep_reminders() <> 1 then raise exception 'FAIL: reminder'; end if; end $$;
do $$ begin if (select message from public.notifications where recipient_id = '00000000-0000-0000-0000-0000000000f1' and kind = 'prep_reminder') not like '%30 days to your next exam.%' then raise exception 'FAIL: nearest exam'; end if; end $$;
select 'MULTI-EXAM CHECKS PASSED';
rollback;
