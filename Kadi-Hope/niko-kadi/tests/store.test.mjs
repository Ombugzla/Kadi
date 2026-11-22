import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};

const store = await import('../www/js/store.js?online-result-test');

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
