\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'r1@t'), ('00000000-0000-0000-0000-0000000000a2', 'r2@t'), ('00000000-0000-0000-0000-0000000000a3', 'r3@t') on conflict do nothing;
insert into public.app_admins (user_id) values ('00000000-0000-0000-0000-0000000000a3') on conflict do nothing;
set local role authenticated;
-- two students on UPSC, one checks in
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.prep_plans (template_id, exam_date) select id, current_date + 100 from public.prep_exam_templates where code = 'upsc_cse_v1';
insert into public.feedback (user_id, message, page) values ('00000000-0000-0000-0000-0000000000a1', 'The plan page is clear', '/prep/plan');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
insert into public.prep_plans (template_id, exam_date) select id, current_date + 100 from public.prep_exam_templates where code = 'upsc_cse_v1';
do $$ declare r record; begin
  select * into r from public.prep_room_today();
  if r.node_id is null or r.done or r.done_count <> 0 or r.people <> 2 then raise exception 'FAIL: room before %', row_to_json(r); end if;
  perform public.prep_room_checkin(r.template_id);
  perform public.prep_room_checkin(r.template_id); -- twice is fine
  select * into r from public.prep_room_today();
  if not r.done or r.done_count <> 1 then raise exception 'FAIL: check-in %', row_to_json(r); end if;
  -- a direct insert is not allowed (only through the function)
  begin insert into public.prep_room_checkins (template_id, day) values (r.template_id, current_date); raise exception 'FAIL: direct insert';
  exception when insufficient_privilege then null; end;
  -- cannot check in for an exam you are not preparing for
  begin perform public.prep_room_checkin((select id from public.prep_exam_templates where code = 'cat_v1')); raise exception 'FAIL: other exam';
  exception when insufficient_privilege then null; end;
  -- feedback is not readable by students
  begin perform * from public.admin_feedback(); raise exception 'FAIL: student read feedback';
  exception when insufficient_privilege then null; end;
end $$;
-- the other student sees the count, not who
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ declare r record; begin
  select * into r from public.prep_room_today();
  if r.done or r.done_count <> 1 then raise exception 'FAIL: peer view %', row_to_json(r); end if;
  if (select count(*) from public.prep_room_checkins) <> 0 then raise exception 'FAIL: sees others'' check-ins'; end if;
end $$;
-- undo
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ declare r record; begin
  select * into r from public.prep_room_today(); perform public.prep_room_checkin(r.template_id, true);
  select * into r from public.prep_room_today(); if r.done or r.done_count <> 0 then raise exception 'FAIL: undo'; end if;
end $$;
-- the topic moves on each day and every exam has one
reset role;
do $$ declare c text; begin
  if (select node_id from public.prep_room_topic((select id from public.prep_exam_templates where code = 'upsc_cse_v1'), current_date))
   = (select node_id from public.prep_room_topic((select id from public.prep_exam_templates where code = 'upsc_cse_v1'), current_date + 1)) then raise exception 'FAIL: same topic two days'; end if;
  for c in select code from public.prep_exam_templates loop
    if not exists (select 1 from public.prep_room_topic((select id from public.prep_exam_templates where code = c), current_date)) then raise exception 'FAIL: no topic for %', c; end if;
  end loop;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
do $$ begin if (select count(*) from public.admin_feedback() where message = 'The plan page is clear') <> 1 then raise exception 'FAIL: admin feedback'; end if; end $$;
select 'ROOM AND FEEDBACK CHECKS PASSED';
rollback;
