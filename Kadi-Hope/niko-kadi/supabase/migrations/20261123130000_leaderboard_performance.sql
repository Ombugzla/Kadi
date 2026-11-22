create index if not exists online_leaderboard_standings_idx
  on public.online_leaderboard (rp desc, wins desc, played asc, user_id asc);

create or replace function public.get_online_leaderboard(p_user_id uuid)
returns table (
  rank bigint,
  display_name text,
  avatar jsonb,
  rp integer,
  played integer,
  wins integer,
  losses integer,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      rating.user_id,
      profile.display_name,
      profile.avatar,
      rating.rp,
      rating.played,
      rating.wins,
      rating.losses
    from public.online_leaderboard as rating
    join public.player_profiles as profile on profile.user_id = rating.user_id
    where rating.user_id = p_user_id
  ),
  top_players as (
    select
      rating.user_id,
      profile.display_name,
      profile.avatar,
      rating.rp,
      rating.played,
      rating.wins,
      rating.losses
    from public.online_leaderboard as rating
    join public.player_profiles as profile on profile.user_id = rating.user_id
    order by rating.rp desc, rating.wins desc, rating.played asc, rating.user_id asc
    limit 100
  ),
  ranked_top as (
    select
      row_number() over (order by top_players.rp desc, top_players.wins desc, top_players.played asc, top_players.user_id asc) as position,
      top_players.*
    from top_players
  ),
  my_rank as (
    select
      me.*,
      1 + (
        select count(*)
        from public.online_leaderboard as ahead
        join public.player_profiles as ahead_profile on ahead_profile.user_id = ahead.user_id
        where ahead.rp > me.rp
          or (ahead.rp = me.rp and ahead.wins > me.wins)
          or (ahead.rp = me.rp and ahead.wins = me.wins and ahead.played < me.played)
          or (ahead.rp = me.rp and ahead.wins = me.wins and ahead.played = me.played and ahead.user_id < me.user_id)
      ) as position
    from me
  )
  select
    ranked_top.position,
    ranked_top.display_name,
    ranked_top.avatar,
    ranked_top.rp,
    ranked_top.played,
    ranked_top.wins,
    ranked_top.losses,
    ranked_top.user_id = p_user_id
  from ranked_top
  union all
  select
    my_rank.position,
    my_rank.display_name,
    my_rank.avatar,
    my_rank.rp,
    my_rank.played,
    my_rank.wins,
    my_rank.losses,
    true
  from my_rank
  where my_rank.position > 100
  order by 1;
$$;

revoke all on function public.get_online_leaderboard(uuid) from public, anon, authenticated;
grant execute on function public.get_online_leaderboard(uuid) to service_role;
