-- Preparation tracker: each student can choose the order they study in, for each exam.
-- null = the syllabus order. Otherwise {"mix": bool, "subjects": [...], "next": [...], "later": [...]}:
-- mix a few subjects each day, the order of subjects, and single subtopics moved to the front or the end.
-- Only the order changes; the daily target and the dates are worked out as before. Safe to run more than once.

alter table public.prep_plans add column if not exists study_order jsonb;

do $$ begin
  alter table public.prep_plans add constraint prep_plans_study_order_check check (
    study_order is null or (
      jsonb_typeof(study_order) = 'object'
      and pg_column_size(study_order) <= 64000
      and (study_order->'mix' is null or jsonb_typeof(study_order->'mix') = 'boolean')
      and (study_order->'subjects' is null or jsonb_typeof(study_order->'subjects') = 'array')
      and (study_order->'next' is null or jsonb_typeof(study_order->'next') = 'array')
      and (study_order->'later' is null or jsonb_typeof(study_order->'later') = 'array')
    )
  );
exception when duplicate_object then null; end $$;

comment on column public.prep_plans.study_order is 'The student''s own study order for this exam; null means the syllabus order.';
