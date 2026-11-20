create table if not exists public.game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  game text not null check (game in ('nk', 'ss')),
  status text not null default 'waiting' check (status in ('waiting', 'starting', 'playing', 'finished')),
  is_public boolean not null default false,
  max_players smallint not null check (max_players between 2 and 4),
  host_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.game_players (
  room_id uuid not null references public.game_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null check (seat between 0 and 3),
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar jsonb,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat)
);

create table if not exists public.game_states (
  room_id uuid primary key references public.game_rooms(id) on delete cascade,
  version bigint not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists game_rooms_matchmaking_idx
  on public.game_rooms (game, created_at)
  where is_public and status = 'waiting';

create or replace function public.is_game_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.game_players
    where room_id = p_room_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_game_room_member(uuid) from public, anon;
grant execute on function public.is_game_room_member(uuid) to authenticated;

alter table public.game_rooms enable row level security;
alter table public.game_players enable row level security;
alter table public.game_states enable row level security;

revoke all on public.game_rooms, public.game_players, public.game_states from anon, authenticated;
grant select (id, code, game, status, is_public, max_players, revision, created_at)
  on public.game_rooms to authenticated;
grant select (room_id, seat, display_name, avatar, joined_at)
  on public.game_players to authenticated;
grant all on public.game_rooms, public.game_players, public.game_states to service_role;

drop policy if exists "Room members can read their rooms" on public.game_rooms;
create policy "Room members can read their rooms"
  on public.game_rooms for select to authenticated
  using (public.is_game_room_member(id));

drop policy if exists "Room members can read their seats" on public.game_players;
create policy "Room members can read their seats"
  on public.game_players for select to authenticated
  using (public.is_game_room_member(room_id));

create or replace function public.matchmake_game_room(
  p_game text,
  p_user_id uuid,
  p_display_name text,
  p_avatar jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_seat smallint;
begin
  if p_game not in ('nk', 'ss') then
    raise exception 'Unsupported game';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_game || ':2'));

  delete from public.game_rooms
  where status = 'waiting' and created_at < now() - interval '24 hours';

  select r.id into v_room_id
  from public.game_rooms r
  join public.game_players gp on gp.room_id = r.id
  where r.game = p_game
    and r.is_public
    and r.status = 'waiting'
    and gp.user_id = p_user_id
  order by r.created_at
  limit 1
  for update of r;

  if v_room_id is not null then
    return v_room_id;
  end if;

  select r.id into v_room_id
  from public.game_rooms r
  where r.game = p_game
    and r.is_public
    and r.status = 'waiting'
    and r.max_players = 2
    and r.created_at > now() - interval '15 minutes'
    and not exists (
      select 1 from public.game_players gp
      where gp.room_id = r.id and gp.user_id = p_user_id
    )
    and (select count(*) from public.game_players gp where gp.room_id = r.id) < r.max_players
  order by r.created_at
  limit 1
  for update skip locked;

  if v_room_id is null then
    insert into public.game_rooms (code, game, is_public, max_players, host_id)
    values (replace(gen_random_uuid()::text, '-', ''), p_game, true, 2, p_user_id)
    returning id into v_room_id;
    v_seat := 0;
  else
    select coalesce(max(seat) + 1, 0) into v_seat
    from public.game_players where room_id = v_room_id;
  end if;

  insert into public.game_players (room_id, user_id, seat, display_name, avatar)
  values (v_room_id, p_user_id, v_seat, p_display_name, p_avatar);

  return v_room_id;
end;
$$;

create or replace function public.join_game_room(
  p_code text,
  p_user_id uuid,
  p_display_name text,
  p_avatar jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.game_rooms%rowtype;
  v_seat smallint;
begin
  select * into v_room
  from public.game_rooms
  where code = upper(p_code) and not is_public
  for update;

  if not found or v_room.status <> 'waiting' then
    raise exception 'Room not found or no longer accepting players';
  end if;

  if exists (
    select 1 from public.game_players
    where room_id = v_room.id and user_id = p_user_id
  ) then
    return v_room.id;
  end if;

  select candidates.seat into v_seat
  from generate_series(0, v_room.max_players - 1) as candidates(seat)
  where not exists (
    select 1 from public.game_players gp
    where gp.room_id = v_room.id and gp.seat = candidates.seat
  )
  order by candidates.seat
  limit 1;
  if v_seat >= v_room.max_players then
    raise exception 'Room is full';
  end if;

  insert into public.game_players (room_id, user_id, seat, display_name, avatar)
  values (v_room.id, p_user_id, v_seat, p_display_name, p_avatar);

  return v_room.id;
end;
$$;

create or replace function public.claim_game_room_start(p_room_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.game_rooms%rowtype;
  v_players integer;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found or v_room.status <> 'waiting' then return false; end if;
  if not exists (
    select 1 from public.game_players
    where room_id = p_room_id and user_id = p_user_id
  ) then
    return false;
  end if;

  select count(*) into v_players from public.game_players where room_id = p_room_id;
  if v_players < 2 then return false; end if;
  if not (
    v_room.host_id = p_user_id
    or (v_room.is_public and v_players >= v_room.max_players)
  ) then
    return false;
  end if;

  update public.game_rooms set status = 'starting' where id = p_room_id;
  return true;
end;
$$;

create or replace function public.leave_game_room(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.game_rooms%rowtype;
begin
  select * into v_room from public.game_rooms where id = p_room_id for update;
  if not found or v_room.status <> 'waiting' then return; end if;

  if v_room.host_id = p_user_id then
    delete from public.game_rooms where id = p_room_id;
  else
    delete from public.game_players where room_id = p_room_id and user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.start_game_state(p_room_id uuid, p_state jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.game_states (room_id, version, state)
  values (p_room_id, 1, p_state);

  update public.game_rooms
  set status = 'playing', revision = 1
  where id = p_room_id and status = 'starting';
  if not found then raise exception 'Room is not starting'; end if;
  return 1;
end;
$$;

create or replace function public.save_game_state(
  p_room_id uuid,
  p_expected_version bigint,
  p_state jsonb,
  p_status text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version bigint;
begin
  if p_status not in ('playing', 'finished') then
    raise exception 'Invalid game status';
  end if;

  update public.game_states
  set state = p_state, version = p_expected_version + 1, updated_at = now()
  where room_id = p_room_id and version = p_expected_version
  returning version into v_version;
  if not found then return null; end if;

  update public.game_rooms
  set revision = v_version, status = p_status
  where id = p_room_id and status = 'playing';
  if not found then raise exception 'Room is not in progress'; end if;
  return v_version;
end;
$$;

revoke all on function public.matchmake_game_room(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.join_game_room(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.claim_game_room_start(uuid, uuid) from public, anon, authenticated;
revoke all on function public.leave_game_room(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_game_state(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.save_game_state(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.matchmake_game_room(text, uuid, text, jsonb) to service_role;
grant execute on function public.join_game_room(text, uuid, text, jsonb) to service_role;
grant execute on function public.claim_game_room_start(uuid, uuid) to service_role;
grant execute on function public.leave_game_room(uuid, uuid) to service_role;
grant execute on function public.start_game_state(uuid, jsonb) to service_role;
grant execute on function public.save_game_state(uuid, bigint, jsonb, text) to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_rooms'
  ) then
    alter publication supabase_realtime add table public.game_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_players'
  ) then
    alter publication supabase_realtime add table public.game_players;
  end if;
end;
$$;
