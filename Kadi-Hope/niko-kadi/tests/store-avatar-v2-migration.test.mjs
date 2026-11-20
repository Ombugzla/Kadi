import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map([['nikokadi.v2', JSON.stringify({
  avatar: 12,
  avatarCatalogVersion: 1,
  botRosterVersion: 1,
  chatsSeeded: true,
  chats: [{
    id: 'friend',
    name: 'Friend',
    avatar: { photo: 'avatar11' },
    messages: [],
  }],
})]]);
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const store = await import('../www/js/store.js?avatar-v2-migration-test');
const { PLAYER_AVATARS } = await import('../www/js/avatars.js');

test('migrates saved avatar indices past the removed avatar11 image', () => {
  const data = store.get();

  assert.equal(PLAYER_AVATARS[data.avatar].photo, 'avatar12');
  assert.equal(data.chats[0].avatar.photo, 'avatar10');
  assert.equal(data.avatarCatalogVersion, 2);
});
