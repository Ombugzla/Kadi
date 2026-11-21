// Home, Leaderboard, Shop, More and the "play computer" setup screen.
import * as store from './store.js';
import { BOTS, TIERS, pickOpponents } from './bots.js';
import { avatarHTML, PLAYER_AVATARS, OBJECT_LIST, playerAvatar } from './avatars.js';
import { cardEl } from './cards.js';
import { cardId } from './engine.js';
import { ICON } from './icons.js';
import { configure, sfx as tone } from './sound.js'; // menus are silent; only the volume slider plays a sample
import { $, $$, esc, sheet, closeSheet, toast } from './ui.js';
import { go, startGame, pushBack } from './router.js';
import { HELP_NK, HELP_SS } from './help.js';
import { TERMS, PRIVACY, FAIR, ABOUT, RP_HELP } from './legal.js';
import { rankInfo, rpDelta } from './rp.js';
import { net, showModes, showPlayerSearch } from './online.js';
import { showEmailAccount } from './account.js';
import { openChats } from './chat.js';
import { runDailyLeague } from './league.js';

export const GAMES = {
  nk: { key: 'nk', name: 'Niko Kadi', tag: 'Kenyan poker' },
  ss: { key: 'ss', name: 'Special Sequence', tag: 'Collect a winning four' },
};

// app colour themes (accent + paper tint) and table colours
export const THEMES = {
  parlour: ['Parlour', '#3d8fd4', '#efe6d0'],
  lagoon: ['Lagoon', '#1d9bb2', '#d6e6e3'],
  savanna: ['Savanna', '#d28a2c', '#ecd9b0'],
  rosewood: ['Rosewood', '#c4617f', '#ebd3cf'],
  forest: ['Forest', '#4a9a52', '#d9e3c6'],
};
const FELTS = {
  parlour: ['Parlour', '#e6dcc4'],
  wood: ['Walnut wood', 'url(img/wood.webp) center 30% / 240% auto'],
  teal: ['Lake teal', '#0f5a66'],
  forest: ['Forest', '#1f5d3a'],
  midnight: ['Midnight blue', '#1d3f66'],
  clay: ['Red clay', '#7a3f2c'],
};
const BACKS = { royal: 'Royal damask', guilloche: 'Guilloché', deco: 'Art deco', beads: 'Beadwork', mandala: 'Mandala', stars: 'Night sky' };

export function applyTheme() {
  const d = store.get();
  const S = d.settings;
  const b = document.body;
  b.dataset.back = S.back;
  b.dataset.felt = S.felt;
  b.dataset.mode = S.mode === 'dark' ? 'dark' : 'light';
  b.dataset.theme = THEMES[S.theme] ? S.theme : 'parlour';
  b.classList.toggle('reduce-motion', !!S.reduceMotion);
  configure({ enabled: S.sound, volume: S.volume, haptics: S.haptics });
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = S.mode === 'dark' ? '#1b2026' : '#e9dfc6';
}

const myAvatar = () => playerAvatar(store.get());
const winRate = (s) => (s.played ? Math.round((s.won / s.played) * 100) + '%' : '–');

function ago(t) {
  const d = new Date(t), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 864e5);
  const hm = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diff <= 0) return 'Today, ' + hm;
  if (diff === 1) return 'Yesterday, ' + hm;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// ------------------------------------------------------------------ art
function heroArt(g) {
  const ids = g === 'nk' ? ['AS', 'KH', 'QD'] : ['4C', '5H', '6S', '7D'];
  const pose = g === 'nk' ? [[-14, 8, 4], [0, 2, 34], [14, 8, 64]] : [[-12, 10, 13], [-4, 4, 33], [4, 2, 49], [12, 8, 67]];
  const w = 46;
  return ids.map((s, i) => {
    const el = cardEl(cardId(s));
    el.style.setProperty('--cw', w + 'px');
    el.style.left = pose[i][2] + 'px';
    el.style.top = pose[i][1] + 'px';
    el.style.transform = `rotate(${pose[i][0]}deg)`;
    return el.outerHTML;
  }).join('');
}

function gamePanel(g) {
  return `<button class="game ${g}" data-g="${g}" aria-label="Play ${GAMES[g].name}">
    <div class="art">${heroArt(g)}</div>
    <h2>${GAMES[g].name}</h2><span class="sub">${GAMES[g].tag}</span>
    <span class="go"><span class="ic">${ICON.play}</span>Play</span>
  </button>`;
}

function agoShort(t) {
  const timestamp = Number(t);
  if (!Number.isFinite(timestamp)) return '';
  const mins = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const day = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(new Date(timestamp))) / 864e5);
  if (diff <= 0) return `${Math.floor(mins / 60)}h ago`;
  if (diff === 1) return 'Yesterday';
  return new Date(timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function recentHTML() {
  const h = store.get().history;
  if (!h.length) {
    return `<div class="sec"><span>Recent games</span></div>
      <div class="recent empty">No games yet. Your latest results will show up here.</div>`;
  }
  const rows = h.slice(0, 5).map((m, i) => {
    const names = Array.isArray(m.names) ? m.names : [];
    const rival = BOTS.find((b) => b.name === names[0]);
    const extra = names.length > 1 ? ` +${names.length - 1}` : '';
    const who = esc((names[0] || 'Opponent') + extra);
    const rp = Number.isFinite(m.delta) && m.delta
      ? `${m.delta > 0 ? '+' : '\u2212'}${Math.abs(m.delta)} RP`
      : '';
    const res = m.won ? 'Won' : 'Lost';
    const game = GAMES[m.g]?.name || 'Game';
    return `<li class="rg-row ${m.won ? 'w' : 'l'}">
      <span class="rg-face">${rival ? avatarHTML(rival.avatar, 40) : ''}</span>
      <span class="rg-info"><b>${who}</b><small>${game} · ${agoShort(m.t)}</small></span>
      <span class="rg-res"><b>${rp || res}</b>${rp ? `<small>${res}</small>` : ''}</span>
      <button class="rg-again" data-i="${i}" aria-label="Rematch ${who}"><span class="ic">${ICON.rematch}</span></button>
    </li>`;
  }).join('');
  return `<div class="sec rg-heading"><span>Recent games</span></div>
    <div class="rg"><ul class="rg-list">${rows}</ul></div>`;
}

// ------------------------------------------------------------------ home
export function renderHome(root) {
  const d = store.get();
  const today = new Date().toISOString().slice(0, 10);
  const ri = rankInfo(d.rp);
  const nx = ri.next ? `${ri.nextAt - d.rp} RP to ${ri.next}` : 'Top rank reached';
  const note = store.unread('note');
  root.innerHTML = `
  <div class="page" id="homePage">
    <div class="hd">
      <button class="me" id="meBtn" aria-label="Profile">${avatarHTML(myAvatar(), 46)}</button>
      <div class="who"><small>WELCOME</small><b>${esc(d.name)}</b></div>
      <span class="grow"></span>
      <div class="streak ${d.lastDay === today ? 'hot' : ''}" title="Days in a row"><span class="ic">${ICON.flame}</span><b>${d.streakDays}</b></div>
      <button class="icon-btn" id="bell" aria-label="Notifications"><span class="ic">${ICON.bell}</span><span class="badge" ${note ? '' : 'hidden'}>${note}</span></button>
    </div>
    <div class="rankbar" id="rankbar">
      <div class="medal"><span class="ic">${ICON.trophy}</span></div>
      <div class="rk"><small>Offline rank</small><b>${ri.name}</b><div class="bar-rp"><i style="width:${Math.max(4, ri.pct)}%"></i></div><span class="nx">${nx}</span></div>
      <div class="rp">${d.rp}<small>Offline RP</small></div>
    </div>
    <div class="sec"><span>Pick a game</span></div>
    <div class="games">${['nk', 'ss'].map(gamePanel).join('')}</div>
    <div id="recent">${recentHTML()}</div>
  </div>`;

  $('#meBtn', root).onclick = () => { go('more'); };
  $('#bell', root).onclick = () => { showInbox('note', () => renderHome(root)); };
  $('#rankbar', root).onclick = () => { go('rank'); };
  $$('.game', root).forEach((b) => (b.onclick = () => { showModes(b.dataset.g, { computer: showSetup }); }));
  $$('.rg-again', root).forEach((btn) => (btn.onclick = () => {
    const m = store.get().history[+btn.dataset.i];
    if (m) startGame(m.g, { botId: m.botId, count: m.count, rules: m.rules || d.rules });
  }));
  if (!d.welcomed) setTimeout(welcome, 250);
}


// ------------------------------------------------------------------ avatar picker (faces, things, own photo)
function pickerHTML() {
  return `<div class="av-now" id="avNow"></div>
    <div class="seg" id="avTabs"><button data-t="faces">Faces</button><button data-t="things">Things</button><button data-t="photo">Photo</button></div>
    <div id="avBody"></div>`;
}
function resizePhoto(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 192, c = document.createElement('canvas');
      c.width = c.height = S;
      const m = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}
// st = { av, photo }; edits it in place.
function bindPicker(el, st) {
  let tab = st.av === 'photo' ? 'photo' : typeof st.av === 'string' ? 'things' : 'faces';
  const cur = () => (st.av === 'photo' && st.photo ? { img: st.photo } : typeof st.av === 'string' && OBJECT_LIST.some((o) => o.id === st.av) ? { obj: st.av } : PLAYER_AVATARS[st.av] || PLAYER_AVATARS[0]);
  const draw = () => {
    $('#avNow', el).innerHTML = avatarHTML(cur(), 76);
    $$('#avTabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    const body = $('#avBody', el);
    if (tab === 'faces') body.innerHTML = `<div class="avgrid">${PLAYER_AVATARS.map((a, i) => `<button data-v="${i}" class="${i === st.av ? 'on' : ''}">${avatarHTML(a, 60)}</button>`).join('')}</div>`;
    else if (tab === 'things') body.innerHTML = `<div class="avgrid">${OBJECT_LIST.map((o) => `<button data-v="${o.id}" class="${o.id === st.av ? 'on' : ''}" aria-label="${o.name}">${avatarHTML({ obj: o.id }, 60)}</button>`).join('')}</div>`;
    else body.innerHTML = `<div class="photo-box">${st.photo ? `<button class="usephoto ${st.av === 'photo' ? 'on' : ''}" data-v="photo">${avatarHTML({ img: st.photo }, 84)}</button>` : '<p>Use a picture from your phone. It is cropped to a square and stays on this device.</p>'}
      <div class="row"><label class="btn small grey" for="avFile">${st.photo ? 'Choose another' : 'Upload a photo'}</label>${st.photo ? '<button class="btn small grey" id="avDel">Remove</button>' : ''}</div>
      <input type="file" id="avFile" accept="image/*" hidden></div>`;
    $$('[data-v]', body).forEach((b) => (b.onclick = () => { const v = b.dataset.v; st.av = /^\d+$/.test(v) ? +v : v; draw(); }));
    const f = $('#avFile', body);
    if (f) f.onchange = async () => {
      if (!f.files[0]) return;
      try { st.photo = await resizePhoto(f.files[0]); st.av = 'photo'; } catch (e) { toast('That file could not be read as an image'); }
      draw();
    };
    const del = $('#avDel', body);
    if (del) del.onclick = () => { st.photo = ''; if (st.av === 'photo') st.av = 0; draw(); };
  };
  $$('#avTabs button', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
  draw();
}

function welcome() {
  const d = store.get();
  if (d.welcomed) return;
  let name = d.name === 'You' ? '' : d.name;
  const st = { av: d.avatar, photo: d.photo || '' };
  const sh = sheet(`
    <h2>Set up your profile</h2>
    <p>What should the table call you?</p>
    <div style="margin-top:14px"><input type="text" id="wName" maxlength="24" placeholder="Your name" value="${esc(name)}" autocomplete="username"></div>
    <h3>Pick your picture</h3>
    ${pickerHTML()}
    <div class="row"><button class="btn block" id="wGo">Let's play</button></div>`, { center: true, dismiss: false });
  bindPicker(sh.el, st);
  $('#wGo', sh.el).onclick = () => {
    d.name = ($('#wName', sh.el).value || '').trim().slice(0, 24) || 'You';
    d.avatar = st.av; d.photo = st.photo;
    d.welcomed = true;
    store.save();
    closeSheet(true);
    go('home');
  };
}

// ------------------------------------------------------------------ leaderboard
let leaderboardRequest = 0;
export function renderRank(root) {
  runDailyLeague();
  const request = ++leaderboardRequest;
  root.innerHTML = `<div class="page">
    <h1>Leaderboard</h1>
    <div class="me-card" id="onlineMe" hidden></div>
    <div class="sec"><span>Global Games</span><button id="globalRefresh">Refresh</button></div>
    <div class="board" id="globalBoard" hidden></div>
  </div>`;

  const loadLeaderboard = async () => {
    const refresh = $('#globalRefresh', root);
    if (refresh) refresh.disabled = true;
    try {
      const { standings } = await net.leaderboard();
      if (request !== leaderboardRequest) return;
      const me = standings.find((player) => player.isMe);
      const myCard = $('#onlineMe', root);
      const board = $('#globalBoard', root);
      if (!myCard || !board) return;
      if (me) {
        const rank = rankInfo(me.rp);
        myCard.innerHTML = `${avatarHTML(me.avatar || myAvatar(), 56)}<div><b>${esc(me.name)}</b><div class="sm">#${me.rank} · ${rank.name} · ${me.wins} won, ${me.losses} lost</div></div><div class="big">${me.rp}<small>Online RP</small></div>`;
        myCard.hidden = false;
      }
      board.innerHTML = standings.length
        ? standings.map((player) => `<div class="lrow ${player.isMe ? 'you' : ''}">
            <span class="pos">${player.rank}</span>${avatarHTML(player.avatar || PLAYER_AVATARS[0], 42)}
            <div class="nm"><b>${esc(player.name)}</b><small>${player.isMe ? 'You · ' : ''}${rankInfo(player.rp).name} · ${player.wins} won, ${player.losses} lost</small></div>
            <span class="rat">${player.rp}<small>RP</small></span>
          </div>`).join('')
        : '<div class="note-sm">No online players yet.</div>';
      board.hidden = false;
    } catch (error) {
      if (request === leaderboardRequest) {
        const board = $('#globalBoard', root);
        if (board) {
          board.innerHTML = `<div class="note-sm">${esc(error.message || 'Could not load the shared leaderboard.')}</div>`;
          board.hidden = false;
        }
      }
    } finally {
      if (request === leaderboardRequest && refresh) refresh.disabled = false;
    }
  };
  $('#globalRefresh', root).onclick = () => { void loadLeaderboard(); };
  void loadLeaderboard();
  const rpHow = $('#rpHow', root);
  if (rpHow) rpHow.onclick = () => { info('How Rank Points work', RP_HELP); };
}

// ------------------------------------------------------------------ shop
export function renderShop(root) {
  const d = store.get();
  const swatch = (c) => (c.startsWith('url') ? c : `radial-gradient(90% 90% at 50% 40%, ${c}, #0007 160%), ${c}`);
  root.innerHTML = `<div class="page">
    <h1>Shop</h1>
    <div class="sec" style="margin-top:6px"><span>Card backs</span></div>
    <div class="grid2" id="backs">${Object.entries(BACKS).map(([k, n]) => `<button class="item-card ${d.settings.back === k ? 'on' : ''}" data-k="${k}"><div class="card back" data-back="${k}"></div><b>${n}</b><small>${d.settings.back === k ? 'In use' : 'Owned'}</small></button>`).join('')}</div>
    <div class="sec"><span>Table</span></div>
    <div class="grid2" id="felts">${Object.entries(FELTS).map(([k, [n, c]]) => `<button class="item-card ${d.settings.felt === k ? 'on' : ''}" data-k="${k}"><div class="swatch" style="background:${swatch(c)}"></div><b>${n}</b><small>${d.settings.felt === k ? 'In use' : 'Owned'}</small></button>`).join('')}</div>
    <div class="soon">Everything here is yours to use for now.<br>New card backs, avatars and sound packs are coming.</div>
  </div>`;
  $$('#backs button', root).forEach((b) => (b.onclick = () => { d.settings.back = b.dataset.k; store.save(); applyTheme(); renderShop(root); }));
  $$('#felts button', root).forEach((b) => (b.onclick = () => { d.settings.felt = b.dataset.k; store.save(); applyTheme(); renderShop(root); }));
}

// ------------------------------------------------------------------ more
const item = (id, icon, title, sub, pill) =>
  `<button class="item" id="${id}"><span class="ic">${ICON[icon]}</span><span class="grow">${title}${sub ? `<div class="sub">${sub}</div>` : ''}</span>${pill ? `<span class="pill">${pill}</span>` : ''}<span class="ic">${ICON.chevron}</span></button>`;

export function renderMore(root) {
  const d = store.get();
  const ri = rankInfo(d.rp);
  const um = store.unread('msg'), un = store.unread('note');
  root.innerHTML = `<div class="page">
    <h1>More</h1>
    <button class="profile" id="prof">${avatarHTML(myAvatar(), 64)}<div><b>${esc(d.name)}</b><small>Offline · ${ri.name} · ${d.rp} RP</small></div><span class="ic">${ICON.chevron}</span></button>
    <div class="group">Online play</div>
    <div class="list">${item('mFindPlayers', 'user', 'Find players', 'Search by display name and see who is available')}${item('mAccount', 'mail', 'Account', 'Email/password or Google sign-in')}</div>
    <div class="group">Inbox</div>
    <div class="list">${item('mMsg', 'mail', 'Messages', 'Chat with friends & Niko Kadi team', um || '')}${item('mNote', 'bell', 'Notifications', 'Results, ranks and streaks', un || '')}</div>
    <div class="group">You</div>
    <div class="list">${item('mEdit', 'user', 'Edit profile', 'Name and face')}${item('mLook', 'palette', 'Appearance', `${d.settings.mode === 'dark' ? 'Dark' : 'Light'} mode · ${THEMES[d.settings.theme][0]} theme`)}${item('mSet', 'gear', 'Settings', 'Sound, vibration, timer')}</div>
    <div class="group">Help</div>
    <div class="list">${item('mHelp', 'info', 'How to play')}${item('mRP', 'star', 'How Rank Points work')}</div>
    <div class="group">About and policies</div>
    <div class="list">${item('mAbout', 'spade', 'About Niko Kadi', 'Version 0.4')}${item('mTerms', 'doc', 'Terms of Service')}${item('mPriv', 'lock', 'Privacy Policy')}${item('mFair', 'shield', 'Fair Play Policy')}</div>
  </div>`;
  const on = (id, fn) => { $('#' + id, root).onclick = () => { fn(); }; };
  const back = () => renderMore(root);
  on('prof', () => editProfile(back));
  on('mEdit', () => editProfile(back));
  on('mFindPlayers', () => showPlayerSearch());
  on('mAccount', () => showEmailAccount());
  on('mMsg', () => openChats());
  on('mNote', () => showInbox('note', back));
  on('mLook', () => showAppearance(back));
  on('mSet', showSettings);
  on('mHelp', showHelp);
  on('mRP', () => info('How Rank Points work', RP_HELP));
  on('mAbout', () => info('About Niko Kadi', ABOUT));
  on('mTerms', () => info('Terms of Service', TERMS));
  on('mPriv', () => info('Privacy Policy', PRIVACY));
  on('mFair', () => info('Fair Play Policy', FAIR));
}

function info(title, html) {
  const sh = sheet(`<h2>${title}</h2>${html}<div class="row"><button class="btn grey block" id="ok">Close</button></div>`);
  $('#ok', sh.el).onclick = () => closeSheet();
}

export function editProfile(done) {
  const d = store.get();
  const st = { av: d.avatar, photo: d.photo || '' };
  const sh = sheet(`<h2>Edit profile</h2>
    <h3>Name</h3><input type="text" id="pName" maxlength="24" value="${esc(d.name)}" autocomplete="username">
    <h3>Picture</h3>${pickerHTML()}
    <div class="row"><button class="btn grey" id="pC">Cancel</button><button class="btn" id="pS">Save</button></div>`);
  bindPicker(sh.el, st);
  $('#pC', sh.el).onclick = () => closeSheet();
  $('#pS', sh.el).onclick = () => { d.name = ($('#pName', sh.el).value || '').trim().slice(0, 24) || 'You'; d.avatar = st.av; d.photo = st.photo; store.save(); closeSheet(true); done && done(); };
}

export function showInbox(kind, done) {
  const title = kind === 'msg' ? 'Messages' : 'Notifications';
  const list = store.inboxOf(kind);
  const sh = sheet(`<h2>${title}</h2>
    ${list.length ? `<div class="inbox">${list.map((m) => `<button class="msg${m.read ? '' : ' unread'}" data-id="${m.id}"><b>${esc(m.title)}</b><small>${esc(m.from)} · ${ago(m.t)}</small><p>${esc(m.body)}</p></button>`).join('')}</div>` : `<div class="empty-note">Nothing here yet.</div>`}
    <div class="row">${list.some((m) => !m.read) ? '<button class="btn grey" id="allRead">Mark all read</button>' : ''}<button class="btn" id="ok">Close</button></div>`, { onClose: done });
  $$('.msg', sh.el).forEach((b) => (b.onclick = () => {
    b.classList.toggle('open');
    if (b.classList.contains('unread')) { b.classList.remove('unread'); store.markRead(kind, b.dataset.id); }
  }));
  const ar = $('#allRead', sh.el);
  if (ar) ar.onclick = () => { store.markRead(kind); $$('.msg', sh.el).forEach((b) => b.classList.remove('unread')); ar.remove(); };
  $('#ok', sh.el).onclick = () => closeSheet();
}

export function showStats() {
  const d = store.get();
  const ri = rankInfo(d.rp);
  const blk = (g) => {
    const s = d.stats[g];
    return `<h3>${GAMES[g].name}</h3><div class="statgrid">${g === 'nk' ? `<div><b>${d.rp}</b><span>Rank points · ${ri.name}</span></div>` : `<div><b>${winRate(s)}</b><span>Win rate</span></div>`}<div><b>${s.played}</b><span>Played</span></div><div><b>${s.won}</b><span>Won</span></div>${g === 'nk' ? `<div><b>${winRate(s)}</b><span>Win rate</span></div>` : `<div><b>${s.played - s.won}</b><span>Lost</span></div>`}<div><b>${s.streak}</b><span>Win streak</span></div><div><b>${s.best}</b><span>Best streak</span></div></div>`;
  };
  info('Statistics', blk('nk') + blk('ss'));
}

export function showHelp() {
  info('How to play', HELP_NK + HELP_SS);
}

export function showAppearance(done) {
  const d = store.get();
  const S = d.settings;
  const sh = sheet(`<h2>Appearance</h2>
    <h3>Mode</h3>
    <div class="seg" id="modeSeg"><button data-m="light" class="${S.mode !== 'dark' ? 'on' : ''}">Light</button><button data-m="dark" class="${S.mode === 'dark' ? 'on' : ''}">Dark</button></div>
    <h3>Theme</h3>
    <div class="themes" id="themes">${Object.entries(THEMES).map(([k, [n, acc, bg]]) => `<button data-t="${k}" class="${S.theme === k ? 'on' : ''}"><span class="sw" style="background:${bg};--c:${acc}"></span>${n}</button>`).join('')}</div>
    <p style="margin-top:10px">The table has its own colours in the Shop.</p>
    <div class="row"><button class="btn block" id="ok">Done</button></div>`, { onClose: done });
  $$('#modeSeg button', sh.el).forEach((b) => (b.onclick = () => { S.mode = b.dataset.m; store.save(); applyTheme(); $$('#modeSeg button', sh.el).forEach((x) => x.classList.toggle('on', x === b)); }));
  $$('#themes button', sh.el).forEach((b) => (b.onclick = () => { S.theme = b.dataset.t; store.save(); applyTheme(); $$('#themes button', sh.el).forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#ok', sh.el).onclick = () => closeSheet();
}

export function showSettings() {
  const d = store.get();
  const S = d.settings;
  const row = (k, t, sub) => `<div class="toggle-row"><div class="grow"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div><button class="switch ${S[k] ? 'on' : ''}" data-k="${k}" role="switch" aria-checked="${!!S[k]}"></button></div>`;
  const sh = sheet(`<h2>Settings</h2>
    ${row('sound', 'Sound effects')}
    <div class="toggle-row"><div class="grow"><b>Volume</b></div><input type="range" id="vol" min="0" max="100" value="${Math.round(S.volume * 100)}"></div>
    ${row('haptics', 'Vibration', 'Small buzzes when you play')}
    ${row('reduceMotion', 'Reduce motion', 'Cards snap instead of flying')}
    ${row('timer', 'Turn timer', 'One minute a turn, five stars')}
    <div class="row"><button class="btn grey" id="sReset">Reset progress</button><button class="btn" id="sOk">Done</button></div>`);
  $$('.switch', sh.el).forEach((b) => (b.onclick = () => {
    const k = b.dataset.k;
    S[k] = !S[k];
    b.classList.toggle('on', S[k]);
    b.setAttribute('aria-checked', !!S[k]);
    store.save();
    applyTheme();
  }));
  $('#vol', sh.el).oninput = (e) => { S.volume = e.target.value / 100; configure({ volume: S.volume }); };
  $('#vol', sh.el).onchange = () => { store.save(); tone('place'); };
  $('#sOk', sh.el).onclick = () => { closeSheet(); };
  $('#sReset', sh.el).onclick = () => {
    const c = sheet(`<h2>Reset progress?</h2><p>Rank points, stats, matches and messages go back to the start. Your settings stay.</p><div class="row"><button class="btn grey" id="n">Keep</button><button class="btn danger" id="y">Reset</button></div>`, { center: true });
    $('#n', c.el).onclick = () => closeSheet();
    $('#y', c.el).onclick = () => {
      try { localStorage.removeItem('nikokadi.v2'); } catch (e) { /* ignore */ }
      location.reload();
    };
  };
}

// ------------------------------------------------------------------ play computer
export function showSetup(game) {
  const d = store.get();
  const screen = $('#screen');
  document.body.classList.add('playing');
  const unback = pushBack(() => leave());
  let li = d.level[game] ?? 2;
  if (!BOTS[li]) li = 2;
  let count = d.count[game] ?? 2;
  const rules = { ...d.rules };
  const leave = () => { unback(); document.body.classList.remove('playing'); go('home'); };
  const pips = (t) => `<span class="pips">${TIERS.map((_, i) => `<i class="${i <= TIERS.indexOf(t) ? 'on' : ''}"></i>`).join('')}</span>`;

  const stakes = () => {
    const opp = pickOpponents(BOTS[li].id, count - 1);
    return `Win <b>+${rpDelta(true, count, opp)} RP</b> · Lose <b>${rpDelta(false, count, opp)} RP</b>`;
  };

  const draw = () => {
    const bot = BOTS[li];
    screen.innerHTML = `<div class="setup">
      <div class="bar-top"><button class="icon-btn" id="sBack" aria-label="Back"><span class="ic">${ICON.back}</span></button><h1>Play ${GAMES[game].name}</h1></div>
      <div class="body">
        <div class="opp-hero">${avatarHTML(bot.avatar, 84)}<div><b>${esc(bot.name)}</b><span class="lvl"><span class="tag ${bot.tier}">${bot.tier}</span>${pips(bot.tier)}</span><p>${esc(bot.blurb)}</p></div></div>
        ${TIERS.map((t) => `<div class="tier">${t}</div><div class="bots">${BOTS.map((b, i) => (b.tier === t ? `<button class="botbtn ${i === li ? 'on' : ''}" data-i="${i}">${avatarHTML(b.avatar, 44)}<div><b>${esc(b.name)}</b></div></button>` : '')).join('')}</div>`).join('')}
        <div class="tier">Table</div>
        <div class="row-set"><span>Players</span><div class="seg" id="cnt">${[2, 3, 4].map((n) => `<button data-n="${n}" class="${n === count ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <div class="note-sm" id="stakes">${stakes()}</div>
        ${game === 'nk' ? `<button class="link" id="rulesBtn"><span class="grow">House rules<small>${ruleSummary(rules)}</small></span><span class="ic">${ICON.chevron}</span></button>` : ''}
      </div>
      <div class="foot"><button class="btn block" id="sStart">Start game</button></div>
    </div>`;
    $('#sBack', screen).onclick = () => { leave(); };
    $$('.botbtn', screen).forEach((b) => (b.onclick = () => { li = +b.dataset.i; const y = $('.body', screen).scrollTop; draw(); $('.body', screen).scrollTop = y; }));
    $$('#cnt button', screen).forEach((b) => (b.onclick = () => { count = +b.dataset.n; $$('#cnt button', screen).forEach((x) => x.classList.toggle('on', x === b)); $('#stakes', screen).innerHTML = stakes(); }));
    const rb = $('#rulesBtn', screen);
    if (rb) rb.onclick = () => { editRules(rules, () => { const y = $('.body', screen).scrollTop; draw(); $('.body', screen).scrollTop = y; }); };
    $('#sStart', screen).onclick = () => {
      d.level[game] = li; d.count[game] = count; d.rules = rules; d.game = game; store.save();
      unback();
      startGame(game, { botId: BOTS[li].id, count, rules });
    };
  };
  draw();
}

function ruleSummary(r) {
  const on = [r.flow && 'Flow', r.specialJK && 'Special J & K', r.liberal && 'Liberal'].filter(Boolean);
  return on.length ? on.join(' · ') : 'Standard rules';
}

function editRules(rules, done) {
  const items = [
    ['flow', 'Flow', 'An Ace on a penalty can pass it on instead of cancelling it.'],
    ['specialJK', 'Special J & K', 'A Jack passes a penalty forward. A King passes it back and reverses play.'],
    ['liberal', 'Liberal suits', 'Penalty cards stack on any suit.'],
  ];
  const sh = sheet(`<h2>House rules</h2><p>Only for games against the computer and private rooms. Online games always use the standard rules.</p>
    ${items.map(([k, t, s]) => `<div class="toggle-row"><div class="grow"><b>${t}</b><small>${s}</small></div><button class="switch ${rules[k] ? 'on' : ''}" data-k="${k}" role="switch" aria-checked="${!!rules[k]}"></button></div>`).join('')}
    <div class="row"><button class="btn block" id="ok">Done</button></div>`, { onClose: done });
  $$('.switch', sh.el).forEach((b) => (b.onclick = () => {
    const k = b.dataset.k;
    rules[k] = !rules[k];
    b.classList.toggle('on', rules[k]);
    b.setAttribute('aria-checked', !!rules[k]);
  }));
  $('#ok', sh.el).onclick = () => closeSheet();
}
