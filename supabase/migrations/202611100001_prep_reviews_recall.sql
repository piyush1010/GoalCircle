-- Preparation tracker: answer review by the batch mentor, and recall-based revision intervals.
-- Safe to run more than once.

-- 1. Answer review --------------------------------------------------------------------------------
-- The student sends a photo of a written answer to one of their batches. The photo goes to the
-- existing private "batch-proof" bucket under "<student id>/circle-<circle id>/...", which only the
-- student and that batch's mentor can open. Sending an answer is itself the consent to review it.
create table if not exists public.prep_answer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  question text check (question is null or length(question) <= 500),
  paper text check (paper is null or length(paper) <= 40),
  image_path text not null check (length(image_path) between 10 and 300),
  submitted_at timestamptz not null default now(),
  marks numeric check (marks is null or marks >= 0),
  max_marks numeric not null default 10 check (max_marks > 0 and max_marks <= 250),
  feedback text check (feedback is null or length(feedback) <= 1500),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  seen_at timestamptz,
  check (marks is null or marks <= max_marks),
  check (image_path like user_id::text || '/circle-' || circle_id::text || '/%')
);
create index if not exists prep_answer_reviews_circle_idx on public.prep_answer_reviews (circle_id, submitted_at desc);
create index if not exists prep_answer_reviews_user_idx on public.prep_answer_reviews (user_id, submitted_at desc);
alter table public.prep_answer_reviews enable row level security;

drop policy if exists "Student or batch mentor reads answer reviews" on public.prep_answer_reviews;
create policy "Student or batch mentor reads answer reviews" on public.prep_answer_reviews for select to authenticated
  using (user_id = (select auth.uid()) or public.is_circle_admin(circle_id));
drop policy if exists "Student sends answers to own batch" on public.prep_answer_reviews;
create policy "Student sends answers to own batch" on public.prep_answer_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_circle_member(circle_id) and marks is null and feedback is null and reviewed_by is null);
drop policy if exists "Student withdraws unreviewed answers" on public.prep_answer_reviews;
create policy "Student withdraws unreviewed answers" on public.prep_answer_reviews for delete to authenticated
  using (user_id = (select auth.uid()) and reviewed_at is null);
revoke all on public.prep_answer_reviews from anon;
grant select, insert, delete on public.prep_answer_reviews to authenticated;
revoke update on public.prep_answer_reviews from authenticated;

-- Mentor marks an answer; student marks feedback as seen. Both through checked functions.
create or replace function public.prep_review_answer(target uuid, given_marks numeric, given_feedback text)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.prep_answer_reviews;
begin
  select * into r from public.prep_answer_reviews where id = target for update;
  if not found or not public.is_circle_admin(r.circle_id) then
    raise exception 'Only the batch mentor can review this answer' using errcode = '42501';
  end if;
  if given_marks is not null and (given_marks < 0 or given_marks > r.max_marks) then
    raise exception 'Marks must be between 0 and %', r.max_marks using errcode = '22023';
  end if;
  update public.prep_answer_reviews
     set marks = given_marks, feedback = nullif(left(trim(coalesce(given_feedback, '')), 1500), ''),
         reviewed_by = auth.uid(), reviewed_at = now(), seen_at = null
   where id = target;
  insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
  values (r.user_id, auth.uid(), 'circle_reply', r.circle_id,
          left('Your answer was reviewed' || case when given_marks is not null then format(': %s/%s', given_marks, r.max_marks) else '' end, 200));
  return true;
end;
$$;
revoke execute on function public.prep_review_answer(uuid, numeric, text) from public, anon;
grant execute on function public.prep_review_answer(uuid, numeric, text) to authenticated;

create or replace function public.prep_mark_reviews_seen()
returns integer language sql security definer set search_path = public as $$
  with u as (update public.prep_answer_reviews set seen_at = now()
              where user_id = auth.uid() and reviewed_at is not null and seen_at is null returning 1)
  select count(*)::integer from u;
$$;
revoke execute on function public.prep_mark_reviews_seen() from public, anon;
grant execute on function public.prep_mark_reviews_seen() to authenticated;

-- 2. Recall-based revision -------------------------------------------------------------------------
-- A revision may carry details {"recall": "all" | "some" | "little"}:
--   all (or nothing given) -> the interval grows as before (3, 7, 15, 30, ... days)
--   some                  -> the interval stays the same size as last time
--   little                -> back to 3 days
create or replace function public.prep_apply_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare st public.prep_topic_state; day date := new.occurred_on; node_kind text; recall text;
begin
  if new.node_id is null or not new.confirmed then return new; end if;
  select kind into node_kind from public.prep_syllabus_nodes where id = new.node_id;
  insert into public.prep_topic_state (user_id, node_id) values (new.user_id, new.node_id) on conflict do nothing;
  select * into st from public.prep_topic_state where user_id = new.user_id and node_id = new.node_id for update;

  if new.kind = 'studied' and coalesce((new.details ->> 'undo')::boolean, false) then
    update public.prep_topic_state set touched_on = null, foundation = '{}'::jsonb,
      next_revision_on = case when revision_count = 0 then null else next_revision_on end,
      interval_days = case when revision_count = 0 then null else interval_days end,
      algorithm_version = 'v1', updated_at = now()
    where user_id = new.user_id and node_id = new.node_id;
    return new;
  end if;

  st.touched_on := least(coalesce(st.touched_on, day), day);
  if new.kind in ('studied', 'notes', 'foundation', 'ncert_step') then
    st.foundation := st.foundation || coalesce(new.details -> 'foundation', '{}'::jsonb)
      || case when new.kind = 'notes' then '{"notes": true}'::jsonb else '{}'::jsonb end;
    if st.next_revision_on is null and node_kind <> 'subtopic' then
      st.interval_days := public.prep_next_interval(0);
      st.next_revision_on := day + st.interval_days;
    end if;
  elsif new.kind = 'revised' then
    if st.last_revised_on is null or day > st.last_revised_on then
      recall := coalesce(new.details ->> 'recall', 'all');
      st.revision_count := st.revision_count + 1;
      st.last_revised_on := day;
      st.interval_days := case recall
        when 'little' then public.prep_next_interval(0)
        when 'some' then public.prep_next_interval(greatest(st.revision_count - 1, 0))
        else public.prep_next_interval(st.revision_count) end;
      st.next_revision_on := day + st.interval_days;
    end if;
  elsif new.kind = 'pyq' then
    st.pyq_attempted := st.pyq_attempted + new.quantity;
    st.pyq_correct := st.pyq_correct + least(new.quantity, coalesce((new.details ->> 'correct')::integer, 0));
  elsif new.kind = 'answers' then
    st.answers_written := st.answers_written + new.quantity;
  end if;

  update public.prep_topic_state set touched_on = st.touched_on, foundation = st.foundation, revision_count = st.revision_count,
    last_revised_on = st.last_revised_on, interval_days = st.interval_days, next_revision_on = st.next_revision_on,
    pyq_attempted = st.pyq_attempted, pyq_correct = st.pyq_correct, answers_written = st.answers_written,
    algorithm_version = 'v1', updated_at = now()
  where user_id = new.user_id and node_id = new.node_id;
  return new;
end;
$$;
