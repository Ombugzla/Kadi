// Offline-capable service worker. Code (html/js/css/json) is network-first so updates always show up;
// images and other static assets are cache-first. Bump CACHE whenever you ship a new version.
const CACHE = 'niko-kadi-v56';
const CARD_FACES = [
  ...['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king']
    .flatMap((rank) => ['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => `img/cards/${rank}_of_${suit}.svg`)),
  'img/cards/joker_red.svg',
  'img/cards/joker_black.svg',
];
const FILES = [
  './', 'index.html', 'about.html', 'legal.html', 'manifest.json', 'img/icon.svg', 'img/quadra-q.svg', 'img/quadra-splash.png', 'img/quadra-games-splash.png', 'img/wood.webp', 'img/icon-192.png', 'img/icon-512.png', 'img/icon-maskable-512.png',
  'css/base.css', 'css/home.css', 'css/table.css', 'css/cards.css', 'css/chat.css',
  'js/main.js', 'js/router.js', 'js/store.js', 'js/screens.js', 'js/chat.js', 'js/direct-messages.js', 'js/ai-chat.js', 'js/ai-chat-config.js', 'js/supabase-config.js', 'js/clerk-config.js', 'js/supabase-client.js', 'js/account.js', 'js/table.js', 'js/play.js', 'js/playseq.js',
  'js/engine.js', 'js/bots.js', 'js/league.js', 'js/sequence.js', 'js/cards.js', 'js/avatars.js', 'js/icons.js', 'js/sound.js', 'js/ui.js', 'js/help.js', 'js/rp.js', 'js/legal.js', 'js/online.js',
  ...CARD_FACES,
  ...['royal', 'guilloche', 'deco', 'beads', 'mandala', 'stars'].map((n) => 'img/backs/' + n + '.svg'),
  'img/faces/amara.webp',
  ...Array.from({ length: 20 }, (_, i) => `avatar${i + 1}`)
    .filter((name) => name !== 'avatar11')
    .map((name) => `img/faces/${name}.${name === 'avatar9' ? 'jpg' : 'webp'}`),
];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(FILES.map((u) => c.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const isCode = e.request.mode === 'navigate' || /\.(?:html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isCode) {
    // network-first: fresh files when online, cached copy when offline
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
