import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../workers/ai-chat/src/index.js';

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
