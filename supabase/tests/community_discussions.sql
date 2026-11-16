\set ON_ERROR_STOP 1
begin;
-- asker and answerer joined a month ago; newbie joined today; three reporters
insert into auth.users (id, email, created_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'asker@t', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000e2', 'answerer@t', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000e3', 'newbie@t', now()),
  ('00000000-0000-0000-0000-0000000000e4', 'r1@t', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000e5', 'r2@t', now() - interval '30 days')
on conflict do nothing;
insert into public.profiles (id, full_name) values ('00000000-0000-0000-0000-0000000000e2', 'Meera') on conflict (id) do update set full_name = 'Meera';
set local role authenticated;

-- The asker posts a question in the UPSC community and becomes a member of it.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into public.community_posts (id, community, kind, body)
values ('00000000-0000-0000-0000-0000000000f1', 'exam:upsc_cse_v1', 'question', '  What is the difference between certiorari and prohibition?  ');
do $$ begin
  if (select body from public.community_posts where id = '00000000-0000-0000-0000-0000000000f1') like ' %' then raise exception 'FAIL: body not trimmed'; end if;
  if not exists (select 1 from public.community_members where community = 'exam:upsc_cse_v1' and state = 'joined') then raise exception 'FAIL: posting should join the community'; end if;
  begin
    insert into public.community_posts (community, body) values ('knitting', 'hello there'); raise exception 'FAIL: unknown community accepted';
  exception when check_violation then null; end;
  begin
    insert into public.community_posts (user_id, community, body) values ('00000000-0000-0000-0000-0000000000e2', 'fitness', 'posting as someone else');
    if exists (select 1 from public.community_posts where user_id = '00000000-0000-0000-0000-0000000000e2') then raise exception 'FAIL: posted as someone else'; end if;
  end;
  begin
    insert into public.community_posts (community, body, image_url) values ('fitness', 'look at this', 'https://x.supabase.co/storage/v1/object/public/goal-media/00000000-0000-0000-0000-0000000000e2/a.jpg');
    raise exception 'FAIL: used someone else''s photo';
  exception when raise_exception then if sqlerrm <> 'GY_BAD_IMAGE' then raise; end if; end;
end $$;
-- the "posting as someone else" row was saved as the asker; tidy it up
delete from public.community_posts where body = 'posting as someone else';

-- The answerer replies; the asker gets a notification and marks it helpful.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
insert into public.community_comments (id, post_id, body) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', 'Certiorari quashes an order already made; prohibition stops a case that is still going on.');
do $$ begin
  begin
    update public.community_posts set helpful_comment_id = '00000000-0000-0000-0000-0000000000c1' where id = '00000000-0000-0000-0000-0000000000f1';
    if (select helpful_comment_id from public.community_posts where id = '00000000-0000-0000-0000-0000000000f1') is not null then raise exception 'FAIL: someone else marked the answer helpful'; end if;
  end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ declare n record; card record; begin
  select * into n from public.notifications where kind = 'community_answer' and recipient_id = auth.uid();
  if n.message <> 'Meera answered your question.' or n.community_post_id <> '00000000-0000-0000-0000-0000000000f1' then raise exception 'FAIL: answer notification %', n.message; end if;
  update public.community_posts set helpful_comment_id = '00000000-0000-0000-0000-0000000000c1' where id = '00000000-0000-0000-0000-0000000000f1';
  select * into card from public.community_post_cards where id = '00000000-0000-0000-0000-0000000000f1';
  if card.answers <> 1 or card.helpful_comment_id is null or card.edited_at is not null then raise exception 'FAIL: card % % %', card.answers, card.helpful_comment_id, card.edited_at; end if;
  update public.community_posts set body = 'Certiorari vs prohibition: what is the difference?', hidden = true where id = '00000000-0000-0000-0000-0000000000f1';
  select * into card from public.community_post_cards where id = '00000000-0000-0000-0000-0000000000f1';
  if card.edited_at is null or card.hidden then raise exception 'FAIL: edit should mark edited and never change hidden'; end if;
  -- you can't mark your own answer
  insert into public.community_comments (id, post_id, body) values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000f1', 'Thanks!');
  begin
    update public.community_posts set helpful_comment_id = '00000000-0000-0000-0000-0000000000c2' where id = '00000000-0000-0000-0000-0000000000f1';
    raise exception 'FAIL: marked own answer helpful';
  exception when raise_exception then if sqlerrm <> 'GY_BAD_HELPFUL' then raise; end if; end;
  -- five posts a day
  insert into public.community_posts (community, body) select 'reading', 'Book idea number ' || g from generate_series(1, 4) g;
  begin
    insert into public.community_posts (community, body) values ('reading', 'One too many');
    raise exception 'FAIL: sixth post of the day accepted';
  exception when raise_exception then if sqlerrm <> 'GY_LIMIT_POSTS' then raise; end if; end;
end $$;

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
do $$ begin
  if not exists (select 1 from public.notifications where kind = 'community_helpful' and recipient_id = auth.uid()) then raise exception 'FAIL: no helpful notification'; end if;
end $$;

-- A new account can't post links; an older one can.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
do $$ begin
  begin
    insert into public.community_posts (community, body) values ('fitness', 'Join my group t.me/freeupsc for notes');
    raise exception 'FAIL: link from a new account accepted';
  exception when raise_exception then if sqlerrm <> 'GY_NO_LINKS' then raise; end if; end;
  begin
    insert into public.community_comments (post_id, body) values ('00000000-0000-0000-0000-0000000000f1', 'Free notes at www.example.com');
    raise exception 'FAIL: link answer from a new account accepted';
  exception when raise_exception then if sqlerrm <> 'GY_NO_LINKS' then raise; end if; end;
  insert into public.community_posts (id, community, body) values ('00000000-0000-0000-0000-0000000000f2', 'fitness', 'Buy cheap protein now, best price');
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
insert into public.community_comments (post_id, body) values ('00000000-0000-0000-0000-0000000000f1', 'See the judgment at https://main.sci.gov.in for detail.');

-- Blocking: the asker blocks the newbie, and neither sees the other.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into public.blocks (blocker_id, blocked_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e3');
do $$ begin
  if exists (select 1 from public.community_post_cards where id = '00000000-0000-0000-0000-0000000000f2') then raise exception 'FAIL: saw a blocked person''s post'; end if;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
do $$ begin
  if exists (select 1 from public.community_post_cards where id = '00000000-0000-0000-0000-0000000000f1') then raise exception 'FAIL: blocked person saw the post'; end if;
  begin
    insert into public.community_comments (post_id, body) values ('00000000-0000-0000-0000-0000000000f1', 'hello');
    raise exception 'FAIL: blocked person answered';
  exception when insufficient_privilege then null; end;
end $$;

-- Reports: you can't report yourself; three people hide the post; the author still sees it.
do $$ begin
  begin perform public.community_report('00000000-0000-0000-0000-0000000000f2', null, 'spam'); raise exception 'FAIL: reported own post';
  exception when raise_exception then if sqlerrm <> 'GY_OWN_REPORT' then raise; end if; end;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
select public.community_report('00000000-0000-0000-0000-0000000000f2', null, 'spam');
select public.community_report('00000000-0000-0000-0000-0000000000f2', null, 'spam'); -- twice counts once
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e4';
do $$ begin
  if public.community_report('00000000-0000-0000-0000-0000000000f2', null, 'spam') then raise exception 'FAIL: hidden after two people'; end if;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e5';
do $$ begin
  if not public.community_report('00000000-0000-0000-0000-0000000000f2', null, 'rude') then raise exception 'FAIL: not hidden after three people'; end if;
  if exists (select 1 from public.community_post_cards where id = '00000000-0000-0000-0000-0000000000f2') then raise exception 'FAIL: hidden post still visible'; end if;
  begin perform public.community_moderate('00000000-0000-0000-0000-0000000000f2', null, false); raise exception 'FAIL: non-admin moderated';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.community_reports) then raise exception 'FAIL: reports readable'; end if;
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e3';
do $$ begin
  if not (select hidden from public.community_post_cards where id = '00000000-0000-0000-0000-0000000000f2') then raise exception 'FAIL: author can''t see own hidden post'; end if;
  update public.community_posts set hidden = false where id = '00000000-0000-0000-0000-0000000000f2';
  if not (select hidden from public.community_posts where id = '00000000-0000-0000-0000-0000000000f2') then raise exception 'FAIL: author un-hid own post'; end if;
end $$;

-- Deleting a question removes its answers and notifications.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
delete from public.community_posts where id = '00000000-0000-0000-0000-0000000000f1';
reset role;
do $$ begin
  if exists (select 1 from public.community_comments where post_id = '00000000-0000-0000-0000-0000000000f1') then raise exception 'FAIL: answers left behind'; end if;
  if exists (select 1 from public.notifications where community_post_id = '00000000-0000-0000-0000-0000000000f1') then raise exception 'FAIL: notifications left behind'; end if;
end $$;
-- A mentor whose batch prepares for an exam is in that exam's community, without a plan of their own.
insert into public.circles (id, name, owner_id, visibility, exam_template) values ('00000000-0000-0000-0000-0000000000b1', 'Polity batch', '00000000-0000-0000-0000-0000000000e2', 'private', 'tnpsc_g1_v1');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
do $$ begin
  if not coalesce((select member from public.community_overview() where key = 'exam:tnpsc_g1_v1'), false) then raise exception 'FAIL: mentor not in their batch''s exam community'; end if;
  if public.community_is_mentor(auth.uid()) then raise exception 'FAIL: mentor label without three students'; end if;
end $$;
reset role;
select 'community discussions ok';
rollback;
