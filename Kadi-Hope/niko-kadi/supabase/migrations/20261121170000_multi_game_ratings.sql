create or replace function public.record_online_game_result(
  p_room_id uuid,
  p_winner_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game text;
  v_status text;
  v_winner_rp integer;
  v_total_gain integer := 0;
  v_transfer integer;
  v_loser record;
begin
  select room.game, room.status
  into v_game, v_status
  from public.game_rooms as room
  where room.id = p_room_id
  for update;
  if not found then raise exception 'Room not found'; end if;
  if v_game not in ('nk', 'ss') or v_status <> 'finished' then
    raise exception 'Only finished Niko Kadi and Special Sequence games affect the online leaderboard';
  end if;
  if not exists (
    select 1 from public.game_players
    where room_id = p_room_id and user_id = p_winner_user_id
  ) then
    raise exception 'Winner is not a player in this room';
  end if;
  if (select count(*) from public.game_players where room_id = p_room_id) < 2 then
    raise exception 'A ranked game must have at least two players';
  end if;

  insert into public.online_match_results (room_id, winner_user_id)
  values (p_room_id, p_winner_user_id)
  on conflict (room_id) do nothing;
  if not found then return; end if;

  insert into public.online_leaderboard (user_id)
  select player.user_id
  from public.game_players as player
  where player.room_id = p_room_id
  on conflict (user_id) do nothing;

  select rp into v_winner_rp
  from public.online_leaderboard
  where user_id = p_winner_user_id;

  for v_loser in
    select player.user_id, rating.rp
    from public.game_players as player
    join public.online_leaderboard as rating on rating.user_id = player.user_id
    where player.room_id = p_room_id
      and player.user_id <> p_winner_user_id
  loop
    v_transfer := greatest(
      1,
      least(
        4,
        round(2 * greatest(0.5, least(2.0, 1.0 + (v_loser.rp - v_winner_rp)::numeric / 200)))::integer
      )
    );
    v_transfer := least(v_transfer, v_loser.rp);
    v_total_gain := v_total_gain + v_transfer;

    update public.online_leaderboard
    set rp = rp - v_transfer,
        played = played + 1,
        losses = losses + 1,
        updated_at = now()
    where user_id = v_loser.user_id;
  end loop;

  update public.online_leaderboard
  set rp = rp + v_total_gain,
      played = played + 1,
      wins = wins + 1,
      updated_at = now()
  where user_id = p_winner_user_id;
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
  v_game text;
  v_winner_seat integer;
  v_winner_user_id uuid;
begin
  if p_status not in ('playing', 'finished') then
    raise exception 'Invalid game status';
  end if;

  select game into v_game
  from public.game_rooms
  where id = p_room_id and status = 'playing'
  for update;
  if not found then raise exception 'Room is not in progress'; end if;

  update public.game_states
  set state = p_state, version = p_expected_version + 1, updated_at = now()
  where room_id = p_room_id and version = p_expected_version
  returning version into v_version;
  if not found then return null; end if;

  update public.game_rooms
  set revision = v_version, status = p_status
  where id = p_room_id and status = 'playing';
  if not found then raise exception 'Room is not in progress'; end if;

  if p_status = 'finished' and v_game in ('nk', 'ss') then
    if coalesce(p_state #>> '{over,winner}', '') !~ '^[0-3]$' then
      raise exception 'Finished game has no valid winner';
    end if;
    v_winner_seat := (p_state #>> '{over,winner}')::integer;
    v_winner_user_id := (p_state #>> array['players', v_winner_seat::text, 'userId'])::uuid;
    if v_winner_user_id is null then raise exception 'Finished game has no winner account'; end if;
    perform public.record_online_game_result(p_room_id, v_winner_user_id);
  end if;

  return v_version;
end;
$$;

revoke all on function public.record_online_game_result(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_game_state(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.record_online_game_result(uuid, uuid) to service_role;
grant execute on function public.save_game_state(uuid, bigint, jsonb, text) to service_role;
