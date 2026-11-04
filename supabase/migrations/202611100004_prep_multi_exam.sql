-- Preparation tracker: prepare for more than one exam at once. Safe to run more than once.
-- Each exam is a plan with its own date, stage, level and optional. prep_profiles keeps the
-- person-level settings (hours a day, reminders, on/off) and its template_id stays as the main exam,
-- so the mentor view and older code keep working.

create table if not exists public.prep_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  template_id uuid not null references public.prep_exam_templates(id),
  exam_date date,
  target_stage text not null default 'prelims' check (target_stage in ('prelims', 'mains')),
  plan_start_on date,
  revision_buffer_pct smallint not null default 15 check (revision_buffer_pct between 0 and 40),
  level text check (level is null or level in ('beginner', 'intermediate', 'advanced')),
  optional_subject_node_id uuid references public.prep_syllabus_nodes(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, template_id)
);
alter table public.prep_plans enable row level security;
drop policy if exists "Owner reads plans" on public.prep_plans;
create policy "Owner reads plans" on public.prep_plans for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Owner writes plans" on public.prep_plans;
create policy "Owner writes plans" on public.prep_plans for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Owner updates plans" on public.prep_plans;
create policy "Owner updates plans" on public.prep_plans for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Owner deletes plans" on public.prep_plans;
create policy "Owner deletes plans" on public.prep_plans for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.prep_plans from anon;
grant select, insert, update, delete on public.prep_plans to authenticated;

-- Everyone who already set up an exam keeps it as their first plan.
insert into public.prep_plans (user_id, template_id, exam_date, target_stage, plan_start_on, revision_buffer_pct, level, optional_subject_node_id, active)
select user_id, template_id, exam_date, coalesce(target_stage, 'prelims'), plan_start_on, coalesce(revision_buffer_pct, 15), level, optional_subject_node_id, true
from public.prep_profiles
on conflict (user_id, template_id) do nothing;

-- Revisions due are counted across every active exam (a topic shared by two exams counts once per exam's node).
create or replace function public.notify_prep_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  now_ist timestamp := now() at time zone 'Asia/Kolkata';
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  p record;
  due_count integer;
  target integer;
  next_exam date;
  msg text;
  sent integer := 0;
begin
  for p in
    select pr.* from public.prep_profiles pr
     where pr.reminder_enabled and pr.active
       and pr.reminder_hour = extract(hour from now_ist)::integer
       and (pr.last_reminded_on is null or pr.last_reminded_on < today_ist)
       and not exists (select 1 from public.prep_events e where e.user_id = pr.user_id and e.occurred_on = today_ist)
     for update of pr skip locked
  loop
    select count(*) into due_count
      from public.prep_topic_state s join public.prep_syllabus_nodes n on n.id = s.node_id
     where s.user_id = p.user_id and n.kind = 'topic' and s.next_revision_on <= today_ist
       and n.template_id in (select template_id from public.prep_plans where user_id = p.user_id and active
                             union select p.template_id);
    target := case when p.target_computed_on >= today_ist - 1 then p.daily_target end;
    select min(exam_date) into next_exam from public.prep_plans where user_id = p.user_id and active and exam_date >= today_ist;
    next_exam := coalesce(next_exam, case when p.exam_date >= today_ist then p.exam_date end);

    msg := case
      when coalesce(target, 0) > 0 and due_count > 0 then format('Today: %s subtopic%s to study and %s revision%s due.', target, case when target = 1 then '' else 's' end, due_count, case when due_count = 1 then '' else 's' end)
      when coalesce(target, 0) > 0 then format('Today: %s subtopic%s to stay on plan.', target, case when target = 1 then '' else 's' end)
      when due_count > 0 then format('%s revision%s due. A quick one keeps your progress from slipping.', due_count, case when due_count = 1 then ' is' else 's are' end)
      else 'A short study session today keeps your preparation moving.'
    end;
    if next_exam is not null then msg := msg || format(' %s days to your next exam.', next_exam - today_ist); end if;

    insert into public.notifications (recipient_id, actor_id, kind, message) values (p.user_id, null, 'prep_reminder', left(msg, 200));
    update public.prep_profiles set last_reminded_on = today_ist where user_id = p.user_id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.notify_prep_reminders() from public, anon, authenticated;
