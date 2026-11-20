// Small UI helpers shared by all screens: DOM, toast, bottom sheets.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let toastTimer = 0;
export function toast(msg, ms = 1700) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), ms);
}

let closeCb = null;
// Show a bottom sheet (or centred dialog). Returns { el, close }.
export function sheet(html, { center = false, dismiss = true, onClose = null } = {}) {
  const o = $('#overlay');
  closeSheet(true);
  o.className = center ? 'ovc' : '';
  o.innerHTML = `<div class="sheet">${html}</div>`;
  o.hidden = false;
  closeCb = onClose;
  o.onclick = (e) => {
    if (dismiss && e.target === o) closeSheet();
  };
  return { el: o.firstElementChild, close: closeSheet };
}

export function closeSheet(silent = false) {
  const o = $('#overlay');
  if (!o || o.hidden) return;
  o.hidden = true;
  o.innerHTML = '';
  const cb = closeCb;
  closeCb = null;
  if (!silent && cb) cb();
}
export const sheetOpen = () => { const o = $('#overlay'); return !!o && !o.hidden; };
