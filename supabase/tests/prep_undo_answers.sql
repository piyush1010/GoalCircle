\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a9', 'ans@t') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a9';
create temp table t as select id from public.prep_syllabus_nodes where code = 'PRE.GS.POL.CON' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1');
insert into public.prep_events (node_id, kind, occurred_on, quantity) select id, 'answers', current_date, 3 from t;
insert into public.prep_events (node_id, kind, occurred_on, quantity, details) select id, 'answers', current_date, 2, '{"undo": true}' from t;
do $$ begin if (select answers_written from public.prep_topic_state where node_id = (select id from t)) <> 1 then raise exception 'FAIL: undo answers'; end if; end $$;
insert into public.prep_events (node_id, kind, occurred_on, quantity, details) select id, 'answers', current_date, 5, '{"undo": true}' from t;
do $$ begin if (select answers_written from public.prep_topic_state where node_id = (select id from t)) <> 0 then raise exception 'FAIL: never below zero'; end if; end $$;
select 'UNDO ANSWERS CHECKS PASSED';
rollback;
