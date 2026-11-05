\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'pilot@t'), ('00000000-0000-0000-0000-0000000000f2', 'boss@t') on conflict do nothing;
insert into public.profiles (id, full_name) values ('00000000-0000-0000-0000-0000000000f1', 'Pilot One') on conflict (id) do update set full_name = excluded.full_name;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
insert into public.prep_plans (template_id, exam_date) select id, current_date + 200 from public.prep_exam_templates where code = 'upsc_cse_v1';
create temp table subs as select id from public.prep_syllabus_nodes
 where kind = 'subtopic' and owner_id is null and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1') order by code limit 3;
-- 3 subtopics ticked, one unticked again, one twin copy (must not count), 50 minutes
insert into public.prep_events (node_id, kind, occurred_on, minutes) select id, 'studied', current_date, 25 from subs;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'studied', current_date, '{"undo": true}' from subs order by id limit 1;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'studied', current_date, '{"twin": true}' from subs order by id desc limit 1;
-- a topic: studied 10 days ago, revised today then undone, then revised again
create temp table t as select id from public.prep_syllabus_nodes where code = 'PRE.GS.POL.CON' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1');
insert into public.prep_events (node_id, kind, occurred_on) select id, 'studied', current_date - 20 from t;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date, '{"recall":"all","prev":{"revision_count":0,"last_revised_on":null,"interval_days":3,"next_revision_on":null}}' from t;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date, '{"undo": true}' from t;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date, '{"recall":"all"}' from t;
do $$ begin
  begin perform * from public.admin_prep_pilot(); raise exception 'FAIL: student read the pilot view';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare w jsonb := public.prep_week_numbers('00000000-0000-0000-0000-0000000000f1', current_date); begin
  if (w ->> 'ticks')::int <> 2 then raise exception 'FAIL: ticks %', w; end if;
  if (w ->> 'revisions')::int <> 1 then raise exception 'FAIL: revisions %', w; end if;
  if (w ->> 'minutes')::int <> 75 then raise exception 'FAIL: minutes %', w; end if;
  if public.prep_week_message(w, public.prep_week_numbers('00000000-0000-0000-0000-0000000000f1', current_date - 7)) not like 'This week: 1 study day, 2 subtopics, 1 revision, 1.3 h focused. Up from 0 days last week.%'
  then raise exception 'FAIL: message %', public.prep_week_message(w, public.prep_week_numbers('00000000-0000-0000-0000-0000000000f1', current_date - 7)); end if;
end $$;
insert into public.app_admins (user_id) values ('00000000-0000-0000-0000-0000000000f2') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ declare r record; begin
  select * into r from public.admin_prep_pilot() where name = 'Pilot One';
  if r is null then raise exception 'FAIL: pilot row missing'; end if;
  if not r.setup_done or r.ticks <> 2 or r.revisions <> 1 or array_length(r.daily, 1) <> 14 or r.daily[14] <> 3 or r.days_active <> 1
  then raise exception 'FAIL: pilot row %', row_to_json(r); end if;
end $$;
select 'PILOT AND WEEKLY CHECKS PASSED';
rollback;
