import { createClient } from 'npm:@supabase/supabase-js@2';
import * as E from '../../../www/js/engine.js';
import { newSeqGame, seqPick, seqDispose } from '../../../www/js/sequence.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function cleanProfile(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 24) : '';
  if (!name) throw new Error('Choose a display name before playing online.');
  const avatar = body.avatar && typeof body.avatar === 'object' && !Array.isArray(body.avatar)
    ? body.avatar as Record<string, unknown>
    : {};
  const safeAvatar = typeof avatar.photo === 'string' && /^[a-z0-9_-]{1,24}$/i.test(avatar.photo)
    ? { photo: avatar.photo }
    : typeof avatar.obj === 'string' && /^[a-z0-9_-]{1,24}$/i.test(avatar.obj)
      ? { obj: avatar.obj }
      : null;
  return { name, avatar: safeAvatar };
}

function databaseErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

function operationErrorMessage(operation: string, error: unknown) {
  const code = databaseErrorCode(error);
  if (['42P01', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code || '')) {
    return `Online ${operation} is missing database setup. Apply the latest Supabase migrations and redeploy online-game.`;
  }
  if (code === '42501') {
    return `Online ${operation} is blocked by database permissions. Apply the latest Supabase migrations and redeploy online-game.`;
  }
  return `Online ${operation} failed${code ? ` (${code})` : ''}. Check the Supabase online-game function logs.`;
}

function redactState(state: Record<string, any>, seat: number) {
  const view = structuredClone(state);
  delete view.seed;
  view.players.forEach((player: Record<string, any>, index: number) => {
    delete player.userId;
    if (index !== seat) player.hand = player.hand.map(() => -1);
  });
  if (Array.isArray(view.draw)) view.draw = view.draw.map(() => -1);
  if (Array.isArray(view.dead)) view.dead = view.dead.map(() => -1);
  return view;
}

function applyNikoAction(state: Record<string, any>, action: Record<string, any>) {
  switch (action.type) {
    case 'place': return E.place(state, action.cards, action.opts || {});
    case 'take': return E.take(state);
    case 'pass': return E.pass(state);
    case 'accept': return E.accept(state);
    case 'declare': return E.declare(state);
    default: return { ok: false, reason: 'Unsupported move.' };
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in to play online.' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publishableKey || !serviceKey) return json({ error: 'Online game server is not configured.' }, 503);

  const authClient = createClient(url, publishableKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: 'Your online session has expired. Reconnect and try again.' }, 401);
  if (user.is_anonymous === true || !user.email || !user.email_confirmed_at) {
    return json({ error: 'Verify your email address to use online play.' }, 403);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let body: Record<string, any>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 32000) return json({ error: 'Request is too large.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Request must be valid JSON.' }, 400);
  }

  const operation = typeof body.op === 'string' ? body.op : 'request';
  let profile: ReturnType<typeof cleanProfile>;
  try {
    profile = cleanProfile(body);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid player profile.' }, 400);
  }

  try {
    const op = body.op;
    const { error: profileError } = await admin.from('player_profiles').upsert({
      user_id: user.id,
      display_name: profile.name,
      avatar: profile.avatar,
    }, { onConflict: 'user_id' });
    if (profileError) throw profileError;

    if (op === 'presence' || op === 'searchPlayers') {
      const { error: presenceError } = await admin.from('player_presence').upsert({
        user_id: user.id,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (presenceError) throw presenceError;
      if (op === 'presence') return json({ ok: true });

      const query = typeof body.query === 'string' ? body.query.trim().slice(0, 24) : '';
      const { data: players, error: searchError } = await admin.rpc('search_available_players', {
        p_user_id: user.id,
        p_query: query,
      });
      if (searchError) throw searchError;
      return json({
        ok: true,
        players: (players || []).map((player: any) => ({
          name: player.display_name,
          avatar: player.avatar,
        })),
      });
    }

    if (op === 'leaderboard') {
      const { error: ratingError } = await admin.from('online_leaderboard').upsert(
        { user_id: user.id },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
      if (ratingError) throw ratingError;
      const { data: standings, error: standingsError } = await admin.rpc('get_online_leaderboard', {
        p_user_id: user.id,
      });
      if (standingsError) throw standingsError;
      return json({
        ok: true,
        standings: (standings || []).map((standing: any) => ({
          rank: standing.rank,
          name: standing.display_name,
          avatar: standing.avatar,
          rp: standing.rp,
          played: standing.played,
          wins: standing.wins,
          losses: standing.losses,
          isMe: standing.is_me,
        })),
      });
    }

    if (op === 'matchmake') {
      if (!['nk', 'ss'].includes(body.game)) return json({ error: 'Unsupported game.' }, 400);
      await pruneOldRooms(admin);
      const { data: roomId, error } = await admin.rpc('matchmake_game_room', {
        p_game: body.game,
        p_user_id: user.id,
        p_display_name: profile.name,
        p_avatar: profile.avatar,
      });
      if (error) throw error;
      await maybeStartPublicRoom(admin, roomId);
      return await roomResponse(admin, roomId, user.id);
    }

    if (op === 'create') {
      if (!['nk', 'ss'].includes(body.game) || ![2, 3, 4].includes(body.maxPlayers)) {
        return json({ error: 'Invalid room settings.' }, 400);
      }
      await pruneOldRooms(admin);
      const { data: ownedRooms, error: ownedError } = await admin.from('game_rooms')
        .select('id').eq('host_id', user.id).eq('status', 'waiting').limit(3);
      if (ownedError) throw ownedError;
      if (ownedRooms.length >= 3) return json({ error: 'Leave an existing room before creating another.' }, 429);
      const code = await uniqueRoomCode(admin);
      const { data: room, error } = await admin.from('game_rooms').insert({
        code,
        game: body.game,
        max_players: body.maxPlayers,
        is_public: false,
        host_id: user.id,
      }).select('id').single();
      if (error) throw error;
      const { error: playerError } = await admin.from('game_players').insert({
        room_id: room.id, user_id: user.id, seat: 0, display_name: profile.name, avatar: profile.avatar,
      });
      if (playerError) throw playerError;
      return await roomResponse(admin, room.id, user.id);
    }

    if (op === 'join') {
      const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
      if (!/^[A-Z0-9]{5}$/.test(code)) return json({ error: 'Room codes have five letters or numbers.' }, 400);
      const { data: roomId, error } = await admin.rpc('join_game_room', {
        p_code: code,
        p_user_id: user.id,
        p_display_name: profile.name,
        p_avatar: profile.avatar,
      });
      if (error) return json({ error: 'Room not found, full, or already started.' }, 404);
      return await roomResponse(admin, roomId, user.id);
    }

    if (op === 'room') return await roomResponse(admin, body.roomId, user.id);
    if (op === 'leave') {
      const roomId = requireUuid(body.roomId);
      const { error } = await admin.rpc('leave_game_room', { p_room_id: roomId, p_user_id: user.id });
      if (error) throw error;
      return json({ ok: true });
    }

    if (op === 'start') {
      const roomId = requireUuid(body.roomId);
      const { data: claimed, error } = await admin.rpc('claim_game_room_start', { p_room_id: roomId, p_user_id: user.id });
      if (error) throw error;
      if (!claimed) return json({ error: 'The host can start after another player has joined.' }, 409);
      const { data: room, error: roomError } = await admin.from('game_rooms').select('*').eq('id', roomId).single();
      if (roomError) throw roomError;
      const { data: players, error: playersError } = await admin.from('game_players').select('*').eq('room_id', roomId).order('seat');
      if (playersError) throw playersError;
      const currentPlayer = players.find((p: any) => p.user_id === user.id);
      if (!currentPlayer) return json({ error: 'You are not in this room.' }, 403);
      const state = createState(room.game, players);
      const { error: startError } = await admin.rpc('start_game_state', { p_room_id: roomId, p_state: state });
      if (startError) throw startError;
      return json({ ok: true, state: redactState(state, currentPlayer.seat), version: 1, me: currentPlayer.seat });
    }

    if (op === 'state') {
      const roomId = requireUuid(body.roomId);
      const { data: players, error: playerError } = await admin.from('game_players').select('*').eq('room_id', roomId);
      if (playerError) throw playerError;
      const player = players.find((p: any) => p.user_id === user.id);
      if (!player) return json({ error: 'You are not in this room.' }, 403);
      const { data: saved, error } = await admin.from('game_states').select('version,state').eq('room_id', roomId).single();
      if (error) throw error;
      return json({ ok: true, state: redactState(saved.state, player.seat), version: saved.version, me: player.seat });
    }

    if (op === 'resign') {
      const roomId = requireUuid(body.roomId);
      const { data: players, error: playerError } = await admin.from('game_players').select('*').eq('room_id', roomId).order('seat');
      if (playerError) throw playerError;
      const player = players.find((p: any) => p.user_id === user.id);
      if (!player) return json({ error: 'You are not in this room.' }, 403);
      const { data: saved, error: stateError } = await admin.from('game_states').select('version,state').eq('room_id', roomId).single();
      if (stateError) throw stateError;
      if (saved.state.over) return json({ ok: true });
      const winner = players.find((candidate: any) => candidate.seat !== player.seat);
      saved.state.over = { winner: winner.seat, reason: 'resign' };
      const { data: nextVersion, error: updateError } = await admin.rpc('save_game_state', {
        p_room_id: roomId,
        p_expected_version: saved.version,
        p_state: saved.state,
        p_status: 'finished',
      });
      if (updateError) throw updateError;
      if (!nextVersion) return json({ error: 'The table changed. Syncing the latest game state.' }, 409);
      return json({ ok: true });
    }

    if (op === 'move') {
      const roomId = requireUuid(body.roomId);
      const { data: room, error: roomError } = await admin.from('game_rooms').select('game,status').eq('id', roomId).single();
      if (roomError) throw roomError;
      if (room.status !== 'playing') return json({ error: 'This game is not accepting moves.' }, 409);
      const { data: players, error: playerError } = await admin.from('game_players').select('*').eq('room_id', roomId);
      if (playerError) throw playerError;
      const player = players.find((p: any) => p.user_id === user.id);
      if (!player) return json({ error: 'You are not in this room.' }, 403);
      const { data: saved, error: stateError } = await admin.from('game_states').select('version,state').eq('room_id', roomId).single();
      if (stateError) throw stateError;
      if (!Number.isInteger(body.version) || saved.version !== body.version) {
        return json({ error: 'The table changed. Syncing the latest game state.' }, 409);
      }
      const state = saved.state;
      if (state.cur !== player.seat || state.players[state.cur]?.userId !== user.id) {
        return json({ error: 'It is not your turn.' }, 403);
      }
      const result = room.game === 'nk'
        ? applyNikoAction(state, body.action || {})
        : body.action?.type === 'pick'
          ? seqPick(state, body.action.from)
          : body.action?.type === 'dispose'
            ? seqDispose(state, body.action.card)
            : { ok: false, reason: 'Unsupported move.' };
      if (!result.ok) return json({ error: result.reason || 'That move is not allowed.' }, 400);
      const nextStatus = state.over ? 'finished' : 'playing';
      const { data: nextVersion, error: updateError } = await admin.rpc('save_game_state', {
        p_room_id: roomId,
        p_expected_version: saved.version,
        p_state: state,
        p_status: nextStatus,
      });
      if (updateError) throw updateError;
      if (!nextVersion) return json({ error: 'Another move arrived first. Syncing the table.' }, 409);
      return json({ ok: true, state: redactState(state, player.seat), version: nextVersion, me: player.seat, events: [] });
    }

    return json({ error: 'Unknown online game operation.' }, 400);
  } catch (error) {
    console.error(`Online game ${operation} failed:`, error);
    return json({ error: operationErrorMessage(operation, error) }, 500);
  }
});

function createState(game: string, players: Record<string, any>[]) {
  const seats = players.map((player) => ({ name: player.display_name, avatar: player.avatar }));
  const state = game === 'nk'
    ? E.newGame({ players: seats, rules: {}, seed: randomUint32() | 0 })
    : newSeqGame({ players: seats, seed: randomUint32() | 0 });
  state.players.forEach((player: Record<string, any>, index: number) => { player.userId = players[index].user_id; });
  state.cur = randomUint32() % state.n;
  return state;
}

function randomUint32() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0];
}

async function uniqueRoomCode(admin: any) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 8; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    const code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
    const { data } = await admin.from('game_rooms').select('id').eq('code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('Could not allocate a room code. Try again.');
}

async function pruneOldRooms(admin: any) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await admin.from('game_rooms').delete().lt('created_at', cutoff);
  if (error) throw error;
}

async function maybeStartPublicRoom(admin: any, roomId: string) {
  const { data: room, error } = await admin.from('game_rooms').select('*').eq('id', roomId).single();
  if (error) throw error;
  if (!room.is_public) return;
  const { data: players, error: playersError } = await admin.from('game_players').select('*').eq('room_id', roomId).order('seat');
  if (playersError) throw playersError;
  if (!players || players.length < room.max_players) return;
  const { data: claimed, error: claimError } = await admin.rpc('claim_game_room_start', { p_room_id: roomId, p_user_id: players[0].user_id });
  if (claimError) throw claimError;
  if (!claimed) return;
  const state = createState(room.game, players);
  const { error: startError } = await admin.rpc('start_game_state', { p_room_id: roomId, p_state: state });
  if (startError) throw startError;
}

async function roomResponse(admin: any, roomId: string, userId: string) {
  if (typeof roomId !== 'string' || !/^[0-9a-f-]{36}$/i.test(roomId)) return json({ error: 'Room not found.' }, 404);
  const [{ data: room, error: roomError }, { data: players, error: playersError }] = await Promise.all([
    admin.from('game_rooms').select('id,code,game,status,is_public,max_players,host_id,revision').eq('id', roomId).single(),
    admin.from('game_players').select('user_id,seat,display_name,avatar').eq('room_id', roomId).order('seat'),
  ]);
  if (roomError || playersError || !players.some((player: any) => player.user_id === userId)) {
    return json({ error: 'Room not found or you are not a member.' }, 404);
  }
  return json({
    ok: true,
    room: { id: room.id, code: room.code, game: room.game, status: room.status, isPublic: room.is_public, maxPlayers: room.max_players, isHost: room.host_id === userId, revision: room.revision },
    players: players.map((player: any) => ({ seat: player.seat, name: player.display_name, avatar: player.avatar })),
    me: players.find((player: any) => player.user_id === userId).seat,
  });
}

function requireUuid(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) throw new Error('Invalid room id.');
  return value;
}
