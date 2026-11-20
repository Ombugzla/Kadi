// Special Sequence table.
import * as E from './engine.js';
import { newSeqGame, seqPick, seqDispose, SEQ_PATTERNS } from './sequence.js';
import { BOTS, pickOpponents, seqChoosePick, seqChooseDispose } from './bots.js';
import { cardEl, backEl, wait } from './cards.js';
import { playerAvatar, avatarHTML } from './avatars.js';
import { ICON } from './icons.js';
import { sfx, configure } from './sound.js';
import * as store from './store.js';
import { $, $$, esc, toast, sheet, closeSheet } from './ui.js';
import { go, pushBack } from './router.js';
import { SLOTS, fly, flyBack, plateHTML, fanHTML, layoutHand, menuSheet, dragify, HELP_SS } from './table.js';

let G = null;

export function stopSeq() {
  if (!G) return;
  G.stopped = true;
  clearTimeout(G.botT);
  G.unback && G.unback();
  G = null;
}

export function startSeq({ botId, count }) {
  stopSeq();
  const d = store.get();
  const opp = pickOpponents(botId, count - 1);
  const list = [{ name: d.name, avatar: playerAvatar(d), human: true }, ...opp.map((b) => ({ name: b.name, bot: b, avatar: b.avatar }))];
  const players = list.map((p) => ({ p, k: Math.random() })).sort((a, b) => a.k - b.k).map((x) => x.p);
  const s = newSeqGame({ players });
  G = { s, me: players.findIndex((p) => p.human), botId, count, sel: [], busy: true, paused: false, stopped: false, botT: 0, msg: '', els: new Map(), rivals: opp };
  store.get().lastBot.ss = botId;
  document.body.classList.add('playing');
  G.unback = pushBack(() => openMenu());
  build();
  renderAll(true);
  sfx('shuffle');
  setTimeout(() => sfx('deal'), 350);
  wait(900).then(() => { if (!G || G.stopped) return; G.busy = false; nextStep(); });
}

function build() {
  $('#screen').innerHTML = `<div class="table seq" id="tbl">
    <button class="hint" id="snd" aria-label="Sound"></button>
    <button class="menu" id="menu" aria-label="Menu"><span class="ic">${ICON.list}</span></button>
    <div id="seats"></div>
    <div class="center"><div class="pile tap" id="deadP"></div><div class="pile" id="dispP"></div></div>
    <div class="goal">${Object.values(SEQ_PATTERNS).map((t) => `<span>${t}</span>`).join('')}</div>
    <div class="status" id="status"></div>
    <div class="mine" id="mine"></div>
    <div class="bar" id="bar"></div>
    <div class="hand" id="hand"></div>
  </div>`;
  $('#menu').onclick = () => { sfx('click'); openMenu(); };
  $('#snd').onclick = () => { const d = store.get(); d.settings.sound = !d.settings.sound; store.save(); configure({ enabled: d.settings.sound }); renderSnd(); if (d.settings.sound) sfx('click'); };
  const topOf = (sel) => { const c = [...document.querySelectorAll(sel + ' .card')].pop(); return c ? c.getBoundingClientRect() : null; };
  const pileDrag = (id, from, ghost, sel) => dragify($(id), {
    can: () => myTurn() && !G.busy && !G.paused && G.s.phase === 'pick' && (from === 'dead' ? G.s.dead.length : G.s.dispose.length) > 0,
    ghost, rectOf: () => topOf(sel),
    hit: (x, y) => y > $('#hand').getBoundingClientRect().top - 50,
    hi: () => $('#hand'),
    target: () => $('#hand').getBoundingClientRect(),
    onDrop: () => onPile(from, true),
    onTap: () => onPile(from),
  });
  pileDrag('#deadP', 'dead', () => backEl(), '#deadP');
  pileDrag('#dispP', 'dispose', () => cardEl(G.s.dispose[G.s.dispose.length - 1]), '#dispP');
  renderSnd();
}
const renderSnd = () => { const b = $('#snd'); if (b) b.innerHTML = `<span class="ic">${store.get().settings.sound ? ICON.sound : ICON.mute}</span>`; };

const nm = (i) => (i === G.me ? 'You' : G.s.players[i].name);
const seatRect = (i) => { const el = $(`.plate[data-p="${i}"]`); return el ? el.getBoundingClientRect() : null; };
const myTurn = () => !!G && !G.s.over && G.s.cur === G.me;

function renderAll(initial = false) {
  const s = G.s, n = s.n, slots = SLOTS[n];
  let html = '';
  for (let k = 1; k < n; k++) {
    const i = (G.me + k) % n, p = s.players[i];
    html += `<div class="seat ${slots[k - 1]}">${plateHTML({ ...p, stars: null }, i, { active: s.cur === i && !s.over })}${fanHTML(p.hand.length)}</div>`;
  }
  $('#seats').innerHTML = html;
  $('#mine').innerHTML = plateHTML({ ...s.players[G.me], stars: null }, G.me, { active: myTurn() });
  renderPiles();
  renderStatus();
  renderHand(initial);
  renderBar();
}

function renderPiles() {
  const s = G.s, pick = myTurn() && s.phase === 'pick';
  const dp = $('#deadP');
  dp.className = 'pile tap' + (pick ? ' glow' : '') + (s.dead.length ? '' : ' empty');
  let h = '';
  const nb = Math.min(3, s.dead.length);
  for (let i = 0; i < nb; i++) { const b = backEl(); b.style.transform = `translate(${(i - nb + 1) * 2}px,${(i - nb + 1) * 2}px)`; h += b.outerHTML; }
  dp.innerHTML = h + `<span class="cnt">${s.dead.length}</span><span class="lbl">Dead pile</span>`;
  const sp = $('#dispP');
  sp.className = 'pile' + (s.dispose.length ? ' tap' : ' empty') + (pick && s.dispose.length ? ' glow' : '');
  sp.innerHTML = '';
  s.dispose.slice(-3).forEach((id, i, arr) => {
    const el = cardEl(id);
    const depth = arr.length - 1 - i;
    el.style.transform = `rotate(${depth === 0 ? 0 : (((id * 37) % 11) - 5) * 1.3}deg) translate(${depth * -3}px,${depth * -2}px)`;
    sp.appendChild(el);
  });
  const lb = document.createElement('span');
  lb.className = 'lbl';
  lb.textContent = 'Dispose';
  sp.appendChild(lb);
}

function renderStatus() {
  const s = G.s, el = $('#status');
  if (s.over) { el.hidden = true; return; }
  el.hidden = false;
  if (s.cur === G.me) { el.className = 'status you'; el.textContent = s.phase === 'pick' ? 'Your turn · take a card from either pile' : 'Now throw away one card'; }
  else { el.className = 'status'; el.textContent = G.msg || `${s.players[s.cur].name} is thinking…`; }
}

const byRank = (h) => h.slice().sort((a, b) => E.orderOf(a) - E.orderOf(b) || E.suitOf(a) - E.suitOf(b));

function renderHand(initial) {
  const s = G.s, box = $('#hand');
  const ids = byRank(s.players[G.me].hand);
  for (const [id, el] of G.els) if (!ids.includes(id)) { el.remove(); G.els.delete(id); }
  const els = ids.map((id) => {
    let el = G.els.get(id);
    if (!el) {
      el = cardEl(id);
      dragify(el, {
        can: () => !!G && myTurn() && !G.busy && !G.paused && G.s.phase === 'dispose',
        ghost: () => { const g = el.cloneNode(true); g.classList.remove('sel', 'dragging'); return g; },
        hit: (x, y) => y < $('#hand').getBoundingClientRect().top - 12,
        hi: () => $('.center'),
        target: () => $('#dispP').getBoundingClientRect(),
        onDrop: () => { G.sel = [id]; throwAway(true); },
        onTap: () => onCard(id),
      });
      G.els.set(id, el);
      el.dataset.fresh = '1';
    }
    el.classList.toggle('sel', G.sel.includes(id));
    box.appendChild(el);
    return el;
  });
  layoutHand(box, els);
  const from = (G.lastPile && $(G.lastPile === 'dispose' ? '#dispP' : '#deadP').getBoundingClientRect()) || $('#deadP').getBoundingClientRect();
  els.forEach((el, i) => { if (el.dataset.fresh) { delete el.dataset.fresh; { if (!G.noFly) fly(el, from, { delay: initial ? 120 + i * 120 : 0 }); } } });
}

function renderBar() {
  const s = G.s, bar = $('#bar');
  if (!myTurn() || G.busy || G.paused || s.phase !== 'dispose') { bar.innerHTML = ''; return; }
  bar.innerHTML = G.sel.length ? `<button class="act go" data-a="dispose">Throw away</button>` : '';
  const b = $('.act', bar);
  if (b) b.onclick = () => { sfx('click'); throwAway(); };
}

// ------------------------------------------------------------------ actions
function onCard(id) {
  if (!G || G.busy || G.paused || !myTurn() || G.s.phase !== 'dispose') return;
  if (G.sel[0] === id) { sfx('click'); return throwAway(); }
  sfx('select');
  G.sel = [id];
  renderHand();
  renderBar();
}

function onPile(from, viaDrag = false) {
  if (!G || G.busy || G.paused || !myTurn()) return;
  const s = G.s;
  if (s.phase !== 'pick') { toast('Throw away a card first'); sfx('error'); return; }
  if (from === 'dispose' && !s.dispose.length) { toast('Nothing in the dispose pile yet'); sfx('error'); return; }
  act(() => seqPick(s, from), { from, noFly: viaDrag });
}

function throwAway(viaDrag = false) {
  if (!G.sel.length) return;
  const c = G.sel[0];
  const rect = G.els.get(c) ? G.els.get(c).getBoundingClientRect() : null;
  act(() => seqDispose(G.s, c), { rect, card: c, noFly: viaDrag });
}

async function act(fn, ctx = {}) {
  const s = G.s;
  const pre = { dead: $('#deadP').getBoundingClientRect(), disp: $('#dispP').getBoundingClientRect() };
  const r = fn();
  if (!r.ok) { sfx('error'); toast(r.reason || 'Not allowed'); return; }
  G.sel = [];
  G.busy = true;
  G.noFly = !!ctx.noFly;
  await present(r.ev, pre, ctx);
  if (G) G.noFly = false;
  if (!G || G.stopped) return;
  G.busy = false;
  if (s.over) return finish();
  nextStep();
}

async function present(ev, pre, ctx) {
  const s = G.s;
  const lastPick = ev.find((e) => e.t === 'pick');
  G.lastPile = lastPick ? lastPick.from : null;
  renderAll();
  let t = 0;
  const at = (ms, fn) => setTimeout(() => { if (G && !G.stopped) fn(); }, ms);
  const msgs = [];
  for (const e of ev) {
    switch (e.t) {
      case 'pick': {
        at(t, () => sfx(e.from === 'dispose' ? 'flip' : 'draw'));
        if (e.p !== G.me) { flyBack(e.from === 'dispose' ? pre.disp : pre.dead, seatRect(e.p), { delay: t }); msgs.push(`${nm(e.p)} took from the ${e.from === 'dispose' ? 'dispose' : 'dead'} pile`); }
        t += 260;
        break;
      }
      case 'dispose': {
        at(t, () => sfx('place'));
        const node = $(`#dispP .card[data-id="${e.card}"]`);
        const from = e.p === G.me ? ctx.rect : seatRect(e.p);
        if (node && from && !(G.noFly && e.p === G.me)) fly(node, from, { delay: t });
        if (e.p !== G.me) msgs.push(`${nm(e.p)} threw away ${E.cardName(e.card)}`);
        t += 260;
        break;
      }
      case 'refill': at(t, () => sfx('shuffle')); t += 350; break;
      case 'turn': if (e.p === G.me) at(t + 60, () => sfx('turn')); break;
      case 'win': at(t + 150, () => sfx(e.p === G.me ? 'win' : 'lose')); t += 500; break;
    }
  }
  if (msgs.length) G.msg = msgs.slice(-1)[0];
  if (G.s.cur !== G.me && !G.s.over) { const st = $('#status'); if (st) st.textContent = G.msg; }
  await wait(Math.max(240, t + 100));
}

function nextStep() {
  if (!G || G.stopped || G.paused || G.busy) return;
  const s = G.s;
  renderAll();
  clearTimeout(G.botT);
  if (s.over || s.cur === G.me) return;
  G.botT = setTimeout(botMove, 700 + Math.random() * 500);
}

function botMove() {
  if (!G || G.stopped || G.paused || G.busy) return;
  const s = G.s;
  if (s.over || s.cur === G.me) return;
  const L = s.players[s.cur].bot.L;
  if (s.phase === 'pick') act(() => seqPick(s, seqChoosePick(s, L)));
  else { const c = seqChooseDispose(s, L); const rect = seatRect(s.cur); act(() => seqDispose(s, c), { rect, card: c }); }
}

// ------------------------------------------------------------------ menu, result
function openMenu() {
  if (!G || G.stopped || G.s.over) return;
  if (document.querySelector('#overlay:not([hidden])')) return closeSheet();
  G.paused = true;
  clearTimeout(G.botT);
  menuSheet({
    helpHTML: HELP_SS,
    onResume: () => { if (!G) return; G.paused = false; nextStep(); },
    onResign: () => { G.paused = false; finish('resign'); },
  });
}

function finish(why) {
  if (!G || G.finished) return;
  G.finished = true;
  clearTimeout(G.botT);
  const s = G.s;
  const won = !!s.over && s.over.winner === G.me && why !== 'resign';
  const w = s.over ? s.players[s.over.winner] : null;
  store.recordResult('ss', won, G.rivals, G.botId, { winner: won ? s.players[G.me].name : (w && w.name) || '' });
  const title = why === 'resign' ? 'You left the game' : won ? 'Victory! You won' : `Defeat! ${esc(w.name)} won`;
  const sub = why === 'resign' ? '' : SEQ_PATTERNS[s.over.pattern];
  const reveal = w && why !== 'resign' ? `<div class="reveal">${w.hand.slice().sort((a, b) => E.orderOf(a) - E.orderOf(b)).map((c) => cardEl(c).outerHTML).join('')}</div>` : '';
  const st = store.get().stats.ss;
  setTimeout(() => {
    if (!G || G.stopped) return;
    G.busy = true;
    $('#bar').innerHTML = '';
    const sh = sheet(`<div class="result ${won ? 'won' : 'lost'}">
      <span class="ic trophy">${won ? ICON.trophy : ICON.seq}</span>
      <h2>${title}</h2><p>${sub}</p>${reveal}
      <p class="rk">Special Sequence wins: ${st.won} of ${st.played}</p>
      <div class="row"><button class="btn grey" id="rHome">Home</button><button class="btn" id="rAgain">Rematch</button></div></div>`, { center: true, dismiss: false });
    $('#rHome', sh.el).onclick = () => { sfx('click'); closeSheet(true); leave(); };
    $('#rAgain', sh.el).onclick = () => { sfx('click'); closeSheet(true); const { botId, count } = G; startSeq({ botId, count }); };
  }, why === 'resign' ? 0 : 900);
}

function leave() {
  stopSeq();
  document.body.classList.remove('playing');
  go('home');
}
