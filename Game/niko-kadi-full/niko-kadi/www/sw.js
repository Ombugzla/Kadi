// Cache-first service worker so the web version works offline.
const CACHE = 'niko-kadi-v15';
const FILES = [
  './', 'index.html', 'manifest.json', 'img/icon.svg', 'img/wood.webp', 'img/icon-192.png', 'img/icon-512.png', 'img/icon-maskable-512.png',
  'css/base.css', 'css/home.css', 'css/table.css', 'css/cards.css', 'css/chat.css',
  'js/main.js', 'js/router.js', 'js/store.js', 'js/screens.js', 'js/chat.js', 'js/table.js', 'js/play.js', 'js/playseq.js',
  'js/engine.js', 'js/bots.js', 'js/sequence.js', 'js/cards.js', 'js/avatars.js', 'js/icons.js', 'js/sound.js', 'js/ui.js', 'js/help.js', 'js/rp.js', 'js/legal.js', 'js/online.js',
  ...['royal', 'guilloche', 'deco', 'beads', 'mandala', 'stars'].map((n) => 'img/backs/' + n + '.svg'),
  ...['amara', 'priya', 'luca', 'erik', 'viktor', 'imani', 'mei', 'layla', 'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 'avatar6', 'avatar7'].map((n) => 'img/faces/' + n + '.webp'),
];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(FILES.map((u) => c.add(u)))).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
