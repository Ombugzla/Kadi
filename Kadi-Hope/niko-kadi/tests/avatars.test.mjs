import assert from 'node:assert/strict';
import { accessSync } from 'node:fs';
import { test } from 'node:test';
import { ANIME_AVATARS, PLAYER_AVATARS, avatarSVG } from '../www/js/avatars.js';

test('the avatar picker includes the supplied portraits and resolves each image path', () => {
  assert.equal(ANIME_AVATARS.length, 20);
  assert.equal(PLAYER_AVATARS.length, 21);
  for (const name of ANIME_AVATARS) {
    const extension = name === 'avatar9' ? 'jpg' : 'webp';
    assert.doesNotThrow(() => accessSync(new URL(`../www/img/faces/${name}.${extension}`, import.meta.url)));
  }
});

test('JPG and legacy portrait references resolve to the current catalog', () => {
  assert.match(avatarSVG({ photo: 'avatar9' }), /avatar9\.jpg/);
  assert.match(avatarSVG({ photo: 'erik' }), /avatar11\.webp/);
});
