\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'trainer@t') on conflict do nothing;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';

-- a trainer starts a fitness batch with a target, and posts a task that asks for a photo
insert into public.circles (id, name, owner_id, visibility, coach_kind, target) values ('00000000-0000-0000-0000-0000000000fc', 'Morning run club', '00000000-0000-0000-0000-0000000000f1', 'private', 'fitness', 'Five runs a week');
insert into public.circle_tasks (circle_id, creator_id, task_date, title, proof) values ('00000000-0000-0000-0000-0000000000fc', '00000000-0000-0000-0000-0000000000f1', current_date, '5 km easy run', 'photo');

do $$ begin
  if (select coach_kind from public.circles where id = '00000000-0000-0000-0000-0000000000fc') <> 'fitness' then raise exception 'FAIL: coach kind not saved'; end if;
  begin update public.circles set coach_kind = 'dance' where id = '00000000-0000-0000-0000-0000000000fc'; raise exception 'FAIL: unknown coach kind accepted';
  exception when check_violation then null; end;
  begin update public.circle_tasks set proof = 'selfie' where circle_id = '00000000-0000-0000-0000-0000000000fc'; raise exception 'FAIL: unknown proof accepted';
  exception when check_violation then null; end;
  begin update public.circles set target = repeat('x', 121) where id = '00000000-0000-0000-0000-0000000000fc'; raise exception 'FAIL: long target accepted';
  exception when check_violation then null; end;
end $$;
select 'batches_any_goal passed';
rollback;
