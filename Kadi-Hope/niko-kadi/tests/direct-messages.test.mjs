import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directChatId, mapDirectMessage } from '../www/js/direct-messages.js';

const me = '11111111-1111-4111-8111-111111111111';
const friend = '22222222-2222-4222-8222-222222222222';
const stranger = '44444444-4444-4444-8444-444444444444';
const message = {
  id: '33333333-3333-4333-8333-333333333333',
  client_id: '55555555-5555-4555-8555-555555555555',
  sender_id: friend,
  recipient_id: me,
  body: 'Hello!',
  created_at: '2026-11-22T00:00:00.000Z',
  read_at: null,
};

test('direct chats have stable ids and remote messages map to the right sender', () => {
  assert.equal(directChatId(friend), `player_${friend}`);
  assert.deepEqual(mapDirectMessage(message, me), {
    id: message.id,
    remoteId: message.id,
    clientId: message.client_id,
    from: 'them',
    text: 'Hello!',
    t: Date.parse(message.created_at),
    status: 'delivered',
    reactions: [],
  });
  assert.equal(mapDirectMessage({ ...message, sender_id: me }, me).from, 'me');
});

test('direct message mapping rejects invalid identities and records', () => {
  assert.throws(() => directChatId('not-a-user-id'), TypeError);
  assert.throws(() => mapDirectMessage(message, stranger), TypeError);
  assert.throws(() => mapDirectMessage({ ...message, created_at: 'invalid' }, me), TypeError);
});
