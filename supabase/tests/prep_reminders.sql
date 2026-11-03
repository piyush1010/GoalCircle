\set ON_ERROR_STOP 1
begin;
-- a beta user with a profile on UPPCS, reminder at the current IST hour
do $$
declare u uuid; t uuid; h int := extract(hour from now() at time zone 'Asia/Kolkata');
begin
  select id into u from auth.users limit 1;
  select id into t from prep_exam_templates where code = 'uppcs_v1';
  insert into prep_beta (user_id) values (u) on conflict do nothing;
  insert into prep_profiles (user_id, template_id, exam_date, reminder_hour, daily_target, target_computed_on)
  values (u, t, (now() at time zone 'Asia/Kolkata')::date + 120, h, 4, (now() at time zone 'Asia/Kolkata')::date)
  on conflict (user_id) do update set template_id = excluded.template_id, exam_date = excluded.exam_date, reminder_hour = h, daily_target = 4, target_computed_on = excluded.target_computed_on, last_reminded_on = null, reminder_enabled = true;
  delete from prep_events where user_id = u and occurred_on = (now() at time zone 'Asia/Kolkata')::date;
end $$;
select 'sent ' || notify_prep_reminders();
select 'again ' || notify_prep_reminders();
select message from notifications where kind = 'prep_reminder' order by created_at desc limit 1;
rollback;
