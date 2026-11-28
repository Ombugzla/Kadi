import assert from 'node:assert/strict';
import { accessSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cardFacePath } from '../www/js/cards.js';

const UPLOADED_BACKS = [
  'baroque-ink',
  'antique-olive',
  'antique-rose',
  'astral-gold',
  'navy-filigree',
  'scarlet-scroll',
  'sapphire-scroll',
];

test('all card ids map to the supplied face artwork', () => {
  const paths = Array.from({ length: 54 }, (_, id) => cardFacePath(id));
  assert.equal(new Set(paths).size, 54);
  for (const path of paths) {
    assert.doesNotThrow(() => accessSync(new URL(`../www/${path}`, import.meta.url)));
  }
  assert.equal(cardFacePath(0), 'img/cards/ace_of_spades.svg');
  assert.equal(cardFacePath(12), 'img/cards/king_of_spades.svg');
  assert.equal(cardFacePath(13), 'img/cards/ace_of_hearts.svg');
  assert.equal(cardFacePath(26), 'img/cards/ace_of_diamonds.svg');
  assert.equal(cardFacePath(38), 'img/cards/king_of_diamonds.svg');
  assert.equal(cardFacePath(39), 'img/cards/ace_of_clubs.svg');
  assert.equal(cardFacePath(51), 'img/cards/king_of_clubs.svg');
  assert.equal(cardFacePath(52), 'img/cards/joker_red.svg');
  assert.equal(cardFacePath(53), 'img/cards/joker_black.svg');
});

test('uploaded card backs are available in the shop, game, and offline cache', () => {
  const shop = readFileSync(new URL('../www/js/screens.js', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../www/css/cards.css', import.meta.url), 'utf8');
  const serviceWorker = readFileSync(new URL('../www/sw.js', import.meta.url), 'utf8');

  for (const back of UPLOADED_BACKS) {
    const svgPath = new URL(`../www/img/backs/${back}.svg`, import.meta.url);
    assert.doesNotThrow(() => accessSync(svgPath));
    assert.match(readFileSync(svgPath, 'utf8'), /<svg\b[\s\S]*data:image\/webp;base64,/);
    assert.match(shop, new RegExp(`['"]${back}['"]\\s*:`));
    assert.match(styles, new RegExp(`data-back="${back}"`));
    assert.match(serviceWorker, new RegExp(`'${back}'`));
  }
});

test('card face mapping rejects invalid ids', () => {
  assert.throws(() => cardFacePath(-1), RangeError);
  assert.throws(() => cardFacePath(54), RangeError);
  assert.throws(() => cardFacePath(1.5), TypeError);
});
