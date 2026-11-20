// Supabase-backed public matchmaking and private rooms.
import * as store from './store.js';
import { playerAvatar, avatarHTML } from './avatars.js';
import { getSupabase, ensureOnlineSession } from './supabase-client.js';
import { $, $$, esc, sheet, closeSheet, toast } from './ui.js';
import { startGame } from './router.js';

let roomChannel = null;
let roomChannelEpoch = 0;
export const net = {
  live: true,

  newRoomCode() {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 5 }, () => alphabet[(Math.random() * alphabet.length) | 0]).join('');
  },

  async _call(op, params = {}) {
    await ensureOnlineSession();
    const supabase = await getSupabase();
    const profile = store.get();
    const { data, error } = await supabase.functions.invoke('online-game', {
      body: { op, name: profile.name, avatar: playerAvatar(profile), ...params },
    });
    if (error) {
      try {
        const result = await error.context?.clone?.().json();
        if (result?.error) throw new Error(result.error);
      } catch (detail) {
        if (detail instanceof Error && detail.message !== error.message) throw detail;
      }
      throw new Error(error.message || 'Could not contact the online game server.');
    }
    if (!data?.ok) throw new Error(data?.error || 'The online game request failed.');
    return data;
  },

  async findMatch(game) {
    return this._call('matchmake', { game });
  },
  async createRoom(game, maxPlayers) {
    return this._call('create', { game, maxPlayers });
  },
  async joinRoom(code) {
    return this._call('join', { code });
  },
  async room(roomId) {
    return this._call('room', { roomId });
  },
  async startRoom(roomId) {
    return this._call('start', { roomId });
  },
  async state(roomId) {
    return this._call('state', { roomId });
  },
  async move(roomId, action, version) {
    return this._call('move', { roomId, action, version });
  },
  async resign(roomId) {
    return this._call('resign', { roomId });
  },
  async leaveRoom(roomId) {
    try { return await this._call('leave', { roomId }); }
    catch (error) { console.error('Could not leave online room:', error); return null; }
  },

  watchRoom(roomId, onChange) {
    this.unwatchRoom();
    const epoch = roomChannelEpoch;
    getSupabase().then((supabase) => {
      if (epoch !== roomChannelEpoch) return;
      roomChannel = supabase.channel(`game-room-${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` }, onChange)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') onChange();
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') toast('Lost the live room connection. Reconnecting…', 3000);
        });
    }).catch((error) => toast(error.message || 'Could not connect to live room updates.'));
  },

  unwatchRoom() {
    roomChannelEpoch++;
    if (roomChannel) {
      const channel = roomChannel;
      getSupabase().then((supabase) => supabase.removeChannel(channel))
        .catch((error) => console.error('Could not close the live room connection:', error));
    }
    roomChannel = null;
  },
};

const I = {
  cpu: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2h2v3h2V2h2v3h2.500A1.500 1.500 0 0 1 20 6.500V9h3v2h-3v2h3v2h-3v2.500a1.500 1.500 0 0 1-1.500 1.500H16v3h-2v-3h-2v3h-2v-3H7.500A1.500 1.500 0 0 1 6 17.500V15H3v-2h3v-2H3V9h3V6.500A1.500 1.500 0 0 1 7.500 5H9zM8 8v8h8V8z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.500"/><path d="M2.500 12h19M12 2.500c3 3 4 6 4 9.500s-1 6.500-4 9.500c-3-3-4-6.500-4-9.500s1-6.500 4-9.500z"/></svg>',
  room: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h11a1 1 0 0 1 1 1v1h3a1 1 0 0 1 1 1v14h2v2H2v-2h2zm2 2v14h8V5zm5 6h2v2h-2z"/></svg>',
};
const NAMES = { nk: 'Niko Kadi', ss: 'Special Sequence' };
const opt = (id, ic, title, sub) => `<button class="opt" id="${id}"><span class="ic">${I[ic]}</span><span>${title}<small>${sub}</small></span></button>`;

export function showModes(game, { computer }) {
  const d = store.get();
  const root = (html, bind) => { const sh = sheet(html); bind(sh.el); };

  const modes = () => root(`<h2>${NAMES[game]}</h2><p>How do you want to play?</p>
    ${opt('mC', 'cpu', 'Play the computer', 'Four levels, Easy to Expert')}
    ${opt('mO', 'globe', 'Online match', 'Quick 2-player match')}
    ${opt('mR', 'room', 'Private room', 'Make a room and invite friends with a code')}`, (el) => {
    $('#mC', el).onclick = () => { closeSheet(true); computer(game); };
    $('#mO', el).onclick = online;
    $('#mR', el).onclick = rooms;
  });

  const online = () => root(`<h2>Online match</h2><p>Join a public two-player queue. You can play while waiting for an opponent.</p>
    <div class="row"><button class="btn grey" id="back">Back</button><button class="btn" id="find">Find a match</button></div>`, (el) => {
    $('#back', el).onclick = modes;
    $('#find', el).onclick = async () => {
      $('#find', el).disabled = true;
      $('#find', el).textContent = 'Connecting…';
      try {
        const result = await net.findMatch(game);
        showLobby(result, game);
      } catch (error) {
        $('#find', el).disabled = false;
        $('#find', el).textContent = 'Find a match';
        toast(error.message || 'Could not join matchmaking.');
      }
    };
  });

  const rooms = () => root(`<h2>Private room</h2><p>Play with friends. Everyone who has the code can take a seat.</p>
    ${opt('rC', 'room', 'Create a room', 'You get a code to share')}
    ${opt('rJ', 'globe', 'Join with a code', 'Enter the code a friend sent you')}
    <div class="row"><button class="btn grey" id="back">Back</button></div>`, (el) => {
    $('#back', el).onclick = modes;
    $('#rC', el).onclick = create;
    $('#rJ', el).onclick = join;
  });

  const create = () => {
    let count = d.count[game] || 2;
    root(`<h2>New private room</h2><p>Choose the number of seats. You can start once at least one friend joins.</p>
      <div class="seg" id="cnt">${[2, 3, 4].map((x) => `<button data-n="${x}" class="${x === count ? 'on' : ''}">${x} players</button>`).join('')}</div>
      <div class="row"><button class="btn grey" id="back">Back</button><button class="btn" id="make">Create room</button></div>`, (el) => {
      $$('#cnt button', el).forEach((b) => (b.onclick = () => {
        count = +b.dataset.n;
        $$('#cnt button', el).forEach((x) => x.classList.toggle('on', x === b));
      }));
      $('#back', el).onclick = rooms;
      $('#make', el).onclick = async () => {
        $('#make', el).disabled = true;
        try {
          d.count[game] = count;
          store.save();
          showLobby(await net.createRoom(game, count), game);
        } catch (error) {
          $('#make', el).disabled = false;
          toast(error.message || 'Could not create the room.');
        }
      };
    });
  };

  const join = () => root(`<h2>Join a room</h2><p>Type the 5 letter code your friend shared.</p>
    <input type="text" id="jc" maxlength="5" placeholder="CODE" autocomplete="off" autocapitalize="characters" style="text-align:center;letter-spacing:.3em;text-transform:uppercase">
    <p id="jerr" class="note-sm"></p>
    <div class="row"><button class="btn grey" id="back">Back</button><button class="btn" id="jg">Join</button></div>`, (el) => {
    $('#back', el).onclick = rooms;
    $('#jg', el).onclick = async () => {
      const code = $('#jc', el).value.trim().toUpperCase();
      if (code.length !== 5) { $('#jerr', el).textContent = 'The code has 5 letters or numbers.'; return; }
      $('#jg', el).disabled = true;
      try {
        const result = await net.joinRoom(code);
        showLobby(result, result.room.game);
      } catch (error) {
        $('#jg', el).disabled = false;
        $('#jerr', el).textContent = error.message || `Could not join room ${code}.`;
      }
    };
  });

  function showLobby(initial, lobbyGame) {
    let info = initial;
    let started = false;
    let leaving = false;
    const sh = sheet('');
    const roomId = initial.room.id;

    const launch = async (result) => {
      if (started) return;
      started = true;
      try {
        const data = result.state ? result : await net.state(roomId);
        net.unwatchRoom();
        closeSheet(true);
        startGame(lobbyGame, {
          onlineRoom: roomId,
          onlineState: data.state,
          onlineMe: data.me,
          onlineVersion: data.version,
          onlinePlayers: info.players,
        });
      } catch (error) {
        started = false;
        toast(error.message || 'Could not load the game.');
      }
    };

    const render = () => {
      const { room, players, me } = info;
      const isHost = room.isHost;
      const openSeats = Math.max(0, room.maxPlayers - players.length);
      sh.el.innerHTML = `<h2>${room.isPublic ? 'Finding a player' : 'Private room'}</h2>
        ${room.isPublic ? '<p>Waiting for another player to join…</p>' : `<p>Share this code with friends.</p><div class="roomcode">${esc(room.code)}</div>
          <div class="row"><button class="btn small grey" id="copy">Copy code</button><button class="btn small grey" id="share">Share</button></div>`}
        <h3>Players (${players.length}/${room.maxPlayers})</h3>
        <div class="seats">${players.map((p) => `<div class="seat-row">${avatarHTML(p.avatar, 34)}<b>${esc(p.name)}${p.seat === 0 ? ' · Host' : ''}${p.seat === me ? ' · You' : ''}</b></div>`).join('')}
          ${Array.from({ length: openSeats }, () => '<div class="seat-row empty"><b>Waiting for a player…</b></div>').join('')}</div>
        <p class="note-sm">${room.status === 'starting' ? 'Starting table…' : room.status === 'playing' ? 'Joining game…' : room.isPublic ? 'This queue matches two players.' : isHost ? 'Start when your friends are ready.' : 'Waiting for the host to start the game.'}</p>
        <div class="row"><button class="btn grey" id="cancel">${room.isPublic ? 'Leave queue' : 'Leave room'}</button>
        ${!room.isPublic && isHost ? `<button class="btn" id="start"${players.length < 2 || room.status !== 'waiting' ? ' disabled' : ''}>Start game</button>` : ''}</div>`;

      const copy = $('#copy', sh.el);
      if (copy) copy.onclick = async () => {
        try { await navigator.clipboard.writeText(room.code); toast('Code copied'); }
        catch { toast('Room code: ' + room.code); }
      };
      const share = $('#share', sh.el);
      if (share) share.onclick = async () => {
        try {
          if (navigator.share) await navigator.share({ title: 'Niko Kadi', text: `Join my ${NAMES[lobbyGame]} room with code ${room.code}` });
          else { await navigator.clipboard.writeText(room.code); toast('Code copied'); }
        } catch { /* Share sheet dismissed. */ }
      };
      $('#cancel', sh.el).onclick = async () => {
        if (leaving) return;
        leaving = true;
        net.unwatchRoom();
        await net.leaveRoom(roomId);
        closeSheet(true);
        modes();
      };
      const start = $('#start', sh.el);
      if (start) start.onclick = async () => {
        start.disabled = true;
        try { await launch(await net.startRoom(roomId)); }
        catch (error) { start.disabled = false; toast(error.message || 'Could not start the game.'); }
      };
    };

    const refresh = async () => {
      if (leaving || started) return;
      try {
        info = await net.room(roomId);
        render();
        if (info.room.status === 'playing') await launch(info);
      } catch (error) {
        console.error('Could not refresh online room:', error);
        toast('Room connection failed. Check your connection.', 3000);
      }
    };

    render();
    net.watchRoom(roomId, refresh);
    if (info.room.status === 'playing') void launch(info);
  }

  modes();
}
