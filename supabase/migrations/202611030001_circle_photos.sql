-- Mentors can give their batch a photo or logo. Safe to run more than once.
alter table public.circles add column if not exists avatar_url text;
alter table public.circles drop constraint if exists circles_avatar_url_check;
alter table public.circles add constraint circles_avatar_url_check
  check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url like 'https://%'));
