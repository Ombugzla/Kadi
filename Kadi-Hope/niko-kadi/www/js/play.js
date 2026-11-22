// Niko Kadi table: rendering, input, bots, timer, sound and results.
import * as E from './engine.js';
import { chooseAction, applyAction, pickOpponents } from './bots.js';
import { cardEl, backEl, wait, SUIT_TXT, rankLabel } from './cards.js';
import { playerAvatar, avatarHTML } from './avatars.js';
import { ICON } from './icons.js';
import { sfx, vibrate } from './sound.js';
import * as store from './store.js';
import { rankInfo } from './rp.js';
import { $, $$, esc, toast, sheet, closeSheet } from './ui.js';
import { go, pushBack } from './router.js';
import { SLOTS, fly, flyBack, rl, suitHTML, plateHTML, fanHTML, layoutHand, menuSheet, dragify, HELP_NK, CARD_STAGGER_MS, flightDuration } from './table.js';
import { net } from './online.js';

let G = null;

export function stopNiko() {
  if (!G) return;
  G.stopped = true;
  clearInterval(G.tmr);
  clearTimeout(G.botT);
  if (G.onlineRoom) net.unwatchRoom();
  G.unback && G.unback();
  G = null;
}

export function startNiko({ botId, count, rules, onlineRoom = null, onlineState = null, onlineMe = 0, onlineVersion = 0 }) {
  stopNiko();
  const d = store.get();
  const opp = onlineRoom ? [] : pickOpponents(botId, count - 1);
  let players, s, me;
  if (onlineRoom) {
    s = onlineState;
    players = s.players;
    me = onlineMe;
  } else {
    const list = [{ name: d.name, avatar: playerAvatar(d), human: true }, ...opp.map((b) => ({ name: b.name, bot: b, avatar: b.avatar }))];
    players = list.map((p) => ({ p, k: Math.random() })).sort((a, b) => a.k - b.k).map((x) => x.p);
    s = E.newGame({ players, rules });
    me = players.findIndex((p) => p.human);
  }
  G = {
    s, me, botId, count: onlineRoom ? s.n : count, rules: s.rules || rules,
    sel: [], busy: true, paused: false, stopped: false, turnKey: -1,
    deadline: 0, timerWarned: false, tmr: 0, botT: 0, msg: '', els: new Map(), rivals: opp,
    onlineRoom, onlineVersion, onlineSyncing: false,
  };
  if (onlineRoom) G.rivals = s.players.filter((_, index) => index !== me).map((player) => ({ name: player.name }));
  if (!onlineRoom) store.get().lastBot.nk = botId;
  document.body.classList.add('playing');
  G.unback = pushBack(() => openMenu());
  build();
  renderAll(true);
  if (onlineRoom) {
    net.watchRoom(onlineRoom, () => {
      if (!G || G.stopped || G.onlineSyncing) return;
      G.onlineSyncing = true;
      net.state(onlineRoom).then((result) => {
        if (!G || G.stopped || result.version <= G.onlineVersion) return;
        G.s = result.state;
        G.me = result.me;
        G.onlineVersion = result.version;
        renderAll();
        if (G.s.over) finish();
        else nextStep();
      }).catch((error) => {
        if (G && !G.stopped) toast(error.message || 'Could not sync the game.');
      }).finally(() => { if (G) G.onlineSyncing = false; });
    });
  }
  sfx('shuffle');
  setTimeout(() => sfx('deal'), 350);
  wait(900).then(() => { if (!G || G.stopped) return; G.busy = false; nextStep(); });
}

// ------------------------------------------------------------------ skeleton
function build() {
  $('#screen').innerHTML = `<div class="table" id="tbl">
    <button class="hint" id="snd" aria-label="Sound"></button>
    <button class="menu" id="menu" aria-label="Menu"><span class="ic">${ICON.list}</span></button>
    <div id="seats"></div>
    <div class="center"><div class="pile" id="drawP"></div><div class="pile" id="discP"></div></div>
    <div class="effect" id="eff" hidden></div>
    <div class="status" id="status"></div>
    <div class="mine" id="mine"></div>
    <div class="bar" id="bar"></div>
    <div class="hand" id="hand"></div>
  </div>`;
  dragify($('#drawP'), {
    can: () => canAct() && !!G.s.draw.length && E.summary(G.s).canTake,
    ghost: () => backEl(),
    rectOf: () => { const c = $('#drawP .card:last-of-type'); return c ? c.getBoundingClientRect() : null; },
    hit: (x, y) => y > $('#hand').getBoundingClientRect().top - 50,
    hi: () => $('#hand'),
    target: () => $('#hand').getBoundingClientRect(),
    onDrop: () => onAct('take', { noFly: true }),
    onTap: () => { if (canAct()) toast(E.summary(G.s).canTake ? 'Drag the pile to your hand, or press Take' : "You can't draw right now"); },
  });
  $('#menu').onclick = () => { sfx('click'); openMenu(); };
  $('#snd').onclick = () => { const d = store.get(); d.settings.sound = !d.settings.sound; store.save(); import('./sound.js').then((m) => m.configure({ enabled: d.settings.sound })); renderSnd(); if (d.settings.sound) sfx('click'); };
  renderSnd();
}
const renderSnd = () => { const b = $('#snd'); if (b) b.innerHTML = `<span class="ic">${store.get().settings.sound ? ICON.sound : ICON.mute}</span>`; };

// ------------------------------------------------------------------ rendering
const nm = (i) => (i === G.me ? 'You' : G.s.players[i].name);
const seatRect = (i) => { const el = $(`.plate[data-p="${i}"]`); return el ? el.getBoundingClientRect() : null; };

function renderAll(initial = false) {
  renderSeats();
  renderCenter();
  renderEffect();
  renderStatus();
  renderMine();
  renderHand(initial);
  renderBar();
}

function renderSeats() {
  const s = G.s, n = s.n, slots = SLOTS[n];
  let html = '';
  for (let k = 1; k < n; k++) {
    const i = (G.me + k) % n, p = s.players[i];
    const tag = p.declared != null && !p.out ? '<span class="tag">NIKO KADI</span>' : '';
    html += `<div class="seat ${slots[k - 1]}">${plateHTML(p, i, { active: s.cur === i && !s.over, tag })}${p.out ? '' : fanHTML(p.hand.length)}</div>`;
  }
  $('#seats').innerHTML = html;
}

function renderMine() {
  const s = G.s, p = s.players[G.me];
  const tag = p.declared != null && !p.out ? '<span class="tag">NIKO KADI</span>' : '';
  $('#mine').innerHTML = plateHTML(p, G.me, { active: s.cur === G.me && !s.over, tag });
}

function renderCenter() {
  const s = G.s;
  const dp = $('#drawP');
  dp.className = 'pile' + (s.draw.length ? '' : ' empty');
  let h = '';
  if (s.draw.length) {
    const nb = Math.min(3, s.draw.length);
    for (let i = 0; i < nb; i++) { const b = backEl(); b.style.transform = `translate(${(i - nb + 1) * 2}px,${(i - nb + 1) * 2}px)`; h += b.outerHTML; }
  }
  dp.innerHTML = h + `<span class="cnt">${s.draw.length}</span>`;
  const dc = $('#discP');
  dc.className = 'pile';
  dc.innerHTML = '';
  const top = s.discard.slice(-3);
  top.forEach((id, i) => {
    const el = cardEl(id);
    const depth = top.length - 1 - i;
    const tilt = depth === 0 ? 0 : (((id * 37) % 11) - 5) * (depth === 1 ? 1.1 : 1.6);
    el.style.transform = `rotate(${tilt}deg) translate(${depth * -3}px, ${depth * -2}px)`;
    dc.appendChild(el);
  });
}

function infoText() {
  const s = G.s, inf = E.info(s);
  const suits = [0, 1, 2, 3].filter((x) => inf.mask & (1 << x)).map(suitHTML).join('');
  return inf.rc != null ? `${suits} or ${rl(inf.rc === 12 ? 12 : inf.rc)}${inf.rc === 12 ? '/8' : ''}` : suits;
}

function renderEffect() {
  const s = G.s, el = $('#eff');
  let cls = '', html = '';
  if (s.over) { el.hidden = true; return; }
  if (s.pending) { cls = 'pen'; html = `<span class="big">${s.pending.count}</span> to draw`; }
  else if (s.turn.mustAnswer) { cls = 'q'; html = `Answer <span class="big">?</span>`; }
  else if (s.threat > 0) { cls = 'jmp'; html = `Skip <span class="big">×${s.threat}</span>`; }
  else if (s.demand) {
    cls = 'dem';
    html = s.demand.W >= 2 ? `Request <span class="big">${rl(s.demand.rank)}${suitHTML(s.demand.suit)}</span>` : `Suit <span class="big">${suitHTML(s.demand.suit)}</span>`;
  } else if (s.eff && s.eff.mask) {
    cls = 'q';
    html = `Follow <span class="big">${[0, 1, 2, 3].filter((x) => s.eff.mask & (1 << x)).map(suitHTML).join('')}</span>`;
  }
  if (!html) { el.hidden = true; el.dataset.k = ''; return; }
  const key = cls + html;
  el.className = 'effect ' + cls;
  el.innerHTML = html;
  if (el.dataset.k !== key) { el.hidden = true; void el.offsetWidth; } // restart the pop animation
  el.hidden = false;
  el.dataset.k = key;
}

function hintText() {
  const s = G.s, c = E.ctx(s);
  switch (c) {
    case 'answer': return `Answer the question with a normal card (${infoText()})`;
    case 'pending': return `Draw ${s.pending.count}, pass it on, or play an Ace`;
    case 'threat': return 'Counter with a Jack, or accept the skip';
    case 'demand': return s.demand.W >= 2 ? `Play the ${rl(s.demand.rank)}${suitHTML(s.demand.suit)} or an Ace` : `Play ${suitHTML(s.demand.suit)} or an Ace`;
    default: return s.turn.placed ? 'Play more, or pass' : `Your turn · match ${infoText()}`;
  }
}

function renderStatus() {
  const s = G.s, el = $('#status');
  if (s.over) { el.hidden = true; return; }
  el.hidden = false;
  if (s.cur === G.me) { el.className = 'status you'; el.innerHTML = hintText(); }
  else { el.className = 'status'; el.innerHTML = G.msg ? esc(G.msg) : `${esc(s.players[s.cur].name)} is thinking…`; }
}

const sortHand = (h) => h.slice().sort((a, b) => (E.isJoker(a) - E.isJoker(b)) || E.suitOf(a) - E.suitOf(b) || E.orderOf(a) - E.orderOf(b));

function renderHand(initial) {
  const s = G.s, p = s.players[G.me], box = $('#hand');
  const mine = s.cur === G.me && !s.over;
  const ok = mine ? E.playableIds(s) : new Set();
  const ids = sortHand(p.hand);
  for (const [id, el] of G.els) if (!ids.includes(id)) { el.remove(); G.els.delete(id); }
  const els = ids.map((id) => {
    let el = G.els.get(id);
    if (!el) {
      el = cardEl(id);
      dragify(el, {
        can: canAct,
        ghost: () => { const g = el.cloneNode(true); g.classList.remove('sel', 'dim', 'ok', 'dragging'); return g; },
        hit: (x, y) => y < $('#hand').getBoundingClientRect().top - 12,
        hi: () => $('.center'),
        target: () => $('#discP').getBoundingClientRect(),
        onDrop: () => dragPlay(id),
        onTap: () => onCard(id),
      });
      G.els.set(id, el);
      el.dataset.fresh = '1';
    }
    el.classList.toggle('sel', G.sel.includes(id));
    el.classList.toggle('dim', mine && !ok.has(id) && !G.sel.includes(id));
    el.classList.toggle('ok', mine && ok.has(id));
    box.appendChild(el);
    return el;
  });
  layoutHand(box, els);
  const drawR = $('#drawP').getBoundingClientRect();
  let flightIndex = 0;
  els.forEach((el, i) => {
    if (el.dataset.fresh) {
      delete el.dataset.fresh;
      const delay = initial ? 80 + flightIndex * 70 : (G.freshDelay || 0) + Math.min(flightIndex, 4) * CARD_STAGGER_MS;
      flightIndex++;
      if (!G.noFly) fly(el, drawR, { delay });
    }
  });
}

function renderBar() {
  const s = G.s, bar = $('#bar');
  if (s.over || s.cur !== G.me || G.busy || G.paused) { bar.innerHTML = ''; return; }
  const sm = E.summary(s), p = s.players[G.me];
  let h = '';
  if (sm.declared && E.canFall(p.hand)) h += `<button class="act nk done" disabled>${ICON.check} Called</button>`;
  else h += `<button class="act nk${sm.canDeclare ? '' : ' off'}" data-a="declare">Niko Kadi</button>`;
  if (sm.canAccept) h += `<button class="act" data-a="accept">Accept<small>SKIP</small></button>`;
  if (sm.canPass) h += `<button class="act" data-a="pass">Pass</button>`;
  if (sm.canTake) {
    const lose = p.hand.length + sm.takeCount > E.HAND_LIMIT;
    h += `<button class="act take${lose ? ' warn' : ' hot'}" data-a="take">Take<small>${sm.takeCount > 1 ? sm.takeCount + ' CARDS' : '1 CARD'}</small></button>`;
  }
  if (G.sel.length) h += `<button class="act go" data-a="play">Play</button>`;
  bar.innerHTML = h;
  $$('.act', bar).forEach((b) => (b.onclick = () => onAct(b.dataset.a)));
}

// ------------------------------------------------------------------ events -> sound / motion
function capture() {
  const hand = new Map();
  for (const [id, el] of G.els) hand.set(id, el.getBoundingClientRect());
  return { hand, draw: $('#drawP').getBoundingClientRect() };
}

function describe(e) {
  const s = G.s;
  switch (e.t) {
    case 'play': return `${nm(e.p)} played ${e.cards.map(E.cardName).join(' ')}`;
    case 'draw': return e.n ? `${nm(e.p)} drew ${e.n}` : null;
    case 'demand': return e.demand.W >= 2 ? `${nm(e.p)} asks for ${rl(e.demand.rank)}${SUIT_TXT[e.demand.suit]}` : `${nm(e.p)} calls ${SUIT_TXT[e.demand.suit]}`;
    case 'cancel': return `${nm(e.p)} cancelled the ${e.what}`;
    case 'skip': return `${nm(e.p)} skipped`;
    case 'reverse': return 'Direction reversed';
    case 'declare': return `${nm(e.p)}: Niko Kadi!`;
    case 'star': return `${nm(e.p)} ran out of time`;
    case 'out': return `${nm(e.p)} is out`;
    case 'forward': return `${nm(e.p)} passes it on`;
    case 'counter': return `${nm(e.p)} counters with a Jack`;
    case 'refill': return 'Shuffling the pile';
  }
  return null;
}

// state is already final when this runs; this plays the sound and flies the cards, then waits.
async function present(ev, pre) {
  renderAll();
  let t = 0;
  const at = (ms, fn) => setTimeout(() => { if (G && !G.stopped) fn(); }, ms);
  const msgs = [];
  for (const e of ev) {
    const m = describe(e);
    if (m) msgs.push(m);
    switch (e.t) {
      case 'play': {
        if (e.kind === 'A') at(t + 100, () => sfx('ace'));
        e.cards.forEach((c, i) => {
          const delay = t + Math.min(i, 4) * CARD_STAGGER_MS;
          at(delay, () => sfx('place'));
          const node = $(`#discP .card[data-id="${c}"]`);
          const from = e.p === G.me ? pre.hand.get(c) : seatRect(e.p);
          if (node && from && !(G.noFly && e.p === G.me)) fly(node, from, { delay });
        });
        t += flightDuration() + Math.min(e.cards.length - 1, 4) * CARD_STAGGER_MS;
        break;
      }
      case 'draw': {
        if (!e.n) break;
        const to = seatRect(e.p);
        e.cards.forEach((c, i) => {
          const delay = t + Math.min(i, 4) * CARD_STAGGER_MS;
          at(delay, () => sfx('draw'));
          if (e.p === G.me) { const el = G.els.get(c); if (el) { /* already animated by renderHand */ } }
          else flyBack(pre.draw, to, { delay });
        });
        t += flightDuration() + Math.min(e.n - 1, 4) * CARD_STAGGER_MS;
        break;
      }
      case 'penalty': at(t, () => sfx('penalty')); break;
      case 'skip': at(t, () => sfx('skip')); t += 260; break;
      case 'reverse': at(t, () => sfx('reverse')); t += 200; break;
      case 'declare': at(t, () => sfx('niko')); t += 350; break;
      case 'cancel': case 'forward': at(t, () => sfx('ace')); break;
      case 'refill': at(t, () => sfx('shuffle')); t += 350; break;
      case 'star': at(t, () => sfx('star')); t += 300; break;
      case 'out': at(t, () => sfx('out')); t += 300; break;
      case 'turn': if (e.p === G.me) at(t + 60, () => sfx('turn')); break;
      case 'win': at(t + 150, () => sfx(e.p === G.me ? 'win' : 'lose')); t += 450; break;
    }
  }
  if (msgs.length) G.msg = msgs.slice(-2).join(' · ');
  const st = $('#status');
  if (st && G.s.cur !== G.me && !G.s.over) st.textContent = G.msg || '';
  await wait(Math.max(260, t + 120));
}

// ------------------------------------------------------------------ flow
async function doAction(a, o = {}) {
  if (!G || G.stopped) return false;
  const s = G.s;
  const pre = capture();
  let r;
  if (G.onlineRoom) {
    G.busy = true;
    try {
      const result = await net.move(G.onlineRoom, a, G.onlineVersion);
      G.s = result.state;
      G.me = result.me;
      G.onlineVersion = result.version;
      r = { ok: true, ev: result.events || [] };
    } catch (error) {
      G.busy = false;
      try {
        const latest = await net.state(G.onlineRoom);
        G.s = latest.state;
        G.me = latest.me;
        G.onlineVersion = latest.version;
      } catch (syncError) {
        console.error('Could not sync after a rejected move:', syncError);
      }
      renderAll();
      toast(error.message || 'Move could not be sent.');
      return false;
    }
  } else {
    r = applyAction(s, a);
  }
  if (!r.ok) { sfx('error'); toast(r.reason || 'Not allowed right now'); return false; }
  G.sel = [];
  G.busy = true;
  G.freshDelay = 0;
  G.noFly = !!o.noFly; // a dragged card is already where it was dropped
  await present(r.ev, pre);
  if (G) G.noFly = false;
  if (!G || G.stopped) return true;
  G.busy = false;
  after();
  return true;
}

function after() {
  const s = G.s;
  if (s.over) return finish();
  if (s.players[G.me].out) return finish();
  nextStep();
}

function nextStep() {
  if (!G || G.stopped || G.paused || G.busy) return;
  const s = G.s;
  renderAll();
  clearTimeout(G.botT);
  if (s.over) return;
  if (G.onlineRoom) {
    if (s.cur === G.me) beginHuman();
    else {
      clearInterval(G.tmr);
      G.msg = `${s.players[s.cur].name} is playing…`;
      renderStatus();
    }
    return;
  }
  if (s.cur === G.me) beginHuman();
  else { clearInterval(G.tmr); G.botT = setTimeout(botMove, 650 + Math.random() * 600); }
}

function botMove() {
  if (!G || G.stopped || G.paused || G.busy) return;
  const s = G.s;
  if (s.over) return;
  const p = s.players[s.cur];
  if (!p.bot) return;
  let a;
  try { a = chooseAction(s, p.bot.L); } catch (e) { a = null; }
  if (!a) { const sm = E.summary(s); a = sm.canTake ? { type: 'take' } : sm.canAccept ? { type: 'accept' } : { type: 'pass' }; }
  doAction(a).then((ok) => {
    if (!ok && G && !G.stopped) { const sm = E.summary(G.s); doAction(sm.canTake ? { type: 'take' } : sm.canAccept ? { type: 'accept' } : { type: 'pass' }); }
  });
}

// ---- human turn + one-minute timer (three stars; lose one on timeout, out at zero)
function beginHuman() {
  if (G.onlineRoom) { clearInterval(G.tmr); return; }
  const key = G.s.turnNo;
  if (G.turnKey !== key) { G.turnKey = key; G.deadline = Date.now() + 60000; G.timerWarned = false; }
  clearInterval(G.tmr);
  if (store.get().settings.timer) { G.tmr = setInterval(tick, 200); tick(); }
}

function tick() {
  if (!G || G.stopped || G.paused) return;
  const s = G.s;
  if (s.over || s.cur !== G.me) return clearInterval(G.tmr);
  // nothing in hand fits: no countdown, nothing happens on its own. The player takes a card when ready.
  if (!G.sel.length && !E.playableIds(s).size) {
    G.deadline = Date.now() + 60000;
    const b0 = $('#mine .tbar i'), p0 = $('#mine .plate');
    if (b0) b0.style.transform = 'scaleX(1)';
    if (p0) p0.classList.remove('low');
    return;
  }
  const left = G.deadline - Date.now();
  const bar = $('#mine .tbar i'), plate = $('#mine .plate');
  if (bar) bar.style.transform = `scaleX(${Math.max(0, left / 60000)})`;
  if (plate) plate.classList.toggle('low', left < 15000);
  const sec = Math.ceil(left / 1000);
  if (sec <= 10 && sec > 0 && !G.timerWarned) {
    G.timerWarned = true;
    if (plate) plate.classList.add('warning');
    vibrate(55);
  }
  if (left <= 0 && !G.busy) humanTimeout();
}

async function humanTimeout() {
  clearInterval(G.tmr);
  closeSheet(true);
  G.sel = [];
  G.busy = true;
  const pre = capture();
  const r = E.timeout(G.s);
  toast('Time is up! You lose a star', 2200);
  await present(r.ev || [], pre);
  if (!G || G.stopped) return;
  G.busy = false;
  after();
}

// ------------------------------------------------------------------ input
const sameGroup = (a, b) => (E.cat(a) === 'P' && E.cat(b) === 'P') || (E.cat(a) === E.cat(b) && E.cat(a) !== 'P' && E.rc(a) === E.rc(b));

function onCard(id) {
  if (!G || G.busy || G.paused || G.s.over || G.s.cur !== G.me) return;
  const s = G.s;
  if (G.sel.includes(id)) { sfx('click'); if (G.sel.length === 1 || true) return tryPlay(); }
  let next;
  if (G.sel.length && sameGroup(G.sel[0], id)) next = [...G.sel, id];
  else {
    const a = E.analyze(s, [id]);
    // a card that is not playable alone may still be legal after a partner; only block when nothing could start it
    if (!a.ok && !startsSomething(id)) { sfx('error'); toast(a.reason); return; }
    next = [id];
  }
  sfx('select');
  G.sel = next;
  renderHand();
  renderBar();
}
const startsSomething = (id) => E.analyze(G.s, [id]).ok;
const canAct = () => !!G && !G.busy && !G.paused && !G.s.over && G.s.cur === G.me;

// dropped a card on the table: add it to the cards already chosen (same group) and play
function dragPlay(id) {
  if (!canAct()) return;
  let next;
  if (G.sel.includes(id)) next = G.sel;
  else if (G.sel.length && sameGroup(G.sel[0], id)) next = [...G.sel, id];
  else {
    const a = E.analyze(G.s, [id]);
    if (!a.ok) { sfx('error'); toast(a.reason); renderHand(); return; }
    next = [id];
  }
  G.sel = next;
  renderHand();
  tryPlay(true);
}

async function onAct(a, o = {}) {
  if (!G || G.busy || G.paused) return;
  sfx('click');
  if (a === 'play') return tryPlay();
  if (a === 'declare' && !E.summary(G.s).canDeclare) {
    sfx('error');
    toast(G.s.players[G.me].declared != null ? 'Niko Kadi is already called' : 'Niko Kadi only works with a winning hand');
    return;
  }
  if (a === 'take') {
    const sm = E.summary(G.s), p = G.s.players[G.me];
    if (p.hand.length + sm.takeCount > E.HAND_LIMIT) return confirmOut(() => doAction({ type: 'take' }));
    return doAction({ type: 'take' }, o);
  }
  return doAction({ type: a });
}

function confirmOut(go2) {
  G.paused = true;
  clearInterval(G.tmr);
  const pausedAt = Date.now();
  const sh = sheet(`<h2>That puts you out</h2><p>Taking these cards takes you past the 8-card limit. Try an Ace or another card to answer instead.</p><div class="row"><button class="btn grey" id="n">Go back</button><button class="btn danger" id="y">Take anyway</button></div>`, { center: true, dismiss: false });
  const resume = () => { G.paused = false; G.deadline += Date.now() - pausedAt; };
  $('#n', sh.el).onclick = () => { closeSheet(true); resume(); nextStep(); };
  $('#y', sh.el).onclick = () => { closeSheet(true); resume(); go2(); };
}

async function tryPlay(viaDrag = false) {
  const s = G.s;
  if (!G.sel.length) return;
  const order = E.findOrder(s, G.sel) || G.sel.slice();
  const a = E.analyze(s, order);
  if (!a.ok) { sfx('error'); toast(a.reason); return; }
  const opts = {};
  if (a.kind === 'A') {
    G.busy = true; // block taps while a picker is open
    let mode = 'cancel';
    if (a.modes.length > 1) {
      mode = await ask('Ace on a penalty', [
        ['cancel', 'Cancel the penalty', 'Nobody draws. Play carries on.'],
        ['forward', 'Pass it on (Flow)', 'The next player takes the penalty or answers it.'],
      ]);
      if (!mode) { G.busy = false; return; }
    }
    opts.mode = mode;
    const a2 = E.analyze(s, order, { mode });
    if (!a2.ok) { G.busy = false; sfx('error'); toast(a2.reason); return; }
    if (a2.needs === 'suit') {
      const su = await pickSuit();
      if (su == null) { G.busy = false; return; }
      opts.demand = { suit: su };
    } else if (a2.needs === 'card') {
      const dm = await pickCard();
      if (!dm) { G.busy = false; return; }
      opts.demand = dm;
    }
    G.busy = false;
  }
  doAction({ type: 'place', cards: order, opts }, { noFly: viaDrag });
}

// ---- pickers
function pause() { G.paused = true; clearInterval(G.tmr); G.pausedAt = Date.now(); }
function unpause() { if (!G) return; G.paused = false; if (G.pausedAt) G.deadline += Date.now() - G.pausedAt; G.pausedAt = 0; }

function ask(title, opts) {
  return new Promise((res) => {
    let done = false;
    const sh = sheet(`<h2>${title}</h2>${opts.map(([k, t, sub]) => `<button class="opt" data-k="${k}"><span class="ic">${ICON.ace || ICON.spade}</span><div>${t}<small>${sub}</small></div></button>`).join('')}<div class="row"><button class="btn grey block" id="x">Cancel</button></div>`, { center: true, onClose: () => { if (!done) res(null); } });
    $$('.opt', sh.el).forEach((b) => (b.onclick = () => { done = true; closeSheet(true); res(b.dataset.k); }));
    $('#x', sh.el).onclick = () => closeSheet();
  });
}

function pickSuit() {
  return new Promise((res) => {
    let done = false;
    const sh = sheet(`<h2>Which suit?</h2><p>The next player must follow it, or cancel with an Ace.</p>
      <div class="pickgrid">${[0, 1, 2, 3].map((x) => `<button class="pick ${x === 1 || x === 2 ? 'red' : ''}" data-s="${x}">${SUIT_TXT[x]}</button>`).join('')}</div>
      <div class="row"><button class="btn grey block" id="x">Cancel</button></div>`, { center: true, onClose: () => { if (!done) res(null); } });
    $$('.pick', sh.el).forEach((b) => (b.onclick = () => { done = true; sfx('select'); closeSheet(true); res(+b.dataset.s); }));
    $('#x', sh.el).onclick = () => closeSheet();
  });
}

function pickCard() {
  return new Promise((res) => {
    let done = false, rank = null, suit = null;
    const sh = sheet(`<h2>Request a card</h2><p>Everyone draws until it is played, or an Ace cancels it.</p>
      <div class="pickgrid six">${E.NORMAL_RANKS.map((r) => `<button class="pick num" data-r="${r}">${r}</button>`).join('')}</div>
      <div class="pickgrid">${[0, 1, 2, 3].map((x) => `<button class="pick ${x === 1 || x === 2 ? 'red' : ''}" data-s="${x}">${SUIT_TXT[x]}</button>`).join('')}</div>
      <div class="row"><button class="btn grey" id="x">Cancel</button><button class="btn" id="ok" disabled>Request</button></div>`, { center: true, onClose: () => { if (!done) res(null); } });
    const upd = () => { $('#ok', sh.el).disabled = rank == null || suit == null; };
    $$('[data-r]', sh.el).forEach((b) => (b.onclick = () => { rank = +b.dataset.r; sfx('select'); $$('[data-r]', sh.el).forEach((x) => x.classList.toggle('on', x === b)); upd(); }));
    $$('[data-s]', sh.el).forEach((b) => (b.onclick = () => { suit = +b.dataset.s; sfx('select'); $$('[data-s]', sh.el).forEach((x) => x.classList.toggle('on', x === b)); upd(); }));
    $('#ok', sh.el).onclick = () => { done = true; closeSheet(true); res({ rank, suit }); };
    $('#x', sh.el).onclick = () => closeSheet();
  });
}

// ------------------------------------------------------------------ menu, result
function openMenu() {
  if (!G || G.stopped || G.s.over) return;
  if (document.querySelector('#overlay:not([hidden])')) return closeSheet();
  pause();
  menuSheet({
    helpHTML: HELP_NK,
    onResume: () => { unpause(); nextStep(); },
    onResign: () => {
      unpause();
      if (G.onlineRoom) net.resign(G.onlineRoom).catch((error) => toast(error.message || 'Could not leave the table.'));
      finish('resign');
    },
  });
}

function finish(why) {
  if (!G || G.finished) return;
  G.finished = true;
  clearInterval(G.tmr);
  clearTimeout(G.botT);
  const s = G.s, me = s.players[G.me];
  const won = !!s.over && s.over.winner === G.me && why !== 'resign';
  const w = s.over ? s.players[s.over.winner] : null;
  const r = G.onlineRoom
    ? store.recordOnlineResult('nk', won, G.rivals, (w && w.name) || '')
    : store.recordResult('nk', won, G.rivals, G.botId, { winner: won ? me.name : (w && w.name) || '', rules: G.rules });
  let title, sub = '';
  if (why === 'resign') { title = 'You left the game'; }
  else if (won) title = 'Victory! You won';
  else if (me.out && !s.over) { title = "You're out"; sub = me.outReason === 'limit' ? 'Over the 8-card limit.' : 'Out of stars.'; }
  else title = `Defeat! ${esc(w.name)} won`;
  const winner = won ? me : w;
  const rk = rankInfo(r.rp);
  const rating = G.onlineRoom
    ? '<p class="rk">Online RP updates the shared leaderboard.</p>'
    : `<div class="delta ${r.delta >= 0 ? 'up' : 'down'}">${r.delta > 0 ? '+' : ''}${r.delta} RP</div>
      <p class="rk">${rk.name} &middot; ${r.rp} RP${r.rankUp ? ` &middot; <b>Promoted to ${r.rankUp}!</b>` : ''}</p>`;
  setTimeout(() => {
    if (!G || G.stopped) return;
    G.busy = true;
    $('#bar').innerHTML = '';
    const sh = sheet(`<div class="result ${won ? 'won' : 'lost'}">
      <span class="ic trophy">${won ? ICON.trophy : ICON.spade}</span>
      <h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}
      ${winner ? `<div class="who">${avatarHTML(winner.avatar, 56)}</div>` : ''}
      ${rating}
      <div class="row"><button class="btn grey" id="rHome">Home</button><button class="btn" id="rAgain">${G.onlineRoom ? 'Menu' : 'Rematch'}</button></div></div>`, { center: true, dismiss: false });
    $('#rHome', sh.el).onclick = () => { sfx('click'); closeSheet(true); leave(); };
    $('#rAgain', sh.el).onclick = () => {
      sfx('click');
      closeSheet(true);
      if (G.onlineRoom) { leave(); return; }
      const { botId, count, rules } = G;
      startNiko({ botId, count, rules });
    };
  }, why === 'resign' ? 0 : 900);
}

function leave() {
  stopNiko();
  document.body.classList.remove('playing');
  go('home');
}
