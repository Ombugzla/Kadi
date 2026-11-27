create table if not exists public.clerk_user_links (
  clerk_user_id text primary key check (clerk_user_id ~ '^user_[A-Za-z0-9]+$'),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clerk_user_links enable row level security;
revoke all on public.clerk_user_links from public, anon, authenticated;
grant all on public.clerk_user_links to service_role;

create or replace function public.current_app_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_subject text := auth.jwt() ->> 'sub';
begin
  if v_subject is null then
    return null;
  end if;

  if v_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_subject::uuid;
  end if;

  return (
    select link.auth_user_id
    from public.clerk_user_links as link
    where link.clerk_user_id = v_subject
  );
end;
$$;

revoke all on function public.current_app_user_id() from public, anon;
grant execute on function public.current_app_user_id() to authenticated, service_role;

create or replace function public.find_auth_user_id_for_clerk_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select account.id
  from auth.users as account
  where lower(account.email) = lower(btrim(p_email))
    and account.is_anonymous is not true
  limit 1;
$$;

revoke all on function public.find_auth_user_id_for_clerk_email(text) from public, anon, authenticated;
grant execute on function public.find_auth_user_id_for_clerk_email(text) to service_role;

create or replace function public.link_clerk_identity(
  p_clerk_user_id text,
  p_auth_user_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid;
begin
  if p_clerk_user_id is null
     or p_clerk_user_id !~ '^user_[A-Za-z0-9]+$'
     or p_auth_user_id is null
     or nullif(btrim(p_email), '') is null then
    raise exception 'Invalid Clerk identity link.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from auth.users as account
    where account.id = p_auth_user_id
      and lower(account.email) = lower(btrim(p_email))
      and account.email_confirmed_at is not null
      and account.is_anonymous is not true
  ) then
    raise exception 'A verified matching account is required.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.clerk_user_links as link
    where link.auth_user_id = p_auth_user_id
      and link.clerk_user_id <> p_clerk_user_id
  ) then
    raise exception 'This game account is already linked to another Clerk account.' using errcode = '23505';
  end if;

  insert into public.clerk_user_links (clerk_user_id, auth_user_id, email)
  values (p_clerk_user_id, p_auth_user_id, lower(btrim(p_email)))
  on conflict (clerk_user_id) do update
    set email = excluded.email,
        updated_at = statement_timestamp()
    where public.clerk_user_links.auth_user_id = excluded.auth_user_id
  returning auth_user_id into v_user_id;

  if v_user_id is null then
    raise exception 'This Clerk account is already linked to a different game account.' using errcode = '23505';
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.link_clerk_identity(text, uuid, text) from public, anon, authenticated;
grant execute on function public.link_clerk_identity(text, uuid, text) to service_role;

create or replace function public.resolve_clerk_auth_user(p_clerk_user_id text)
returns uuid
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select link.auth_user_id
  from public.clerk_user_links as link
  where link.clerk_user_id = p_clerk_user_id;
$$;

revoke all on function public.resolve_clerk_auth_user(text) from public, anon, authenticated;
grant execute on function public.resolve_clerk_auth_user(text) to service_role;

alter table public.direct_messages
  alter column sender_id set default public.current_app_user_id();

do $$
declare
  v_function record;
  v_definition text;
  v_policy record;
  v_roles text;
  v_statement text;
begin
  for v_function in
    select p.oid
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    join pg_language as l on l.oid = p.prolang
    where n.nspname = 'public'
      and p.prokind = 'f'
      and l.lanname in ('sql', 'plpgsql')
      and pg_get_functiondef(p.oid) like '%auth.uid()%'
  loop
    v_definition := pg_get_functiondef(v_function.oid);
    execute replace(v_definition, 'auth.uid()', 'public.current_app_user_id()');
  end loop;

  for v_policy in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    select string_agg(quote_ident(role_name::text), ', ')
    into v_roles
    from unnest(v_policy.roles) as role_names(role_name);

    execute format(
      'drop policy %I on %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );

    v_statement := format(
      'create policy %I on %I.%I as %s for %s to %s',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename,
      lower(v_policy.permissive),
      v_policy.cmd,
      v_roles
    );

    if v_policy.qual is not null then
      v_statement := v_statement || format(
        ' using (%s)',
        replace(v_policy.qual, 'auth.uid()', 'public.current_app_user_id()')
      );
    end if;

    if v_policy.with_check is not null then
      v_statement := v_statement || format(
        ' with check (%s)',
        replace(v_policy.with_check, 'auth.uid()', 'public.current_app_user_id()')
      );
    end if;

    execute v_statement;
  end loop;
end;
$$;
