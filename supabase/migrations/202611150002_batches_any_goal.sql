-- Batches for any goal: a UPSC teacher, a fitness trainer or a skill coach. Safe to rerun.
--  coach_kind     what the batch is for: an exam, fitness or health, a skill, or something else
--  exam_template  for exam batches, the exact exam (a prep template code, e.g. 'uppcs_v1')
--  target         for other batches, the regular target, e.g. "5 workouts a week"
--  circle_tasks.proof  how students mark a task done: a tick, a written answer, a photo, a link or minutes

alter table public.circles add column if not exists coach_kind text;
alter table public.circles drop constraint if exists circles_coach_kind_check;
alter table public.circles add constraint circles_coach_kind_check check (coach_kind is null or coach_kind in ('exam', 'fitness', 'skill', 'other'));
alter table public.circles add column if not exists exam_template text;
alter table public.circles drop constraint if exists circles_exam_template_check;
alter table public.circles add constraint circles_exam_template_check check (exam_template is null or char_length(exam_template) <= 40);
alter table public.circles add column if not exists target text;
alter table public.circles drop constraint if exists circles_target_check;
alter table public.circles add constraint circles_target_check check (target is null or char_length(target) <= 120);

-- Existing batches with an exam tag are exam batches.
update public.circles set coach_kind = 'exam' where coach_kind is null and exam is not null;

alter table public.circle_tasks add column if not exists proof text;
alter table public.circle_tasks drop constraint if exists circle_tasks_proof_check;
alter table public.circle_tasks add constraint circle_tasks_proof_check check (proof is null or proof in ('tick', 'answer', 'photo', 'link', 'minutes'));
