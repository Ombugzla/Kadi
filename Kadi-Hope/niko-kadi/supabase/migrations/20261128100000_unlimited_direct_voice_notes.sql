alter table public.direct_messages
  drop constraint if exists direct_messages_content_check;

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
      and voice_duration > 0
      and voice_path in (
        sender_id::text || '/' || recipient_id::text || '/' || client_id::text || '.webm',
        sender_id::text || '/' || recipient_id::text || '/' || client_id::text || '.m4a',
        sender_id::text || '/' || recipient_id::text || '/' || client_id::text || '.ogg'
      )
    )
  );

update storage.buckets
set file_size_limit = 52428800
where id = 'direct-message-voice';
