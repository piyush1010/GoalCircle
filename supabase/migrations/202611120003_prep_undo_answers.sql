-- Preparation tracker: deleting an answer-writing log also takes those answers off the topic's count.
-- The app records an 'answers' event with {"undo": true} and the same quantity. Safe to run more than once.

create or replace function public.prep_apply_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare st public.prep_topic_state; day date := new.occurred_on; node_kind text; recall text; prev jsonb;
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

  -- An answer log deleted by its owner: take its answers back off the topic.
  if new.kind = 'answers' and coalesce((new.details ->> 'undo')::boolean, false) then
    update public.prep_topic_state set answers_written = greatest(0, answers_written - new.quantity), updated_at = now()
    where user_id = new.user_id and node_id = new.node_id;
    return new;
  end if;

  -- Undo today's revision: put back the schedule saved on the first revision logged today.
  if new.kind = 'revised' and coalesce((new.details ->> 'undo')::boolean, false) then
    if st.last_revised_on = day then
      select e.details -> 'prev' into prev from public.prep_events e
      where e.user_id = new.user_id and e.node_id = new.node_id and e.kind = 'revised' and e.occurred_on = day
        and e.id <> new.id and not coalesce((e.details ->> 'undo')::boolean, false) and e.details ? 'prev'
      order by e.created_at asc limit 1;
      if prev is not null then
        update public.prep_topic_state set
          revision_count = greatest(coalesce((prev ->> 'revision_count')::integer, st.revision_count - 1), 0),
          last_revised_on = (prev ->> 'last_revised_on')::date,
          interval_days = (prev ->> 'interval_days')::integer,
          next_revision_on = (prev ->> 'next_revision_on')::date,
          algorithm_version = 'v1', updated_at = now()
        where user_id = new.user_id and node_id = new.node_id;
      end if;
    end if;
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
