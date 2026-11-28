import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../workers/ai-chat/src/index.js';

test('AI worker allows production app origins when deployment variables are missing', async () => {
  const response = await worker.fetch(new Request('https://worker.example/api/chat', {
    method: 'OPTIONS',
    headers: { Origin: 'https://play.zavhira.com' },
  }), {});

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://play.zavhira.com');
});

test('AI worker rejects origins outside its allowlist', async () => {
  const response = await worker.fetch(new Request('https://worker.example/api/chat', {
    method: 'OPTIONS',
    headers: { Origin: 'http://127.0.0.1:8765' },
  }), {});

  assert.equal(response.status, 403);
});

test('AI worker allows the configured local app origin', async () => {
  const response = await worker.fetch(new Request('https://worker.example/api/chat', {
    method: 'OPTIONS',
    headers: { Origin: 'http://127.0.0.1:8765' },
  }), {
    ALLOWED_ORIGINS: 'https://ombugzla.github.io,https://play.zavhira.com,http://localhost:8000,http://localhost:8765,http://127.0.0.1:8765',
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:8765');
});

test('AI worker uses the selected assistant display name', async () => {
  const originalFetch = globalThis.fetch;
  let prompt = '';
  globalThis.fetch = async (_url, options) => {
    prompt = JSON.parse(options.body).systemInstruction.parts[0].text;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Here is a helpful answer.' }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await worker.fetch(new Request('https://worker.example/api/chat', {
      method: 'POST',
      headers: { Origin: 'https://game.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot: { id: 'assistant', name: 'Pip' },
        messages: [{ role: 'user', content: 'How do I play?' }],
      }),
    }), {
      ALLOWED_ORIGIN: 'https://game.example',
      GEMINI_API_KEY: 'test-key',
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).reply, 'Here is a helpful answer.');
    assert.match(prompt, /multipurpose AI assistant/);
    assert.match(prompt, /"Pip"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AI worker reports safe provider failure details and tries its fallback', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const diagnostics = [];
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('Unavailable', { status: calls === 1 ? 503 : 429 });
  };
  console.error = (message) => diagnostics.push(message);

  try {
    const response = await worker.fetch(new Request('https://worker.example/api/chat', {
      method: 'POST',
      headers: { Origin: 'https://game.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot: { id: 'assistant', name: 'Pip' },
        messages: [{ role: 'user', content: 'How do I play?' }],
      }),
    }), {
      ALLOWED_ORIGIN: 'https://game.example',
      GEMINI_API_KEY: 'test-gemini-key',
      FEATHERLESS_API_KEY: 'test-featherless-key',
      FEATHERLESS_MODEL: 'test-model',
    });

    assert.equal(response.status, 502);
    assert.equal(calls, 2);
    const body = await response.json();
    assert.match(body.error, /Gemini: HTTP 503/);
    assert.match(body.error, /Featherless: HTTP 429/);
    assert.doesNotMatch(body.error, /test-(?:gemini|featherless)-key/);
    assert.deepEqual(diagnostics, [
      'AI provider Gemini failed: HTTP 503',
      'AI provider Featherless failed: HTTP 429',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});
