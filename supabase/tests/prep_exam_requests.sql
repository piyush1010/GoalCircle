\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b7', 'req@t'), ('00000000-0000-0000-0000-0000000000b8', 'req2@t') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b7';
insert into public.prep_exam_requests (exam_name, details) values ('RAS (Rajasthan)', 'Prelims 2027');
do $$ begin
  begin perform * from public.admin_exam_requests(); raise exception 'FAIL: non-admin read requests';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b8';
insert into public.prep_exam_requests (exam_name) values ('ras (rajasthan) ');
do $$ begin if (select count(*) from public.prep_exam_requests) <> 1 then raise exception 'FAIL: sees others'' requests'; end if; end $$;
reset role;
insert into public.app_admins (user_id) values ('00000000-0000-0000-0000-0000000000b8') on conflict do nothing;
set local role authenticated;
do $$ begin if (select requests from public.admin_exam_requests() limit 1) <> 2 then raise exception 'FAIL: requests not grouped'; end if; end $$;
select 'EXAM REQUEST CHECKS PASSED';
rollback;
