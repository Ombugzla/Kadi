// Niko Kadi friends chat.
// Layout: a messenger-style list + thread (doodle wallpaper, voice notes, scroll-to-latest, pill composer).
// Borrowed bits: Signal (circle read-ticks, grouped bubbles without tails, unread badge),
// Instagram (story-ring friends tray, double-tap to ❤️, swipe to reply, gradient sent bubbles, floating reaction bar).
// Colours come from the app theme tokens (light/dark + selected theme), so it always matches the rest of Niko Kadi.
// Player chats sync through Supabase; the assistant replies through the configured AI service.
import * as store from './store.js';
import { BOTS, botById } from './bots.js';
import { AI_CHAT_API_URL } from './ai-chat-config.js';
import { generateBotReply } from './ai-chat.js';
import {
  currentDirectUserId,
  directChatId,
  loadDirectMessages,
  loadFriendRequests,
  loadDirectThreads,
  loadDirectVoice,
  mapDirectMessage,
  markDirectMessagesRead,
  respondToFriendRequest,
  sendFriendRequest,
  sendDirectMessage,
  sendDirectVoice,
  syncPlayerProfile,
  watchDirectMessages,
  watchFriendRequests,
} from './direct-messages.js';
import { avatarHTML, playerAvatar, PLAYER_AVATARS } from './avatars.js';
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
  if (s === 'failed') return '<span class="sig-tick failed" title="Failed to send">!</span>';
  if (s === 'sent') {
    return `<span class="sig-tick" title="Sent"><svg viewBox="0 0 22 14"><circle cx="15" cy="7" r="5.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12.6 7.1l1.7 1.7 3.2-3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  if (s === 'delivered') {
    return `<span class="sig-tick" title="Delivered"><svg viewBox="0 0 22 14"><circle cx="9.2" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M7.1 7.1l1.4 1.4 2.7-2.9" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15.5" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M13.4 7.1l1.4 1.4 2.7-2.9" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }
  return `<span class="sig-tick read" title="Read"><svg viewBox="0 0 22 14"><circle cx="9.2" cy="7" r="5.3" fill="currentColor" opacity=".88"/><path d="M7.1 7.1l1.4 1.4 2.7-2.9" fill="none" ${cut} stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15.5" cy="7" r="5.3" fill="currentColor"/><path d="M13.4 7.1l1.4 1.4 2.7-2.9" fill="none" ${cut} stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}

let activeChatId = null;
let category = 'all'; // all | unread | online
let search = '';
let replyTo = null;
let trayOpen = false;
let typingChatId = null;
let unback = null;
let rec = null;
let vp = null;
let voiceLoadToken = 0;
let recordingChatId = null;
let stopWatchingDirectMessages = null;
let stopWatchingFriendRequests = null;
let directChatEpoch = 0;
let directUserId = null;
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
  directChatEpoch++;
  directUserId = null;
  if (stopWatchingDirectMessages) {
    stopWatchingDirectMessages();
    stopWatchingDirectMessages = null;
  }
  if (stopWatchingFriendRequests) {
    stopWatchingFriendRequests();
    stopWatchingFriendRequests = null;
  }
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
  const epoch = directChatEpoch;
  void syncDirectChats(epoch).catch((error) => {
    if (epoch !== directChatEpoch) return;
    console.error('Could not sync friend messages:', error);
    toast(error.message || 'Could not load friend messages.');
  });
}

function openThread(id) {
  activeChatId = id;
  replyTo = null;
  trayOpen = false;
  store.markChatRead(id);
  renderThread();
  const chat = store.getChat(id);
  if (chat?.remoteUserId) void loadDirectThread(chat).catch((error) => {
    if (activeChatId !== id) return;
    console.error('Could not load friend message history:', error);
    toast(error.message || 'Could not load this conversation.');
  });
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

function addDirectThread(thread, userId) {
  const id = directChatId(thread.peer_id);
  const chat = store.addChat({
    id,
    remoteUserId: thread.peer_id,
    remoteOwnerId: userId,
    name: thread.display_name,
    avatar: thread.avatar || PLAYER_AVATARS[0],
    online: false,
    status: 'Friend',
  });
  if (thread.last_message_id) {
    store.syncDirectMessage(id, mapDirectMessage({
      id: thread.last_message_id,
      client_id: thread.last_message_client_id,
      sender_id: thread.last_message_sender_id,
      recipient_id: thread.last_message_recipient_id,
      body: thread.last_message,
      created_at: thread.last_message_at,
      read_at: thread.last_message_read_at,
      voice_path: thread.last_message_voice_path,
      voice_duration: thread.last_message_voice_duration,
    }, userId));
  }
  store.setChatUnread(id, thread.unread_count);
  return chat;
}

async function syncFriendRequestNotifications(userId) {
  const result = await loadFriendRequests();
  if (result.userId !== userId) throw new Error('The active account changed.');
  for (const request of result.incoming) {
    store.addInbox('note', {
      id: `friend-request:${request.id}`,
      type: 'friend-request',
      requestId: request.id,
      from: request.name,
      title: 'Friend request',
      body: `${request.name} wants to connect and chat.`,
    });
  }
}

async function syncDirectThreadList(userId, epoch) {
  const result = await loadDirectThreads();
  if (result.userId !== userId) throw new Error('The active account changed.');
  if (epoch !== directChatEpoch) return;
  for (const thread of result.threads) addDirectThread(thread, userId);
  if (activeChatId) refreshThread(true);
  else renderListOnly();
}

async function syncDirectChats(epoch) {
  const userId = await currentDirectUserId();
  if (epoch !== directChatEpoch) return;
  directUserId = userId;
  const profile = store.get();
  try {
    const syncedUserId = await syncPlayerProfile(profile.name, playerAvatar(profile));
    if (syncedUserId !== userId) throw new Error('The active account changed.');
  } catch (error) {
    if (epoch !== directChatEpoch) return;
    console.error('Could not sync the player profile:', error);
    toast(error.message || 'Could not sync the player profile.');
  }
  if (epoch !== directChatEpoch) return;
  store.removeDirectChatsExcept(userId);
  renderListOnly();
  try {
    await syncFriendRequestNotifications(userId);
  } catch (error) {
    if (epoch !== directChatEpoch) return;
    console.error('Could not load friend requests:', error);
    toast(error.message || 'Could not load friend requests.');
  }
  try {
    const stop = await watchDirectMessages(userId, {
      onMessage: (row) => {
        void receiveDirectMessage(row, userId).catch((error) => {
          console.error('Could not receive a friend message:', error);
          toast(error.message || 'Could not load a new friend message.');
        });
      },
      onRead: (row) => {
        try {
          const chatId = directChatId(row.recipient_id);
          store.syncDirectMessage(chatId, mapDirectMessage(row, userId));
          refreshAny();
        } catch (error) {
          console.error('Could not update friend message status:', error);
        }
      },
      onError: (error) => {
        console.error('Friend messages lost their live connection:', error);
        toast(error.message || 'Friend messages lost their live connection.');
      },
    });
    if (epoch !== directChatEpoch) {
      stop();
      return;
    }
    stopWatchingDirectMessages = stop;
  } catch (error) {
    if (epoch !== directChatEpoch) return;
    console.error('Could not start live friend messages:', error);
    toast(error.message || 'Live friend messages are unavailable.');
  }
  try {
    const stop = await watchFriendRequests(userId, {
      onChange: () => {
        void syncFriendRequestNotifications(userId).then(() => syncDirectThreadList(userId, epoch)).catch((error) => {
          if (epoch !== directChatEpoch) return;
          console.error('Could not refresh friend requests:', error);
          toast(error.message || 'Could not refresh friend requests.');
        });
      },
      onError: (error) => {
        console.error('Friend requests lost their live connection:', error);
        toast(error.message || 'Friend requests lost their live connection.');
      },
    });
    if (epoch !== directChatEpoch) {
      stop();
      return;
    }
    stopWatchingFriendRequests = stop;
  } catch (error) {
    if (epoch !== directChatEpoch) return;
    console.error('Could not start live friend requests:', error);
    toast(error.message || 'Live friend requests are unavailable.');
  }

  try {
    await syncDirectThreadList(userId, epoch);
  } catch (error) {
    if (epoch !== directChatEpoch) return;
    console.error('Could not load friend conversations:', error);
    toast(error.message || 'Could not load friend conversations.');
    renderListOnly();
  }
}

async function loadDirectThread(chat) {
  const { userId, messages } = await loadDirectMessages(chat.remoteUserId);
  if (!store.getChat(chat.id)) return;
  for (const message of messages) {
    store.syncDirectMessage(chat.id, mapDirectMessage(message, userId));
  }
  await markDirectMessagesRead(chat.remoteUserId);
  store.markChatRead(chat.id);
  if (activeChatId === chat.id) refreshThread(true);
}

async function receiveDirectMessage(row, userId) {
  const chatId = directChatId(row.sender_id);
  let chat = store.getChat(chatId);
  if (!chat) {
    const { threads } = await loadDirectThreads();
    const thread = threads.find((item) => item.peer_id === row.sender_id);
    if (!thread) throw new Error('Could not load this player profile.');
    chat = addDirectThread(thread, userId);
  }
  store.syncDirectMessage(chatId, mapDirectMessage(row, userId));
  if (activeChatId === chatId) {
    store.markChatRead(chatId);
    await markDirectMessagesRead(row.sender_id);
  }
  refreshAny();
}

// ------------------------------------------------------------------ Chats list
function filteredChats() {
  const q = search.trim().toLowerCase();
  return store.getChats().filter((c) => {
    if (c.remoteUserId && c.remoteOwnerId !== directUserId) return false;
    if (category === 'unread' && !c.unread) return false;
    if (category === 'online' && !c.online) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.messages.some((m) => (m.text || '').toLowerCase().includes(q));
  });
}

function storiesHTML() {
  const friends = store.getChats().filter((c) =>
    (!c.remoteUserId || c.remoteOwnerId === directUserId) && !c.official && (c.online || c.unread)
  ).slice(0, 12);
  return `<button class="story story-new" id="stNew" type="button"><span class="story-av"><span class="plus">${PLUS_SVG}</span></span><span class="story-name">New</span></button>
    ${friends.map((c) => `<button class="story${c.unread ? ' has-unread' : ''}" type="button" data-id="${esc(c.id)}">
      <span class="story-av ring">${avatarHTML(c.avatar, 54)}${c.online ? '<span class="online-dot"></span>' : ''}</span>
      <span class="story-name">${esc(c.name.split(' ')[0])}</span></button>`).join('')}`;
}

function renderList() {
  const screen = $('#screen');
  const cats = [['all', 'All'], ['unread', 'Unread'], ['online', 'Online']];

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
  if (c.assistant) return 'AI assistant';
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
      ${c.official || c.remoteUserId ? '' : `<button class="icon-btn" id="tInvite" aria-label="Invite to game"><span class="ic">${ICON.spade}</span></button>`}
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
        ${c.official || c.remoteUserId ? '' : `<button type="button" id="gBtn" aria-label="Invite to table"><span class="ic">${ICON.rematch}</span></button>`}
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
  inp.placeholder = c.assistant ? `Ask ${c.name}…` : c.official ? 'Message Niko Kadi Team' : `Message ${c.name}…`;
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
    const showFoot = !sameNext || m.invite || m.voice || m.deleted || m.status === 'failed';
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
  if (!m || m.deleted || c.remoteUserId) return;
  if (!(m.reactions || []).includes('❤️')) store.toggleReaction(c.id, mid, '❤️');
  refreshThread();
  const r = $(`.msg-row[data-mid="${CSS.escape(mid)}"] .reacts`);
  if (r) r.classList.add('pop');
}

// ------------------------------------------------------------------ reply
function setReplyFor(mid) {
  const c = store.getChat(activeChatId);
  const m = c && c.messages.find((x) => x.id === mid);
  if (!m || m.deleted || c.remoteUserId) return;
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

// ------------------------------------------------------------------ voice notes
function startRec() {
  if (rec || recordingChatId) return;
  const chat = store.getChat(activeChatId);
  if (chat?.remoteUserId) {
    void startDirectRec(chat.id);
    return;
  }
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

async function startDirectRec(chatId) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== 'function') {
    toast('Voice recording is not supported by this browser.');
    return;
  }
  const screen = $('#screen');
  const send = $('#sBtn', screen);
  recordingChatId = chatId;
  if (send) send.disabled = true;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (activeChatId !== chatId || !$('#comp', screen)) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
      .find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const current = {
      chatId,
      direct: true,
      start: Date.now(),
      iv: null,
      recorder,
      stream,
      chunks: [],
      send: false,
    };
    rec = current;
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) current.chunks.push(event.data);
    });
    recorder.addEventListener('error', (event) => {
      console.error('Could not record a friend voice note:', event.error);
      if (rec === current) stopRec(false);
      toast('Could not record this voice note.');
    }, { once: true });
    recorder.addEventListener('stop', () => {
      current.stream.getTracks().forEach((track) => track.stop());
      if (current.send) {
        const duration = Math.max(1, Math.min(60, Math.round((Date.now() - current.start) / 1000)));
        const type = current.recorder.mimeType || current.chunks[0]?.type || '';
        const blob = new Blob(current.chunks, { type });
        if (blob.size) void doSend('', null, { voice: { dur: duration, blob } });
        else toast('The recording was empty. Please try again.');
      }
    }, { once: true });
    recorder.start(250);
    const comp = $('#comp', screen);
    comp.classList.add('recording');
    $('#recUi', screen).hidden = false;
    $('#recTime', screen).textContent = '0:00';
    $('.rec-hint', screen).textContent = 'Tap to send · 1:00 max';
    current.iv = setInterval(() => {
      if (rec !== current) return;
      const seconds = Math.floor((Date.now() - current.start) / 1000);
      const time = $('#recTime', screen);
      if (time) time.textContent = fmtDur(seconds);
      if (seconds >= 60) {
        toast('Voice notes are limited to 60 seconds.');
        stopRec(true);
      }
    }, 250);
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    if (rec?.chatId === chatId) {
      clearInterval(rec.iv);
      rec = null;
      $('#comp', screen)?.classList.remove('recording');
      const recUi = $('#recUi', screen);
      if (recUi) recUi.hidden = true;
    }
    if (activeChatId === chatId) {
      console.error('Could not start friend voice recording:', error);
      toast(error.message || 'Could not access the microphone.');
    }
  } finally {
    if (recordingChatId === chatId) recordingChatId = null;
    if (activeChatId === chatId && send) send.disabled = false;
  }
}

function stopRec(send) {
  if (!rec) return;
  const current = rec;
  current.send = send;
  const secs = Math.max(1, Math.round((Date.now() - current.start) / 1000));
  clearInterval(current.iv);
  rec = null;
  const comp = $('#comp');
  if (comp) comp.classList.remove('recording');
  const ui = $('#recUi');
  if (ui) ui.hidden = true;
  if (current.direct) {
    try {
      if (current.recorder.state !== 'inactive') current.recorder.stop();
    } catch (error) {
      current.stream.getTracks().forEach((track) => track.stop());
      console.error('Could not finish friend voice recording:', error);
      toast('Could not finish this voice note.');
    }
    return;
  }
  if (send) doSend('', null, { voice: { dur: Math.min(secs, 599) } });
}

async function toggleVoice(el) {
  const bubble = el.closest('.bubble');
  if (!bubble) return;
  const mid = bubble.dataset.mid;
  if (vp && vp.mid === mid) { stopVoice(); return; }
  stopVoice();
  const chat = store.getChat(activeChatId);
  const message = chat?.messages.find((item) => item.id === mid);
  if (chat?.remoteUserId && message?.voice?.path) {
    const token = voiceLoadToken;
    try {
      const blob = await loadDirectVoice(chat.remoteUserId, message.voice.path);
      if (token !== voiceLoadToken || activeChatId !== chat.id) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      vp = { mid, audio, url, i: 0 };
      audio.addEventListener('timeupdate', paintVoice);
      audio.addEventListener('ended', () => {
        if (vp?.audio === audio) stopVoice();
      }, { once: true });
      audio.addEventListener('error', () => {
        if (vp?.audio === audio) {
          stopVoice();
          toast('Could not play this voice note.');
        }
      }, { once: true });
      await audio.play();
      paintVoice();
    } catch (error) {
      if (token === voiceLoadToken) {
        if (vp?.mid === mid) stopVoice();
        console.error('Could not load a friend voice note:', error);
        toast(error.message || 'Could not play this voice note.');
      }
    }
    return;
  }
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
  voiceLoadToken++;
  if (vp) {
    clearInterval(vp.timer);
    if (vp.audio) {
      vp.audio.pause();
      vp.audio.removeAttribute('src');
      vp.audio.load();
      URL.revokeObjectURL(vp.url);
    }
    vp = null;
  }
  paintVoice();
}

function paintVoice() {
  $$('.voice').forEach((v) => {
    const b = v.closest('.bubble');
    const on = !!(vp && b && b.dataset.mid === vp.mid);
    v.classList.toggle('playing', on);
    const bars = $$('.wave i', v);
    const progress = on && vp.audio && Number.isFinite(vp.audio.duration)
      ? vp.audio.currentTime / vp.audio.duration * bars.length
      : on ? vp.i : 0;
    bars.forEach((bar, k) => bar.classList.toggle('done', on && k < progress));
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
  if (c.remoteUserId && invite) {
    toast('Game invites are not available in friend chats yet.');
    return;
  }
  const directVoice = c.remoteUserId && extra?.voice;
  if (directVoice && !(directVoice.blob instanceof Blob)) {
    toast('This voice note could not be sent. Please record it again.');
    return;
  }
  const clientId = c.remoteUserId ? crypto.randomUUID() : null;
  const localExtra = extra ? { ...extra } : {};
  if (directVoice) localExtra.voice = { dur: directVoice.dur };
  const msg = store.sendMessage(c.id, {
    from: 'me',
    text,
    invite,
    status: 'sent',
    ...(clientId ? { clientId } : {}),
    replyTo: replyTo ? { ...replyTo } : null,
    ...localExtra,
  });
  clearReply();
  refreshThread(true);
  if (c.remoteUserId) {
    try {
      const remote = directVoice
        ? await sendDirectVoice(c.remoteUserId, directVoice.blob, directVoice.dur, clientId)
        : await sendDirectMessage(c.remoteUserId, text, clientId);
      store.updateMessage(c.id, msg.id, {
        remoteId: remote.id,
        status: 'delivered',
        t: Date.parse(remote.created_at),
        ...(remote.voice_path ? {
          voice: { dur: remote.voice_duration, path: remote.voice_path },
        } : {}),
      });
      if (activeChatId === c.id) refreshThread(true);
    } catch (error) {
      store.updateMessage(c.id, msg.id, { status: 'failed' });
      console.error('Could not send friend message:', error);
      toast(error.message || 'Could not send this message.');
      if (activeChatId === c.id) refreshThread();
    }
    return;
  }
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
    if ((chat.botId || chat.assistant) && AI_CHAT_API_URL && !invite && !(extra && extra.voice)) {
      const bot = chat.assistant ? { id: 'assistant', name: chat.name } : botById(chat.botId);
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
    console.error('AI assistant reply failed:', error);
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
  if (chat.official && !chat.assistant) return 'Thanks for writing! Offline support replies right here, and online feedback tools are coming in the next update.';
  const replies = [
    [/\b(hi|hello|hey|sasa|mambo|niaje|wasee)\b/, [
      'Hey! How is your day going?',
      'Mambo! What have you been up to today?',
    ]],
    [/\b(food|eat|recipe|cook|cooking|lunch|dinner)\b/, [
      'That sounds delicious. What is your favorite thing to cook?',
      'Now I am hungry 😄 Do you have a go-to comfort meal?',
    ]],
    [/\b(music|song|singer|album|concert)\b/, [
      'Nice! What kind of music have you been listening to lately?',
      'A good song can change the whole mood. Who have you been playing on repeat?',
    ]],
    [/\b(film|movie|series|show|episode)\b/, [
      'I am always up for a good recommendation. What kind of stories do you enjoy?',
      'What did you think of it? I like hearing what makes a story memorable.',
    ]],
    [/\b(work|job|school|class|study|studying)\b/, [
      'How is that going for you? Anything interesting happen today?',
      'Sounds like a full day. What part has been keeping you busiest?',
    ]],
    [/\b(travel|trip|visit|holiday|vacation|beach)\b/, [
      'That sounds like a lovely change of scenery. Where would you go if you could leave tomorrow?',
      'I love talking about places. What is somewhere you would happily visit again?',
    ]],
    [/\b(football|soccer|team|sport)\b/, [
      'Who do you support? I like hearing the stories behind people’s teams.',
      'That can get intense! Was it a close one?',
    ]],
    [/\b(how are you|how's it going|how is it going)\b/, [
      'Doing alright, thanks for asking! What has been the highlight of your day?',
      'Pretty good! How are things going on your side?',
    ]],
    [/\b(kadi|cards|deck|rematch|opponent|ace|joker|jack|penalty)\b/, [
      'I am up for a match if you are. Send a table invite whenever you like ♠️',
      'Those games can turn around fast! Want to set up a table?',
    ]],
  ];
  for (const [pattern, pool] of replies) {
    if (pattern.test(t)) return pool[(Math.random() * pool.length) | 0];
  }
  const pool = [
    'That is interesting. What got you thinking about it?',
    'I get you. Tell me a bit more!',
    'That made me smile 😄 What else has been on your mind?',
    'Good point. What do you think you will do next?',
    'I like hearing about the things you are into. How did you get interested in that?',
  ];
  return pool[(Math.random() * pool.length) | 0];
}

// ------------------------------------------------------------------ sheets
function openMessageActions(chat, msgId) {
  if (!chat) return;
  const m = chat.messages.find((x) => x.id === msgId);
  if (!m) return;
  const isDirect = !!chat.remoteUserId;
  const sh = sheet(`
    ${isDirect || m.deleted ? '' : `<div class="react-bar">${REACTIONS.map((e) => `<button data-e="${e}">${e}</button>`).join('')}</div>`}
    ${isDirect || m.deleted ? '' : `<button class="opt" id="aRep"><span class="ic">${ICON.reverse}</span><div>Reply</div></button>`}
    ${m.text && !m.deleted ? `<button class="opt" id="aCopy"><span class="ic">${ICON.doc}</span><div>Copy text</div></button>` : ''}
    ${!isDirect && m.from === 'me' && !m.deleted ? `<button class="opt" id="aDel"><span class="ic" style="color:var(--danger)">${ICON.close}</span><div>Delete message</div></button>` : ''}
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
    const d = store.get();
    const botId = chat.botId || (BOTS[d.level[game]] || BOTS[2]).id;
    closeSheet(true);
    doSend('', { game, code: net.newRoomCode(), count: 2, botId });
  }));
  $('#x', sh.el).onclick = () => closeSheet();
}

function joinInvite(chat, game) {
  const d = store.get();
  const botId = chat.botId || (BOTS[d.level[game]] || BOTS[2]).id;
  cleanup();
  startGame(game, { botId, count: 2, rules: d.rules });
}

function openRenameAssistant() {
  const assistant = store.getChat('quadra-assistant');
  if (!assistant) return;
  const sh = sheet(`<h2>Rename assistant</h2>
    <p>Choose any name you like, up to 40 characters.</p>
    <label for="assistantNameInput">Name</label>
    <input id="assistantNameInput" type="text" maxlength="40" value="${esc(assistant.name)}" autocomplete="off">
    <div class="row"><button class="btn grey" id="assistantNameCancel">Cancel</button><button class="btn" id="assistantNameSave">Save</button></div>`);
  const input = $('#assistantNameInput', sh.el);
  const save = () => {
    try {
      store.renameAssistant(input.value);
      closeSheet(true);
      refreshAny();
    } catch (error) {
      toast(error.message || 'Could not rename the assistant.');
      input.focus();
    }
  };
  $('#assistantNameSave', sh.el).onclick = save;
  $('#assistantNameCancel', sh.el).onclick = () => closeSheet();
  input.onkeydown = (event) => {
    if (event.key === 'Enter') save();
  };
  input.focus();
  input.select();
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
    ${chat.assistant ? `<button class="opt" id="cmRename"><span class="ic">${ICON.user}</span><div>Rename assistant</div></button>` : ''}
    <h3>Chat wallpaper</h3>
    <div class="walls">${WALLS.map(([k, lbl, bg]) => `<button data-w="${k}" class="${curWall === k ? 'on' : ''}"><i style="background:${bg}"></i>${lbl}</button>`).join('')}</div>
    <button class="opt" id="cmMute"><span class="ic">${chat.muted ? ICON.sound : ICON.mute}</span><div>${chat.muted ? 'Unmute notifications' : 'Mute notifications'}</div></button>
    ${chat.remoteUserId || (chat.official && !chat.assistant) ? '' : `<button class="opt" id="cmClr"><span class="ic">${ICON.doc}</span><div>Clear chat history</div></button>`}
    ${chat.official || chat.remoteUserId ? '' : `<button class="opt" id="cmDel"><span class="ic" style="color:var(--danger)">${ICON.close}</span><div>Remove conversation</div></button>`}
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
  const rename = $('#cmRename', sh.el);
  if (rename) rename.onclick = () => { closeSheet(true); openRenameAssistant(); };
  const clear = $('#cmClr', sh.el);
  if (clear) clear.onclick = () => { store.clearChat(chat.id); closeSheet(true); refreshThread(true); toast('Chat cleared'); };
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

function openNewChat() {
  const assistantName = store.getChat('quadra-assistant')?.name || 'Quadra';
  let players = [];
  let searchOwnerId = null;
  let searching = false;
  let active = true;
  const sh = sheet(`<h2>New message</h2>
    <h3>Assistant</h3>
    <div class="bots" style="margin-bottom:14px"><button class="botbtn" id="assistantChat" type="button">${avatarHTML({ obj: 'card' }, 42)}<div><b>${esc(assistantName)}</b><small style="color:var(--muted);font-size:12px">Ask about the games or anything else</small></div></button></div>
    <h3>Find friends</h3>
    <div class="player-search"><input type="text" id="fSearch" maxlength="24" placeholder="Search player accounts" autocomplete="off"><button class="btn small" id="fSearchBtn">Search</button></div>
    <p class="note-sm" id="fSearchStatus" aria-live="polite">Search registered accounts and send a friend request to start chatting.</p>
    <div class="player-results" id="fPlayers"></div>
    <div class="row"><button class="btn grey block" id="fCx">Cancel</button></div>`, {
    onClose: () => { active = false; },
  });
  const el = sh.el;
  const results = $('#fPlayers', el);
  const status = $('#fSearchStatus', el);
  const searchPlayers = async () => {
    if (searching) return;
    searching = true;
    $('#fSearchBtn', el).disabled = true;
    status.textContent = 'Searching player accounts…';
    results.innerHTML = '';
    try {
      const response = await net.searchPlayers($('#fSearch', el).value.trim());
      if (!active) return;
      players = response.players || [];
      searchOwnerId = response.userId;
      results.innerHTML = players.length
        ? players.map((player) => `<div class="player-result">
            ${avatarHTML(player.avatar || PLAYER_AVATARS[0], 40)}
            <span style="flex:1"><b>${esc(player.name)}</b><small>${player.relationship === 'incoming' ? 'Sent you a friend request' : player.relationship === 'outgoing' ? 'Friend request pending' : player.relationship === 'friend' ? 'Friend' : 'Player account'}</small></span>
            ${player.relationship === 'incoming'
              ? `<span class="player-actions"><button class="btn small player-action" type="button" data-action="accept" data-request="${esc(player.requestId)}">Accept</button><button class="btn small grey player-action" type="button" data-action="decline" data-request="${esc(player.requestId)}">Decline</button></span>`
              : player.relationship === 'outgoing'
                ? '<button class="btn small" type="button" disabled>Request sent</button>'
                : player.relationship === 'friend'
                  ? `<button class="btn small player-action" type="button" data-action="message" data-peer="${esc(player.userId)}">Message</button>`
                  : `<button class="btn small player-action" type="button" data-action="add" data-peer="${esc(player.userId)}">Add friend</button>`}
          </div>`).join('')
        : '<div class="empty-note">No player accounts found. Try another name.</div>';
      status.textContent = `${players.length} player account${players.length === 1 ? '' : 's'} found`;
      $$('.player-action', results).forEach((button) => (button.onclick = async () => {
        const player = players.find((item) => item.userId === button.dataset.peer);
        const action = button.dataset.action;
        if (action === 'message' && player) {
          button.disabled = true;
          try {
            const userId = await currentDirectUserId();
            if (!active) return;
            if (searchOwnerId !== userId) throw new Error('The active account changed.');
            directUserId = userId;
            store.removeDirectChatsExcept(userId);
            const chat = store.addChat({
              id: directChatId(player.userId),
              remoteUserId: player.userId,
              remoteOwnerId: userId,
              name: player.name,
              avatar: player.avatar || PLAYER_AVATARS[0],
              online: false,
              status: 'Friend',
            });
            active = false;
            closeSheet(true);
            openThread(chat.id);
          } catch (error) {
            if (active) {
              button.disabled = false;
              toast(error.message || 'Could not start this friend chat.');
            }
          }
          return;
        }
        button.disabled = true;
        try {
          if (action === 'add' && player) {
            const result = await sendFriendRequest(player.userId);
            if (result.status === 'friend') toast('You are already friends.');
            else if (result.status === 'incoming') toast('This player already sent you a request.');
            else toast('Friend request sent.');
          } else {
            const requestId = button.dataset.request;
            const result = await respondToFriendRequest(requestId, action === 'accept');
            store.markRead('note', `friend-request:${requestId}`);
            toast(result === 'accepted' ? 'Friend request accepted.' : 'Friend request declined.');
          }
          await searchPlayers();
        } catch (error) {
          button.disabled = false;
          toast(error.message || 'Could not update the friend request.');
        }
      }));
    } catch (error) {
      if (active) status.textContent = error.message || 'Could not search player accounts.';
    } finally {
      searching = false;
      if (active) $('#fSearchBtn', el).disabled = false;
    }
  };
  $('#assistantChat', el).onclick = () => {
    const chat = store.addChat({
      id: 'quadra-assistant',
      name: assistantName,
      avatar: { obj: 'card' },
      assistant: true,
      official: true,
      online: true,
      status: 'AI assistant',
    });
    active = false;
    closeSheet(true);
    openThread(chat.id);
  };
  $('#fSearchBtn', el).onclick = () => { void searchPlayers(); };
  $('#fSearch', el).onkeydown = (event) => {
    if (event.key === 'Enter') void searchPlayers();
  };
  $('#fCx', el).onclick = () => {
    active = false;
    closeSheet();
  };
}
