\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000ac01', 'sub@test') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000ac01';
create temp table x as select (select id from public.prep_syllabus_nodes where code = 'PRE.GS.POL.CON' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1')) topic, (select id from public.prep_syllabus_nodes where code = 'PRE.GS.POL.CON.05' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1')) sub;
insert into public.prep_events (node_id, kind) select sub, 'studied' from x;
insert into public.prep_events (node_id, kind) select topic, 'studied' from x;
do $$ declare s record; t record; begin
  select * into s from public.prep_topic_state where node_id = (select sub from x);
  select * into t from public.prep_topic_state where node_id = (select topic from x);
  if s.touched_on is null or s.next_revision_on is not null then raise exception 'FAIL: subtopic tick %', row_to_json(s); end if;
  if t.next_revision_on <> current_date + 3 then raise exception 'FAIL: topic revision %', row_to_json(t); end if;
end $$;
insert into public.prep_events (node_id, kind, details) select sub, 'studied', '{"undo": true}' from x;
do $$ begin if (select touched_on from public.prep_topic_state where node_id = (select sub from x)) is not null then raise exception 'FAIL: untick'; end if; end $$;
do $$ begin if (select count(*) from public.prep_syllabus_nodes where kind = 'subtopic') < 470 then raise exception 'FAIL: official subtopics not visible'; end if; end $$;
select 'SUBTOPIC CHECKS PASSED';
rollback;
