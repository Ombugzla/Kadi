import assert from 'node:assert/strict';
import { accessSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

test('the light-theme mountain backdrop is included in the offline cache', () => {
  const image = new URL('../www/img/misty-mountains.webp', import.meta.url);
  const styles = readFileSync(new URL('../www/css/base.css', import.meta.url), 'utf8');
  const serviceWorker = readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');

  assert.doesNotThrow(() => accessSync(image));
  assert.match(styles, /misty-mountains\.webp/);
  assert.match(serviceWorker, /'img\/misty-mountains\.webp'/);
});
