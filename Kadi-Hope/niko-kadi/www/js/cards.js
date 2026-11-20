// Card faces and backs as DOM. Sizing comes from CSS (--cw = card width).
import { rankOf, suitOf, isJoker, RJ, SUIT_SYM, cat } from './engine.js';

const L = 27, C = 50, R = 73;
const PIPS = {
  2: [[C, 17], [C, 83]],
  3: [[C, 17], [C, 50], [C, 83]],
  4: [[L, 17], [R, 17], [L, 83], [R, 83]],
  5: [[L, 17], [R, 17], [C, 50], [L, 83], [R, 83]],
  6: [[L, 17], [R, 17], [L, 50], [R, 50], [L, 83], [R, 83]],
  7: [[L, 17], [R, 17], [C, 33], [L, 50], [R, 50], [L, 83], [R, 83]],
  8: [[L, 17], [R, 17], [C, 33], [L, 50], [R, 50], [C, 67], [L, 83], [R, 83]],
  9: [[L, 17], [R, 17], [L, 39], [R, 39], [C, 50], [L, 61], [R, 61], [L, 83], [R, 83]],
  10: [[L, 17], [R, 17], [C, 28], [L, 39], [R, 39], [L, 61], [R, 61], [C, 72], [L, 83], [R, 83]],
};
// text-style suit glyphs (VS15) so Android never swaps them for emoji
export const SUIT_TXT = SUIT_SYM.map((x) => x + '\uFE0E');
const LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const rankLabel = (id) => LABEL[rankOf(id)] || String(rankOf(id));
export const isRed = (id) => id === RJ || (!isJoker(id) && (suitOf(id) === 1 || suitOf(id) === 2));

// court cards: double-ended figures in the classic orange / red / black palette (original artwork)
const K0 = '#1c1a1a', RD = '#d9382c', OR = '#f2a33a', GD = '#f5c542', SK = '#f6d9b8';
function courtHalf(r, g) {
  const hair = r === 12 ? '#dfa33a' : '#6b3d1a';
  const robe = `<path d="M3 42V34C3 28 11 26 25 26S47 28 47 34V42z" fill="${OR}"/><path d="M25 26C39 26 47 28 47 34V42H25z" fill="${RD}"/><path d="M3 37.500 25 31.500 47 37.500v2.500L25 34 3 40z" fill="${K0}"/><path d="M3 42V34C3 28 11 26 25 26S47 28 47 34V42" fill="none" stroke="${K0}" stroke-width=".7"/><circle cx="10" cy="32" r="1" fill="#fff"/><circle cx="40" cy="32" r="1" fill="#fff"/>`;
  const collar = `<path d="M17.500 27 25 37l7.500-10z" fill="#fff" stroke="${K0}" stroke-width=".6" stroke-linejoin="round"/><path d="M21 28l4 5 4-5" fill="none" stroke="${GD}" stroke-width="1"/>`;
  const back = r === 12 ? `<path d="M17.500 14C14 21 14 27 18 31l3-7zM32.500 14C36 21 36 27 32 31l-3-7z" fill="${hair}" stroke="${K0}" stroke-width=".5"/>` : '';
  const face = `<ellipse cx="25" cy="17.500" rx="6.600" ry="8" fill="${SK}" stroke="${K0}" stroke-width=".6"/><ellipse cx="22.500" cy="17" rx=".9" ry=".7" fill="${K0}"/><ellipse cx="27.500" cy="17" rx=".9" ry=".7" fill="${K0}"/><path d="M21.200 15.200q1.300-.8 2.600 0M26.200 15.200q1.300-.8 2.600 0" stroke="${K0}" stroke-width=".5" fill="none"/><path d="M25 17.500v3.200l-1 .6" stroke="#a06a3a" stroke-width=".5" fill="none"/><path d="M23.200 22.800q1.800 1.100 3.600 0" stroke="${RD}" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
  let top = '';
  if (r === 13) top = `<path d="M18.600 18c0 8 2.800 10.700 6.400 10.700s6.400-2.700 6.400-10.700c-1.200 3.200-3.400 4.800-6.400 4.800s-5.200-1.600-6.400-4.800z" fill="#ece4d2" stroke="${K0}" stroke-width=".5"/><path d="M21.500 21.500q3.500-1.300 7 0" stroke="#bbb2a0" stroke-width=".7" fill="none"/><path d="M17 11l.8-8.500 3.400 4.300L25 .5l3.800 6.300 3.400-4.300.8 8.500z" fill="${GD}" stroke="${K0}" stroke-width=".6" stroke-linejoin="round"/><circle cx="25" cy="7.500" r="1.200" fill="${RD}"/><circle cx="20.500" cy="8.700" r=".8" fill="${RD}"/><circle cx="29.500" cy="8.700" r=".8" fill="${RD}"/>`;
  else if (r === 12) top = `<path d="M18.400 11.500C18 6 21 3.500 25 3.500S32 6 31.600 11.500c-1.800-2.600-3.600-3.300-6.600-3.300s-4.800.7-6.600 3.300z" fill="${hair}" stroke="${K0}" stroke-width=".5"/><path d="M18.500 11 19.800 5l2.500 3L25 2.500 27.700 8l2.500-3 1.300 6z" fill="${GD}" stroke="${K0}" stroke-width=".6" stroke-linejoin="round"/><circle cx="25" cy="5.500" r="1.100" fill="${RD}"/>`;
  else top = `<path d="M18.400 12.500c0-6 2.800-9 6.600-9s6.600 3 6.600 9c-2-3-3.800-4-6.600-4s-4.600 1-6.600 4z" fill="${hair}" stroke="${K0}" stroke-width=".5"/><path d="M16 11.500C17 3 33 3 34 11.500z" fill="${RD}" stroke="${K0}" stroke-width=".6"/><path d="M16 11.500h18" stroke="${K0}" stroke-width=".8"/><path d="M31 6.500C37 -1 45 1 46 8c-4-3-8-3-12 2z" fill="${GD}" stroke="${K0}" stroke-width=".5"/>`;
  const sym = `<text x="41.500" y="14.500" text-anchor="middle" font-size="9.500" fill="currentColor" font-family="'Segoe UI Symbol','Noto Sans Symbols2','DejaVu Sans',sans-serif">${g}</text>`;
  return robe + back + face + top + collar + sym;
}
function courtSVG(r, g) {
  const h = courtHalf(r, g);
  return `<svg viewBox="0 0 50 84" preserveAspectRatio="none"><rect x=".5" y=".5" width="49" height="83" fill="#fff" stroke="${K0}" stroke-width=".9"/><g>${h}</g><g transform="rotate(180 25 42)">${h}</g><path d="M0 42h50" stroke="${K0}" stroke-width=".5"/></svg>`;
}
const ACE_SPADE = `<svg viewBox="0 0 40 52"><path id="aceS" d="M20 1C28 11 38.500 17.500 38.500 28c0 6-5 9.500-10 8.200-2-.5-3.600-1.700-4.600-3.200.5 5 1.900 9 4.600 12.500H11.500c2.700-3.500 4.100-7.500 4.600-12.500-1 1.500-2.600 2.700-4.600 3.200-5 1.300-10-2.200-10-8.200C1.500 17.500 12 11 20 1z" fill="#141414"/><path d="M20 6.500C26 14 34 19.500 34 28c0 4.200-3.500 6.800-7.200 5.800-1.800-.5-3.200-1.600-4-3 .2 4 1.200 7 3 9.200h-11.600c1.800-2.200 2.800-5.200 3-9.200-.8 1.400-2.200 2.500-4 3C8.500 34.800 6 32.200 6 28 6 19.500 14 14 20 6.500z" fill="none" stroke="#fff" stroke-width=".9" stroke-dasharray="1 1.700" stroke-linecap="round"/><circle cx="20" cy="27" r="6.200" fill="#fff"/><circle cx="20" cy="27" r="5" fill="none" stroke="#141414" stroke-width=".6"/><path d="M20 22.500l1.300 3 3.200.3-2.400 2.100.7 3.100L20 29.500l-2.800 1.500.7-3.100-2.400-2.100 3.200-.3z" fill="#141414"/></svg>`;
const JESTER = (red) => `<svg viewBox="0 0 50 70"><path d="M13 27C5 22 3 11 8 4c1 6 6 11 12 15zM37 27c8-5 10-16 5-23-1 6-6 11-12 15zM25 21c-3-7-2-14 0-19 2 5 3 12 0 19z" fill="${red ? RD : K0}" stroke="${K0}" stroke-width=".6" stroke-linejoin="round"/><circle cx="8" cy="4" r="2.200" fill="${GD}" stroke="${K0}" stroke-width=".5"/><circle cx="42" cy="4" r="2.200" fill="${GD}" stroke="${K0}" stroke-width=".5"/><circle cx="25" cy="2.500" r="2.200" fill="${GD}" stroke="${K0}" stroke-width=".5"/><path d="M13 24q12 5 24 0v4q-12 5-24 0z" fill="${red ? K0 : RD}" stroke="${K0}" stroke-width=".5"/><circle cx="25" cy="35" r="11" fill="#fbf1e4" stroke="${K0}" stroke-width=".7"/><ellipse cx="21" cy="33" rx="1.300" ry="1.600" fill="${K0}"/><ellipse cx="29" cy="33" rx="1.300" ry="1.600" fill="${K0}"/><circle cx="25" cy="37" r="2" fill="${RD}"/><path d="M19 41q6 5 12 0" stroke="${RD}" stroke-width="1.200" fill="none" stroke-linecap="round"/><circle cx="17" cy="38" r="2" fill="${RD}" opacity=".35"/><circle cx="33" cy="38" r="2" fill="${RD}" opacity=".35"/><path d="M10 52l5-6 5 6 5-6 5 6 5-6 5 6v4H10z" fill="#fff" stroke="${K0}" stroke-width=".7" stroke-linejoin="round"/><path d="M10 52l5-6 5 6zM25 52l5-6 5 6z" fill="${red ? RD : K0}"/><path d="M8 70V58q17-5 34 0v12z" fill="${red ? K0 : RD}" stroke="${K0}" stroke-width=".6"/><path d="M8 62q17-4 34 0" stroke="${GD}" stroke-width="1.400" fill="none"/></svg>`;

export function cardEl(id) {
  const el = document.createElement('div');
  el.dataset.id = id;
  if (isJoker(id)) {
    el.className = 'card joker ' + (id === RJ ? 'red' : 'black');
    el.innerHTML =
      '<span class="jk">JOKER</span><span class="jstar">' + JESTER(id === RJ) + '</span><span class="jk b">JOKER</span>';
    return el;
  }
  const r = rankOf(id), g = SUIT_TXT[suitOf(id)], lab = rankLabel(id);
  el.className = 'card ' + (isRed(id) ? 'red' : 'black') + (r > 10 ? ' royal' : '') + (r === 1 ? ' ace' : '') + (r === 9 || r === 10 ? ' r' + r : '');
  let mid;
  if (r === 1) mid = suitOf(id) === 0 ? `<span class="acesp">${ACE_SPADE}</span>` : `<span class="bigsuit">${g}</span>`;
  else if (r > 10) mid = `<div class="court">${courtSVG(r, g)}</div>`;
  else
    mid =
      '<div class="pipbox">' +
      PIPS[r].map(([x, y]) => `<span class="pip${y > 50 ? ' dn' : ''}" style="left:${(((x - L) / (R - L)) * 100).toFixed(1)}%;top:${(((y - 17) / 66) * 100).toFixed(1)}%">${g}</span>`).join('') +
      '</div>';
  el.innerHTML = `<div class="cn tl"><b>${lab}</b><i>${g}</i></div>${mid}<div class="cn br"><b>${lab}</b><i>${g}</i></div>`;
  return el;
}

export function backEl(extra = '') {
  const el = document.createElement('div');
  el.className = 'card back ' + extra;
  return el;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const rectOf = (x) => (x instanceof Element ? x.getBoundingClientRect() : x);

// FLIP-style move: animate `node` (already laid out at its final spot) from `from` to where it is.
export function flyFrom(node, from, { dur = 380, delay = 0, rot = 0, reduce = false } = {}) {
  const a = rectOf(from), b = node.getBoundingClientRect();
  if (reduce || !a || !b || !b.width) return Promise.resolve();
  const dx = a.left + a.width / 2 - (b.left + b.width / 2);
  const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  const s = a.width ? a.width / b.width : 1;
  const anim = node.animate(
    [
      { transform: `translate(${dx}px,${dy}px) scale(${s}) rotate(${rot}deg)`, offset: 0 },
      { transform: 'translate(0,0) scale(1) rotate(0deg)', offset: 1 },
    ],
    { duration: dur, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' }
  );
  return anim.finished.catch(() => {});
}

// Free-flying clone between two rects (used where there is no real element at the destination).
export function flyClone(node, from, to, { dur = 380, delay = 0, reduce = false, layer = document.body } = {}) {
  const a = rectOf(from), b = rectOf(to);
  if (reduce || !a || !b) return Promise.resolve();
  node.style.cssText += `;position:fixed;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;margin:0;z-index:70;pointer-events:none`;
  layer.appendChild(node);
  const dx = a.left + a.width / 2 - (b.left + b.width / 2);
  const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  const anim = node.animate(
    [{ transform: `translate(${dx}px,${dy}px)`, opacity: 1 }, { transform: 'translate(0,0)', opacity: 1 }],
    { duration: dur, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'both' }
  );
  return anim.finished.catch(() => {}).then(() => node.remove());
}

export { cat };
