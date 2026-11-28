import assert from 'node:assert/strict';
import { accessSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

test('light-theme image and font assets are included in the offline cache', () => {
  const image = new URL('../www/img/misty-mountains.webp', import.meta.url);
  const homeImage = new URL('../www/img/misty-mountains-home.webp', import.meta.url);
  const homeLayout = new URL('../www/img/home-layout.webp', import.meta.url);
  const styles = readFileSync(new URL('../www/css/base.css', import.meta.url), 'utf8');
  const homeStyles = readFileSync(new URL('../www/css/home.css', import.meta.url), 'utf8');
  const tableStyles = readFileSync(new URL('../www/css/table.css', import.meta.url), 'utf8');
  const serviceWorker = readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');

  assert.doesNotThrow(() => accessSync(image));
  assert.doesNotThrow(() => accessSync(homeImage));
  assert.doesNotThrow(() => accessSync(homeLayout));
  assert.match(styles, /misty-mountains\.webp/);
  assert.match(styles, /home-layout\.webp/);
  assert.match(styles, /#app\.home-screen #homePage h1/);
  assert.doesNotMatch(styles, /#screen h1/);
  assert.match(styles, /source-sans-3\.woff/);
  assert.match(styles, /crimson-text-bold\.woff/);
  assert.match(homeStyles, /gem\.svg/);
  assert.match(homeStyles, /gem-end\.svg/);
  assert.match(tableStyles, /misty-mountains-home\.webp/);
  assert.match(serviceWorker, /'img\/misty-mountains\.webp'/);
  assert.match(serviceWorker, /'img\/misty-mountains-home\.webp'/);
  assert.match(serviceWorker, /'img\/home-layout\.webp'/);
  assert.match(serviceWorker, /'fonts\/source-sans-3\.woff'/);
  assert.match(serviceWorker, /'fonts\/crimson-text-bold\.woff'/);
  assert.match(serviceWorker, /'fonts\/crimson-text-semibold\.woff'/);
});
