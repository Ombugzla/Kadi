import test from 'node:test';
import assert from 'node:assert/strict';
import { authRedirectUrl, isVerifiedEmailUser } from '../www/js/supabase-client.js';

test('online access requires a confirmed non-anonymous email account', () => {
  assert.equal(isVerifiedEmailUser({ email: 'player@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }), true);
  assert.equal(isVerifiedEmailUser({ email: 'player@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'google' } }), true);
  assert.equal(isVerifiedEmailUser({ email: 'player@example.com', email_confirmed_at: null }), false);
  assert.equal(isVerifiedEmailUser({ email: 'player@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', is_anonymous: true }), false);
  assert.equal(isVerifiedEmailUser(null), false);
});

test('auth redirects resolve to the app root, not Supabase or a stale localhost port', () => {
  assert.equal(authRedirectUrl('https://ombugzla.github.io/Kadi/js/supabase-client.js'), 'https://ombugzla.github.io/Kadi/');
  assert.equal(authRedirectUrl('http://localhost:8000/js/supabase-client.js'), 'http://localhost:8000/');
});
