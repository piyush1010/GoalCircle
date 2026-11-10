\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e9', 'owl@t') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e9';
do $$ begin if public.user_today(auth.uid()) <> (now() at time zone 'Asia/Kolkata')::date then raise exception 'FAIL: default should be midnight'; end if; end $$;
insert into public.user_preferences (user_id, day_ends_hour) values (auth.uid(), 3) on conflict (user_id) do update set day_ends_hour = 3;
do $$ begin if public.user_today(auth.uid()) <> ((now() at time zone 'Asia/Kolkata') - interval '3 hours')::date then raise exception 'FAIL: 3 AM shift'; end if; end $$;
do $$ begin
  begin update public.user_preferences set day_ends_hour = 6 where user_id = auth.uid(); raise exception 'FAIL: 6 allowed';
  exception when check_violation then null; end;
end $$;
insert into public.prep_plans (template_id, exam_date) select id, current_date + 90 from public.prep_exam_templates where code = 'upsc_cse_v1';
do $$ declare r record; begin
  select * into r from public.prep_room_today(); perform public.prep_room_checkin(r.template_id);
  if not exists (select 1 from public.prep_room_checkins where user_id = auth.uid() and day = public.user_today(auth.uid())) then raise exception 'FAIL: room check-in day'; end if;
end $$;
select 'DAY END CHECKS PASSED';
rollback;
