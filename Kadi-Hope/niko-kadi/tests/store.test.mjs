import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const store = await import('../www/js/store.js?online-result-test');

test('new profiles start with one Quadra chat', () => {
  const chats = store.get().chats;
  assert.equal(chats.length, 1);
  assert.equal(chats[0].name, 'Quadra');
  assert.equal(chats[0].assistant, true);
});

test('assistant name can be changed and is not reset when opening its chat', () => {
  const name = 'My card pal 🃏';
  store.renameAssistant(name);
  store.addChat({
    id: 'quadra-assistant',
    name: 'Quadra',
    avatar: { obj: 'card' },
    assistant: true,
    official: true,
    status: 'AI assistant',
  });

  assert.equal(store.getChat('quadra-assistant').name, name);
  assert.equal(JSON.parse(storage.get('nikokadi.v2')).chats[0].name, name);
  assert.throws(() => store.renameAssistant('   '), RangeError);
  assert.throws(() => store.renameAssistant('x'.repeat(41)), RangeError);
});

test('online Niko Kadi results record rivals without changing RP', () => {
  const result = store.recordOnlineResult('nk', true, [{ name: 'Rival' }], 'You');

  assert.equal(result.rp, store.START_RP);
  assert.equal(result.delta, 0);
  assert.equal(store.get().history[0].online, true);
  assert.deepEqual(store.get().history[0].names, ['Rival']);
});

test('offline Special Sequence results award RP from the shared local rating', () => {
  const before = store.get().rp;
  const result = store.recordResult('ss', true, [{ name: 'Rival', tier: 'Medium' }]);

  assert.equal(result.delta, 4);
  assert.equal(result.rp, before + 4);
  assert.equal(store.get().history[0].g, 'ss');
});

test('online Special Sequence results leave local RP unchanged', () => {
  const before = store.get().rp;
  const result = store.recordOnlineResult('ss', false, [{ name: 'Rival' }], 'Rival');

  assert.equal(result.delta, 0);
  assert.equal(result.rp, before);
  assert.equal(store.get().history[0].online, true);
});

test('game results do not create victory or defeat notifications', () => {
  const notices = store.inboxOf('note');
  assert.equal(notices.some((message) => /^(?:Victory|Defeat) in\b/.test(message.title)), false);
});
