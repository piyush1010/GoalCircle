\set ON_ERROR_STOP 1
begin;
-- mentor M, students A (summary), B (full), C (no share), outsider X
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1', 'mentor@t'), ('00000000-0000-0000-0000-0000000000a2', 'a@t'),
 ('00000000-0000-0000-0000-0000000000a3', 'b@t'), ('00000000-0000-0000-0000-0000000000a4', 'c@t'), ('00000000-0000-0000-0000-0000000000a5', 'x@t') on conflict do nothing;
insert into public.circles (id, name) values ('00000000-0000-0000-0000-0000000000c1', 'Batch') on conflict do nothing;
insert into public.circle_memberships (circle_id, user_id, role) values
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'member'),
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'member'),
 ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 'member') on conflict do nothing;
insert into public.prep_profiles (user_id, template_id) select u, (select id from public.prep_exam_templates where code = 'cat_v1')
 from unnest(array['00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a4']::uuid[]) u on conflict do nothing;
set local role authenticated;
-- students set their own sharing
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
insert into public.prep_mentor_shares (circle_id, scope) values ('00000000-0000-0000-0000-0000000000c1', 'summary');
insert into public.prep_events (node_id, kind) select id, 'studied' from public.prep_syllabus_nodes where code = 'PRE.QA.ARI.PCT.01' and template_id = (select id from public.prep_exam_templates where code = 'cat_v1');
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
insert into public.prep_mentor_shares (circle_id, scope) values ('00000000-0000-0000-0000-0000000000c1', 'full');
insert into public.prep_mistakes (category) values ('careless');
-- an outsider cannot share into a batch they are not in
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a5';
do $$ begin
  begin insert into public.prep_mentor_shares (circle_id, scope) values ('00000000-0000-0000-0000-0000000000c1', 'full'); raise exception 'FAIL: outsider shared';
  exception when insufficient_privilege then null; end;
  begin perform public.prep_mentor_view('00000000-0000-0000-0000-0000000000c1'); raise exception 'FAIL: outsider read mentor view';
  exception when insufficient_privilege then null; end;
end $$;
-- a student cannot use the mentor view
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin
  begin perform public.prep_mentor_view('00000000-0000-0000-0000-0000000000c1'); raise exception 'FAIL: student read mentor view';
  exception when insufficient_privilege then null; end;
end $$;
-- the mentor sees numbers only for sharing students
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
do $$ declare v jsonb := public.prep_mentor_view('00000000-0000-0000-0000-0000000000c1'); r jsonb; begin
  if jsonb_array_length(v) <> 3 then raise exception 'FAIL: expected 3 students, got %', v; end if;
  for r in select * from jsonb_array_elements(v) loop
    if (r ->> 'scope') = 'nothing' and (r ? 'ticked' or r ? 'mocks') then raise exception 'FAIL: unshared student leaked %', r; end if;
    if (r ->> 'scope') = 'summary' and ((r ->> 'ticked')::int <> 1 or r ? 'open_mistakes') then raise exception 'FAIL: summary scope %', r; end if;
    if (r ->> 'scope') = 'full' and (r ->> 'open_mistakes')::int <> 1 then raise exception 'FAIL: full scope %', r; end if;
  end loop;
end $$;
reset role;
-- weekly summary sends once
insert into public.prep_beta (user_id) values ('00000000-0000-0000-0000-0000000000a2') on conflict do nothing;
do $$ begin
  if public.notify_prep_weekly() < 1 then raise exception 'FAIL: weekly not sent'; end if;
  if public.notify_prep_weekly() <> 0 then raise exception 'FAIL: weekly sent twice'; end if;
end $$;
select message from public.notifications where kind = 'prep_weekly' and recipient_id = '00000000-0000-0000-0000-0000000000a2';
select 'MENTOR AND WEEKLY CHECKS PASSED';
rollback;
