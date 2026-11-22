// Pieces shared by the Niko Kadi and Special Sequence tables: seats, plates, hand fan, flying cards, menu, results.
import * as store from './store.js';
import { avatarHTML } from './avatars.js';
import { backEl, cardEl } from './cards.js';
import { ICON } from './icons.js';
import { sfx, configure } from './sound.js';
import { $, $$, esc, sheet, closeSheet } from './ui.js';
import { HELP_NK, HELP_SS } from './help.js';
import { MAX_STARS } from './engine.js';

// where opponents sit, by table size, in play order after you
export const SLOTS = { 2: ['top'], 3: ['left', 'right'], 4: ['left', 'top', 'right'] };

export const reduced = () => !!store.get().settings.reduceMotion;
export const supportsFly = () => typeof CSS !== 'undefined' && CSS.supports && CSS.supports('translate', '1px');
export const CARD_FLIGHT_MS = 650;
export const CARD_STAGGER_MS = 90;
export const flightDuration = () => reduced() || !supportsFly() ? 0 : CARD_FLIGHT_MS;

// Fly a node from a rect to where it already is. Uses the individual translate/scale properties so the
// card's own transform (hand fan angle, pile tilt) is left alone.
export function fly(node, from, { dur = CARD_FLIGHT_MS, delay = 0 } = {}) {
  if (!node || !from || reduced() || !supportsFly() || !node.animate) return;
  const b = node.getBoundingClientRect();
  if (!b.width) return;
  const dx = from.left + from.width / 2 - (b.left + b.width / 2);
  const dy = from.top + from.height / 2 - (b.top + b.height / 2);
  const sc = Math.max(0.3, Math.min(2.5, from.width / b.width));
  const arc = Math.max(16, Math.min(42, Math.hypot(dx, dy) * 0.12));
  const tilt = (Math.sign(dx) || 1) * 8;
  node.animate(
    [
      { translate: `${dx}px ${dy}px`, scale: sc, rotate: `${tilt}deg` },
      { translate: `${dx * 0.52}px ${dy * 0.52 - arc}px`, scale: Math.min(1.08, sc * 1.05), rotate: `${-tilt * 0.35}deg`, offset: 0.58 },
      { translate: '0px 0px', scale: 1, rotate: '0deg' },
    ],
    { duration: dur, delay, easing: 'cubic-bezier(.22,.72,.28,1)', fill: 'backwards' }
  );
}

// a card back that flies between two rects and disappears (e.g. a draw going to an opponent)
export function flyBack(from, to, { dur = CARD_FLIGHT_MS, delay = 0 } = {}) {
  if (!from || !to || reduced() || !supportsFly()) return;
  const el = backEl();
  el.style.cssText = `position:fixed;left:${to.left + to.width / 2 - 14}px;top:${to.top + to.height / 2 - 20}px;width:28px;height:39px;--cw:28px;z-index:70;pointer-events:none`;
  document.body.appendChild(el);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const arc = Math.max(16, Math.min(42, Math.hypot(dx, dy) * 0.12));
  const a = el.animate(
    [
      { translate: `${dx}px ${dy}px`, scale: 1.7, rotate: '-7deg', opacity: 0.95 },
      { translate: `${dx * 0.52}px ${dy * 0.52 - arc}px`, scale: 1.35, rotate: '3deg', opacity: 0.9, offset: 0.58 },
      { translate: '0 0', scale: 1, rotate: '0deg', opacity: 0.2 },
    ],
    { duration: dur, delay, easing: 'cubic-bezier(.22,.72,.28,1)', fill: 'both' }
  );
  a.finished.catch(() => {}).then(() => el.remove());
}

export const rl = (r) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[r] || String(r));
export const suitHTML = (s) => `<span class="${s === 1 || s === 2 ? 'red' : ''}">${['♠', '♥', '♦', '♣'][s]}︎</span>`;

export function plateHTML(p, i, { active = false, tag = '' } = {}) {
  const stars = Array.from({ length: MAX_STARS }, (_, j) => `<i class="${j < (p.stars ?? MAX_STARS) ? '' : 'off'}"></i>`).join('');
  const t = p.out ? '<span class="tag skip">OUT</span>' : tag;
  return `<div class="plate${active ? ' active' : ''}${p.out ? ' out' : ''}" data-p="${i}">
    ${avatarHTML(p.avatar, 34)}
    <div class="nm"><b>${esc(p.name)}</b>${p.stars != null ? `<span class="stars">${stars}</span>` : ''}</div>
    <span class="cnt">${p.hand.length}</span>${t}
    <div class="tbar"><i></i></div></div>`;
}

export function fanHTML(n) {
  return `<div class="fan">${Array.from({ length: Math.min(n, 8) }, () => backEl().outerHTML).join('')}</div>`;
}

// lay my cards out in a fan; els are .card nodes already inside the hand container
export function layoutHand(container, els) {
  const n = els.length;
  const W = container.clientWidth || 360;
  // big hands get smaller cards and a flatter fan, so nothing slides off the sides or the bottom
  const base = parseFloat(getComputedStyle(container.parentElement || container).getPropertyValue('--hcw')) || 80;
  const f = n <= 5 ? 1 : n <= 7 ? 0.92 : n <= 9 ? 0.82 : 0.72;
  container.style.setProperty('--hcw', Math.round(base * f) + 'px');
  const cw = Math.round(base * f);
  const room = W - cw - 24;
  const step = n > 1 ? Math.min(cw * 0.7, room / (n - 1)) : 0;
  const mid = (n - 1) / 2;
  els.forEach((el, i) => {
    const k = i - mid;
    el.style.setProperty('--x', k * step + 'px');
    el.style.setProperty('--y', (Math.min(10, k * k * (n > 5 ? 0.6 : 2.2)) - (n > 5 ? 14 : 0)) + 'px');
    el.style.setProperty('--r', (n > 1 ? k * Math.min(4.5, 16 / n) : 0) + 'deg');
    el.style.zIndex = i + 1;
  });
}

// Pause / menu sheet. Calls back so each table can pause its own timers.
export function menuSheet({ onResume, onResign, helpHTML, resignText = 'Resign' }) {
  const d = store.get();
  const sh = sheet(
    `<h2>Paused</h2>
    <button class="opt" id="mSound"><span class="ic">${d.settings.sound ? ICON.sound : ICON.mute}</span><div>Sound ${d.settings.sound ? 'on' : 'off'}<small>Tap to switch</small></div></button>
    <button class="opt" id="mHelp"><span class="ic">${ICON.info}</span><div>How to play<small>Rules and special cards</small></div></button>
    <button class="opt" id="mResign"><span class="ic" style="color:var(--danger)">${ICON.close}</span><div>${resignText}</div></button>
    <div class="row"><button class="btn block" id="mGo">Resume</button></div>`,
    { center: true, onClose: onResume }
  );
  $('#mGo', sh.el).onclick = () => { sfx('click'); closeSheet(); };
  $('#mSound', sh.el).onclick = () => {
    d.settings.sound = !d.settings.sound;
    store.save();
    configure({ enabled: d.settings.sound });
    menuSheetRefresh(sh.el, d);
    if (d.settings.sound) sfx('click');
  };
  $('#mHelp', sh.el).onclick = () => {
    sfx('click');
    const h = sheet(`<h2>How to play</h2>${helpHTML}<div class="row"><button class="btn grey block" id="ok">Back</button></div>`, { onClose: () => menuSheet({ onResume, onResign, helpHTML, resignText }) });
    $('#ok', h.el).onclick = () => closeSheet();
  };
  $('#mResign', sh.el).onclick = () => {
    sfx('click');
    const c = sheet(`<h2>Leave the game?</h2><div class="row"><button class="btn grey" id="n">Keep playing</button><button class="btn danger" id="y">Leave</button></div>`, { center: true, onClose: onResume });
    $('#n', c.el).onclick = () => closeSheet();
    $('#y', c.el).onclick = () => { closeSheet(true); onResign(); };
  };
}
function menuSheetRefresh(el, d) {
  const b = $('#mSound', el);
  b.innerHTML = `<span class="ic">${d.settings.sound ? ICON.sound : ICON.mute}</span><div>Sound ${d.settings.sound ? 'on' : 'off'}<small>Tap to switch</small></div>`;
}

export { HELP_NK, HELP_SS, cardEl };

// Pointer-based dragging for a hand card or a pile. A tap (no real movement) calls onTap.
//   can()        may a drag start right now?
//   ghost()      node that follows the finger (a clone of the card, or a card back)
//   rectOf()     where the dragged thing starts (defaults to the element itself)
//   hit(x, y)    is the pointer over the drop zone?
//   hi()         element to highlight while over the zone
//   onDrop()     runs on a good drop; a bad drop glides the card back home
export function dragify(el, { can, ghost, rectOf, hit, hi, onDrop, onTap, target }) {
  let st = null;
  const THR = 9;
  const clear = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
  };
  function begin(e) {
    const r = rectOf ? rectOf() : el.getBoundingClientRect();
    if (!r) { st.can = false; return; }
    const g = ghost();
    g.classList.add('drag-ghost');
    g.style.width = r.width + 'px';
    g.style.height = r.height + 'px';
    g.style.left = r.left + 'px';
    g.style.top = r.top + 'px';
    g.style.setProperty('--cw', r.width + 'px');
    document.body.appendChild(g);
    st.drag = true; st.g = g; st.r = r; st.ox = st.x - r.left; st.oy = st.y - r.top;
    if (el.classList.contains('card')) el.classList.add('dragging');
  }
  // dragged at least halfway to the target counts as a drop, so the move completes itself
  const reach = (e) => {
    if (hit(e.clientX, e.clientY)) return true;
    const T = target && target();
    if (!T || !st) return false;
    const gx = e.clientX - st.ox + st.r.width / 2, gy = e.clientY - st.oy + st.r.height / 2;
    const sx = st.r.left + st.r.width / 2, sy = st.r.top + st.r.height / 2;
    const tx = T.left + T.width / 2, ty = T.top + T.height / 2;
    const D = Math.hypot(tx - sx, ty - sy);
    return D > 0 && Math.hypot(tx - gx, ty - gy) <= D * 0.5;
  };
  function move(e) {
    if (!st || e.pointerId !== st.id) return;
    if (!st.drag) {
      if (!st.can || Math.hypot(e.clientX - st.x, e.clientY - st.y) < THR) return;
      begin(e);
      if (!st.drag) return;
    }
    st.g.style.left = e.clientX - st.ox + 'px';
    st.g.style.top = e.clientY - st.oy + 'px';
    const over = reach(e);
    if (over !== st.over) { st.over = over; const h = hi && hi(); if (h) h.classList.toggle('drop-hi', over); }
    if (e.cancelable) e.preventDefault();
  }
  function finish(e, allowDrop) {
    if (!st || (e && e.pointerId !== st.id)) return;
    const s = st;
    st = null;
    clear();
    if (!s.drag) { if (allowDrop && onTap) onTap(e); return; }
    const h = hi && hi();
    if (h) h.classList.remove('drop-hi');
    el.classList.remove('dragging');
    st = s;
    const ok = allowDrop && reach(e);
    st = null;
    if (ok) { s.g.remove(); onDrop(); return; }
    s.g.classList.add('home');
    s.g.style.left = s.r.left + 'px';
    s.g.style.top = s.r.top + 'px';
    setTimeout(() => s.g.remove(), 220);
  }
  const up = (e) => finish(e, true);
  const cancel = (e) => finish(e, false);
  el.addEventListener('pointerdown', (e) => {
    if (st || (e.pointerType === 'mouse' && e.button !== 0)) return;
    st = { id: e.pointerId, x: e.clientX, y: e.clientY, drag: false, can: !!can(), over: false };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  });
}
