import { ensureOnlineSession, getSupabase } from './supabase-client.js';

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

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
  return {
    id: row.id,
    remoteId: row.id,
    clientId: row.client_id,
    from: row.sender_id === userId ? 'me' : 'them',
    text: row.body,
    t: timestamp,
    status: row.read_at ? 'read' : 'delivered',
    reactions: [],
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

export async function loadDirectThreads() {
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase.rpc('get_direct_message_threads');
  if (error) throw error;
  return { userId, threads: data || [] };
}

export async function loadDirectMessages(peerId) {
  if (!UUID.test(peerId)) throw new TypeError('Invalid player id.');
  const { supabase, userId } = await authenticatedClient();
  const { data, error } = await supabase
    .from('direct_messages')
    .select('id,client_id,sender_id,recipient_id,body,created_at,read_at')
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
    .select('id,client_id,sender_id,recipient_id,body,created_at,read_at')
    .single();
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
