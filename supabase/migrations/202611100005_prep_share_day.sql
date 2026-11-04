-- Preparation tracker: share a day's preparation as a post, only when the student chooses to.
-- Posts need a goal, so each student gets one "Exam preparation" goal (category exam_prep), made on
-- first share. One post per day: sharing again the same day updates it. Safe to run more than once.

create or replace function public.prep_share_day(target_visibility text, message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  goal uuid;
  post uuid;
  clean text := left(trim(coalesce(message, '')), 500);
begin
  if me is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if target_visibility not in ('private', 'followers', 'public') then raise exception 'Unknown audience' using errcode = '22023'; end if;
  if length(clean) < 3 then raise exception 'Nothing to share yet' using errcode = '22023'; end if;

  select id into goal from public.goals where user_id = me and category = 'exam_prep' order by created_at limit 1;
  if goal is null then
    insert into public.goals (user_id, title, category, visibility, frequency)
    values (me, 'Exam preparation', 'exam_prep', 'public', 'daily') returning id into goal;
  end if;

  select id into post from public.posts
   where user_id = me and goal_id = goal and (created_at at time zone 'Asia/Kolkata')::date = today_ist
   order by created_at desc limit 1;
  if post is null then
    insert into public.posts (user_id, goal_id, caption, proof_type, checkin_status, visibility)
    values (me, goal, clean, 'text', 'done', target_visibility) returning id into post;
  else
    update public.posts set caption = clean, visibility = target_visibility where id = post;
  end if;
  return post;
end;
$$;
revoke execute on function public.prep_share_day(text, text) from public, anon;
grant execute on function public.prep_share_day(text, text) to authenticated;
