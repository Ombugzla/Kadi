drop function if exists public.search_available_players(uuid, text);

create function public.search_available_players(
  p_user_id uuid,
  p_query text
)
returns table (user_id uuid, display_name text, avatar jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.user_id, profile.display_name, profile.avatar
  from public.player_profiles as profile
  join public.player_presence as presence on presence.user_id = profile.user_id
  where profile.user_id <> p_user_id
    and presence.last_seen_at >= statement_timestamp() - interval '90 seconds'
    and (
      coalesce(btrim(p_query), '') = ''
      or position(lower(btrim(p_query)) in lower(profile.display_name)) > 0
    )
  order by presence.last_seen_at desc;
$$;

revoke all on function public.search_available_players(uuid, text) from public, anon, authenticated;
grant execute on function public.search_available_players(uuid, text) to service_role;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 600),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id),
  unique (sender_id, client_id)
);

create index if not exists direct_messages_sender_recipient_created_idx
  on public.direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists direct_messages_recipient_created_idx
  on public.direct_messages (recipient_id, created_at desc);

alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from public, anon, authenticated;
grant select, insert on public.direct_messages to authenticated;
grant update (read_at) on public.direct_messages to authenticated;

create or replace function public.is_verified_player()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and email_confirmed_at is not null
      and is_anonymous is not true
  );
$$;

revoke all on function public.is_verified_player() from public, anon;
grant execute on function public.is_verified_player() to authenticated;

drop policy if exists "Participants can read direct messages" on public.direct_messages;
create policy "Participants can read direct messages"
  on public.direct_messages for select to authenticated
  using (public.is_verified_player() and (select auth.uid()) in (sender_id, recipient_id));

drop policy if exists "Players can send their own direct messages" on public.direct_messages;
create policy "Players can send their own direct messages"
  on public.direct_messages for insert to authenticated
  with check (
    public.is_verified_player()
    and
    sender_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
  );

drop policy if exists "Recipients can mark direct messages read" on public.direct_messages;
create policy "Recipients can mark direct messages read"
  on public.direct_messages for update to authenticated
  using (public.is_verified_player() and recipient_id = (select auth.uid()) and read_at is null)
  with check (public.is_verified_player() and recipient_id = (select auth.uid()) and read_at is not null);

create or replace function public.get_direct_message_threads()
returns table (
  peer_id uuid,
  display_name text,
  avatar jsonb,
  last_message_id uuid,
  last_message_client_id uuid,
  last_message_sender_id uuid,
  last_message_recipient_id uuid,
  last_message text,
  last_message_at timestamptz,
  last_message_read_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  with mine as (
    select
      case
        when message.sender_id = (select auth.uid()) then message.recipient_id
        else message.sender_id
      end as peer_id,
      message.id,
      message.client_id,
      message.sender_id,
      message.recipient_id,
      message.body,
      message.created_at,
      message.read_at,
      row_number() over (
        partition by case
          when message.sender_id = (select auth.uid()) then message.recipient_id
          else message.sender_id
        end
        order by message.created_at desc, message.id desc
      ) as message_rank
    from public.direct_messages as message
    where public.is_verified_player()
      and (
        message.sender_id = (select auth.uid())
        or message.recipient_id = (select auth.uid())
      )
  ),
  latest as (
    select * from mine where message_rank = 1
  ),
  unread as (
    select message.sender_id as peer_id, count(*) as message_count
    from public.direct_messages as message
    where message.recipient_id = (select auth.uid())
      and message.read_at is null
    group by message.sender_id
  )
  select
    latest.peer_id,
    profile.display_name,
    profile.avatar,
    latest.id,
    latest.client_id,
    latest.sender_id,
    latest.recipient_id,
    latest.body,
    latest.created_at,
    latest.read_at,
    coalesce(unread.message_count, 0)
  from latest
  join public.player_profiles as profile on profile.user_id = latest.peer_id
  left join unread on unread.peer_id = latest.peer_id
  order by latest.created_at desc;
$$;

revoke all on function public.get_direct_message_threads() from public, anon, authenticated;
grant execute on function public.get_direct_message_threads() to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'direct_messages'
     ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end
$$;
