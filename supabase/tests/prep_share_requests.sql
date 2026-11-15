\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'mentor@t'), ('00000000-0000-0000-0000-0000000000e2', 'student@t'), ('00000000-0000-0000-0000-0000000000e3', 'stranger@t') on conflict do nothing;
insert into public.profiles (id, full_name, username) values ('00000000-0000-0000-0000-0000000000e1', 'R. Sharma', 'sharma_t'), ('00000000-0000-0000-0000-0000000000e2', 'Kriti', 'kriti_t'), ('00000000-0000-0000-0000-0000000000e3', 'Stranger', 'stranger_t') on conflict (id) do nothing;
insert into public.circles (id, name, owner_id) values ('00000000-0000-0000-0000-0000000000ec', 'Prelims batch', '00000000-0000-0000-0000-0000000000e1') on conflict do nothing;
insert into public.circle_memberships (circle_id, user_id, role) values ('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e1', 'owner'), ('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e2', 'member') on conflict do nothing;
set local role authenticated;

-- a stranger cannot ask, and a student cannot be asked about by someone outside the batch
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
do $$ begin
  begin perform public.prep_request_share('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e2'); raise exception 'FAIL: stranger asked';
  exception when insufficient_privilege then null; end;
end $$;

-- the mentor asks; asking again while pending changes nothing
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  if public.prep_request_share('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e2') <> 'asked' then raise exception 'FAIL: not asked'; end if;
  if public.prep_request_share('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e2') <> 'pending' then raise exception 'FAIL: not pending'; end if;
  if (select count(*) from public.prep_share_status('00000000-0000-0000-0000-0000000000ec') where requested_at is not null) <> 1 then raise exception 'FAIL: mentor cannot see the request'; end if;
end $$;

-- the student sees it, says Not now: the level stays private and the mentor waits a week
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
do $$ begin
  if not exists (select 1 from public.prep_mentor_shares where circle_id = '00000000-0000-0000-0000-0000000000ec' and requested_at is not null and answered_at is null) then raise exception 'FAIL: student cannot see the request'; end if;
  if not exists (select 1 from public.notifications where recipient_id = '00000000-0000-0000-0000-0000000000e2' and message like 'R. Sharma asked to see your full plan%') then raise exception 'FAIL: no notification'; end if;
  if not public.prep_answer_share('00000000-0000-0000-0000-0000000000ec', false) then raise exception 'FAIL: answer not saved'; end if;
  if (select scope from public.prep_mentor_shares where circle_id = '00000000-0000-0000-0000-0000000000ec') <> 'nothing' then raise exception 'FAIL: declining shared'; end if;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  if public.prep_request_share('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e2') <> 'declined' then raise exception 'FAIL: asked again within a week'; end if;
end $$;

-- a week later the mentor asks again and the student allows: full plan shared
reset role;
update public.prep_mentor_shares set answered_at = now() - interval '8 days' where circle_id = '00000000-0000-0000-0000-0000000000ec';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  if public.prep_request_share('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e2') <> 'asked' then raise exception 'FAIL: could not ask again'; end if;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select public.prep_answer_share('00000000-0000-0000-0000-0000000000ec', true);
do $$ begin
  if (select scope from public.prep_mentor_shares where circle_id = '00000000-0000-0000-0000-0000000000ec') <> 'full' then raise exception 'FAIL: allow did not share'; end if;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  if public.prep_request_share('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e2') <> 'shared' then raise exception 'FAIL: not reported as shared'; end if;
end $$;

-- the student cannot answer for someone else's batch row, and anon cannot call any of it
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
do $$ begin
  if public.prep_answer_share('00000000-0000-0000-0000-0000000000ec', true) then raise exception 'FAIL: stranger answered'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform public.prep_answer_share('00000000-0000-0000-0000-0000000000ec', true); raise exception 'FAIL: anon allowed';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
\echo 'prep_share_requests: all checks passed'
