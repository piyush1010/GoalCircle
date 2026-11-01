-- Preparation tracker, Milestone 1: schema, RLS, exam-template foundation and beta flag.
-- Spec: docs/PREPARATION_TRACKER_SPEC.md. Safe to rerun. Touches no existing table.

-- Beta allowlist -----------------------------------------------------------------------------
-- Add testers with: insert into public.prep_beta (user_id, note) select id, 'tester' from auth.users where email = '...';
create table if not exists public.prep_beta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  added_at timestamptz not null default now()
);
alter table public.prep_beta enable row level security;
drop policy if exists "See own beta row" on public.prep_beta;
create policy "See own beta row" on public.prep_beta for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.has_feature(feature text)
returns boolean language sql stable security definer set search_path = public as $$
  select case feature when 'prep' then exists (select 1 from public.prep_beta where user_id = auth.uid()) else false end;
$$;
revoke execute on function public.has_feature(text) from public, anon;
grant execute on function public.has_feature(text) to authenticated;

-- Exam templates and syllabus tree ------------------------------------------------------------
create table if not exists public.prep_exam_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- e.g. upsc_cse_v1
  name text not null,
  exam text not null,                              -- matches lib/exams.ts ids: upsc, cat, state_psc
  version integer not null default 1,
  base_template_id uuid references public.prep_exam_templates(id),  -- overlays (State PCS on a civil-services base)
  status text not null default 'live' check (status in ('draft', 'live', 'retired')),
  created_at timestamptz not null default now()
);
alter table public.prep_exam_templates enable row level security;
drop policy if exists "Read live templates" on public.prep_exam_templates;
create policy "Read live templates" on public.prep_exam_templates for select to authenticated using (status = 'live');

create table if not exists public.prep_syllabus_nodes (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.prep_exam_templates(id) on delete cascade,
  parent_id uuid references public.prep_syllabus_nodes(id) on delete cascade,
  kind text not null check (kind in ('stage', 'paper', 'subject', 'topic', 'subtopic', 'ncert_book', 'ncert_chapter')),
  code text,                                       -- stable official code, e.g. GS2.POL.FR; null for custom nodes
  title text not null check (length(title) between 1 and 200),
  stages text[] not null default '{}',             -- prelims, mains, interview
  papers text[] not null default '{}',             -- GS1, CSAT, ESSAY, OPT1...
  weight numeric not null default 1 check (weight > 0 and weight <= 10),
  sort integer not null default 0,
  pyq_frequency smallint check (pyq_frequency between 0 and 5),
  owner_id uuid references auth.users(id) on delete cascade,  -- null = official; set = student's private custom subtopic
  source text not null default 'official' check (source in ('official', 'mentor', 'user')),
  created_at timestamptz not null default now(),
  unique (template_id, code),
  check ((owner_id is null) = (source = 'official'))
);
create index if not exists prep_nodes_parent_idx on public.prep_syllabus_nodes (template_id, parent_id, sort);
create index if not exists prep_nodes_owner_idx on public.prep_syllabus_nodes (owner_id) where owner_id is not null;
alter table public.prep_syllabus_nodes enable row level security;
drop policy if exists "Read official and own nodes" on public.prep_syllabus_nodes;
create policy "Read official and own nodes" on public.prep_syllabus_nodes for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
drop policy if exists "Create own custom subtopics" on public.prep_syllabus_nodes;
create policy "Create own custom subtopics" on public.prep_syllabus_nodes for insert to authenticated
  with check (owner_id = (select auth.uid()) and source = 'user' and kind = 'subtopic' and parent_id is not null);
drop policy if exists "Edit own custom subtopics" on public.prep_syllabus_nodes;
create policy "Edit own custom subtopics" on public.prep_syllabus_nodes for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and source = 'user');
drop policy if exists "Delete own custom subtopics" on public.prep_syllabus_nodes;
create policy "Delete own custom subtopics" on public.prep_syllabus_nodes for delete to authenticated using (owner_id = (select auth.uid()));

-- A custom subtopic must hang under a node the student can see, in the same template.
create or replace function public.prep_check_custom_parent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null and not exists (
    select 1 from public.prep_syllabus_nodes p
    where p.id = new.parent_id and p.template_id = new.template_id and (p.owner_id is null or p.owner_id = new.owner_id)
  ) then raise exception 'Parent topic not found' using errcode = '23503'; end if;
  return new;
end;
$$;
drop trigger if exists prep_custom_parent on public.prep_syllabus_nodes;
create trigger prep_custom_parent before insert or update on public.prep_syllabus_nodes for each row execute function public.prep_check_custom_parent();

-- Student profile ------------------------------------------------------------------------------
create table if not exists public.prep_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  template_id uuid not null references public.prep_exam_templates(id),
  exam_date date,
  optional_subject_node_id uuid references public.prep_syllabus_nodes(id) on delete set null,
  daily_minutes integer check (daily_minutes between 15 and 960),
  preferred_hours text,
  reminder_mode text not null default 'balanced' check (reminder_mode in ('minimal', 'balanced', 'active')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evidence ledger: append-only. Edits insert a new row with supersedes_id; nothing is deleted.
create table if not exists public.prep_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  node_id uuid references public.prep_syllabus_nodes(id) on delete set null,
  kind text not null check (kind in ('studied', 'revised', 'pyq', 'answers', 'mock', 'notes', 'current_affairs', 'ncert_step', 'foundation', 'source_change')),
  quantity integer not null default 1 check (quantity between 0 and 500),
  minutes integer check (minutes between 0 and 960),
  details jsonb not null default '{}'::jsonb,
  occurred_on date not null default current_date,
  source text not null default 'manual' check (source in ('manual', 'timer', 'screenshot', 'mentor', 'import')),
  confirmed boolean not null default true,
  extraction_method text,
  algorithm_version text not null default 'v1',
  supersedes_id uuid references public.prep_events(id),
  created_at timestamptz not null default now(),
  check (occurred_on <= current_date + 1)
);
create index if not exists prep_events_user_idx on public.prep_events (user_id, occurred_on desc);
create index if not exists prep_events_node_idx on public.prep_events (user_id, node_id);

-- Derived per-topic state (cache of the ledger; recomputable). Maintained by trigger.
create table if not exists public.prep_topic_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id uuid not null references public.prep_syllabus_nodes(id) on delete cascade,
  touched_on date,
  foundation jsonb not null default '{}'::jsonb,   -- {read, highlighted, notes, open_notes, limited_sources}
  revision_count integer not null default 0,
  last_revised_on date,
  interval_days integer,
  next_revision_on date,
  pyq_attempted integer not null default 0,
  pyq_correct integer not null default 0,
  answers_written integer not null default 0,
  algorithm_version text not null default 'v1',
  updated_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

-- Typed logs ---------------------------------------------------------------------------------
create table if not exists public.prep_mock_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stage text not null check (stage in ('prelims_gs', 'csat', 'mains', 'optional', 'other')),
  name text not null check (length(name) between 1 and 160),
  taken_on date not null check (taken_on <= current_date),
  score numeric, max_score numeric,
  total_questions integer, correct integer, incorrect integer, unattempted integer,
  accuracy numeric check (accuracy between 0 and 100),
  percentile numeric check (percentile between 0 and 100),
  rank integer check (rank > 0),
  minutes integer check (minutes between 0 and 600),
  platform text,
  attempt_strategy text check (attempt_strategy in ('conservative', 'balanced', 'aggressive', 'custom')),
  quick_audit text[] not null default '{}',
  guess_counts jsonb not null default '{}'::jsonb, -- {fifty_fifty, educated, blind, changed}
  source text not null default 'manual' check (source in ('manual', 'screenshot', 'import')),
  confirmed boolean not null default true,
  extraction_method text,
  algorithm_version text not null default 'v1',
  created_at timestamptz not null default now(),
  check (score is null or max_score is null or score <= max_score),
  check (max_score is null or max_score > 0),
  check (total_questions is null or correct is null or incorrect is null or unattempted is null or correct + incorrect + unattempted = total_questions),
  check (correct is null or correct >= 0), check (incorrect is null or incorrect >= 0), check (unattempted is null or unattempted >= 0)
);
create index if not exists prep_mock_user_idx on public.prep_mock_tests (user_id, taken_on desc);

create table if not exists public.prep_pyq_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  node_id uuid references public.prep_syllabus_nodes(id) on delete set null,
  exam text not null default 'upsc',
  year smallint check (year between 1979 and 2100),
  paper text,
  attempted integer not null default 0 check (attempted >= 0),
  correct integer not null default 0 check (correct >= 0),
  revised boolean not null default false,
  options_analysed boolean not null default false,
  notebook jsonb,                                   -- optional: why correct, other options, related facts
  attempted_on date not null default current_date,
  created_at timestamptz not null default now(),
  check (correct <= attempted)
);

create table if not exists public.prep_mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mock_id uuid references public.prep_mock_tests(id) on delete cascade,
  pyq_id uuid references public.prep_pyq_attempts(id) on delete cascade,
  node_id uuid references public.prep_syllabus_nodes(id) on delete set null,
  category text not null check (category in ('concept_not_studied', 'fact_forgotten', 'misread_statement', 'extreme_word', 'similar_options', 'overthinking', 'incorrect_elimination', 'current_affairs_gap', 'careless', 'blind_guess')),
  count integer not null default 1 check (count between 1 and 200),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.prep_answer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  node_id uuid references public.prep_syllabus_nodes(id) on delete set null,
  paper text,
  count integer not null check (count between 1 and 50),
  timed boolean not null default false,
  mentor_reviewed boolean not null default false,
  written_on date not null default current_date check (written_on <= current_date + 1),
  created_at timestamptz not null default now()
);

create table if not exists public.prep_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_node_id uuid references public.prep_syllabus_nodes(id) on delete set null,
  title text not null check (length(title) between 1 and 160),
  role text not null check (role in ('primary', 'ncert', 'current_affairs', 'pyq', 'test_series', 'supplementary')),
  status text not null default 'active' check (status in ('active', 'archived')),
  replaced_by uuid references public.prep_sources(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.prep_current_affairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  kind text not null check (kind in ('judgment', 'report', 'committee', 'scheme', 'budget', 'economic_survey', 'state_example', 'other')),
  occurred_on date,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.prep_current_affairs_links (
  item_id uuid not null references public.prep_current_affairs(id) on delete cascade,
  node_id uuid not null references public.prep_syllabus_nodes(id) on delete cascade,
  stage text check (stage in ('prelims', 'mains', 'interview')),
  primary key (item_id, node_id)
);

create table if not exists public.prep_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  computed_on date not null default current_date,
  algorithm_version text not null,
  metrics jsonb not null,
  explanations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, computed_on, algorithm_version)
);

-- Mentor sharing: student-controlled, default nothing. Mentor read access arrives in Milestone 8 via an RPC.
create table if not exists public.prep_mentor_shares (
  student_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  scope text not null default 'nothing' check (scope in ('full', 'summary', 'tasks_only', 'subjects', 'nothing')),
  subject_node_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (student_id, circle_id)
);

-- RLS: every student table is owner-only. -----------------------------------------------------
do $$
declare t text; col text;
begin
  foreach t in array array['prep_profiles', 'prep_topic_state', 'prep_mock_tests', 'prep_pyq_attempts', 'prep_mistakes', 'prep_answer_logs', 'prep_sources', 'prep_current_affairs', 'prep_score_snapshots', 'prep_events', 'prep_mentor_shares'] loop
    col := case when t = 'prep_mentor_shares' then 'student_id' else 'user_id' end;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Owner reads" on public.%I', t);
    execute format('create policy "Owner reads" on public.%I for select to authenticated using (%I = (select auth.uid()))', t, col);
    execute format('drop policy if exists "Owner writes" on public.%I', t);
    execute format('create policy "Owner writes" on public.%I for insert to authenticated with check (%I = (select auth.uid()))', t, col);
    -- The ledger and the derived cache are not edited directly.
    if t not in ('prep_events', 'prep_topic_state') then
      execute format('drop policy if exists "Owner updates" on public.%I', t);
      execute format('create policy "Owner updates" on public.%I for update to authenticated using (%I = (select auth.uid())) with check (%I = (select auth.uid()))', t, col, col);
      execute format('drop policy if exists "Owner deletes" on public.%I', t);
      execute format('create policy "Owner deletes" on public.%I for delete to authenticated using (%I = (select auth.uid()))', t, col);
    end if;
  end loop;
end $$;
-- prep_topic_state is written only by the trigger below.
drop policy if exists "Owner writes" on public.prep_topic_state;

alter table public.prep_current_affairs_links enable row level security;
drop policy if exists "Owner links" on public.prep_current_affairs_links;
create policy "Owner links" on public.prep_current_affairs_links for all to authenticated
  using (exists (select 1 from public.prep_current_affairs c where c.id = item_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.prep_current_affairs c where c.id = item_id and c.user_id = (select auth.uid())));

-- Owned rows may only reference nodes the owner can see (official or their own custom ones).
create or replace function public.prep_node_visible(target uuid, viewer uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target is null or exists (select 1 from public.prep_syllabus_nodes n where n.id = target and (n.owner_id is null or n.owner_id = viewer));
$$;
do $$
declare t text;
begin
  foreach t in array array['prep_events', 'prep_pyq_attempts', 'prep_mistakes', 'prep_answer_logs'] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_node_visible');
    execute format('alter table public.%I add constraint %I check (public.prep_node_visible(node_id, user_id))', t, t || '_node_visible');
  end loop;
end $$;

-- A mentor share must point at a batch the student belongs to.
create or replace function public.prep_check_share()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.circle_memberships m where m.circle_id = new.circle_id and m.user_id = new.student_id) then
    raise exception 'You are not in that batch' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists prep_share_member on public.prep_mentor_shares;
create trigger prep_share_member before insert or update on public.prep_mentor_shares for each row execute function public.prep_check_share();

-- Revision engine v1 (mirrored in lib/prep/revision.ts) ----------------------------------------
-- Days until the next revision, given how many revisions are already done:
-- 0 (first study) -> 3, 1 -> 7, 2 -> 15, 3 -> 30, then x1.5, capped at 90.
create or replace function public.prep_next_interval(revisions_done integer)
returns integer language sql immutable as $$
  select case
    when revisions_done <= 0 then 3
    when revisions_done = 1 then 7
    when revisions_done = 2 then 15
    when revisions_done = 3 then 30
    else least(90, round(30 * power(1.5, revisions_done - 3))::integer)
  end;
$$;

-- Ledger -> topic state. Superseded events are ignored by later recomputes (Milestone 3 adds full recompute).
create or replace function public.prep_apply_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare st public.prep_topic_state; day date := new.occurred_on;
begin
  if new.node_id is null or not new.confirmed then return new; end if;
  insert into public.prep_topic_state (user_id, node_id) values (new.user_id, new.node_id) on conflict do nothing;
  select * into st from public.prep_topic_state where user_id = new.user_id and node_id = new.node_id for update;

  st.touched_on := least(coalesce(st.touched_on, day), day);
  if new.kind in ('studied', 'notes', 'foundation', 'ncert_step') then
    st.foundation := st.foundation || coalesce(new.details -> 'foundation', '{}'::jsonb)
      || case when new.kind = 'notes' then '{"notes": true}'::jsonb else '{}'::jsonb end;
    if st.next_revision_on is null then
      st.interval_days := public.prep_next_interval(0);
      st.next_revision_on := day + st.interval_days;
    end if;
  elsif new.kind = 'revised' then
    if st.last_revised_on is null or day > st.last_revised_on then
      st.revision_count := st.revision_count + 1;
      st.last_revised_on := day;
      st.interval_days := public.prep_next_interval(st.revision_count);
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
drop trigger if exists prep_events_apply on public.prep_events;
create trigger prep_events_apply after insert on public.prep_events for each row execute function public.prep_apply_event();

-- Explicit table privileges (Supabase grants these by default; stated here so access is reviewable).
-- Signed-out visitors get nothing; RLS above decides which rows signed-in users see.
do $$
declare t text;
begin
  foreach t in array array['prep_beta', 'prep_exam_templates', 'prep_syllabus_nodes', 'prep_profiles', 'prep_events', 'prep_topic_state', 'prep_mock_tests', 'prep_pyq_attempts', 'prep_mistakes', 'prep_answer_logs', 'prep_sources', 'prep_current_affairs', 'prep_current_affairs_links', 'prep_score_snapshots', 'prep_mentor_shares'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
-- Ledger is append-only; the derived topic state is written only by its trigger.
revoke update, delete on public.prep_events from authenticated;
revoke insert, update, delete on public.prep_topic_state from authenticated;
revoke execute on function public.prep_node_visible(uuid, uuid) from public, anon;
grant execute on function public.prep_node_visible(uuid, uuid) to authenticated;
