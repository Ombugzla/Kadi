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
  where is_public
    and status = 'waiting'
    and created_at < now() - interval '24 hours';

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

revoke all on function public.matchmake_game_room(text, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.matchmake_game_room(text, uuid, text, jsonb) to service_role;
