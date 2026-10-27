-- Phone push notifications (Web Push, no app store needed).
-- Each phone that allows notifications saves a push address here. When a notification row is
-- created, a trigger sends it, with that person's push addresses, to the app's /api/push route,
-- which delivers it. The route's address and shared secret live in private.push_config, which the
-- app's users can't read; set them once with the separate setup snippet (not committed).

create extension if not exists pg_net with schema extensions;

-- 1. Push addresses -------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists "Users see their own push addresses" on public.push_subscriptions;
create policy "Users see their own push addresses" on public.push_subscriptions
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users remove their own push addresses" on public.push_subscriptions;
create policy "Users remove their own push addresses" on public.push_subscriptions
for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.push_subscriptions to authenticated;

-- Save this phone's push address for the signed-in person. A shared phone moves to whoever
-- signed in last, so one person never gets another's notifications.
create or replace function public.save_push_subscription(target_endpoint text, key_p256dh text, key_auth text, agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then raise exception 'Sign in first'; end if;
  if target_endpoint !~ '^https://' or length(target_endpoint) > 1000 then raise exception 'Invalid push address'; end if;
  delete from public.push_subscriptions where endpoint = target_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values ((select auth.uid()), target_endpoint, left(key_p256dh, 200), left(key_auth, 100), left(agent, 200));
end; $$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

-- 2. Private settings: where to send, and the shared secret ---------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.push_config (
  id integer primary key default 1 check (id = 1),
  endpoint_url text not null,
  secret text not null
);

-- The push route calls this to drop addresses that phones have given up (uninstalled, revoked).
create or replace function public.forget_push_subscription(target_endpoint text, push_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from private.push_config where id = 1 and secret = push_secret) then return; end if;
  delete from public.push_subscriptions where endpoint = target_endpoint;
end; $$;
revoke all on function public.forget_push_subscription(text, text) from public;
grant execute on function public.forget_push_subscription(text, text) to anon, authenticated;

-- 3. Send each new notification ------------------------------------------
create or replace function public.send_push_for_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  config private.push_config%rowtype;
  targets jsonb;
begin
  select * into config from private.push_config where id = 1;
  if not found then return new; end if;
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
    into targets from public.push_subscriptions where user_id = new.recipient_id;
  if targets is null then return new; end if;
  perform net.http_post(
    url := config.endpoint_url,
    body := jsonb_build_object(
      'notification', jsonb_build_object('id', new.id, 'kind', new.kind, 'message', new.message,
        'post_id', new.post_id, 'circle_id', new.circle_id, 'goal_id', to_jsonb(new) -> 'goal_id'),
      'actor', (select coalesce(nullif(full_name, ''), username) from public.profiles where id = new.actor_id),
      'circle', (select name from public.circles where id = new.circle_id),
      'subscriptions', targets),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', config.secret),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  return new; -- a push problem must never stop the notification itself
end; $$;
revoke all on function public.send_push_for_notification() from public, anon, authenticated;

drop trigger if exists notifications_send_push on public.notifications;
create trigger notifications_send_push after insert on public.notifications
for each row execute function public.send_push_for_notification();
