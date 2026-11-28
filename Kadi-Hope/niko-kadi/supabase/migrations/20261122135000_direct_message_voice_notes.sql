alter table public.direct_messages
  add column if not exists voice_path text,
  add column if not exists voice_duration integer;

alter table public.direct_messages
  drop constraint if exists direct_messages_body_check;

alter table public.direct_messages
  add constraint direct_messages_content_check
  check (
    (
      voice_path is null
      and voice_duration is null
      and char_length(btrim(body)) between 1 and 600
    )
    or (
      body = ''
      and voice_path is not null
      and voice_duration is not null
      and voice_duration between 1 and 60
      and voice_path in (
        sender_id::text || '/' || recipient_id::text || '/' || client_id::text || '.webm',
        sender_id::text || '/' || recipient_id::text || '/' || client_id::text || '.m4a',
        sender_id::text || '/' || recipient_id::text || '/' || client_id::text || '.ogg'
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'direct-message-voice',
  'direct-message-voice',
  false,
  4194304,
  array['audio/webm', 'audio/mp4', 'audio/ogg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Participants can read direct message voice" on storage.objects;
create policy "Participants can read direct message voice"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'direct-message-voice'
    and exists (
      select 1
      from public.direct_messages as message
      where message.voice_path = storage.objects.name
        and (select auth.uid()) in (message.sender_id, message.recipient_id)
    )
  );

drop policy if exists "Players can upload their direct message voice" on storage.objects;
create policy "Players can upload their direct message voice"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'direct-message-voice'
    and public.is_verified_player()
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Players can remove unattached direct message voice" on storage.objects;
create policy "Players can remove unattached direct message voice"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'direct-message-voice'
    and public.is_verified_player()
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1
      from public.direct_messages as message
      where message.voice_path = storage.objects.name
    )
  );

drop function public.get_direct_message_threads();

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
    latest.voice_path,
    latest.voice_duration,
    coalesce(unread.message_count, 0)
  from latest
  join public.player_profiles as profile on profile.user_id = latest.peer_id
  left join unread on unread.peer_id = latest.peer_id
  order by latest.created_at desc;
$$;

revoke all on function public.get_direct_message_threads() from public, anon, authenticated;
grant execute on function public.get_direct_message_threads() to authenticated;
