// Local profile, stats, history, inbox, chats and settings (localStorage, always wrapped in try/catch).
import { rpDelta, rankInfo } from './rp.js';

const KEY = 'nikokadi.v2';
export const START_RP = 10;

const DEFAULTS = () => ({
  name: 'You',
  avatar: 0, // face index, object id, or 'photo'
  photo: '', // uploaded picture (small data URL)
  rp: START_RP, // rank points, Niko Kadi only
  stats: {
    nk: { played: 0, won: 0, streak: 0, best: 0 },
    ss: { played: 0, won: 0, streak: 0, best: 0 },
  },
  vs: {}, // botId -> { w, l }
  history: [], // recent matches, newest first
  inbox: [], // notifications
  chats: [], // WhatsApp-style conversations
  seeded: false,
  chatsSeeded: false,
  streakDays: 0,
  lastDay: '',
  settings: { sound: true, volume: 0.7, haptics: true, reduceMotion: false, back: 'royal', felt: 'parlour', mode: 'light', theme: 'parlour', timer: true, chatBg: 'default' },
  rules: { flow: false, specialJK: false, liberal: false },
  game: 'nk',
  level: { nk: 2, ss: 2 }, // index into BOTS
  count: { nk: 2, ss: 2 }, // players at the table (2..4)
  lastBot: { nk: '', ss: '' },
  welcomed: false,
});

let data = null;
function merge(base, src) {
  for (const k of Object.keys(base)) {
    if (src && k in src) {
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], src[k]);
      else base[k] = src[k];
    }
  }
  if (src && src.vs && typeof src.vs === 'object') base.vs = src.vs; // keep dynamic maps
  return base;
}

export function load() {
  if (data) return data;
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
  data = merge(DEFAULTS(), raw);
  if (raw && !raw.themeV) { if (!raw.settings || raw.settings.felt === 'teal') data.settings.felt = 'parlour'; }
  data.themeV = 4;
  if (!['royal', 'guilloche', 'deco', 'beads', 'mandala', 'stars'].includes(data.settings.back)) data.settings.back = 'royal';
  for (const g of ['nk', 'ss']) data.count[g] = Math.max(2, Math.min(4, data.count[g] | 0 || 2)); // table cap: 4
  if (!data.seeded) { seedInbox(); data.seeded = true; }
  if (!data.chatsSeeded) { seedChats(); data.chatsSeeded = true; }
  return data;
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
}
export const get = () => load();

const dayStr = (t) => new Date(t).toISOString().slice(0, 10);

// Mark today as played (daily streak, shown as the flame).
export function touchDay() {
  const d = load();
  const t = dayStr(Date.now());
  if (d.lastDay !== t) {
    d.streakDays = d.lastDay === dayStr(Date.now() - 864e5) ? d.streakDays + 1 : 1;
    d.lastDay = t;
    save();
  }
}

function pingInbox() {
  try { document.dispatchEvent(new Event('nk:inbox')); } catch (e) { /* no DOM */ }
}

// ------------------------------------------------------------------ inbox & notifications
let seq = 0;
export function addInbox(kind, { from = 'Niko Kadi', title, body }) {
  const d = load();
  d.inbox.unshift({ id: Date.now().toString(36) + (seq++).toString(36), kind, from, title, body, t: Date.now(), read: false });
  if (d.inbox.length > 60) d.inbox.length = 60;
  save();
  pingInbox();
}
export const inboxOf = (kind) => load().inbox.filter((m) => m.kind === kind);
export const unread = (kind) => {
  const d = load();
  const noteUnread = d.inbox.filter((m) => !m.read && m.kind === 'note').length;
  const chatUnread = d.chats.reduce((sum, c) => sum + (c.muted ? 0 : (c.unread || 0)), 0);
  if (kind === 'note') return noteUnread;
  if (kind === 'msg') return chatUnread;
  return noteUnread + chatUnread;
};
export function markRead(kind, id) {
  const d = load();
  for (const m of d.inbox) if (m.kind === kind && (!id || m.id === id)) m.read = true;
  save();
  pingInbox();
}
function seedInbox() {
  const d = data;
  const t = Date.now();
  d.inbox.push(
    { id: 'n1', kind: 'note', from: 'Niko Kadi', title: 'Your rank is Rookie', body: `You start with ${START_RP} RP. Win matches to move up.`, t: t - 500, read: false },
  );
}

// ------------------------------------------------------------------ WhatsApp-style chats
function seedChats() {
  const d = data;
  const t = Date.now();
  d.chats = [
    {
      id: 'team',
      name: 'Niko Kadi Team',
      avatar: { obj: 'card' },
      official: true,
      online: true,
      muted: false,
      unread: 1,
      status: 'Official updates',
      messages: [
        { id: 'tm1', from: 'them', text: 'Welcome to Niko Kadi! Two games, six computer players from Easy to Expert, and a leaderboard to climb.', t: t - 3600e3 * 4 },
        { id: 'tm2', from: 'them', text: 'Tip: Win a match to take 2 RP from every rival at the table. Beat tougher rivals for bonus RP!', t: t - 3600e3 * 2 },
        { id: 'tm3', from: 'them', text: 'Every shuffle is random and fair. Check How to play in More anytime 🃏', t: t - 1200e3 },
      ],
    },
    {
      id: 'bot_wanjiru',
      name: 'Wanjiru',
      botId: 'wanjiru',
      avatar: { photo: 'imani' },
      online: true,
      muted: false,
      unread: 1,
      status: 'Hard player',
      messages: [
        { id: 'w1', from: 'them', text: 'Sasa! Up for a 2-player Niko Kadi match?', t: t - 5400e3 },
        { id: 'w2', from: 'me', text: 'Always ready 😎', t: t - 5200e3, status: 'read' },
        { id: 'w3', from: 'them', text: 'Don’t forget to call Niko Kadi a turn early this time 😉', t: t - 900e3 },
      ],
    },
    {
      id: 'bot_asgard',
      name: 'Asgard',
      botId: 'asgard',
      avatar: { photo: 'erik' },
      online: true,
      muted: false,
      unread: 0,
      status: 'Medium player',
      messages: [
        { id: 'a1', from: 'them', text: 'Saved an Ace for the final turn yesterday and still got jumped 😂', t: t - 86400e3 },
        { id: 'a2', from: 'me', text: 'Classic Jack stack haha', t: t - 85000e3, status: 'read' },
      ],
    },
    {
      id: 'bot_krystal',
      name: 'Krystal',
      botId: 'krystal',
      avatar: { photo: 'layla' },
      online: false,
      muted: false,
      unread: 0,
      status: 'Expert · last seen today',
      messages: [
        { id: 'k1', from: 'them', text: 'Come challenge me when you reach Skilled rank 🏆', t: t - 86400e3 * 2 },
      ],
    },
  ];
}

export function getChats() {
  return load().chats.slice().sort((a, b) => {
    const ta = a.messages.length ? a.messages[a.messages.length - 1].t : 0;
    const tb = b.messages.length ? b.messages[b.messages.length - 1].t : 0;
    return tb - ta;
  });
}
export const getChat = (id) => load().chats.find((c) => c.id === id) || null;

export function addChat({ id, name, avatar, botId = null, online = true, status = 'Friend' }) {
  const d = load();
  if (id) {
    const hit = d.chats.find((c) => c.id === id);
    if (hit) return hit;
  }
  const c = {
    id: id || ('c_' + Date.now().toString(36) + (seq++).toString(36)),
    name,
    avatar,
    botId,
    online,
    muted: false,
    unread: 0,
    status,
    messages: [{ id: 's_' + Date.now().toString(36), from: 'system', text: `You are now connected with ${name}`, t: Date.now() }],
  };
  d.chats.unshift(c);
  save();
  pingInbox();
  return c;
}

export function sendMessage(chatId, msg) {
  const c = getChat(chatId);
  if (!c) return null;
  const full = { id: 'm_' + Date.now().toString(36) + (seq++).toString(36), t: Date.now(), reactions: [], ...msg };
  c.messages.push(full);
  if (c.messages.length > 200) c.messages.splice(0, c.messages.length - 200);
  if (full.from === 'them') c.unread = (c.unread || 0) + 1;
  save();
  pingInbox();
  return full;
}

export function markChatRead(chatId) {
  const c = getChat(chatId);
  if (!c || !c.unread) return;
  c.unread = 0;
  save();
  pingInbox();
}

export function updateMessage(chatId, msgId, patch) {
  const c = getChat(chatId);
  if (!c) return;
  const m = c.messages.find((x) => x.id === msgId);
  if (!m) return;
  Object.assign(m, patch);
  save();
}

export function deleteMessage(chatId, msgId) {
  updateMessage(chatId, msgId, { deleted: true, text: '', invite: null, reactions: [] });
}

export function toggleReaction(chatId, msgId, emoji) {
  const c = getChat(chatId);
  if (!c) return;
  const m = c.messages.find((x) => x.id === msgId);
  if (!m) return;
  m.reactions = m.reactions || [];
  const i = m.reactions.indexOf(emoji);
  if (i >= 0) m.reactions.splice(i, 1);
  else m.reactions.push(emoji);
  save();
}

export function clearChat(chatId) {
  const c = getChat(chatId);
  if (!c) return;
  c.messages = [];
  c.unread = 0;
  save();
  pingInbox();
}

export function deleteChat(chatId) {
  const d = load();
  d.chats = d.chats.filter((c) => c.id !== chatId);
  save();
  pingInbox();
}

export function toggleMuteChat(chatId) {
  const c = getChat(chatId);
  if (!c) return;
  c.muted = !c.muted;
  save();
  pingInbox();
}

// ------------------------------------------------------------------ results
// Record a finished game. Niko Kadi moves RP; Special Sequence earns no rank points.
export function recordResult(game, won, rivals, botId, info = {}) {
  const d = load();
  if (botId) d.lastBot[game] = botId;
  const s = d.stats[game];
  s.played++;
  if (won) { s.won++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
  let delta = 0, rankUp = null;
  if (game === 'nk' && !info.online) {
    const before = d.rp;
    delta = rpDelta(won, rivals.length + 1, rivals);
    d.rp = Math.max(0, before + delta);
    delta = d.rp - before;
    if (rankInfo(d.rp).idx > rankInfo(before).idx) rankUp = rankInfo(d.rp).name;
  }
  if (botId) {
    const k = game + ':' + botId;
    const v = d.vs[k] || (d.vs[k] = { w: 0, l: 0 });
    if (won) v.w++; else v.l++;
  }
  d.history.unshift({
    g: game, t: Date.now(), won, delta, botId, count: info.count || rivals.length + 1,
    names: rivals.map((b) => b.name), winner: info.winner || '', rules: info.rules || null, online: !!info.online,
  });
  if (d.history.length > 20) d.history.length = 20;
  touchDay();
  const who = rivals.map((b) => b.name).join(', ') || 'your opponent';
  const gname = game === 'nk' ? 'Niko Kadi' : 'Special Sequence';
  addInbox('note', {
    title: won ? `Victory in ${gname}` : `Defeat in ${gname}`,
    body: won ? `You beat ${who}.${game === 'nk' && !info.online ? ` +${delta} RP.` : ''}` : `${info.winner || 'A rival'} won.${game === 'nk' && delta ? ` ${delta} RP.` : ''}`,
  });
  if (rankUp) addInbox('note', { title: `Promoted to ${rankUp}`, body: `You reached ${d.rp} RP. Keep climbing the leaderboard.` });
  save();
  return { delta, rp: d.rp, rankUp };
}

export function recordOnlineResult(game, won, rivals, winner) {
  return recordResult(game, won, rivals, null, {
    online: true,
    count: rivals.length + 1,
    winner,
  });
}
