-- Preparation tracker access tests. Run against a local database built from supabase/migrations
-- (see docs/PREPARATION_TRACKER_STATUS.md). Every check raises on failure.
\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000aa01', 'piyush.kaushik2@gmail.com'),
  ('00000000-0000-0000-0000-00000000aa02', 'student2@test'),
  ('00000000-0000-0000-0000-00000000aa03', 'mentor@test')
on conflict do nothing;
insert into public.prep_beta (user_id, note) values ('00000000-0000-0000-0000-00000000aa01', 'test') on conflict do nothing;
insert into public.circles (id, owner_id, name) values ('00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-00000000aa03', 'Batch') on conflict do nothing;
insert into public.circle_memberships (circle_id, user_id, role) values ('00000000-0000-0000-0000-0000000c0001', '00000000-0000-0000-0000-00000000aa01', 'member') on conflict do nothing;

create temp table ids as select
  (select id from public.prep_syllabus_nodes where code = 'MAI.GS2.CON' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1')) as topic,
  (select id from public.prep_syllabus_nodes where code = 'MAI.GS2.POL' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1')) as subject;
grant select on ids to authenticated;

-- Student 1 -----------------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000aa01';
do $$ begin
  if not public.has_feature('prep') then raise exception 'FAIL: beta user has no prep flag'; end if;
  if (select count(*) from public.prep_syllabus_nodes where kind = 'topic') < 100 then raise exception 'FAIL: official topics not visible'; end if;
end $$;
insert into public.prep_syllabus_nodes (template_id, parent_id, kind, title, owner_id, source)
  select n.template_id, n.id, 'subtopic', 'Article 21 judgments', auth.uid(), 'user' from public.prep_syllabus_nodes n, ids where n.id = ids.topic;
insert into public.prep_events (node_id, kind, details, occurred_on) select topic, 'studied', '{"foundation": {"read": true}}', current_date - 20 from ids;
insert into public.prep_events (node_id, kind, occurred_on) select topic, 'notes', current_date - 20 from ids;
insert into public.prep_events (node_id, kind, occurred_on) select topic, 'revised', current_date - 16 from ids;
insert into public.prep_events (node_id, kind, quantity, details) select topic, 'pyq', 10, '{"correct": 7}' from ids;
insert into public.prep_events (node_id, kind, quantity) select topic, 'answers', 2 from ids;
insert into public.prep_mock_tests (stage, name, taken_on, score, max_score, total_questions, correct, incorrect, unattempted) values ('csat', 'Mock 1', current_date - 1, 92.5, 200, 80, 40, 10, 30);
insert into public.prep_mentor_shares (circle_id, scope) values ('00000000-0000-0000-0000-0000000c0001', 'summary');
do $$ declare s record; begin
  select * into s from public.prep_topic_state where node_id = (select topic from ids);
  if s.revision_count <> 1 or s.interval_days <> 7 or s.next_revision_on <> current_date - 9 then raise exception 'FAIL: revision engine state %', row_to_json(s); end if;
  if s.pyq_attempted <> 10 or s.pyq_correct <> 7 or s.answers_written <> 2 then raise exception 'FAIL: evidence counters %', row_to_json(s); end if;
  if not (s.foundation ->> 'read')::boolean or not (s.foundation ->> 'notes')::boolean then raise exception 'FAIL: foundation flags'; end if;
end $$;
-- Ledger is append-only and the derived cache can't be written directly.
do $$ begin
  begin delete from public.prep_events; raise exception 'FAIL: delete allowed'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.prep_events) <> 5 then raise exception 'FAIL: events were deleted'; end if;
  begin update public.prep_events set quantity = 99; raise exception 'FAIL: event edited in place'; exception when insufficient_privilege then null; end;
  if exists (select 1 from public.prep_events where quantity = 99) then raise exception 'FAIL: event edited in place'; end if;
  begin insert into public.prep_topic_state (user_id, node_id) values (auth.uid(), (select subject from ids)); raise exception 'FAIL: direct state write'; exception when insufficient_privilege then null; end;
end $$;
-- Validation
do $$ begin
  begin insert into public.prep_mock_tests (stage, name, taken_on, total_questions, correct, incorrect, unattempted) values ('csat', 'Bad', current_date, 80, 40, 10, 20); raise exception 'FAIL: counts must add up'; exception when check_violation then null; end;
  begin insert into public.prep_mock_tests (stage, name, taken_on, score, max_score) values ('csat', 'Bad', current_date, 210, 200); raise exception 'FAIL: score > max'; exception when check_violation then null; end;
  begin insert into public.prep_mock_tests (stage, name, taken_on) values ('csat', 'Future', current_date + 3); raise exception 'FAIL: future date'; exception when check_violation then null; end;
  begin insert into public.prep_mentor_shares (circle_id, scope) values (gen_random_uuid(), 'full'); raise exception 'FAIL: share to a batch I am not in'; exception when others then null; end;
end $$;

-- Student 2 (not in beta, not in the batch) ---------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000aa02';
do $$ begin
  if public.has_feature('prep') then raise exception 'FAIL: non-beta user has flag'; end if;
  if exists (select 1 from public.prep_events) or exists (select 1 from public.prep_topic_state) or exists (select 1 from public.prep_mock_tests) or exists (select 1 from public.prep_mentor_shares) then raise exception 'FAIL: cross-user read'; end if;
  if exists (select 1 from public.prep_syllabus_nodes where owner_id is not null) then raise exception 'FAIL: another student''s custom subtopic visible'; end if;
  update public.prep_mock_tests set score = 0; delete from public.prep_mock_tests;
  begin insert into public.prep_events (user_id, node_id, kind) select '00000000-0000-0000-0000-00000000aa01', topic, 'studied' from ids; raise exception 'FAIL: wrote into another user''s ledger'; exception when insufficient_privilege then null; end;
  begin insert into public.prep_events (node_id, kind) select id, 'studied' from public.prep_syllabus_nodes where owner_id is not null limit 1; exception when others then null; end;
end $$;

-- Mentor of the student's batch: no direct access in M1 (RPC arrives in M8) -------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000aa03';
do $$ begin
  if exists (select 1 from public.prep_events) or exists (select 1 from public.prep_topic_state) or exists (select 1 from public.prep_mentor_shares) then raise exception 'FAIL: mentor read student data directly'; end if;
end $$;

-- Back as student 1: nothing of theirs was changed by others.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000aa01';
do $$ begin
  if (select count(*) from public.prep_mock_tests) <> 1 or (select score from public.prep_mock_tests limit 1) <> 92.5 then raise exception 'FAIL: other user changed my data'; end if;
  if (select count(*) from public.prep_events) <> 5 then raise exception 'FAIL: event count'; end if;
end $$;
reset role;
select 'ALL PREP RLS TESTS PASSED' as result;
rollback;
