\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'undo@t') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
create temp table n as select id from public.prep_syllabus_nodes where code = 'PRE.GS.POL.CON' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1');
insert into public.prep_events (node_id, kind, occurred_on) select id, 'studied', current_date - 30 from n;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date - 20, '{}' from n;
-- state now: 1 revision, 7-day gap, due current_date - 13
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date,
  jsonb_build_object('recall', 'all', 'prev', jsonb_build_object('revision_count', 1, 'last_revised_on', current_date - 20, 'interval_days', 7, 'next_revision_on', current_date - 13)) from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n);
  if s.revision_count <> 2 or s.last_revised_on <> current_date then raise exception 'FAIL: revision not applied'; end if; end $$;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date, '{"undo": true}' from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n);
  if s.revision_count <> 1 or s.last_revised_on <> current_date - 20 or s.interval_days <> 7 or s.next_revision_on <> current_date - 13
  then raise exception 'FAIL: undo did not restore (% % % %)', s.revision_count, s.last_revised_on, s.interval_days, s.next_revision_on; end if; end $$;
-- revise again after the undo, then undo again: still restores the same earlier schedule
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date,
  jsonb_build_object('recall', 'little', 'prev', jsonb_build_object('revision_count', 1, 'last_revised_on', current_date - 20, 'interval_days', 7, 'next_revision_on', current_date - 13)) from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n);
  if s.interval_days <> 3 then raise exception 'FAIL: re-revision not applied'; end if; end $$;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date, '{"undo": true}' from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n);
  if s.revision_count <> 1 or s.next_revision_on <> current_date - 13 then raise exception 'FAIL: second undo'; end if; end $$;
-- an undo with nothing revised today changes nothing
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date, '{"undo": true}' from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n);
  if s.revision_count <> 1 then raise exception 'FAIL: stray undo changed state'; end if; end $$;
select 'UNDO REVISION CHECKS PASSED';
rollback;
