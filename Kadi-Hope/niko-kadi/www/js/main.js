// Entry point: boot, bottom navigation, Android back button, router wiring.
import * as store from './store.js';
import { setRouter, handleBack } from './router.js';
import { applyTheme, renderHome, renderRank, renderShop, renderMore } from './screens.js';
import { startNiko, stopNiko } from './play.js';
import { startSeq, stopSeq } from './playseq.js';
import { sfx, unlock } from './sound.js';
import { $, $$, sheetOpen, closeSheet } from './ui.js';

const TABS = { home: renderHome, rank: renderRank, shop: renderShop, more: renderMore };
let tab = 'home';

// unread messages and notifications show as a badge on More
function refreshBadge() {
  const b = $('#moreBadge');
  if (!b) return;
  const n = store.unread();
  b.textContent = n > 9 ? '9+' : String(n);
  b.hidden = !n;
}

function go(t = tab) {
  stopNiko();
  stopSeq();
  closeSheet(true);
  document.body.classList.remove('playing');
  tab = TABS[t] ? t : 'home';
  $$('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const root = $('#screen');
  root.innerHTML = '';
  TABS[tab](root);
  refreshBadge();
}

function start(game, opts) {
  closeSheet(true);
  if (game === 'ss') startSeq(opts);
  else startNiko(opts);
}

setRouter({ go, start });

function boot() {
  store.load();
  applyTheme();
  $$('#nav button').forEach((b) => (b.onclick = () => { go(b.dataset.tab); }));
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  store.touchDay();
  document.addEventListener('nk:inbox', refreshBadge);
  go('home');

  // Android hardware back (Capacitor). In a plain browser this is a no-op.
  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.addListener) {
      App.addListener('backButton', () => {
        if (sheetOpen()) return closeSheet();
        if (handleBack()) return;
        if (tab !== 'home') return go('home');
        App.exitApp && App.exitApp();
      });
      // sound can't play in the background
      App.addListener('appStateChange', (st) => { if (!st.isActive) document.dispatchEvent(new Event('nk:background')); });
    }
  } catch (e) { /* not native */ }

  // Offline for the web version; the native app already ships its files.
  const native = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  if (!native && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    // When a new version of the app takes over, reload once so the player never sees stale screens.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
