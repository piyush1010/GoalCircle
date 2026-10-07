-- Compatibility bridge for the original GoalCircle database. The production
-- project predates the current schema, so preserve its rows while adding the
-- columns used by the stabilized application.

alter table public.goals alter column visibility type text using visibility::text;
alter table public.goals add column if not exists is_completed boolean not null default false;
alter table public.goals add column if not exists streak_count integer not null default 0;
alter table public.goals add column if not exists updated_at timestamptz not null default now();

alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists is_onboarded boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.posts add column if not exists proof_type text not null default 'text';
alter table public.posts add column if not exists minutes_logged integer;
alter table public.posts add column if not exists visibility text not null default 'public';

alter table public.post_comments add column if not exists body text;
update public.post_comments set body = comment_text where body is null;
alter table public.post_comments alter column comment_text drop not null;
alter table public.post_comments alter column body set not null;

alter table public.post_reactions add column if not exists reaction text not null default 'boost';
create unique index if not exists post_reactions_post_user_reaction_idx on public.post_reactions(post_id,user_id,reaction);

alter table public.circles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
update public.circles set owner_id = created_by where owner_id is null;
alter table public.circles add column if not exists member_count integer not null default 0;
alter table public.circles add column if not exists category text not null default 'habits';
alter table public.circles add column if not exists emoji text not null default '🎯';
alter table public.circles add column if not exists visibility text not null default 'public';
alter table public.circles alter column invite_code set default encode(gen_random_bytes(6),'hex');

-- Empty legacy tables must still be deny-by-default rather than exposed through
-- the REST API. They can receive purpose-specific policies if revived later.
alter table public.badges enable row level security;
alter table public.blocks enable row level security;
alter table public.goal_challenges enable row level security;
alter table public.group_members enable row level security;
alter table public.groups enable row level security;
alter table public.nudges enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_tags enable row level security;
alter table public.progress_updates enable row level security;
alter table public.referrals enable row level security;
alter table public.reports enable row level security;
alter table public.user_badges enable row level security;
