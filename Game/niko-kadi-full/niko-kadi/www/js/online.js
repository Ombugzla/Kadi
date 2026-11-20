// Play modes: computer, online match, private room.
// Real multiplayer needs a game server, which this build does not have yet. The flows below are complete on screen,
// and every network call goes through `net` so a real server can replace it later without touching the screens.
import * as store from './store.js';
import { BOTS } from './bots.js';
import { $, $$, sheet, closeSheet, toast } from './ui.js';
import { startGame } from './router.js';

export const net = {
  live: false,
  async findMatch() { await new Promise((r) => setTimeout(r, 2600)); return { ok: false, reason: 'offline' }; },
  newRoomCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; return Array.from({ length: 5 }, () => a[(Math.random() * a.length) | 0]).join(''); },
  async joinRoom() { await new Promise((r) => setTimeout(r, 900)); return { ok: false, reason: 'offline' }; },
};

const I = {
  cpu: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2h2v3h2V2h2v3h2.500A1.500 1.500 0 0 1 20 6.500V9h3v2h-3v2h3v2h-3v2.500a1.500 1.500 0 0 1-1.500 1.500H16v3h-2v-3h-2v3h-2v-3H7.500A1.500 1.500 0 0 1 6 17.500V15H3v-2h3v-2H3V9h3V6.500A1.500 1.500 0 0 1 7.500 5H9zM8 8v8h8V8z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.500"/><path d="M2.500 12h19M12 2.500c3 3 4 6 4 9.500s-1 6.500-4 9.500c-3-3-4-6-4-9.500s1-6.500 4-9.500z"/></svg>',
  room: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h11a1 1 0 0 1 1 1v1h3a1 1 0 0 1 1 1v14h2v2H2v-2h2zm2 2v14h8V5zm5 6h2v2h-2z"/></svg>',
};
const NAMES = { nk: 'Niko Kadi', ss: 'Special Sequence' };

const opt = (id, ic, t, sub) => `<button class="opt" id="${id}"><span class="ic">${I[ic]}</span><span>${t}<small>${sub}</small></span></button>`;

export function showModes(game, { computer }) {
  const d = store.get();
  const root = (html, bind) => { const sh = sheet(html); bind(sh.el); };
  const modes = () => root(`<h2>${NAMES[game]}</h2><p>How do you want to play?</p>
    ${opt('mC', 'cpu', 'Play the computer', 'Four levels, Easy to Expert')}
    ${opt('mO', 'globe', 'Online match', 'Quick game against players worldwide')}
    ${opt('mR', 'room', 'Private room', 'Make a room and invite friends with a code')}`, (el) => {
    $('#mC', el).onclick = () => { closeSheet(true); computer(game); };
    $('#mO', el).onclick = online;
    $('#mR', el).onclick = rooms;
  });

  const online = () => root(`<h2>Online match</h2><p>You'll be matched with players of a similar rank.</p>
    <div class="row"><button class="btn grey" id="back">Back</button><button class="btn" id="find">Find a match</button></div>`, (el) => {
    $('#back', el).onclick = modes;
    $('#find', el).onclick = async () => {
      el.innerHTML = `<h2>Looking for players</h2><div class="searching"><i></i><i></i><i></i></div><p style="text-align:center">Searching for a ${NAMES[game]} table…</p><div class="row"><button class="btn grey" id="cx">Cancel</button></div>`;
      let off = false;
      $('#cx', el).onclick = () => { off = true; modes(); };
      const r = await net.findMatch(game);
      if (off) return;
      if (!r.ok) root(`<h2>No connection to the game servers</h2><p>Online matches are not available in this version yet, so nobody could be found. Your rank is untouched.</p>
        <div class="row"><button class="btn grey" id="b">Back</button><button class="btn" id="cpu">Play the computer</button></div>`, (e2) => {
        $('#b', e2).onclick = modes; $('#cpu', e2).onclick = () => { closeSheet(true); computer(game); };
      });
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
    const code = net.newRoomCode();
    let n = d.count[game] || 2;
    const draw = (el) => {
      el.innerHTML = `<h2>Your room</h2><p>Share this code so friends can join.</p>
        <div class="roomcode" id="code">${code}</div>
        <div class="row"><button class="btn small grey" id="copy">Copy code</button><button class="btn small grey" id="share">Share</button></div>
        <h3>Seats</h3><div class="seg" id="cnt">${[2, 3, 4].map((x) => `<button data-n="${x}" class="${x === n ? 'on' : ''}">${x} players</button>`).join('')}</div>
        <div class="seats">${Array.from({ length: n }, (_, i) => `<div class="seat-row${i ? ' empty' : ''}"><b>${i ? 'Waiting for a friend…' : 'You (host)'}</b></div>`).join('')}</div>
        <p class="note-sm">${net.live ? '' : 'Friends cannot join rooms in this version yet. You can fill the empty seats with computer players and start now.'}</p>
        <div class="row"><button class="btn grey" id="back">Back</button><button class="btn" id="go">${'Start game'}</button></div>`;
      $$('#cnt button', el).forEach((b) => (b.onclick = () => { n = +b.dataset.n; draw(el); }));
      $('#back', el).onclick = rooms;
      $('#copy', el).onclick = async () => { try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch (e) { toast('Code: ' + code); } };
      $('#share', el).onclick = async () => { try { if (navigator.share) await navigator.share({ title: 'Niko Kadi', text: `Join my Niko Kadi room with code ${code}` }); else { await navigator.clipboard.writeText(code); toast('Code copied'); } } catch (e) { /* cancelled */ } };
      $('#go', el).onclick = () => {
        const li = BOTS[d.level[game]] ? d.level[game] : 2;
        d.count[game] = n; d.game = game; store.save();
        closeSheet(true);
        startGame(game, { botId: BOTS[li].id, count: n, rules: d.rules });
      };
    };
    const sh = sheet(''); draw(sh.el);
  };

  const join = () => root(`<h2>Join a room</h2><p>Type the 5 letter code.</p>
    <input type="text" id="jc" maxlength="5" placeholder="CODE" autocomplete="off" autocapitalize="characters" style="text-align:center;letter-spacing:.3em;text-transform:uppercase">
    <p id="jerr" class="note-sm"></p>
    <div class="row"><button class="btn grey" id="back">Back</button><button class="btn" id="jg">Join</button></div>`, (el) => {
    $('#back', el).onclick = rooms;
    $('#jg', el).onclick = async () => {
      const c = $('#jc', el).value.trim().toUpperCase();
      if (c.length !== 5) { $('#jerr', el).textContent = 'The code has 5 letters or numbers.'; return; }
      $('#jg', el).disabled = true;
      const r = await net.joinRoom(c);
      $('#jg', el).disabled = false;
      if (!r.ok) $('#jerr', el).textContent = `Could not reach room ${c}. Online rooms are not available in this version yet.`;
    };
  });

  modes();
}
