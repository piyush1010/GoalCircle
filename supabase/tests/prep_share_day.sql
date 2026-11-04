\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a9', 'share@t') on conflict do nothing;
insert into public.profiles (id, username) values ('00000000-0000-0000-0000-0000000000a9', 'sharetest') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a9';
create temp table ids (a uuid, b uuid);
grant all on ids to authenticated;
insert into ids select public.prep_share_day('followers', 'UPSC: 4 subtopics and 2 revisions today'), public.prep_share_day('public', 'UPSC: 6 subtopics and 2 revisions today');
do $$ begin
  begin perform public.prep_share_day('everyone', 'x y z'); raise exception 'FAIL: bad audience accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ begin
  if (select a <> b from ids) then raise exception 'FAIL: second share should update the same post'; end if;
  if (select p.visibility from public.posts p join ids on p.id = ids.a) <> 'public' then raise exception 'FAIL: audience not updated'; end if;
  if (select count(*) from public.goals where category = 'exam_prep' and user_id = '00000000-0000-0000-0000-0000000000a9') <> 1 then raise exception 'FAIL: one prep goal'; end if;
end $$;
select 'SHARE CHECKS PASSED';
rollback;
