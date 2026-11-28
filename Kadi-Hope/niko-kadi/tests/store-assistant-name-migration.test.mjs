import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map([['nikokadi.v2', JSON.stringify({
  avatarCatalogVersion: 2,
  botRosterVersion: 1,
  assistantChatVersion: 1,
  seeded: true,
  chatsSeeded: true,
  chats: [{
    id: 'quadra-assistant',
    name: 'Quadra Assistant',
    assistant: true,
    messages: [{
      id: 'assistant-welcome',
      from: 'them',
      text: "Hi, I'm Quadra Assistant. Ask me about the games, the app, or anything else.",
      t: 1,
    }],
  }],
})]]);

globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const store = await import('../www/js/store.js?assistant-name-migration-test');

test('renames the old default assistant without replacing its chat history', () => {
  const data = store.get();
  const assistant = store.getChat('quadra-assistant');

  assert.equal(assistant.name, 'Quadra');
  assert.equal(assistant.messages[0].text, "Hi, I'm Quadra. Ask me about the games, the app, or anything else.");
  assert.equal(data.assistantChatVersion, 2);
});
