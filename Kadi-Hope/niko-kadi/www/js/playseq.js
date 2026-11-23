// Special Sequence table.
import * as E from './engine.js';
import { newSeqGame, seqPick, seqDispose, orderedRunCards } from './sequence.js';
import { selectedOpponents, seqChoosePick, seqChooseDispose } from './bots.js';
import { cardEl, backEl, wait } from './cards.js';
import { playerAvatar, avatarHTML } from './avatars.js';
import { ICON } from './icons.js';
import { sfx, configure } from './sound.js';
import * as store from './store.js';
import { $, $$, esc, toast, sheet, closeSheet } from './ui.js';
import { go, pushBack } from './router.js';
import { SLOTS, fly, flyBack, plateHTML, fanHTML, layoutHand, menuSheet, dragify, HELP_SS, CARD_STAGGER_MS, flightDuration } from './table.js';
import { net } from './online.js';
import { rankInfo } from './rp.js';

let G = null;

export function stopSeq() {
  if (!G) return;
  G.stopped = true;
  clearTimeout(G.botT);
  if (G.onlineRoom) net.unwatchRoom();
  G.unback && G.unback();
  G = null;
}

export function startSeq({ botId, botIds = null, count, onlineRoom = null, onlineState = null, onlineMe = 0, onlineVersion = 0 }) {
  stopSeq();
  const d = store.get();
  const opp = onlineRoom ? [] : selectedOpponents(botIds, botId, count - 1);
  let players, s, me;
  if (onlineRoom) {
    s = onlineState;
    players = s.players;
    me = onlineMe;
  } else {
    const list = [{ name: d.name, avatar: playerAvatar(d), human: true }, ...opp.map((b) => ({ name: b.name, bot: b, avatar: b.avatar }))];
    players = list.map((p) => ({ p, k: Math.random() })).sort((a, b) => a.k - b.k).map((x) => x.p);
    s = newSeqGame({ players });
    me = players.findIndex((p) => p.human);
  }
  G = {
    s, me, botId, botIds: opp.map((bot) => bot.id), count: onlineRoom ? s.n : count, sel: [], busy: true, paused: false, stopped: false,
    botT: 0, msg: '', els: new Map(), rivals: opp, onlineRoom, onlineVersion, onlineSyncing: false,
  };
  if (onlineRoom) G.rivals = s.players.filter((_, index) => index !== me).map((player) => ({ name: player.name }));
  if (!onlineRoom) store.get().lastBot.ss = botId;
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

function build() {
  $('#screen').innerHTML = `<div class="table seq${G.s.n === 4 ? ' four' : ''}" id="tbl">
    <button class="hint" id="snd" aria-label="Sound"></button>
    <button class="menu" id="menu" aria-label="Menu"><span class="ic">${ICON.list}</span></button>
    <div id="seats"></div>
    <div class="center"><div class="pile tap" id="deadP"></div><div class="pile" id="dispP"></div></div>
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

const byRank = (h) => orderedRunCards(h) || h.slice().sort((a, b) => E.orderOf(a) - E.orderOf(b) || E.suitOf(a) - E.suitOf(b));

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
  let flightIndex = 0;
  els.forEach((el) => {
    if (!el.dataset.fresh) return;
    delete el.dataset.fresh;
    const delay = initial ? 80 + flightIndex * 70 : Math.min(flightIndex, 4) * CARD_STAGGER_MS;
    flightIndex++;
    if (!G.noFly) fly(el, from, { delay });
  });
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
  act({ type: 'pick', from }, { from, noFly: viaDrag });
}

function throwAway(viaDrag = false) {
  if (!G.sel.length) return;
  const c = G.sel[0];
  const rect = G.els.get(c) ? G.els.get(c).getBoundingClientRect() : null;
  act({ type: 'dispose', card: c }, { rect, card: c, noFly: viaDrag });
}

async function act(action, ctx = {}) {
  if (!G || G.stopped) return;
  const s = G.s;
  const pre = { dead: $('#deadP').getBoundingClientRect(), disp: $('#dispP').getBoundingClientRect() };
  let r;
  if (G.onlineRoom) {
    G.busy = true;
    try {
      const result = await net.move(G.onlineRoom, action, G.onlineVersion);
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
      return;
    }
  } else {
    r = action.type === 'pick' ? seqPick(s, action.from) : seqDispose(s, action.card);
  }
  if (!r.ok) { sfx('error'); toast(r.reason || 'Not allowed'); return; }
  G.sel = [];
  G.busy = true;
  G.noFly = !!ctx.noFly;
  await present(r.ev, pre, ctx);
  if (G) G.noFly = false;
  if (!G || G.stopped) return;
  G.busy = false;
  if (G.s.over) return finish();
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
        const delay = t;
        at(delay, () => sfx(e.from === 'dispose' ? 'flip' : 'draw'));
        if (e.p !== G.me) { flyBack(e.from === 'dispose' ? pre.disp : pre.dead, seatRect(e.p), { delay }); msgs.push(`${nm(e.p)} took from the ${e.from === 'dispose' ? 'dispose' : 'dead'} pile`); }
        t += flightDuration();
        break;
      }
      case 'dispose': {
        at(t, () => sfx('place'));
        const node = $(`#dispP .card[data-id="${e.card}"]`);
        const from = e.p === G.me ? ctx.rect : seatRect(e.p);
        if (node && from && !(G.noFly && e.p === G.me)) fly(node, from, { delay: t });
        if (e.p !== G.me) msgs.push(`${nm(e.p)} threw away ${E.cardName(e.card)}`);
        t += flightDuration();
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
  if (s.over) return finish();
  if (G.onlineRoom) {
    if (s.cur !== G.me) {
      G.msg = `${s.players[s.cur].name} is playing…`;
      renderStatus();
    }
    return;
  }
  if (s.cur === G.me) return;
  G.botT = setTimeout(botMove, 700 + Math.random() * 500);
}

function botMove() {
  if (!G || G.stopped || G.paused || G.busy) return;
  const s = G.s;
  if (s.over || s.cur === G.me) return;
  const L = s.players[s.cur].bot.L;
  if (s.phase === 'pick') act({ type: 'pick', from: seqChoosePick(s, L) });
  else { const c = seqChooseDispose(s, L); const rect = seatRect(s.cur); act({ type: 'dispose', card: c }, { rect, card: c }); }
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
    onResign: () => {
      G.paused = false;
      if (G.onlineRoom) net.resign(G.onlineRoom).catch((error) => toast(error.message || 'Could not leave the table.'));
      finish('resign');
    },
  });
}

function finish(why) {
  if (!G || G.finished) return;
  G.finished = true;
  clearTimeout(G.botT);
  const s = G.s;
  const won = !!s.over && s.over.winner === G.me && why !== 'resign';
  const w = s.over ? s.players[s.over.winner] : null;
  const result = G.onlineRoom
    ? store.recordOnlineResult('ss', won, G.rivals, (w && w.name) || '')
    : store.recordResult('ss', won, G.rivals, G.botId, { winner: won ? s.players[G.me].name : (w && w.name) || '' });
  const rank = rankInfo(result.rp);
  const rating = G.onlineRoom
    ? '<p class="rk">Online RP updates the shared leaderboard.</p>'
    : `<div class="delta ${result.delta >= 0 ? 'up' : 'down'}">${result.delta > 0 ? '+' : ''}${result.delta} RP</div>
      <p class="rk">${rank.name} &middot; ${result.rp} RP${result.rankUp ? ` &middot; <b>Promoted to ${result.rankUp}!</b>` : ''}</p>`;
  const title = why === 'resign' ? 'You left the game' : won ? 'Victory! You won' : `Defeat! ${esc(w.name)} won`;
  const sub = why !== 'resign' && s.over.reason === 'resign' ? 'Your opponent left the game.' : '';
  const reveal = w && !G.onlineRoom && why !== 'resign' ? `<div class="reveal">${byRank(w.hand).map((c) => cardEl(c).outerHTML).join('')}</div>` : '';
  const st = store.get().stats.ss;
  setTimeout(() => {
    if (!G || G.stopped) return;
    G.busy = true;
    $('#bar').innerHTML = '';
    const sh = sheet(`<div class="result ${won ? 'won' : 'lost'}">
      <span class="ic trophy">${won ? ICON.trophy : ICON.seq}</span>
      <h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}${reveal}
      ${rating}
      <p class="rk">Special Sequence wins: ${st.won} of ${st.played}</p>
      <div class="row"><button class="btn grey" id="rHome">Home</button><button class="btn" id="rAgain">${G.onlineRoom ? 'Menu' : 'Rematch'}</button></div></div>`, { center: true, dismiss: false });
    $('#rHome', sh.el).onclick = () => { sfx('click'); closeSheet(true); leave(); };
    $('#rAgain', sh.el).onclick = () => {
      sfx('click');
      closeSheet(true);
      if (G.onlineRoom) { leave(); return; }
      const { botId, botIds, count } = G;
      startSeq({ botId, botIds, count });
    };
  }, why === 'resign' ? 0 : 900);
}

function leave() {
  stopSeq();
  document.body.classList.remove('playing');
  go('home');
}
