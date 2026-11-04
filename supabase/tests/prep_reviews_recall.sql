\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000b1', 'mentor2@t'), ('00000000-0000-0000-0000-0000000000b2', 's2@t'), ('00000000-0000-0000-0000-0000000000b3', 'peer@t') on conflict do nothing;
insert into public.circles (id, name) values ('00000000-0000-0000-0000-0000000000c2', 'Batch 2') on conflict do nothing;
insert into public.circle_memberships (circle_id, user_id, role) values
 ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 'owner'),
 ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2', 'member'),
 ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3', 'member') on conflict do nothing;
set local role authenticated;
-- student sends an answer
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
insert into public.prep_answer_reviews (id, circle_id, question, image_path) values
 ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c2', 'Role of Governor', '00000000-0000-0000-0000-0000000000b2/circle-00000000-0000-0000-0000-0000000000c2/answer-1.jpg');
do $$ begin
  -- cannot self-grade or point at someone else's folder
  begin insert into public.prep_answer_reviews (circle_id, image_path, marks) values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b2/circle-00000000-0000-0000-0000-0000000000c2/x.jpg', 10); raise exception 'FAIL: self-graded';
  exception when insufficient_privilege or check_violation then null; end;
  begin insert into public.prep_answer_reviews (circle_id, image_path) values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b3/circle-00000000-0000-0000-0000-0000000000c2/x.jpg'); raise exception 'FAIL: other folder';
  exception when insufficient_privilege or check_violation then null; end;
  begin perform public.prep_review_answer('00000000-0000-0000-0000-0000000000d1', 9, 'self'); raise exception 'FAIL: student reviewed';
  exception when insufficient_privilege then null; end;
end $$;
-- a classmate cannot see it
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b3';
do $$ begin if (select count(*) from public.prep_answer_reviews) <> 0 then raise exception 'FAIL: classmate sees answer'; end if; end $$;
-- the mentor sees and marks it
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  if (select count(*) from public.prep_answer_reviews) <> 1 then raise exception 'FAIL: mentor cannot see'; end if;
  begin perform public.prep_review_answer('00000000-0000-0000-0000-0000000000d1', 11, 'too many'); raise exception 'FAIL: marks over max';
  exception when invalid_parameter_value then null; end;
  perform public.prep_review_answer('00000000-0000-0000-0000-0000000000d1', 6.5, 'Good structure; add a case study.');
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  if (select marks from public.prep_answer_reviews where id = '00000000-0000-0000-0000-0000000000d1') <> 6.5 then raise exception 'FAIL: marks not saved'; end if;
  if public.prep_mark_reviews_seen() <> 1 then raise exception 'FAIL: seen'; end if;
  delete from public.prep_answer_reviews where id = '00000000-0000-0000-0000-0000000000d1';
  if (select count(*) from public.prep_answer_reviews) <> 1 then raise exception 'FAIL: reviewed answer was deleted'; end if;
end $$;
-- recall-based intervals
create temp table n as select id from public.prep_syllabus_nodes where code = 'PRE.GS.POL.CON' and template_id = (select id from public.prep_exam_templates where code = 'upsc_cse_v1');
insert into public.prep_events (node_id, kind, occurred_on) select id, 'studied', current_date - 30 from n;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date - 20, '{}' from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n); if s.interval_days <> 7 then raise exception 'FAIL: all -> 7, got %', s.interval_days; end if; end $$;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date - 10, '{"recall": "some"}' from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n); if s.interval_days <> 7 or s.revision_count <> 2 then raise exception 'FAIL: some keeps 7, got % / %', s.interval_days, s.revision_count; end if; end $$;
insert into public.prep_events (node_id, kind, occurred_on, details) select id, 'revised', current_date, '{"recall": "little"}' from n;
do $$ declare s record; begin select * into s from public.prep_topic_state where node_id = (select id from n); if s.interval_days <> 3 or s.next_revision_on <> current_date + 3 then raise exception 'FAIL: little -> 3, got %', s.interval_days; end if; end $$;
select 'REVIEW AND RECALL CHECKS PASSED';
rollback;
