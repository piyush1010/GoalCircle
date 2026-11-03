\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000ac02', 'm@test'), ('00000000-0000-0000-0000-00000000ac03', 'o@test') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000ac02';
insert into public.prep_mistakes (category, note) values ('other', 'Mixed up Article 32 and 226');
update public.prep_mistakes set resolved_on = current_date where note like 'Mixed%';
do $$ begin if (select count(*) from public.prep_mistakes where resolved_on is not null) <> 1 then raise exception 'FAIL: resolve'; end if; end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000ac03';
do $$ begin if (select count(*) from public.prep_mistakes) <> 0 then raise exception 'FAIL: another user sees mistakes'; end if; end $$;
update public.prep_mistakes set resolved_on = null;
reset role;
do $$ begin if (select count(*) from public.prep_mistakes where resolved_on is null and user_id = '00000000-0000-0000-0000-00000000ac02') <> 0 then raise exception 'FAIL: another user changed a mistake'; end if; end $$;
select 'MISTAKE CHECKS PASSED';
rollback;
