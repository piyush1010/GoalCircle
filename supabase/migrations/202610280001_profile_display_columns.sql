-- The feed reads profiles.display_name and profiles.handle. The original production
-- project had them from before the migrations; add them so a fresh project matches.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists handle text;
