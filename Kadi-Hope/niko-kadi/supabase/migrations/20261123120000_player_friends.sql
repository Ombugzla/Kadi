create table if not exists public.player_friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create index if not exists player_friend_requests_recipient_status_idx
  on public.player_friend_requests (recipient_id, status, created_at desc);
create index if not exists player_friend_requests_requester_status_idx
  on public.player_friend_requests (requester_id, status, created_at desc);

create table if not exists public.player_friends (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);

create or replace function public.handle_new_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Player'
  );
  insert into public.player_profiles (user_id, display_name, avatar)
  values (new.id, left(v_name, 24), null)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_player_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_player_profile on auth.users;
create trigger on_auth_user_created_player_profile
  after insert on auth.users
  for each row execute function public.handle_new_player_profile();

insert into public.player_profiles (user_id, display_name, avatar)
select
  account.id,
  left(coalesce(
    nullif(btrim(account.raw_user_meta_data ->> 'username'), ''),
    nullif(btrim(account.raw_user_meta_data ->> 'preferred_username'), ''),
    nullif(btrim(account.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(account.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(account.email, ''), '@', 1), ''),
    'Player'
  ), 24),
  null
from auth.users as account
where account.is_anonymous is not true
on conflict (user_id) do nothing;

alter table public.player_friend_requests enable row level security;
alter table public.player_friends enable row level security;
revoke all on public.player_friend_requests from public, anon, authenticated;
revoke all on public.player_friends from public, anon, authenticated;
grant select on public.player_friend_requests to authenticated;

create policy "Players can read their friend requests"
  on public.player_friend_requests for select to authenticated
  using (
    public.is_verified_player()
    and (select auth.uid()) in (requester_id, recipient_id)
  );

create or replace function public.is_player_friend(p_peer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select public.is_verified_player()
    and p_peer_id <> (select auth.uid())
    and exists (
      select 1
      from public.player_friends as friend
      where friend.user_low = least((select auth.uid()), p_peer_id)
        and friend.user_high = greatest((select auth.uid()), p_peer_id)
    );
$$;

revoke all on function public.is_player_friend(uuid) from public, anon;
grant execute on function public.is_player_friend(uuid) to authenticated;

create or replace function public.sync_player_profile(p_display_name text, p_avatar jsonb)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_name text := btrim(coalesce(p_display_name, ''));
begin
  if not public.is_verified_player() then
    raise exception 'A verified account is required.' using errcode = '42501';
  end if;
  if char_length(v_name) not between 1 and 24 then
    raise exception 'Display name must be 1-24 characters.' using errcode = '22023';
  end if;

  insert into public.player_profiles (user_id, display_name, avatar)
  values (
    (select auth.uid()),
    v_name,
    case when jsonb_typeof(p_avatar) = 'object' then p_avatar else null end
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        avatar = excluded.avatar;
end;
$$;

revoke all on function public.sync_player_profile(text, jsonb) from public, anon;
grant execute on function public.sync_player_profile(text, jsonb) to authenticated;

create or replace function public.search_registered_players(p_query text)
returns table (
  user_id uuid,
  display_name text,
  avatar jsonb,
  relationship text,
  request_id uuid
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    profile.user_id,
    profile.display_name,
    profile.avatar,
    case
      when friend.user_low is not null then 'friend'
      when incoming.id is not null then 'incoming'
      when outgoing.id is not null then 'outgoing'
      else 'none'
    end,
    coalesce(incoming.id, outgoing.id)
  from public.player_profiles as profile
  join auth.users as account
    on account.id = profile.user_id
    and account.email_confirmed_at is not null
    and account.is_anonymous is not true
  left join public.player_friends as friend
    on friend.user_low = least((select auth.uid()), profile.user_id)
    and friend.user_high = greatest((select auth.uid()), profile.user_id)
  left join public.player_friend_requests as incoming
    on incoming.requester_id = profile.user_id
    and incoming.recipient_id = (select auth.uid())
    and incoming.status = 'pending'
  left join public.player_friend_requests as outgoing
    on outgoing.requester_id = (select auth.uid())
    and outgoing.recipient_id = profile.user_id
    and outgoing.status = 'pending'
  where public.is_verified_player()
    and profile.user_id <> (select auth.uid())
    and (
      coalesce(btrim(p_query), '') = ''
      or position(lower(btrim(p_query)) in lower(profile.display_name)) > 0
    )
  order by lower(profile.display_name), profile.user_id
  limit 100;
$$;

revoke all on function public.search_registered_players(text) from public, anon;
grant execute on function public.search_registered_players(text) to authenticated;

create or replace function public.send_player_friend_request(p_recipient_id uuid)
returns table (status text, request_id uuid)
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_request_id uuid;
begin
  if not public.is_verified_player() then
    raise exception 'A verified account is required.' using errcode = '42501';
  end if;
  if p_recipient_id is null or p_recipient_id = v_user_id then
    raise exception 'Choose another player.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.player_profiles as profile
    join auth.users as account
      on account.id = profile.user_id
      and account.email_confirmed_at is not null
      and account.is_anonymous is not true
    where profile.user_id = p_recipient_id
  ) then
    raise exception 'Player account not found.' using errcode = 'P0002';
  end if;
  if public.is_player_friend(p_recipient_id) then
    return query select 'friend'::text, null::uuid;
    return;
  end if;

  select request.id into v_request_id
  from public.player_friend_requests as request
  where request.requester_id = p_recipient_id
    and request.recipient_id = v_user_id
    and request.status = 'pending'
  limit 1;
  if v_request_id is not null then
    return query select 'incoming'::text, v_request_id;
    return;
  end if;

  select request.id into v_request_id
  from public.player_friend_requests as request
  where request.requester_id = v_user_id
    and request.recipient_id = p_recipient_id
    and request.status = 'pending'
  limit 1;
  if v_request_id is not null then
    return query select 'pending'::text, v_request_id;
    return;
  end if;

  insert into public.player_friend_requests (requester_id, recipient_id, status, created_at, responded_at)
  values (v_user_id, p_recipient_id, 'pending', statement_timestamp(), null)
  on conflict (requester_id, recipient_id) do update
    set status = 'pending',
        created_at = statement_timestamp(),
        responded_at = null
  returning id into v_request_id;

  return query select 'pending'::text, v_request_id;
end;
$$;

revoke all on function public.send_player_friend_request(uuid) from public, anon;
grant execute on function public.send_player_friend_request(uuid) to authenticated;

create or replace function public.respond_to_player_friend_request(p_request_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_requester_id uuid;
  v_status text;
begin
  if not public.is_verified_player() then
    raise exception 'A verified account is required.' using errcode = '42501';
  end if;

  select request.requester_id into v_requester_id
  from public.player_friend_requests as request
  where request.id = p_request_id
    and request.recipient_id = v_user_id
    and request.status = 'pending'
  for update;
  if v_requester_id is null then
    raise exception 'Friend request not found.' using errcode = 'P0002';
  end if;

  if coalesce(p_accept, false) then
    insert into public.player_friends (user_low, user_high)
    values (least(v_user_id, v_requester_id), greatest(v_user_id, v_requester_id))
    on conflict do nothing;
    v_status := 'accepted';
  else
    v_status := 'declined';
  end if;

  update public.player_friend_requests
  set status = v_status, responded_at = statement_timestamp()
  where id = p_request_id;

  if v_status = 'accepted' then
    update public.player_friend_requests
    set status = 'accepted', responded_at = statement_timestamp()
    where requester_id = v_user_id
      and recipient_id = v_requester_id
      and status = 'pending';
  end if;
  return v_status;
end;
$$;

revoke all on function public.respond_to_player_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_player_friend_request(uuid, boolean) to authenticated;

create or replace function public.list_player_friend_requests()
returns table (
  request_id uuid,
  peer_id uuid,
  display_name text,
  avatar jsonb,
  direction text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select requests.request_id, requests.peer_id, profile.display_name, profile.avatar, requests.direction, requests.created_at
  from (
    select request.id as request_id, request.requester_id as peer_id, 'incoming'::text as direction, request.created_at
    from public.player_friend_requests as request
    where request.recipient_id = (select auth.uid()) and request.status = 'pending'
    union all
    select request.id as request_id, request.recipient_id as peer_id, 'outgoing'::text as direction, request.created_at
    from public.player_friend_requests as request
    where request.requester_id = (select auth.uid()) and request.status = 'pending'
  ) as requests
  join public.player_profiles as profile on profile.user_id = requests.peer_id
  where public.is_verified_player()
  order by requests.created_at desc
  limit 100;
$$;

revoke all on function public.list_player_friend_requests() from public, anon;
grant execute on function public.list_player_friend_requests() to authenticated;

drop policy if exists "Players can send their own direct messages" on public.direct_messages;
create policy "Friends can send direct messages"
  on public.direct_messages for insert to authenticated
  with check (
    public.is_verified_player()
    and sender_id = (select auth.uid())
    and public.is_player_friend(recipient_id)
  );

drop policy if exists "Players can upload their direct message voice" on storage.objects;
create policy "Friends can upload their direct message voice"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'direct-message-voice'
    and public.is_verified_player()
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
    and public.is_player_friend(((storage.foldername(name))[2])::uuid)
  );

drop function if exists public.get_direct_message_threads();

create function public.get_direct_message_threads()
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
  last_message_voice_path text,
  last_message_voice_duration integer,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  with my_friends as (
    select
      case
        when friend.user_low = (select auth.uid()) then friend.user_high
        else friend.user_low
      end as peer_id
    from public.player_friends as friend
    where public.is_verified_player()
      and (friend.user_low = (select auth.uid()) or friend.user_high = (select auth.uid()))
  ),
  mine as (
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
      message.voice_path,
      message.voice_duration,
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
      and exists (
        select 1
        from my_friends as friend
        where friend.peer_id = case
          when message.sender_id = (select auth.uid()) then message.recipient_id
          else message.sender_id
        end
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
      and exists (select 1 from my_friends as friend where friend.peer_id = message.sender_id)
    group by message.sender_id
  ),
  peers as (
    select peer_id from my_friends
    union
    select peer_id from latest
  )
  select
    peers.peer_id,
    profile.display_name,
    profile.avatar,
    latest.id,
    latest.client_id,
    latest.sender_id,
    latest.recipient_id,
    latest.body,
    latest.created_at,
    latest.read_at,
    latest.voice_path,
    latest.voice_duration,
    coalesce(unread.message_count, 0)
  from peers
  join public.player_profiles as profile on profile.user_id = peers.peer_id
  left join latest on latest.peer_id = peers.peer_id
  left join unread on unread.peer_id = peers.peer_id
  where public.is_verified_player()
  order by latest.created_at desc nulls last, profile.display_name;
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
         and tablename = 'player_friend_requests'
     ) then
    alter publication supabase_realtime add table public.player_friend_requests;
  end if;
end
$$;
