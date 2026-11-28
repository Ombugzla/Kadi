import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map([['nikokadi.v2', JSON.stringify({
  avatar: 5,
  settings: { back: 'royal' },
  level: { nk: 4, ss: 1 },
  lastBot: { nk: 'wanjiru', ss: 'asgard' },
  vs: { 'nk:wanjiru': { w: 3, l: 2 } },
  history: [{ botId: 'gilbert' }],
  botLeague: {
    day: '2026-11-20',
    round: 1,
    ratings: { aloyce: 47, alexa: 238 },
    results: [{ a: 'aloyce', b: 'alexa', winner: 'alexa' }],
  },
  inbox: [
    { id: 'win', kind: 'note', title: 'Victory in Niko Kadi', body: 'Old result notice' },
    { id: 'loss', kind: 'note', title: 'Defeat in Special Sequence', body: 'Old result notice' },
    { id: 'rank', kind: 'note', title: 'Promoted to Rookie', body: 'Keep climbing' },
  ],
  seeded: true,
  chatsSeeded: true,
  chats: [{
    id: 'bot_wanjiru',
    name: 'Wanjiru',
    botId: 'wanjiru',
    avatar: { photo: 'imani' },
    messages: [{ id: 'old-message', from: 'them', text: 'Previous chat', t: 1 }],
  }],
})]]);
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const store = await import('../www/js/store.js?roster-migration-test');
const { PLAYER_AVATARS } = await import('../www/js/avatars.js');

test('migrates bot chats into one assistant and removes old result notices', () => {
  const data = store.get();
  const assistant = data.chats.find((chat) => chat.assistant);

  assert.equal(PLAYER_AVATARS[data.avatar].photo, 'avatar18');
  assert.equal(data.settings.back, 'baroque-ink');
  assert.equal(JSON.parse(storage.get('nikokadi.v2')).settings.back, 'baroque-ink');
  assert.equal(data.level.nk, 4);
  assert.equal(data.level.ss, 3);
  assert.deepEqual(data.lastBot, { nk: 'alexa', ss: 'haruto' });
  assert.deepEqual(data.vs['nk:alexa'], { w: 3, l: 2 });
  assert.equal(data.history[0].botId, 'liu');
  assert.deepEqual(data.botLeague.ratings, { aloyce: 47, alexa: 238 });
  assert.equal(assistant.name, 'Quadra');
  assert.equal(assistant.messages[0].text, 'Previous chat');
  assert.equal(data.chats.length, 1);
  assert.equal(data.inbox.some((message) => /^(?:Victory|Defeat) in\b/.test(message.title)), false);
  assert.equal(data.inbox.some((message) => message.id === 'rank'), true);
});
