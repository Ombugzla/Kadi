// Local profile, stats, history, inbox, chats and settings (localStorage, always wrapped in try/catch).
import { rpDelta, rankInfo } from './rp.js';
import { BOTS } from './bots.js';
import { PLAYER_AVATARS } from './avatars.js';

const KEY = 'nikokadi.v2';
export const START_RP = 10;
const BOT_ID_RENAMES = { asgard: 'haruto', gilbert: 'liu', wanjiru: 'alexa' };
const LEGACY_FACE_IDS = [
  'amara', 'priya', 'luca', 'erik', 'viktor', 'imani', 'mei', 'layla',
  'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7',
];
const LEGACY_FACE_RENAMES = {
  priya: 'avatar1',
  luca: 'avatar6',
  erik: 'avatar10',
  viktor: 'avatar6',
  imani: 'avatar18',
  mei: 'avatar1',
  layla: 'avatar18',
  avatar11: 'avatar10',
};
const BOT_OPENERS = {
  aloyce: 'I found a new song and it has been on repeat all morning. What have you been listening to?',
  sandra: 'I tried a new recipe this weekend. Do you have a favorite comfort food?',
  natalia: 'I have been looking for a good film to watch. What kind of stories do you enjoy?',
  haruto: 'I took a quiet walk today and found a little cafe. What helps you unwind?',
  alexa: 'I started rearranging my room and now I am thinking about colors. Do you enjoy decorating?',
  liu: 'I read a surprising fact about space today. What topic can keep you curious for hours?',
  hachiman: 'I watched an old film with a great soundtrack. Do you have a movie you can rewatch?',
  krystal: 'I heard a song that instantly improved my mood. What kind of music do you like?',
};

const DEFAULTS = () => ({
  name: 'You',
  avatar: 0, // face index, object id, or 'photo'
  photo: '', // uploaded picture (small data URL)
  rp: START_RP, // offline rank points shared by both games
  stats: {
    nk: { played: 0, won: 0, streak: 0, best: 0 },
    ss: { played: 0, won: 0, streak: 0, best: 0 },
  },
  vs: {}, // botId -> { w, l }
  botLeague: { day: '', round: 0, ratings: {}, results: [] },
  history: [], // recent matches, newest first
  accountProfiles: {},
  profileUserId: '',
  inbox: [], // notifications
  chats: [], // WhatsApp-style conversations
  seeded: false,
  chatsSeeded: false,
  streakDays: 0,
  lastDay: '',
  settings: { sound: true, volume: 0.7, haptics: true, reduceMotion: false, back: 'baroque-ink', felt: 'parlour', mode: 'light', theme: 'parlour', timer: true, chatBg: 'default' },
  rules: { flow: false, specialJK: false, liberal: false },
  game: 'nk',
  level: { nk: 2, ss: 2 }, // index into BOTS
  count: { nk: 2, ss: 2 }, // players at the table (2..4)
  lastBot: { nk: '', ss: '' },
  avatarCatalogVersion: 0,
  botRosterVersion: 0,
  assistantChatVersion: 0,
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
  if (src?.botLeague?.ratings && typeof src.botLeague.ratings === 'object' && !Array.isArray(src.botLeague.ratings)) {
    base.botLeague.ratings = src.botLeague.ratings;
  }
  return base;
}

export function load() {
  if (data) return data;
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
  data = merge(DEFAULTS(), raw);
  if (raw && !raw.themeV) { if (!raw.settings || raw.settings.felt === 'teal') data.settings.felt = 'parlour'; }
  data.themeV = 4;
  let migrated = false;
  if (!Array.isArray(data.inbox)) data.inbox = [];
  const inboxBefore = data.inbox.length;
  data.inbox = data.inbox.filter((message) => !/^(?:Victory|Defeat) in\b/i.test(message?.title || ''));
  if (data.inbox.length !== inboxBefore) migrated = true;
  const savedAvatarVersion = Number(raw?.avatarCatalogVersion) || 0;
  if (savedAvatarVersion < 1) {
    migrateAvatarCatalog(data, raw);
    migrated = true;
  } else if (savedAvatarVersion < 2) {
    migrateAvatarCatalogV2(data, raw);
    migrated = true;
  }
  data.avatarCatalogVersion = 2;
  if (data.botRosterVersion < 1) {
    migrateBotRoster(data, raw);
    data.botRosterVersion = 1;
    migrated = true;
  }
  const uploadedBacks = ['baroque-ink', 'antique-olive', 'antique-rose', 'astral-gold', 'navy-filigree', 'scarlet-scroll', 'sapphire-scroll'];
  if (!uploadedBacks.includes(data.settings.back)) {
    data.settings.back = 'baroque-ink';
    migrated = true;
  }
  for (const g of ['nk', 'ss']) data.count[g] = Math.max(2, Math.min(4, data.count[g] | 0 || 2)); // table cap: 4
  if (!data.seeded) { seedInbox(); data.seeded = true; }
  if (!data.chatsSeeded) { seedChats(); data.chatsSeeded = true; }
  if (data.assistantChatVersion < 1) {
    migrateAssistantChats(data);
    data.assistantChatVersion = 1;
    migrated = true;
  }
  if (data.assistantChatVersion < 2) {
    migrateAssistantName(data);
    data.assistantChatVersion = 2;
    migrated = true;
  }
  if (migrated) save();
  return data;
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
}
export const get = () => load();

export function getAccountProfile(userId) {
  if (typeof userId !== 'string' || !userId) return null;
  const profile = load().accountProfiles?.[userId];
  return profile && typeof profile === 'object' && !Array.isArray(profile) ? { ...profile } : null;
}

export function cacheAccountProfile(userId, profile = load()) {
  if (typeof userId !== 'string' || !userId) throw new TypeError('An account id is required.');
  const d = load();
  if (!d.accountProfiles || typeof d.accountProfiles !== 'object' || Array.isArray(d.accountProfiles)) {
    d.accountProfiles = {};
  }
  d.accountProfiles[userId] = {
    name: typeof profile.name === 'string' ? profile.name : '',
    avatar: typeof profile.avatar === 'string' || Number.isInteger(profile.avatar) ? profile.avatar : 0,
    photo: typeof profile.photo === 'string' ? profile.photo : '',
  };
  d.profileUserId = userId;
  save();
}

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
export function addInbox(kind, { id, type, requestId, from = 'Niko Kadi', title, body }) {
  const d = load();
  const inboxId = id || Date.now().toString(36) + (seq++).toString(36);
  if (d.inbox.some((message) => message.id === inboxId)) return;
  d.inbox.unshift({
    id: inboxId,
    ...(type ? { type } : {}),
    ...(requestId ? { requestId } : {}),
    kind,
    from,
    title,
    body,
    t: Date.now(),
    read: false,
  });
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
      id: 'quadra-assistant',
      name: 'Quadra',
      avatar: { obj: 'card' },
      official: true,
      assistant: true,
      online: true,
      muted: false,
      unread: 1,
      status: 'AI assistant',
      messages: [
        { id: 'assistant-welcome', from: 'them', text: "Hi, I'm Quadra. Ask me about the games, the app, or anything else.", t: t - 1200e3 },
      ],
    },
  ];
}

function migrateAvatarCatalog(d, raw) {
  const oldIndex = Number(raw?.avatar);
  if (Number.isInteger(oldIndex) && oldIndex >= 0 && oldIndex < LEGACY_FACE_IDS.length) {
    const oldFace = LEGACY_FACE_IDS[oldIndex];
    const newFace = LEGACY_FACE_RENAMES[oldFace] || oldFace;
    d.avatar = Math.max(0, PLAYER_AVATARS.findIndex((a) => a.photo === newFace));
  }
  for (const chat of d.chats) {
    const oldFace = chat.avatar?.photo;
    if (LEGACY_FACE_RENAMES[oldFace]) chat.avatar = { ...chat.avatar, photo: LEGACY_FACE_RENAMES[oldFace] };
  }
}

function migrateAvatarCatalogV2(d, raw) {
  if (typeof raw?.avatar === 'number' && raw.avatar >= 11) d.avatar = raw.avatar - 1;
  for (const chat of d.chats) {
    const newFace = LEGACY_FACE_RENAMES[chat.avatar?.photo];
    if (newFace) chat.avatar = { ...chat.avatar, photo: newFace };
  }
}

function migrateBotRoster(d, raw) {
  const rename = (id) => BOT_ID_RENAMES[id] || id;
  if (raw?.level) {
    const oldIds = ['aloyce', 'asgard', 'sandra', 'gilbert', 'wanjiru', 'krystal'];
    for (const game of ['nk', 'ss']) {
      const oldIndex = Number(raw.level[game]);
      if (Number.isInteger(oldIndex) && oldIds[oldIndex]) {
        d.level[game] = BOTS.findIndex((bot) => bot.id === rename(oldIds[oldIndex]));
      }
    }
  }
  for (const game of ['nk', 'ss']) d.lastBot[game] = rename(d.lastBot[game]);
  for (const match of d.history) if (match.botId) match.botId = rename(match.botId);

  const seen = new Map();
  d.chats = d.chats.filter((chat) => {
    if (!chat.botId) return true;
    chat.botId = rename(chat.botId);
    const bot = BOTS.find((entry) => entry.id === chat.botId);
    if (!bot) return true;
    chat.id = 'bot_' + bot.id;
    chat.name = bot.name;
    chat.avatar = bot.avatar;
    chat.status = `${bot.tier} player`;
    const existing = seen.get(bot.id);
    if (existing) {
      existing.messages = [...existing.messages, ...chat.messages].sort((a, b) => a.t - b.t);
      existing.unread = Math.max(existing.unread || 0, chat.unread || 0);
      return false;
    }
    seen.set(bot.id, chat);
    return true;
  });
  const t = Date.now();
  for (const [i, bot] of BOTS.entries()) {
    if (!seen.has(bot.id)) {
      d.chats.push({
        id: 'bot_' + bot.id,
        name: bot.name,
        botId: bot.id,
        avatar: bot.avatar,
        online: true,
        muted: false,
        unread: 0,
        status: `${bot.tier} player`,
        messages: [{ id: `migrate_${bot.id}`, from: 'them', text: BOT_OPENERS[bot.id], t: t - (i + 1) * 60000 }],
      });
    }
  }
  for (const game of ['nk', 'ss']) {
    for (const [oldId, newId] of Object.entries(BOT_ID_RENAMES)) {
      const oldKey = `${game}:${oldId}`;
      const newKey = `${game}:${newId}`;
      if (!d.vs[oldKey]) continue;
      const previous = d.vs[newKey] || { w: 0, l: 0 };
      d.vs[newKey] = {
        w: previous.w + (d.vs[oldKey].w || 0),
        l: previous.l + (d.vs[oldKey].l || 0),
      };
      delete d.vs[oldKey];
    }
  }
}

function migrateAssistantChats(d) {
  const chats = Array.isArray(d.chats) ? d.chats : [];
  const previous = chats.find((chat) => chat.assistant)
    || chats.find((chat) => chat.botId);
  const assistant = previous || {
    messages: [{
      id: 'assistant-welcome',
      from: 'them',
      text: "Hi, I'm Quadra. Ask me about the games, the app, or anything else.",
      t: Date.now(),
    }],
  };
  assistant.id = 'quadra-assistant';
  assistant.name = 'Quadra';
  assistant.avatar = { obj: 'card' };
  assistant.botId = null;
  assistant.assistant = true;
  assistant.official = true;
  assistant.online = true;
  assistant.status = 'AI assistant';
  assistant.unread = assistant.unread || 0;
  assistant.messages = Array.isArray(assistant.messages) ? assistant.messages : [];
  d.chats = [assistant, ...chats.filter((chat) => chat !== previous && !chat.botId && !chat.official && !chat.assistant)];
}

function migrateAssistantName(d) {
  const assistant = d.chats.find((chat) => chat.id === 'quadra-assistant' || chat.assistant);
  if (!assistant) return;
  if (assistant.name === 'Quadra Assistant') assistant.name = 'Quadra';
  for (const message of assistant.messages || []) {
    if (message.text === "Hi, I'm Quadra Assistant. Ask me about the games, the app, or anything else.") {
      message.text = "Hi, I'm Quadra. Ask me about the games, the app, or anything else.";
    }
  }
}

export function getChats() {
  return load().chats.slice().sort((a, b) => {
    const ta = a.messages.length ? a.messages[a.messages.length - 1].t : 0;
    const tb = b.messages.length ? b.messages[b.messages.length - 1].t : 0;
    return tb - ta;
  });
}
export const getChat = (id) => load().chats.find((c) => c.id === id) || null;

export function addChat({
  id,
  name,
  avatar,
  botId = null,
  assistant = false,
  official = false,
  remoteUserId = null,
  remoteOwnerId = null,
  online = true,
  status = 'Friend',
}) {
  const d = load();
  if (id) {
    const hit = d.chats.find((c) => c.id === id);
    if (hit) {
      if (remoteUserId) {
        Object.assign(hit, { remoteUserId, remoteOwnerId, name, avatar, online, status });
        save();
      } else if (assistant) {
        Object.assign(hit, { assistant, official, avatar, online, status });
        if (!hit.name) hit.name = name;
        save();
      }
      return hit;
    }
  }
  const c = {
    id: id || ('c_' + Date.now().toString(36) + (seq++).toString(36)),
    name,
    avatar,
    botId,
    assistant,
    official,
    remoteUserId,
    remoteOwnerId,
    online,
    muted: false,
    unread: 0,
    status,
    messages: remoteUserId ? [] : [{ id: 's_' + Date.now().toString(36), from: 'system', text: `You are now connected with ${name}`, t: Date.now() }],
  };
  d.chats.unshift(c);
  save();
  pingInbox();
  return c;
}

export function renameAssistant(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 40) throw new RangeError('Choose a name between 1 and 40 characters.');
  const assistant = getChat('quadra-assistant');
  if (!assistant?.assistant) throw new Error('The assistant chat is unavailable.');
  assistant.name = name;
  save();
  pingInbox();
  return assistant;
}

export function removeDirectChatsExcept(userId) {
  const d = load();
  const originalCount = d.chats.length;
  d.chats = d.chats.filter((chat) => !chat.remoteUserId || chat.remoteOwnerId === userId);
  if (d.chats.length !== originalCount) {
    save();
    pingInbox();
  }
}

export function syncDirectMessage(chatId, message) {
  const c = getChat(chatId);
  if (!c) return;
  const existing = c.messages.find((item) =>
    item.id === message.remoteId || item.remoteId === message.remoteId || item.clientId === message.clientId
  );
  if (existing) {
    Object.assign(existing, { ...message, id: existing.id });
  } else {
    c.messages.push(message);
    if (message.from === 'them' && message.status !== 'read') c.unread = (c.unread || 0) + 1;
  }
  c.messages.sort((a, b) => a.t - b.t);
  if (c.messages.length > 200) c.messages.splice(0, c.messages.length - 200);
  save();
  pingInbox();
}

export function setChatUnread(chatId, count) {
  const c = getChat(chatId);
  if (!c) return;
  c.unread = Math.max(0, Number(count) || 0);
  save();
  pingInbox();
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
// Record a finished game. Both games share the local offline RP total.
export function recordResult(game, won, rivals, botId, info = {}) {
  const d = load();
  if (botId) d.lastBot[game] = botId;
  const s = d.stats[game];
  s.played++;
  if (won) { s.won++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
  let delta = 0, rankUp = null;
  if (!info.online) {
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
    names: rivals.map((b) => b.name), avatars: rivals.map((b) => b.avatar || null),
    winner: info.winner || '', rules: info.rules || null, online: !!info.online,
  });
  if (d.history.length > 20) d.history.length = 20;
  touchDay();
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
