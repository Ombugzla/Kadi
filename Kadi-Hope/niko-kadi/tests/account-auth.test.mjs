import test from 'node:test';
import assert from 'node:assert/strict';
import { isVerifiedEmailUser } from '../www/js/supabase-client.js';

test('online access requires a confirmed non-anonymous email account', () => {
  assert.equal(isVerifiedEmailUser({ email: 'player@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }), true);
  assert.equal(isVerifiedEmailUser({ email: 'player@example.com', email_confirmed_at: null }), false);
  assert.equal(isVerifiedEmailUser({ email: 'player@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', is_anonymous: true }), false);
  assert.equal(isVerifiedEmailUser(null), false);
});
