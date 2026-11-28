import { ensureOnlineSession, getSupabase } from './supabase-client.js';

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const VOICE_BUCKET = 'direct-message-voice';
const MESSAGE_COLUMNS = 'id,client_id,sender_id,recipient_id,body,created_at,read_at,voice_path,voice_duration';

export function directChatId(userId) {
  if (!UUID.test(userId)) throw new TypeError('Invalid player id.');
  return `player_${userId}`;
}

export function mapDirectMessage(row, userId) {
  if (!UUID.test(row?.id) || !UUID.test(row.client_id) || !UUID.test(userId) || ![row.sender_id, row.recipient_id].includes(userId)) {
    throw new TypeError('Invalid direct message.');
  }
  const timestamp = Date.parse(row.created_at);
  if (!Number.isFinite(timestamp) || typeof row.body !== 'string') {
    throw new TypeError('Invalid direct message.');
  }
  const voice = row.voice_path
    ? { path: row.voice_path, dur: Number(row.voice_duration) }
    : null;
  if (voice && (!Number.isInteger(voice.dur) || voice.dur < 1 || voice.dur > 60)) {
    throw new TypeError('Invalid direct message.');
  }
  return {
    id: row.id,
    remoteId: row.id,
    clientId: row.client_id,
    from: row.sender_id === userId ? 'me' : 'them',
    text: row.body,
    t: timestamp,
    status: row.read_at ? 'read' : 'delivered',
    reactions: [],
    ...(voice ? { voice } : {}),
  };
}

export function mapRegisteredPlayer(row) {
  if (!UUID.test(row?.user_id) || typeof row.display_name !== 'string'
      || !['friend', 'incoming', 'outgoing', 'none'].includes(row.relationship)
      || (['incoming', 'outgoing'].includes(row.relationship) && !UUID.test(row.request_id))) {
    throw new TypeError('Invalid player profile.');
  }
  return {
    userId: row.user_id,
    name: row.display_name,
    avatar: row.avatar || null,
    relationship: row.relationship,
    requestId: row.request_id || null,
  };
}

async function authenticatedClient() {
  const session = await ensureOnlineSession();
  const supabase = await getSupabase();
  return { supabase, userId: session.user.id };
}

export async function currentDirectUserId() {
  const session = await ensureOnlineSession();
  return session.user.id;
}

export async function syncPlayerProfile(displayName, avatar) {
  const name = typeof displayName === 'string'
    ? displayName.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 24)
    : '';
  if (!name) throw new RangeError('Choose a display name before searching for friends.');
  const remoteAvatar = avatar && typeof avatar === 'object' && !Array.isArray(avatar)
    ? typeof avatar.photo === 'string' && /^[a-z0-9_-]{1,24}$/i.test(avatar.photo)
      ? { photo: avatar.photo }
      : typeof avatar.obj === 'string' && /^[a-z0-9_-]{1,24}$/i.test(avatar.obj)
        ? { obj: avatar.obj }
        : null
    : null;
  const { supabase, userId } = await authenticatedClient();
  const { error } = await supabase.rpc('sync_player_profile', {
    p_display_name: name,
    p_avatar: remoteAvatar,
  });
  if (error) throw error;
  return userId;
}

export async function loadDirectThreads() {
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase.rpc('get_direct_message_threads');
  if (error) throw error;
  return { userId, threads: data || [] };
}

export async function searchRegisteredPlayers(query = '') {
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase.rpc('search_registered_players', {
    p_query: typeof query === 'string' ? query.trim().slice(0, 24) : '',
  });
  if (error) throw error;
  const players = (data || []).map(mapRegisteredPlayer);
  return { userId, players };
}

export async function sendFriendRequest(peerId) {
  if (!UUID.test(peerId)) throw new TypeError('Invalid player id.');
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.rpc('send_player_friend_request', {
    p_recipient_id: peerId,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || !['friend', 'incoming', 'pending'].includes(result.status)
      || (result.status !== 'friend' && !UUID.test(result.request_id))) {
    throw new TypeError('Invalid friend request response.');
  }
  return { status: result.status, requestId: result.request_id || null };
}

export async function respondToFriendRequest(requestId, accept) {
  if (!UUID.test(requestId)) throw new TypeError('Invalid friend request.');
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase.rpc('respond_to_player_friend_request', {
    p_request_id: requestId,
    p_accept: !!accept,
  });
  if (error) throw error;
  if (data !== 'accepted' && data !== 'declined') {
    throw new TypeError('Invalid friend request response.');
  }
  return data;
}

export async function loadFriendRequests() {
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase.rpc('list_player_friend_requests');
  if (error) throw error;
  const requests = (data || []).map((row) => {
    if (!UUID.test(row.request_id) || !UUID.test(row.peer_id)
        || typeof row.display_name !== 'string'
        || !['incoming', 'outgoing'].includes(row.direction)) {
      throw new TypeError('Invalid friend request.');
    }
    return {
      id: row.request_id,
      peerId: row.peer_id,
      name: row.display_name,
      avatar: row.avatar || null,
      direction: row.direction,
      createdAt: row.created_at,
    };
  });
  return { userId, incoming: requests.filter((request) => request.direction === 'incoming'), outgoing: requests.filter((request) => request.direction === 'outgoing') };
}

export async function loadDirectMessages(peerId) {
  if (!UUID.test(peerId)) throw new TypeError('Invalid player id.');
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase
    .from('direct_messages')
    .select(MESSAGE_COLUMNS)
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(200);
  if (error) throw error;
  return { userId, messages: (data || []).reverse() };
}

export async function sendDirectMessage(peerId, body, clientId) {
  if (!UUID.test(peerId)) throw new TypeError('Invalid player id.');
  if (!UUID.test(clientId)) throw new TypeError('Invalid message id.');
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text || text.length > 600) throw new RangeError('Messages must be 1–600 characters.');
  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ client_id: clientId, recipient_id: peerId, body: text })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function sendDirectVoice(peerId, blob, duration, clientId) {
  if (!UUID.test(peerId)) throw new TypeError('Invalid player id.');
  if (!UUID.test(clientId)) throw new TypeError('Invalid message id.');
  if (typeof Blob === 'undefined' || !(blob instanceof Blob) || !blob.size || blob.size > 4_194_304) {
    throw new RangeError('Voice recordings must be smaller than 4 MB.');
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
    throw new RangeError('Voice recordings must be 1–60 seconds long.');
  }
  const mimeType = blob.type.split(';', 1)[0].toLowerCase();
  const extension = voiceFileExtension(blob.type);

  const { supabase, userId } = await authenticatedClient();
  const { data: existing, error: lookupError } = await supabase
    .from('direct_messages')
    .select(MESSAGE_COLUMNS)
    .eq('sender_id', userId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing;

  const path = `${userId}/${peerId}/${clientId}.${extension}`;
  const storage = supabase.storage.from(VOICE_BUCKET);
  const { error: uploadError } = await storage.upload(path, blob, {
    cacheControl: '3600',
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      client_id: clientId,
      recipient_id: peerId,
      body: '',
      voice_path: path,
      voice_duration: duration,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) {
    const { data: committed, error: lookupError } = await supabase
      .from('direct_messages')
      .select(MESSAGE_COLUMNS)
      .eq('sender_id', userId)
      .eq('client_id', clientId)
      .maybeSingle();
    if (lookupError) console.error('Could not reconcile a voice message send:', lookupError);
    if (committed) return committed;

    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) console.error('Could not clean up an unsent voice recording:', cleanupError);
    throw error;
  }
  return data;
}

export function voiceFileExtension(type) {
  const mimeType = typeof type === 'string' ? type.split(';', 1)[0].trim().toLowerCase() : '';
  const extensions = { 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg' };
  const extension = extensions[mimeType];
  if (!extension) throw new TypeError('This browser produced an unsupported voice format.');
  return extension;
}

export async function loadDirectVoice(peerId, path) {
  if (!UUID.test(peerId)) throw new TypeError('Invalid player id.');
  if (typeof path !== 'string') throw new TypeError('Invalid voice recording path.');
  const { supabase, userId } = await authenticatedClient();
  const prefixes = [`${userId}/${peerId}/`, `${peerId}/${userId}/`];
  const prefix = prefixes.find((value) => path.startsWith(value));
  const filename = prefix ? path.slice(prefix.length) : '';
  if (!UUID.test(filename.replace(/\.(?:webm|m4a|ogg)$/, '')) || !/\.(?:webm|m4a|ogg)$/.test(filename)) {
    throw new TypeError('Invalid voice recording path.');
  }
  const { data, error } = await supabase.storage.from(VOICE_BUCKET).download(path);
  if (error) throw error;
  return data;
}

export async function markDirectMessagesRead(peerId) {
  if (!UUID.test(peerId)) throw new TypeError('Invalid player id.');
  const { supabase, userId } = await authenticatedClient();
  const { error } = await supabase
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', peerId)
    .eq('recipient_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

export async function watchDirectMessages(userId, { onMessage, onRead, onError }) {
  if (!UUID.test(userId)) throw new TypeError('Invalid player id.');
  const { supabase, userId: signedInUserId } = await authenticatedClient();
  if (signedInUserId !== userId) throw new Error('The active account changed.');
  return new Promise((resolve, reject) => {
    let settled = false;
    const channel = supabase.channel(`direct-messages:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${userId}`,
      }, ({ new: row }) => onMessage(row))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
        filter: `sender_id=eq.${userId}`,
      }, ({ new: row }) => onRead(row))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !settled) {
          settled = true;
          resolve(() => {
            void supabase.removeChannel(channel).catch((error) => {
              console.error('Could not close the friend messages connection:', error);
            });
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const error = new Error('Friend messages lost their live connection.');
          if (!settled) {
            settled = true;
            void supabase.removeChannel(channel).catch((closeError) => {
              console.error('Could not close the friend messages connection:', closeError);
            });
            reject(error);
          } else {
            onError(error);
          }
        }
      });
  });
}

export async function watchFriendRequests(userId, { onChange, onError }) {
  if (!UUID.test(userId)) throw new TypeError('Invalid player id.');
  const { supabase, userId: signedInUserId } = await authenticatedClient();
  if (signedInUserId !== userId) throw new Error('The active account changed.');
  return new Promise((resolve, reject) => {
    let settled = false;
    const channel = supabase.channel(`friend-requests:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_friend_requests',
        filter: `recipient_id=eq.${userId}`,
      }, onChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_friend_requests',
        filter: `requester_id=eq.${userId}`,
      }, onChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !settled) {
          settled = true;
          resolve(() => {
            void supabase.removeChannel(channel).catch((error) => {
              console.error('Could not close the friend requests connection:', error);
            });
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const error = new Error('Friend requests lost their live connection.');
          if (!settled) {
            settled = true;
            void supabase.removeChannel(channel).catch((closeError) => {
              console.error('Could not close the friend requests connection:', closeError);
            });
            reject(error);
          } else {
            onError(error);
          }
        }
      });
  });
}
