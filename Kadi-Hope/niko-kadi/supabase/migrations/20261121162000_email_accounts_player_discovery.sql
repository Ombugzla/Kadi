create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  avatar jsonb
);

create table if not exists public.player_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.player_profiles enable row level security;
alter table public.player_presence enable row level security;
revoke all on public.player_profiles from public, anon, authenticated;
revoke all on public.player_presence from public, anon, authenticated;
grant all on public.player_profiles to service_role;
grant all on public.player_presence to service_role;

create index if not exists player_presence_available_idx
  on public.player_presence (last_seen_at desc);

create or replace function public.search_available_players(
  p_user_id uuid,
  p_query text
)
returns table (display_name text, avatar jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.display_name, profile.avatar
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
