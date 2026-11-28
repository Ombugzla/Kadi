import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../workers/ai-chat/src/index.js';

const origin = 'https://example.github.io';
const request = (body, options = {}) => new Request('https://worker.example/api/chat', {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  ...options,
});
const payload = {
  bot: { id: 'natalia' },
  messages: [{ role: 'user', content: 'Any good films you would recommend?' }],
};

test('rejects requests from origins other than the configured app', async () => {
  const response = await worker.fetch(request(payload, {
    headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
  }), { ALLOWED_ORIGIN: origin, GEMINI_API_KEY: 'test-key' });
  assert.equal(response.status, 403);
});

test('allows both the current Pages origin and the new game domain', async () => {
  const allowedOrigins = `${origin}, https://play.zavhira.com`;
  for (const appOrigin of [origin, 'https://play.zavhira.com']) {
    const response = await worker.fetch(new Request('https://worker.example/api/chat', {
      method: 'OPTIONS',
      headers: { Origin: appOrigin },
    }), { ALLOWED_ORIGINS: allowedOrigins });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), appOrigin);
  }
});

test('returns a Gemini reply for a valid bot message', async () => {
  const originalFetch = globalThis.fetch;
  let endpoint = '';
  let requestBody;
  globalThis.fetch = async (url, options) => {
    endpoint = String(url);
    requestBody = JSON.parse(options.body);
    return Response.json({
      candidates: [{ content: { parts: [{ text: 'Sasa! Let’s play a round.' }] } }],
    });
  };
  try {
    const response = await worker.fetch(request(payload), {
      ALLOWED_ORIGIN: origin,
      GEMINI_API_KEY: 'test-key',
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reply: 'Sasa! Let’s play a round.' });
    assert.match(endpoint, /models\/gemini-3\.5-flash-lite:generateContent/);
    assert.deepEqual(requestBody.generationConfig, { maxOutputTokens: 160 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses Featherless when Gemini fails', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let fallbackRequest;
  globalThis.fetch = async (_url, options) => {
    calls++;
    if (calls === 1) return new Response('Unavailable', { status: 503 });
    fallbackRequest = { headers: options.headers, body: JSON.parse(options.body) };
    return Response.json({ choices: [{ message: { content: 'Ready when you are!' } }] });
  };
  try {
    const response = await worker.fetch(request(payload), {
      ALLOWED_ORIGIN: origin,
      GEMINI_API_KEY: 'test-key',
      FEATHERLESS_API_KEY: 'test-key',
      FEATHERLESS_MODEL: 'test/model',
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reply: 'Ready when you are!' });
    assert.equal(calls, 2);
    assert.equal(fallbackRequest.body.chat_template_kwargs.enable_thinking, false);
    assert.equal(fallbackRequest.headers['X-Title'], 'Kadi Games');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects invalid bot ids and oversized conversation history', async () => {
  for (const body of [
    { bot: { id: 'unknown' }, messages: payload.messages },
    { bot: payload.bot, messages: Array(13).fill(payload.messages[0]) },
  ]) {
    const response = await worker.fetch(request(body), { ALLOWED_ORIGIN: origin });
    assert.equal(response.status, 400);
  }
});
