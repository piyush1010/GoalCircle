-- Preparation tracker: mistake notebook revisits and an "other" mistake type. Safe to run more than once.
alter table public.prep_mistakes add column if not exists resolved_on date;
alter table public.prep_mistakes drop constraint if exists prep_mistakes_category_check;
alter table public.prep_mistakes add constraint prep_mistakes_category_check check (category in (
  'concept_not_studied', 'fact_forgotten', 'misread_statement', 'extreme_word', 'similar_options', 'overthinking',
  'incorrect_elimination', 'current_affairs_gap', 'careless', 'blind_guess', 'other'));
alter table public.prep_mistakes drop constraint if exists prep_mistakes_note_length;
alter table public.prep_mistakes add constraint prep_mistakes_note_length check (note is null or length(note) <= 500);
create index if not exists prep_mistakes_open_idx on public.prep_mistakes (user_id) where resolved_on is null;
