import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const store = await import('../www/js/store.js?direct-message-sync-test');

test('remote chats deduplicate synchronized messages and preserve unread counts', () => {
  store.load();
  const chat = store.addChat({
    id: 'player_11111111-1111-4111-8111-111111111111',
    remoteUserId: '11111111-1111-4111-8111-111111111111',
    name: 'Friend',
    avatar: {},
  });
  assert.deepEqual(chat.messages, []);

  const message = {
    id: '22222222-2222-4222-8222-222222222222',
    remoteId: '22222222-2222-4222-8222-222222222222',
    clientId: '33333333-3333-4333-8333-333333333333',
    from: 'them',
    text: 'Hello',
    t: 1,
    status: 'delivered',
    reactions: [],
  };
  store.syncDirectMessage(chat.id, message);
  store.syncDirectMessage(chat.id, { ...message, status: 'read' });

  assert.equal(chat.messages.length, 1);
  assert.equal(chat.messages[0].status, 'read');
  assert.equal(chat.unread, 1);
});

test('switching signed-in accounts removes the previous account chat cache', () => {
  const firstUserChat = store.addChat({
    id: 'player_11111111-1111-4111-8111-111111111111',
    remoteUserId: '11111111-1111-4111-8111-111111111111',
    remoteOwnerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Old account friend',
    avatar: {},
  });
  const currentUserChat = store.addChat({
    id: 'player_22222222-2222-4222-8222-222222222222',
    remoteUserId: '22222222-2222-4222-8222-222222222222',
    remoteOwnerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Current account friend',
    avatar: {},
  });

  store.removeDirectChatsExcept('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

  assert.equal(store.getChat(firstUserChat.id), null);
  assert.equal(store.getChat(currentUserChat.id).name, 'Current account friend');
});
