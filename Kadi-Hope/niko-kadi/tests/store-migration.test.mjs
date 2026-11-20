import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map([['nikokadi.v2', JSON.stringify({
  avatar: 5,
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
const { BOTS } = await import('../www/js/bots.js');

test('migrates saved avatars, bot selections, records, and chat history', () => {
  const data = store.get();
  const alexaChat = data.chats.find((chat) => chat.botId === 'alexa');

  assert.equal(PLAYER_AVATARS[data.avatar].photo, 'avatar18');
  assert.equal(data.level.nk, 4);
  assert.equal(data.level.ss, 3);
  assert.deepEqual(data.lastBot, { nk: 'alexa', ss: 'haruto' });
  assert.deepEqual(data.vs['nk:alexa'], { w: 3, l: 2 });
  assert.equal(data.history[0].botId, 'liu');
  assert.deepEqual(data.botLeague.ratings, { aloyce: 47, alexa: 238 });
  assert.equal(alexaChat.name, 'Alexa');
  assert.equal(alexaChat.messages[0].text, 'Previous chat');
  assert.equal(alexaChat.avatar.photo, BOTS.find((bot) => bot.id === 'alexa').avatar.photo);
  assert.equal(new Set(data.chats.map((chat) => chat.botId).filter(Boolean)).size, 8);
});
