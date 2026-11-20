// Niko Kadi friends chat.
// Layout: a messenger-style list + thread (doodle wallpaper, voice notes, scroll-to-latest, pill composer).
// Borrowed bits: Signal (circle read-ticks, grouped bubbles without tails, unread badge),
// Instagram (story-ring friends tray, double-tap to ❤️, swipe to reply, gradient sent bubbles, floating reaction bar).
// Colours come from the app theme tokens (light/dark + selected theme), so it always matches the rest of Niko Kadi.
// Runs locally with simulated friend replies and routes sends through `chatNet` for future server sync.
import * as store from './store.js';
import { BOTS, botById } from './bots.js';
import { AI_CHAT_API_URL } from './ai-chat-config.js';
import { generateBotReply } from './ai-chat.js';
import { avatarHTML, PLAYER_AVATARS } from './avatars.js';
import { ICON } from './icons.js';
import { $, $$, esc, sheet, closeSheet, toast } from './ui.js';
import { go, startGame, pushBack } from './router.js';
import { net } from './online.js';

export const chatNet = {
  live: false,
  async send(chatId, msg) { return { ok: true, id: msg.id }; },
};

const REACTIONS = ['❤️', '👍', '😂', '😮', '🔥', '🃏'];
const EMOJIS = ['😀', '😂', '😅', '😎', '🥳', '🔥', '👏', '🙏', '❤️', '💯', '🃏', '♠️', '♥️', '♦️', '♣️', '🏆'];
const QUICK_REPLIES = ['Niko Kadi! 🃏', 'Rematch?', 'Good game! 👏', 'Post tena 😂', 'Ready to play!'];

// Chat wallpapers. Swatches mirror the CSS in chat.css ([data-wall]).
const WALLS = [
  ['default', 'Parlour', 'linear-gradient(155deg,#efe6cf,#ddd0b0)'],
  ['felt', 'Felt', 'radial-gradient(circle at 50% 35%,#16707e,#08404b)'],
  ['wood', 'Wood', 'url(img/wood.webp) center/cover'],
  ['night', 'Night', 'linear-gradient(155deg,#1f2b44,#0d1420)'],
];
const WALL_IDS = WALLS.map((w) => w[0]);
const wallOf = () => {
  const w = store.get().settings.chatBg;
  return WALL_IDS.includes(w) ? w : 'default';
};

const MONO_PALETTES = [
  ['#fadbd8', '#a93226'],
  ['#ebdef0', '#7d3c98'],
  ['#d6eaf8', '#2471a3'],
  ['#d5f5e3', '#1e8449'],
  ['#fdebd0', '#b9770e'],
];

const SEND_SVG = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
const MIC_SVG = '<svg viewBox="0 0 24 24"><path d="M12 14.5a3.2 3.2 0 0 0 3.2-3.2V5.7a3.2 3.2 0 0 0-6.4 0v5.6a3.2 3.2 0 0 0 3.2 3.2zm5.6-3.2a5.6 5.6 0 0 1-11.2 0H5a7 7 0 0 0 6 6.9V21h2v-2.8a7 7 0 0 0 6-6.9z"/></svg>';
const PEN_SVG = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
const PLUS_SVG = '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>';
const SMILE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.4 2 3.5 2 3.5-2 3.5-2" stroke-linecap="round"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>';
const SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const VERIFIED_SVG = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.7 1.7-1.1 3 .9 3.1-2.8 1.5-1 3-3.2-.5L12 22l-2.4-2.1-3.2.5-1-3-2.8-1.5.9-3.1-1.1-3 2.7-1.7.9-3.1 3.2.3z"/><path fill="#fff" d="M10.4 15.6l-3.1-3.1 1.4-1.4 1.7 1.7 4.9-4.9 1.4 1.4z"/></svg>';
const MUTED_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13.7 4.4A6 6 0 0 1 18 10v4l1.5 2H4.5L6 14v-4a6 6 0 0 1 .9-3.2"/><path d="M3 3l18 18"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>';
const REPLY_SVG = '<svg viewBox="0 0 24 24"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>';
const PLAY_SVG = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>';
const DOWN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

// Signal-style circle ticks: sent (one ring), delivered (two rings), read (two filled rings).
// The tick cut-out colour comes from --tick-cut so it matches whichever bubble it sits on.
function tickHTML(status) {
  const s = status || 'sent';
  const cut = 'style="stroke:var(--tick-cut,#fff)"';
  if (s === 'sent') {
    return `<span class="sig-tick" title="Sent"><svg viewBox="0 0 22 14"><circle cx="15" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12.6 7.1l1.7 1.7 3.2-3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  if (s === 'delivered') {
    return `<span class="sig-tick" title="Delivered"><svg viewBox="0 0 22 14"><circle cx="9.2" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7.1 7.1l1.4 1.4 2.7-2.9" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15.5" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M13.4 7.1l1.4 1.4 2.7-2.9" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  return `<span class="sig-tick read" title="Read"><svg viewBox="0 0 22 14"><circle cx="9.2" cy="7" r="5.3" fill="currentColor" opacity=".88"/><path d="M7.1 7.1l1.4 1.4 2.7-2.9" fill="none" ${cut} stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15.5" cy="7" r="5.3" fill="currentColor"/><path d="M13.4 7.1l1.4 1.4 2.7-2.9" fill="none" ${cut} stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}

let activeChatId = null;
let category = 'all'; // all | unread | online | bots
let search = '';
let replyTo = null;
let trayOpen = false;
let typingChatId = null;
let unback = null;
let rec = null; // voice note recording { start, iv }
let vp = null; // voice note "playback" { mid, i, timer }
const drafts = {};
const timers = new Set();

function later(ms, fn) {
  const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.add(id);
  return id;
}

function clearTimers() {
  for (const id of timers) clearTimeout(id);
  timers.clear();
}

const dayStart = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
const fmtTime = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function dayLabel(t) {
  const diff = Math.round((dayStart(new Date()) - dayStart(new Date(t))) / 864e5);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function listTime(t) {
  if (!t) return '';
  const diff = Math.round((dayStart(new Date()) - dayStart(new Date(t))) / 864e5);
  if (diff <= 0) return fmtTime(t);
  if (diff === 1) return 'Yesterday';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const isOnlyEmoji = (s) => !!s && /^(?:\p{Extended_Pictographic}|️|‍|\s){1,6}$/u.test(s) && /\p{Extended_Pictographic}/u.test(s);

function cleanup() {
  clearTimers();
  stopRec(false);
  stopVoice();
  activeChatId = null;
  replyTo = null;
  trayOpen = false;
  typingChatId = null;
  if (unback) { unback(); unback = null; }
}

function leaveChats() {
  cleanup();
  document.body.classList.remove('playing');
  go('more');
}

export function openChats() {
  cleanup();
  search = '';
  category = 'all';
  document.body.classList.add('playing');
  unback = pushBack(() => {
    if (activeChatId) closeThread();
    else leaveChats();
  });
  renderList();
}

function openThread(id) {
  activeChatId = id;
  replyTo = null;
  trayOpen = false;
  store.markChatRead(id);
  renderThread();
}

function closeThread() {
  saveDraft();
  stopRec(false);
  stopVoice();
  activeChatId = null;
  replyTo = null;
  trayOpen = false;
  renderList();
}

function saveDraft() {
  const inp = $('#mIn');
  if (activeChatId && inp) drafts[activeChatId] = inp.value;
}

// Refresh whichever view is on screen without touching the composer (keeps what the player is typing).
function refreshAny() {
  if (activeChatId && $('#wall')) refreshThread();
  else if ($('#cList')) renderListOnly();
}

// ------------------------------------------------------------------ Chats list
function filteredChats() {
  const q = search.trim().toLowerCase();
  return store.getChats().filter((c) => {
    if (category === 'unread' && !c.unread) return false;
    if (category === 'online' && !c.online) return false;
    if (category === 'bots' && !c.botId) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.messages.some((m) => (m.text || '').toLowerCase().includes(q));
  });
}

function storiesHTML() {
  const friends = store.getChats().filter((c) => !c.official && (c.online || c.unread)).slice(0, 12);
  return `<button class="story story-new" id="stNew" type="button"><span class="story-av"><span class="plus">${PLUS_SVG}</span></span><span class="story-name">New</span></button>
    ${friends.map((c) => `<button class="story${c.unread ? ' has-unread' : ''}" type="button" data-id="${esc(c.id)}">
      <span class="story-av ring">${avatarHTML(c.avatar, 54)}${c.online ? '<span class="online-dot"></span>' : ''}</span>
      <span class="story-name">${esc(c.name.split(' ')[0])}</span></button>`).join('')}`;
}

function renderList() {
  const screen = $('#screen');
  const cats = [['all', 'All'], ['unread', 'Unread'], ['online', 'Online'], ['bots', 'Table bots']];

  screen.innerHTML = `<div class="chat-page">
    <div class="chat-top">
      <button class="icon-btn" id="cBack" aria-label="Back"><span class="ic">${ICON.back}</span></button>
      <h1>Messages</h1>
    </div>
    <div class="chat-tools">
      <label class="chat-search">
        <span class="ic">${SEARCH_SVG}</span>
        <input type="text" id="cSearch" placeholder="Search friends or messages" value="${esc(search)}" autocomplete="off">
        <button type="button" id="cClr" aria-label="Clear"${search ? '' : ' hidden'}>✕</button>
      </label>
      <div class="chat-chips" id="cChips">
        ${cats.map(([k, lbl]) => `<button type="button" data-cat="${k}" class="${category === k ? 'on' : ''}">${lbl}</button>`).join('')}
      </div>
    </div>
    <div class="stories" id="stories"${search || category !== 'all' ? ' hidden' : ''}>${storiesHTML()}</div>
    <div class="chat-list" id="cList"></div>
    <button class="chat-fab" id="cFab" aria-label="New message">${PEN_SVG}</button>
  </div>`;

  $('#cBack', screen).onclick = () => leaveChats();
  $('#cFab', screen).onclick = () => openNewChat();
  const sn = $('#stNew', screen);
  if (sn) sn.onclick = () => openNewChat();
  $$('.story[data-id]', screen).forEach((el) => (el.onclick = () => openThread(el.dataset.id)));

  const inp = $('#cSearch', screen);
  inp.oninput = (e) => {
    search = e.target.value;
    $('#cClr').hidden = !search;
    renderListOnly();
  };
  $('#cClr', screen).onclick = () => { search = ''; inp.value = ''; $('#cClr').hidden = true; renderListOnly(); inp.focus(); };
  $$('#cChips button', screen).forEach((b) => (b.onclick = () => {
    category = b.dataset.cat;
    $$('#cChips button', screen).forEach((x) => x.classList.toggle('on', x === b));
    renderListOnly();
  }));

  renderListOnly();
}

function renderListOnly() {
  const box = $('#cList');
  if (!box) return;
  const shown = filteredChats();
  box.innerHTML = shown.length
    ? shown.map(chatRowHTML).join('')
    : `<div class="empty-note">${search || category !== 'all' ? 'No matching chats.' : 'No conversations here yet. Tap the pen to message a friend.'}</div>`;
  $$('.chat-row', box).forEach((el) => (el.onclick = () => openThread(el.dataset.id)));
  const st = $('#stories');
  if (st) {
    st.hidden = !!search || category !== 'all';
    if (!st.hidden) {
      st.innerHTML = storiesHTML();
      $('#stNew', st).onclick = () => openNewChat();
      $$('.story[data-id]', st).forEach((el) => (el.onclick = () => openThread(el.dataset.id)));
    }
  }
}

function previewText(m) {
  if (m.deleted) return 'Message deleted';
  if (m.voice) return `🎤 Voice message (${fmtDur(m.voice.dur)})`;
  if (m.invite) return `🃏 Game invite (${m.invite.game === 'ss' ? 'Special Sequence' : 'Niko Kadi'})`;
  return m.text;
}

function chatRowHTML(c) {
  const last = c.messages[c.messages.length - 1];
  const isTyping = typingChatId === c.id;
  let prev = 'Tap to start chatting';
  if (isTyping) prev = 'typing…';
  else if (last) prev = previewText(last);
  const timeStr = last ? listTime(last.t) : '';
  const own = !isTyping && last && last.from === 'me' && !last.deleted ? tickHTML(last.status) : '';

  return `<button class="chat-row${c.unread ? ' has-unread' : ''}" data-id="${esc(c.id)}">
    <span class="chat-av">${avatarHTML(c.avatar, 50)}${c.online && !c.official ? '<span class="online-dot"></span>' : ''}</span>
    <span class="chat-meta">
      <span class="top">
        <span class="name-wrap">
          <b>${esc(c.name)}</b>
          ${c.official ? `<span class="verified-ic">${VERIFIED_SVG}</span>` : ''}
          ${c.muted ? `<span class="muted-ic">${MUTED_SVG}</span>` : ''}
        </span>
        <time>${esc(timeStr)}</time>
      </span>
      <span class="bot">
        <span class="prev${isTyping ? ' typing' : ''}">${own}<span>${esc(prev)}</span></span>
        ${c.unread ? `<span class="chat-unread">${c.unread > 99 ? '99+' : c.unread}</span>` : ''}
      </span>
    </span>
  </button>`;
}

// ------------------------------------------------------------------ Thread view
function subtitle(c) {
  if (typingChatId === c.id) return 'typing…';
  if (c.official) return 'Official updates & support';
  return c.online ? 'Online' : (c.status || 'Last seen recently');
}

function renderThread() {
  const c = store.getChat(activeChatId);
  if (!c) { activeChatId = null; return renderList(); }
  const screen = $('#screen');
  const sub = subtitle(c);
  const isTyping = typingChatId === c.id;

  screen.innerHTML = `<div class="chat-thread" data-wall="${esc(wallOf())}">
    <div class="thread-top">
      <button class="icon-btn" id="tBack" aria-label="Back"><span class="ic">${ICON.back}</span></button>
      <button class="chat-peer" id="tInfo">
        <span class="chat-av${c.online && !c.official ? ' live' : ''}">${avatarHTML(c.avatar, 40)}</span>
        <span class="nm">
          <span class="nm-row"><b>${esc(c.name)}</b>${c.official ? `<span class="verified-ic">${VERIFIED_SVG}</span>` : ''}</span>
          <small id="tSub" class="${isTyping ? 'typing' : (c.online ? 'online' : '')}">${esc(sub)}</small>
        </span>
      </button>
      ${c.official ? '' : `<button class="icon-btn" id="tInvite" aria-label="Invite to game"><span class="ic">${ICON.spade}</span></button>`}
      <button class="icon-btn" id="tMenu" aria-label="Chat options"><span class="ic">${ICON.more}</span></button>
    </div>

    <div class="thread-canvas">
      <div class="chat-wall" id="wall">${renderMessagesHTML(c)}</div>
      <button class="to-bottom" id="toBottom" aria-label="Scroll to latest" hidden>${DOWN_SVG}</button>
    </div>

    <div class="reply-bar" id="replyBar" hidden>
      <div class="rline"><b id="rpName"></b><span id="rpText"></span></div>
      <button id="rCancel" aria-label="Cancel reply">${ICON.close}</button>
    </div>
    <div class="emoji-tray" id="tray" hidden>
      <div class="emoji-grid">${EMOJIS.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>
      <div class="quick-row">${QUICK_REPLIES.map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    </div>

    <div class="chat-comp" id="comp">
      <div class="chat-box">
        <button type="button" id="eBtn" aria-label="Emoji">${SMILE_SVG}</button>
        <textarea id="mIn" rows="1" maxlength="600"></textarea>
        ${c.official ? '' : `<button type="button" id="gBtn" aria-label="Invite to table"><span class="ic">${ICON.rematch}</span></button>`}
        <div class="rec-ui" id="recUi" hidden>
          <button type="button" id="recCancel" aria-label="Discard voice note">${TRASH_SVG}</button>
          <span class="rec-dot"></span><span id="recTime">0:00</span>
          <span class="rec-hint">Tap to send</span>
        </div>
      </div>
      <button type="button" class="send-btn" id="sBtn" aria-label="Send"><span class="i-mic">${MIC_SVG}</span><span class="i-send">${SEND_SVG}</span></button>
    </div>
  </div>`;

  const inp = $('#mIn', screen);
  inp.placeholder = c.official ? 'Message Niko Kadi Team' : `Message ${c.name}…`;
  inp.value = drafts[c.id] || '';
  autosize();
  syncComposer();

  const wall = $('#wall', screen);
  wall.scrollTop = wall.scrollHeight;
  paintVoice();

  $('#tBack', screen).onclick = closeThread;
  $('#tInfo', screen).onclick = () => openChatMenu(store.getChat(activeChatId));
  $('#tMenu', screen).onclick = () => openChatMenu(store.getChat(activeChatId));
  const inv = $('#tInvite', screen);
  if (inv) inv.onclick = () => openInvitePicker(store.getChat(activeChatId));
  const gBtn = $('#gBtn', screen);
  if (gBtn) gBtn.onclick = () => openInvitePicker(store.getChat(activeChatId));
  $('#rCancel', screen).onclick = clearReply;

  $('#eBtn', screen).onclick = () => {
    trayOpen = !trayOpen;
    $('#tray').hidden = !trayOpen;
    inp.focus();
  };
  $$('.emoji-grid button', screen).forEach((b) => (b.onclick = () => {
    inp.value += b.dataset.e;
    autosize();
    syncComposer();
    inp.focus();
  }));
  $$('.quick-row button', screen).forEach((b) => (b.onclick = () => {
    trayOpen = false;
    $('#tray').hidden = true;
    doSend(b.dataset.q);
  }));

  inp.addEventListener('input', () => { autosize(); syncComposer(); });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submitInput();
    }
  });
  $('#sBtn', screen).onclick = () => {
    if (rec) stopRec(true);
    else if (inp.value.trim()) submitInput();
    else startRec();
  };
  $('#recCancel', screen).onclick = () => stopRec(false);

  bindWall(wall);
  $('#toBottom', screen).onclick = () => wall.scrollTo({ top: wall.scrollHeight, behavior: 'smooth' });
}

function autosize() {
  const i = $('#mIn');
  if (!i) return;
  i.style.height = 'auto';
  i.style.height = Math.min(100, i.scrollHeight) + 'px';
}

// The send button doubles as the voice-note mic while the box is empty.
function syncComposer() {
  const i = $('#mIn'), comp = $('#comp');
  if (i && comp) comp.classList.toggle('typed', !!i.value.trim());
}

function refreshThread(forceBottom = false) {
  const c = store.getChat(activeChatId), wall = $('#wall');
  if (!c || !wall) return;
  const near = forceBottom || wall.scrollHeight - wall.scrollTop - wall.clientHeight < 140;
  wall.innerHTML = renderMessagesHTML(c);
  if (near) wall.scrollTop = wall.scrollHeight;
  const sub = $('#tSub');
  if (sub) {
    sub.textContent = subtitle(c);
    sub.className = typingChatId === c.id ? 'typing' : (c.online ? 'online' : '');
  }
  const tb = $('#toBottom');
  if (tb) tb.hidden = near;
  paintVoice();
}

function canBurst(a, b) {
  if (!a || !b) return false;
  if (a.from === 'system' || b.from === 'system') return false;
  if (a.from !== b.from) return false;
  if (a.deleted || b.deleted) return false;
  if (dayLabel(a.t) !== dayLabel(b.t)) return false;
  return Math.abs(b.t - a.t) < 180000;
}

function waveBars(id, n = 26) {
  let h = 7;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  let out = '';
  for (let i = 0; i < n; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    out += `<i style="height:${6 + ((h >>> 16) % 17)}px"></i>`;
  }
  return out;
}

function renderMessagesHTML(c) {
  let out = '';
  let lastDay = '';
  const msgs = c.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const dl = dayLabel(m.t);
    if (dl !== lastDay) { out += `<div class="chat-day">${esc(dl)}</div>`; lastDay = dl; }
    if (m.from === 'system') { out += `<div class="chat-sys">${esc(m.text)}</div>`; continue; }

    const prev = msgs[i - 1], next = msgs[i + 1];
    const samePrev = canBurst(prev, m);
    const sameNext = canBurst(m, next) && !(m.reactions && m.reactions.length);
    const grp = !samePrev && !sameNext ? 'g-single' : !samePrev ? 'g-start' : sameNext ? 'g-mid' : 'g-end';
    const side = m.from === 'me' ? 'out' : 'in';

    const rxs = [...new Set(m.reactions || [])];
    const rx = rxs.length ? `<div class="reacts">${rxs.map((r) => `<span>${r}</span>`).join('')}</div>` : '';
    const ticks = m.from === 'me' && !m.deleted ? tickHTML(m.status) : '';
    const showFoot = !sameNext || m.invite || m.voice || m.deleted;
    const foot = showFoot ? `<span class="msg-foot"><span>${fmtTime(m.t)}</span>${ticks}</span>` : '';

    const reply = m.replyTo && !m.deleted
      ? `<div class="reply-box" data-q="${esc(m.replyTo.id || '')}"><b>${esc(m.replyTo.fromName || 'Friend')}</b><span>${esc(m.replyTo.text || '')}</span></div>`
      : '';
    const invite = m.invite && !m.deleted
      ? `<div class="invite-card"><div class="itop"><span class="ic">${m.invite.game === 'ss' ? ICON.seq : ICON.spade}</span><div><b>${m.invite.game === 'ss' ? 'Special Sequence' : 'Niko Kadi'} Table</b><small>Room ${esc(m.invite.code)} · ${m.invite.count} players</small></div></div><button class="join-btn" data-game="${m.invite.game}">Play now</button></div>`
      : '';
    const voice = m.voice && !m.deleted
      ? `<div class="voice" data-dur="${m.voice.dur}"><button type="button" class="v-play" aria-label="Play voice message">${PLAY_SVG}</button><div class="wave">${waveBars(m.id)}</div><span class="v-dur">${fmtDur(m.voice.dur)}</span></div>`
      : '';
    const body = m.deleted
      ? '<span class="msg-text del">Message deleted</span>'
      : (m.text ? `<span class="msg-text">${esc(m.text)}</span>` : '');
    const big = !m.deleted && !reply && !invite && !voice && isOnlyEmoji(m.text);

    out += `<div class="msg-row ${side} ${grp}" data-mid="${esc(m.id)}">
      <div class="bubble-wrapper">
        <span class="swipe-ic">${REPLY_SVG}</span>
        <div class="bubble${big ? ' big' : ''}" data-mid="${esc(m.id)}">${reply}${invite}${voice}<div class="msg-line">${body}${foot}</div></div>
      </div>
      ${rx}
    </div>`;
  }
  if (typingChatId === c.id) {
    out += `<div class="msg-row in g-single"><div class="bubble-wrapper"><div class="bubble"><span class="typing-dots"><i></i><i></i><i></i></span></div></div></div>`;
  }
  return out || '<div class="empty-note">Say hello to start the conversation!</div>';
}

// Taps, double-taps (❤️), swipe-to-reply, scroll button — all delegated from the wall.
function bindWall(wall) {
  let tapTimer = null;
  let lastTap = { mid: null, t: 0 };
  let swiped = false;
  let sw = null;

  wall.addEventListener('click', (e) => {
    const c = store.getChat(activeChatId);
    if (!c) return;
    const join = e.target.closest('.join-btn');
    if (join) { e.stopPropagation(); joinInvite(c, join.dataset.game); return; }
    const q = e.target.closest('.reply-box');
    if (q) { jumpTo(q.dataset.q); return; }
    const play = e.target.closest('.v-play');
    if (play) { toggleVoice(play.closest('.voice')); return; }
    const b = e.target.closest('.bubble');
    if (!b || !b.dataset.mid) return;
    if (swiped) { swiped = false; return; }
    const mid = b.dataset.mid;
    const now = Date.now();
    if (lastTap.mid === mid && now - lastTap.t < 320) {
      clearTimeout(tapTimer);
      lastTap = { mid: null, t: 0 };
      likeMessage(mid);
      return;
    }
    lastTap = { mid, t: now };
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => openMessageActions(store.getChat(activeChatId), mid), 300);
  });

  wall.addEventListener('scroll', () => {
    const tb = $('#toBottom');
    if (tb) tb.hidden = wall.scrollHeight - wall.scrollTop - wall.clientHeight < 140;
  });

  wall.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.msg-row');
    if (!row || !row.dataset.mid || e.touches.length !== 1) return;
    const t = e.touches[0];
    sw = { row, x: t.clientX, y: t.clientY, dx: 0, on: false };
  }, { passive: true });
  wall.addEventListener('touchmove', (e) => {
    if (!sw) return;
    const t = e.touches[0];
    const dx = t.clientX - sw.x, dy = t.clientY - sw.y;
    if (!sw.on) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (dx > 14 && dx > Math.abs(dy) * 1.5) { sw.on = true; sw.row.classList.add('swiping'); } else return;
    }
    sw.dx = Math.min(dx, 90);
    sw.row.style.setProperty('--sx', (sw.dx * 0.8).toFixed(1) + 'px');
    sw.row.style.setProperty('--sp', Math.min(1, sw.dx / 56).toFixed(2));
  }, { passive: true });
  const endSwipe = () => {
    if (!sw) return;
    const { row, dx, on } = sw;
    sw = null;
    row.classList.remove('swiping');
    row.style.removeProperty('--sx');
    row.style.removeProperty('--sp');
    if (on) {
      swiped = true;
      setTimeout(() => { swiped = false; }, 120);
      if (dx >= 56) setReplyFor(row.dataset.mid);
    }
  };
  wall.addEventListener('touchend', endSwipe);
  wall.addEventListener('touchcancel', endSwipe);
}

function jumpTo(mid) {
  if (!mid) return;
  const el = $(`.msg-row[data-mid="${CSS.escape(mid)}"] .bubble`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function likeMessage(mid) {
  const c = store.getChat(activeChatId);
  const m = c && c.messages.find((x) => x.id === mid);
  if (!m || m.deleted) return;
  if (!(m.reactions || []).includes('❤️')) store.toggleReaction(c.id, mid, '❤️');
  refreshThread();
  const r = $(`.msg-row[data-mid="${CSS.escape(mid)}"] .reacts`);
  if (r) r.classList.add('pop');
}

// ------------------------------------------------------------------ reply
function setReplyFor(mid) {
  const c = store.getChat(activeChatId);
  const m = c && c.messages.find((x) => x.id === mid);
  if (!m || m.deleted) return;
  replyTo = {
    id: m.id,
    fromName: m.from === 'me' ? 'You' : c.name,
    text: m.voice ? '🎤 Voice message' : m.invite ? 'Game invite' : (m.text || ''),
  };
  $('#rpName').textContent = replyTo.fromName;
  $('#rpText').textContent = replyTo.text;
  $('#replyBar').hidden = false;
  const inp = $('#mIn');
  if (inp) inp.focus();
}

function clearReply() {
  replyTo = null;
  const bar = $('#replyBar');
  if (bar) bar.hidden = true;
}

// ------------------------------------------------------------------ voice notes (recorded as a duration only; no audio is stored)
function startRec() {
  if (rec) return;
  const comp = $('#comp');
  if (!comp) return;
  rec = { start: Date.now(), iv: null };
  comp.classList.add('recording');
  $('#recUi').hidden = false;
  $('#recTime').textContent = '0:00';
  rec.iv = setInterval(() => {
    const t = $('#recTime');
    if (t && rec) t.textContent = fmtDur(Math.round((Date.now() - rec.start) / 1000));
  }, 250);
}

function stopRec(send) {
  if (!rec) return;
  const secs = Math.max(1, Math.round((Date.now() - rec.start) / 1000));
  clearInterval(rec.iv);
  rec = null;
  const comp = $('#comp');
  if (comp) comp.classList.remove('recording');
  const ui = $('#recUi');
  if (ui) ui.hidden = true;
  if (send) doSend('', null, { voice: { dur: Math.min(secs, 599) } });
}

function toggleVoice(el) {
  const bubble = el.closest('.bubble');
  if (!bubble) return;
  const mid = bubble.dataset.mid;
  if (vp && vp.mid === mid) { stopVoice(); return; }
  stopVoice();
  const total = $$('.wave i', el).length;
  const dur = +el.dataset.dur || 3;
  vp = { mid, i: 0, timer: null };
  vp.timer = setInterval(() => {
    if (!vp) return;
    vp.i++;
    if (vp.i > total) { stopVoice(); return; }
    paintVoice();
  }, Math.max(90, (dur * 1000) / total));
  paintVoice();
}

function stopVoice() {
  if (vp) { clearInterval(vp.timer); vp = null; }
  paintVoice();
}

function paintVoice() {
  $$('.voice').forEach((v) => {
    const b = v.closest('.bubble');
    const on = !!(vp && b && b.dataset.mid === vp.mid);
    v.classList.toggle('playing', on);
    $$('.wave i', v).forEach((bar, k) => bar.classList.toggle('done', on && k < vp.i));
    const btn = $('.v-play', v);
    if (btn) btn.innerHTML = on ? PAUSE_SVG : PLAY_SVG;
  });
}

// ------------------------------------------------------------------ sending
function submitInput() {
  const inp = $('#mIn');
  if (!inp) return;
  const txt = inp.value.trim();
  if (!txt) return;
  inp.value = '';
  drafts[activeChatId] = '';
  autosize();
  syncComposer();
  trayOpen = false;
  const tray = $('#tray');
  if (tray) tray.hidden = true;
  doSend(txt);
}

async function doSend(text, invite = null, extra = null) {
  const c = store.getChat(activeChatId);
  if (!c) return;
  const msg = store.sendMessage(c.id, {
    from: 'me',
    text,
    invite,
    status: 'sent',
    replyTo: replyTo ? { ...replyTo } : null,
    ...(extra || {}),
  });
  clearReply();
  refreshThread(true);
  await chatNet.send(c.id, msg);

  if (!chatNet.live) {
    const cid = c.id;
    const mid = msg.id;
    later(350, () => { store.updateMessage(cid, mid, { status: 'delivered' }); refreshAny(); });
    later(900, () => {
      store.updateMessage(cid, mid, { status: 'read' });
      typingChatId = cid;
      refreshAny();
    });
    later(1900 + Math.random() * 900, () => {
      void sendAutoReply(c, text, invite, extra, cid);
    });
  }
}

async function sendAutoReply(chat, text, invite, extra, chatId) {
  try {
    let replyText;
    if (chat.botId && AI_CHAT_API_URL && !invite && !(extra && extra.voice)) {
      const bot = botById(chat.botId);
      const history = chat.messages
        .filter((m) => !m.deleted && !m.invite && !m.voice && (m.from === 'me' || m.from === 'them'))
        .slice(-12)
        .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text || '' }));
      const firstUserMessage = history.findIndex((message) => message.role === 'user');
      replyText = await generateBotReply({
        endpoint: AI_CHAT_API_URL,
        bot,
        messages: history.slice(firstUserMessage),
      });
    } else {
      replyText = buildAutoReply(chat, text, invite, extra);
    }

    if (replyText && store.getChat(chatId)) {
      store.sendMessage(chatId, { from: 'them', text: replyText });
      if (activeChatId === chatId) store.markChatRead(chatId);
    }
  } catch (error) {
    console.error('AI bot reply failed:', error);
    toast('AI reply failed. Check the connection and AI setup.', 3200);
  } finally {
    if (typingChatId === chatId) typingChatId = null;
    refreshAny();
  }
}

function buildAutoReply(chat, text, invite, extra) {
  if (invite) return `Deal! Joining your ${invite.game === 'ss' ? 'Special Sequence' : 'Niko Kadi'} table — tap "Play now" whenever you're ready 🃏`;
  if (extra && extra.voice) return 'Got your voice note 🎧 Can’t play it right now, but I’m in!';
  const t = (text || '').toLowerCase();
  if (chat.official) return 'Thanks for writing! Offline support replies right here, and online feedback tools are coming in the next update.';
  if (/\b(hi|hello|hey|sasa|mambo|niaje|wasee)\b/.test(t)) return 'Mambo! Ready for a round of Niko Kadi? 😄';
  if (/\b(play|game|rematch|table|room|join|kadi)\b/.test(t)) return 'Send a table invite with the spade button at the top and let’s play! ♠️';
  if (/\b(gg|good game|well played|nice|won|win)\b/.test(t)) return 'Good game! Careful next round though, I’m holding onto my Aces 👀';
  if (/\b(ace|jack|joker|penalty|queen)\b/.test(t)) return 'Haha those Jokers and Aces always flip the whole table 🔥';
  const pool = [
    'Haha for sure! Fancy a quick match?',
    'Wait till we play 4-player Niko Kadi — chaos every time 😂',
    'Just warming up my shuffle! 🃏',
    'Let me know when you open a table!',
  ];
  return pool[(Math.random() * pool.length) | 0];
}

// ------------------------------------------------------------------ sheets
function openMessageActions(chat, msgId) {
  if (!chat) return;
  const m = chat.messages.find((x) => x.id === msgId);
  if (!m) return;
  const sh = sheet(`
    ${m.deleted ? '' : `<div class="react-bar">${REACTIONS.map((e) => `<button data-e="${e}">${e}</button>`).join('')}</div>`}
    ${m.deleted ? '' : `<button class="opt" id="aRep"><span class="ic">${ICON.reverse}</span><div>Reply</div></button>`}
    ${m.text && !m.deleted ? `<button class="opt" id="aCopy"><span class="ic">${ICON.doc}</span><div>Copy text</div></button>` : ''}
    ${m.from === 'me' && !m.deleted ? `<button class="opt" id="aDel"><span class="ic" style="color:var(--danger)">${ICON.close}</span><div>Delete message</div></button>` : ''}
    <div class="row"><button class="btn grey block" id="aClose">Cancel</button></div>
  `);
  $$('.react-bar button', sh.el).forEach((b) => (b.onclick = () => {
    store.toggleReaction(chat.id, m.id, b.dataset.e);
    closeSheet(true);
    refreshThread();
  }));
  const rep = $('#aRep', sh.el);
  if (rep) rep.onclick = () => { closeSheet(true); setReplyFor(m.id); };
  const cp = $('#aCopy', sh.el);
  if (cp) cp.onclick = async () => {
    try { await navigator.clipboard.writeText(m.text); toast('Copied'); } catch (e) { toast('Could not copy'); }
    closeSheet(true);
  };
  const dl = $('#aDel', sh.el);
  if (dl) dl.onclick = () => {
    store.deleteMessage(chat.id, m.id);
    store.updateMessage(chat.id, m.id, { voice: null });
    closeSheet(true);
    refreshThread();
  };
  $('#aClose', sh.el).onclick = () => closeSheet();
}

function openInvitePicker(chat) {
  if (!chat) return;
  const sh = sheet(`<h2>Invite ${esc(chat.name)}</h2><p>Send a table invite directly into the chat.</p>
    <button class="opt" data-g="nk"><span class="ic">${ICON.spade}</span><div>Niko Kadi<small>2-player match · earns RP</small></div></button>
    <button class="opt" data-g="ss"><span class="ic">${ICON.seq}</span><div>Special Sequence<small>Casual 4-card set match</small></div></button>
    <div class="row"><button class="btn grey block" id="x">Cancel</button></div>`, { center: true });
  $$('.opt', sh.el).forEach((b) => (b.onclick = () => {
    const game = b.dataset.g;
    closeSheet(true);
    doSend('', { game, code: net.newRoomCode(), count: 2, botId: chat.botId || 'wanjiru' });
  }));
  $('#x', sh.el).onclick = () => closeSheet();
}

function joinInvite(chat, game) {
  const d = store.get();
  const botId = chat.botId || BOTS[d.level[game] ?? 2].id;
  cleanup();
  startGame(game, { botId, count: 2, rules: d.rules });
}

function openChatMenu(chat) {
  if (!chat) return;
  const d = store.get();
  const curWall = wallOf();
  const sh = sheet(`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      ${avatarHTML(chat.avatar, 54)}
      <div><h2 style="margin:0">${esc(chat.name)}</h2><p>${esc(chat.online ? 'Online now' : (chat.status || 'Friend'))}</p></div>
    </div>
    <h3>Chat wallpaper</h3>
    <div class="walls">${WALLS.map(([k, lbl, bg]) => `<button data-w="${k}" class="${curWall === k ? 'on' : ''}"><i style="background:${bg}"></i>${lbl}</button>`).join('')}</div>
    <button class="opt" id="cmMute"><span class="ic">${chat.muted ? ICON.sound : ICON.mute}</span><div>${chat.muted ? 'Unmute notifications' : 'Mute notifications'}</div></button>
    <button class="opt" id="cmClr"><span class="ic">${ICON.doc}</span><div>Clear chat history</div></button>
    ${chat.official ? '' : `<button class="opt" id="cmDel"><span class="ic" style="color:var(--danger)">${ICON.close}</span><div>Remove conversation</div></button>`}
    <div class="row"><button class="btn grey block" id="cmOk">Close</button></div>
  `);
  $$('.walls button', sh.el).forEach((b) => (b.onclick = () => {
    d.settings.chatBg = b.dataset.w;
    store.save();
    $$('.walls button', sh.el).forEach((x) => x.classList.toggle('on', x === b));
    const th = $('.chat-thread');
    if (th) th.dataset.wall = d.settings.chatBg;
  }));
  $('#cmMute', sh.el).onclick = () => { store.toggleMuteChat(chat.id); closeSheet(true); toast(chat.muted ? 'Muted' : 'Unmuted'); };
  $('#cmClr', sh.el).onclick = () => { store.clearChat(chat.id); closeSheet(true); refreshThread(true); toast('Chat cleared'); };
  const del = $('#cmDel', sh.el);
  if (del) del.onclick = () => {
    store.deleteChat(chat.id);
    activeChatId = null;
    closeSheet(true);
    renderList();
    toast('Conversation removed');
  };
  $('#cmOk', sh.el).onclick = () => closeSheet();
}

function makeInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const raw = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'NK';
}

function openNewChat() {
  const existing = new Set(store.getChats().map((c) => c.botId).filter(Boolean));
  const avail = BOTS.filter((b) => !existing.has(b.id));
  let pickAv = 'mono';
  const draw = (el) => {
    el.innerHTML = `<h2>New message</h2>
      ${avail.length ? `<h3>Table friends</h3>
        <div class="bots" style="margin-bottom:14px">${avail.map((b) => `<button class="botbtn" data-bot="${b.id}">${avatarHTML(b.avatar, 42)}<div><b>${esc(b.name)}</b><small style="color:var(--muted);font-size:12px">${b.tier}</small></div></button>`).join('')}</div>` : ''}
      <h3>Add a friend</h3>
      <input type="text" id="fName" maxlength="18" placeholder="Friend's name" autocomplete="off">
      <div class="avgrid" style="margin-top:10px">
        <button data-av="mono" class="${pickAv === 'mono' ? 'on' : ''}">${avatarHTML({ initials: 'AB', bg: MONO_PALETTES[0][0], fg: MONO_PALETTES[0][1] }, 52)}</button>
        ${PLAYER_AVATARS.slice(0, 11).map((a, i) => `<button data-av="${i}" class="${i === pickAv ? 'on' : ''}">${avatarHTML(a, 52)}</button>`).join('')}
      </div>
      <div class="row"><button class="btn grey" id="fCx">Cancel</button><button class="btn" id="fAdd">Start chat</button></div>`;
    $$('[data-bot]', el).forEach((b) => (b.onclick = () => {
      const bot = BOTS.find((x) => x.id === b.dataset.bot);
      if (!bot) return;
      const c = store.addChat({ id: 'bot_' + bot.id, name: bot.name, avatar: bot.avatar, botId: bot.id, online: true, status: `${bot.tier} player` });
      closeSheet(true);
      openThread(c.id);
    }));
    $$('[data-av]', el).forEach((b) => (b.onclick = () => {
      pickAv = b.dataset.av === 'mono' ? 'mono' : +b.dataset.av;
      $$('[data-av]', el).forEach((x) => x.classList.toggle('on', x.dataset.av === String(pickAv)));
    }));
    $('#fCx', el).onclick = () => closeSheet();
    $('#fAdd', el).onclick = () => {
      const name = ($('#fName', el).value || '').trim().slice(0, 18);
      if (!name) { toast('Enter a name'); return; }
      const pal = MONO_PALETTES[name.length % MONO_PALETTES.length];
      const avatar = pickAv === 'mono'
        ? { initials: makeInitials(name), bg: pal[0], fg: pal[1] }
        : (PLAYER_AVATARS[pickAv] || PLAYER_AVATARS[0]);
      const c = store.addChat({ name, avatar, online: true, status: 'Friend' });
      closeSheet(true);
      openThread(c.id);
    };
  };
  const sh = sheet('');
  draw(sh.el);
}
