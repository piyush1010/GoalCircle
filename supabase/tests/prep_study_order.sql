\set ON_ERROR_STOP 1
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'order1@t'), ('00000000-0000-0000-0000-0000000000c2', 'order2@t') on conflict do nothing;
insert into public.prep_plans (user_id, template_id, exam_date)
select u, (select id from public.prep_exam_templates order by code limit 1), current_date + 90
from unnest(array['00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2']::uuid[]) u;
-- the owner saves an order; a wrong shape is refused
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
update public.prep_plans set study_order = '{"mix": true, "subjects": ["a"], "next": [], "later": ["b"]}' where user_id = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  if (select study_order->>'mix' from public.prep_plans where user_id = '00000000-0000-0000-0000-0000000000c1') <> 'true' then raise exception 'FAIL: order not saved'; end if;
  begin update public.prep_plans set study_order = '{"mix": "yes"}' where user_id = '00000000-0000-0000-0000-0000000000c1'; raise exception 'FAIL: bad mix';
  exception when check_violation then null; end;
  begin update public.prep_plans set study_order = '[1, 2]' where user_id = '00000000-0000-0000-0000-0000000000c1'; raise exception 'FAIL: array';
  exception when check_violation then null; end;
end $$;
-- nobody else can change it
update public.prep_plans set study_order = '{"mix": true}' where user_id = '00000000-0000-0000-0000-0000000000c2';
reset role;
do $$ begin
  if (select study_order from public.prep_plans where user_id = '00000000-0000-0000-0000-0000000000c2') is not null then raise exception 'FAIL: changed another student''s order'; end if;
end $$;
select 'prep_study_order ok';
rollback;
