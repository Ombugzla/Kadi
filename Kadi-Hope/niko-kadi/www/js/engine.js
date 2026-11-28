// Niko Kadi rules engine — pure JS, no DOM. All consequential rules live here so the
// same module can later run on a server (spec §7/§8: server-side validation).
//
// Card ids: 0..51 => suit*13 + (rank-1), suits S,H,D,C (0..3). 52 = red joker, 53 = black joker.
// Draw pile: top is the END of the array.  Discard pile: top is the END of the array.

export const SUIT_CH = ['S', 'H', 'D', 'C'];
export const SUIT_SYM = ['♠', '♥', '♦', '♣'];
export const RJ = 52, BJ = 53;
export const HAND_LIMIT = 8;
export const MAX_STARS = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4; // table size cap (was 5 for Special Sequence)
export const NORMAL_RANKS = [4, 5, 6, 7, 9, 10];

export const rankOf = (id) => (id >= 52 || id < 0 ? 0 : (id % 13) + 1);
export const suitOf = (id) => (id >= 52 || id < 0 ? -1 : (id / 13) | 0);
export const isJoker = (id) => id >= 52;
// Card order for sorting and Special Sequence runs: Ace, 2-10, Jack, Queen, King (then back to Ace); Jokers last.
const ORDER_POS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const posOfRank = (r) => ORDER_POS[r];
export const orderOf = (id) => (id >= 52 ? 14 : ORDER_POS[rankOf(id)]);
// suit bit mask: S=1 H=2 D=4 C=8; jokers carry the colour (red = H|D, black = S|C)
export const maskOf = (id) => (id === RJ ? 6 : id === BJ ? 9 : id < 0 ? 0 : 1 << ((id / 13) | 0));
// Queen and 8 are one rank for matching and stacking.
export const rc = (id) => {
  const r = rankOf(id);
  return r === 8 ? 12 : r;
};
// category: N normal/answer, Q question, J jump, K kickback, P penalty, A ace, X unknown
export function cat(id) {
  if (id < 0) return 'X';
  if (id >= 52) return 'P';
  const r = rankOf(id);
  if (r === 1) return 'A';
  if (r === 2 || r === 3) return 'P';
  if (r === 8 || r === 12) return 'Q';
  if (r === 11) return 'J';
  if (r === 13) return 'K';
  return 'N';
}
export const penaltyValue = (id) => (id >= 52 ? 5 : rankOf(id) === 2 ? 2 : 3);
export const aceWorth = (id) => (id === 0 ? 2 : 1); // Ace of spades = "Ace Congress" = two aces

const RANK_STR = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export function cardName(id) {
  if (id === RJ) return 'Red Joker';
  if (id === BJ) return 'Black Joker';
  if (id < 0) return '?';
  return RANK_STR[rankOf(id)] + SUIT_SYM[suitOf(id)];
}
export function cardId(str) {
  if (str === 'RJ') return RJ;
  if (str === 'BJ') return BJ;
  const s = SUIT_CH.indexOf(str.slice(-1));
  const r = RANK_STR.indexOf(str.slice(0, -1));
  return s * 13 + (r - 1);
}
export const fits2 = (a, b) => (maskOf(a) & maskOf(b)) !== 0 || rc(a) === rc(b);

// ---------- rng ----------
export function rand(s) {
  let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function shuffle(arr, s) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rand(s) * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const DEFAULT_RULES = { flow: false, specialJK: false, liberal: false };

const newTurn = () => ({ placed: 0, groupRank: null, mustAnswer: false, jumps: 0, countered: false, lastKind: null, questionPlayed: false });

// ---------- state ----------
export function newGame({ players, rules = {}, seed = (Math.random() * 2 ** 31) | 0 }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error(`Niko Kadi needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  const s = {
    seed,
    n: players.length,
    startN: players.length,
    players: players.map((p, i) => ({
      id: i,
      name: p.name,
      bot: p.bot || null,
      avatar: p.avatar || null,
      hand: [],
      stars: MAX_STARS,
      out: false,
      outReason: null,
      declared: null,
    })),
    rules: { ...DEFAULT_RULES, ...rules },
    draw: [],
    discard: [],
    cur: 0,
    dir: 1,
    turn: newTurn(),
    pending: null,
    demand: null,
    threat: 0,
    carry: 0,
    eff: null,
    turnNo: 1,
    over: null,
  };
  const deck = shuffle(Array.from({ length: 54 }, (_, i) => i), s);
  for (let r = 0; r < 3; r++) for (const p of s.players) p.hand.push(deck.pop());
  // starter must be a normal card; others go to the bottom of the draw pile
  const skipped = [];
  while (deck.length) {
    const c = deck.pop();
    if (cat(c) === 'N') {
      s.discard.push(c);
      break;
    }
    skipped.push(c);
  }
  deck.unshift(...skipped);
  s.draw = deck;
  return s;
}

// Deep-ish copy. hideFor = player index whose view we simulate: other hands become unknown (-1)
export function clone(s, hideFor = -1) {
  return {
    ...s,
    players: s.players.map((p, i) => ({
      ...p,
      hand: hideFor >= 0 && i !== hideFor ? p.hand.map(() => -1) : p.hand.slice(),
    })),
    draw: hideFor >= 0 ? s.draw.slice() : s.draw.slice(),
    discard: s.discard.slice(),
    turn: { ...s.turn },
    pending: s.pending ? { ...s.pending } : null,
    demand: s.demand ? { ...s.demand } : null,
    eff: s.eff ? { ...s.eff } : null,
    rules: s.rules,
    over: s.over ? { ...s.over } : null,
    _ev: undefined,
  };
}

export const top = (s) => s.discard[s.discard.length - 1];
export const info = (s) => s.eff || { mask: maskOf(top(s)), rc: rc(top(s)) };
const fitsInfo = (c, inf) => (maskOf(c) & inf.mask) !== 0 || (inf.rc != null && rc(c) === inf.rc);
export const activeCount = (s) => s.players.filter((p) => !p.out).length;
export const hasJack = (p) => p.hand.some((c) => cat(c) === 'J');

export function step(s, from, n) {
  let i = from;
  for (let k = 0; k < n; k++) {
    let guard = 0;
    do {
      i = (i + s.dir + s.n) % s.n;
    } while (s.players[i].out && ++guard < 20);
  }
  return i;
}

export function ctx(s) {
  const t = s.turn;
  if (t.mustAnswer) return 'answer';
  if (s.pending) return 'pending';
  if (s.threat > 0 && !t.countered && t.placed === 0) return 'threat';
  if (s.demand) return 'demand';
  return 'free';
}

// ---------- drawing / elimination ----------
function refill(s, ev) {
  if (s.discard.length > 1) {
    const t = s.discard.pop();
    s.draw = shuffle(s.discard.filter((x) => x >= 0), s);
    s.discard = [t];
    ev.push({ t: 'refill' });
  }
}

function drawCards(s, idx, n, ev, why) {
  const p = s.players[idx];
  const got = [];
  for (let i = 0; i < n; i++) {
    if (!s.draw.length) refill(s, ev);
    if (!s.draw.length) break;
    got.push(s.draw.pop());
  }
  p.hand.push(...got);
  if (got.length) p.declared = null;
  ev.push({ t: 'draw', p: idx, n: got.length, cards: got, why });
  if (p.hand.length > HAND_LIMIT) eliminate(s, idx, 'limit', ev);
  return got;
}

function eliminate(s, idx, reason, ev) {
  const p = s.players[idx];
  if (p.out) return;
  p.out = true;
  p.outReason = reason;
  s.draw.unshift(...p.hand.filter((x) => x >= 0));
  p.hand = [];
  ev.push({ t: 'out', p: idx, reason });
  if (activeCount(s) === 1) {
    const w = s.players.findIndex((q) => !q.out);
    s.over = { winner: w, reason: 'last' };
    ev.push({ t: 'win', p: w, reason: 'last' });
  }
}

// ---------- turn flow ----------
function endTurn(s, ev, { steps = 1, skipped = false } = {}) {
  if (s.over) return;
  const idx = s.cur;
  const p = s.players[idx];
  let T;
  if (skipped) T = s.threat - 1;
  else {
    if (p.declared != null && !p.out && !canFall(p.hand)) p.declared = null;
    T = s.carry + s.turn.jumps;
  }
  s.carry = 0;
  s.threat = 0;
  s.turnNo++;
  s.cur = step(s, idx, steps);
  s.threat = T;
  s.turn = newTurn();
  resolveThreats(s, ev);
  ev.push({ t: 'turn', p: s.cur });
}

function resolveThreats(s, ev) {
  let guard = 0;
  while (s.threat > 0 && !hasJack(s.players[s.cur]) && guard++ < 20) {
    ev.push({ t: 'skip', p: s.cur });
    s.threat--;
    s.cur = step(s, s.cur, 1);
  }
}

// ---------- placement analysis ----------
const bad = (reason) => ({ ok: false, reason });

export function stackOk(a, b, rules) {
  if (rules.liberal) return true;
  if (rc(a) === rc(b)) return true;
  if (a >= 52 || b >= 52) return (maskOf(a) & maskOf(b)) !== 0;
  return false;
}

export function aceOutcome(s, worth, mode) {
  if (s.pending) {
    if (mode === 'forward' && s.rules.flow) return { k: 'forward', newW: 0 };
    return { k: 'cancelPending', newW: worth - 1 };
  }
  if (s.demand) {
    const d = s.demand;
    if (d.W === 1) return worth >= 1 ? { k: 'cancelDemand', newW: worth - 1 } : null;
    if (worth < d.W - 1) return null; // locked
    if (worth === d.W - 1) return { k: 'reduce', newW: 0 };
    return { k: 'cancelDemand', newW: worth - d.W };
  }
  return { k: 'newDemand', newW: worth };
}

// Pure validation of a placement in the exact order given.
export function analyze(s, cards, opts = {}) {
  if (s.over) return bad('The game is over');
  const p = s.players[s.cur];
  if (!cards.length) return bad('Pick a card');
  if (new Set(cards).size !== cards.length) return bad('Duplicate card');
  for (const c of cards) if (!p.hand.includes(c)) return bad('Not in hand');
  const kinds = new Set(cards.map(cat));
  if (kinds.size !== 1) return bad('Play cards of one kind together');
  const kind = [...kinds][0];
  if (kind === 'P') {
    for (let i = 1; i < cards.length; i++)
      if (!stackOk(cards[i - 1], cards[i], s.rules)) return bad("Those penalty cards don't stack");
  } else if (new Set(cards.map(rc)).size !== 1) return bad('Play cards of the same rank together');

  const c = ctx(s);
  const inf = info(s);
  const first = cards[0];
  const declaredNikoFinishAfterKing = cards.length === p.hand.length
    && kind === 'N'
    && p.declared != null
    && p.declared < s.turnNo
    && s.turn.lastKind === 'K'
    && !s.turn.questionPlayed;
  if (s.turn.placed > 0 && !s.turn.mustAnswer && s.turn.groupRank != null
      && rc(first) !== s.turn.groupRank && !declaredNikoFinishAfterKing) {
    return bad('Play cards of the same rank for the rest of your turn');
  }
  const res = { ok: true, kind, ctx: c, cards };
  switch (c) {
    case 'answer':
      if (kind === 'Q' && rc(first) === s.turn.groupRank) break;
      if (kind !== 'N') return bad('Play another Question or answer with a normal card');
      if (!fitsInfo(first, inf)) return bad('The answer must match the suit');
      break;
    case 'pending':
      if (kind === 'A') break;
      if (kind === 'P' || ((kind === 'J' || kind === 'K') && s.rules.specialJK)) {
        if (!s.rules.liberal && !fitsInfo(first, inf)) return bad('Match the suit or rank of the penalty');
        break;
      }
      return bad('Answer the penalty, play an Ace, or take the cards');
    case 'threat':
      if (kind !== 'J') return bad('Counter with a Jack or accept the skip');
      break;
    case 'demand': {
      if (kind === 'A') break;
      const d = s.demand;
      if (d.W >= 2) {
        if (!(rankOf(first) === d.rank && suitOf(first) === d.suit))
          return bad(`Play the ${RANK_STR[d.rank]}${SUIT_SYM[d.suit]} or an Ace`);
      } else if (!(maskOf(first) & (1 << d.suit))) return bad(`Play ${SUIT_SYM[d.suit]} or an Ace`);
      break;
    }
    default:
      if (kind !== 'A' && !fitsInfo(first, inf)) return bad('Match the suit or rank');
  }
  if (kind === 'A') {
    if (c === 'answer' || c === 'threat') return bad('Not now');
    const worth = cards.reduce((a, id) => a + aceWorth(id), 0);
    const modes = c === 'pending' && s.rules.flow ? ['cancel', 'forward'] : ['cancel'];
    const mode = opts.mode && modes.includes(opts.mode) ? opts.mode : 'cancel';
    const out = aceOutcome(s, worth, mode);
    if (!out) return bad('That demand is locked — play more Aces');
    res.worth = worth;
    res.modes = modes;
    res.mode = mode;
    res.outcome = out;
    res.needs = out.newW === 0 ? null : out.newW === 1 ? 'suit' : 'card';
  }
  if (cards.length === p.hand.length) {
    if (kind !== 'N') return bad('Finish with a normal card (4 5 6 7 9 10)');
    if (p.declared == null || p.declared >= s.turnNo) return bad('Call Niko Kadi a turn before you finish');
  }
  return res;
}

function checkDemandOpt(res, opts) {
  if (!res.needs) return null;
  const d = opts.demand;
  if (!d || !(d.suit >= 0 && d.suit <= 3)) return bad('Choose a suit');
  if (res.needs === 'card' && !NORMAL_RANKS.includes(d.rank)) return bad('Choose a card to request');
  return null;
}

function demandRevert(s, demand, count, fallback) {
  if (demand.revert) return { ...demand.revert };
  const previous = s.discard.slice(0, -count).reverse().find((card) => cat(card) !== 'A');
  return previous == null ? { mask: fallback.mask, rc: fallback.rc } : { mask: maskOf(previous), rc: rc(previous) };
}

export function place(s, cards, opts = {}) {
  const a = analyze(s, cards, opts);
  if (!a.ok) return a;
  const eo = checkDemandOpt(a, opts);
  if (eo) return eo;
  const ev = [];
  s._ev = ev;
  const idx = s.cur;
  const p = s.players[idx];
  const inf = info(s);
  const kind = a.kind;
  const n = cards.length;
  p.hand = p.hand.filter((c) => !cards.includes(c));
  s.discard.push(...cards);
  s.turn.groupRank = rc(cards[0]);
  s.eff = null;
  ev.push({ t: 'play', p: idx, cards: cards.slice(), kind, ctx: a.ctx });
  let ends = false;
  let steps = 1;
  const satisfied = () => {
    if (a.ctx === 'demand' && s.demand) {
      s.demand = null;
      ev.push({ t: 'demandMet' });
    }
  };
  switch (kind) {
    case 'N':
      if (a.ctx === 'answer') s.turn.mustAnswer = false;
      satisfied();
      break;
    case 'Q':
      satisfied();
      s.turn.mustAnswer = true;
      break;
    case 'J':
      if (a.ctx === 'threat') {
        s.carry = s.threat - 1;
        s.threat = 0;
        s.turn.countered = true;
        s.turn.jumps += n - 1;
        ev.push({ t: 'counter', p: idx, n });
      } else if (a.ctx === 'pending') {
        steps = ((n - 1) % Math.max(1, activeCount(s) - 1)) + 1;
        ev.push({ t: 'forward', p: idx, how: 'jack', steps });
        ends = true;
      } else {
        satisfied();
        s.turn.jumps += n;
        ev.push({ t: 'jump', p: idx, n });
      }
      break;
    case 'K':
      if (n % 2 === 1) {
        s.dir = -s.dir;
        ev.push({ t: 'reverse', p: idx });
      }
      if (a.ctx === 'pending') {
        ev.push({ t: 'forward', p: idx, how: 'king' });
        ends = true;
      } else satisfied();
      break;
    case 'P': {
      const sum = cards.reduce((x, c) => x + penaltyValue(c), 0);
      satisfied();
      if (s.pending) s.pending.count += sum;
      else s.pending = { count: sum, revert: inf.mask };
      ev.push({ t: 'penalty', p: idx, count: s.pending.count });
      ends = true;
      break;
    }
    case 'A': {
      const out = a.outcome;
      const d = s.demand;
      const revert = d ? demandRevert(s, d, n, inf) : { mask: inf.mask, rc: inf.rc };
      if (out.k === 'forward') ev.push({ t: 'forward', p: idx, how: 'ace' });
      if (out.k === 'cancelPending') {
        s.eff = { mask: s.pending.revert, rc: null };
        s.pending = null;
        ev.push({ t: 'cancel', p: idx, what: 'penalty' });
      }
      if (out.k === 'reduce') {
        s.demand = { W: 1, suit: d.suit, revert };
        ev.push({ t: 'reduce', p: idx });
      }
      if (out.k === 'cancelDemand') {
        s.demand = null;
        if (out.newW === 0) s.eff = revert;
        ev.push({ t: 'cancel', p: idx, what: 'demand' });
      }
      if (out.newW > 0) {
        const dd = opts.demand;
        s.demand = out.newW === 1
          ? { W: 1, suit: dd.suit, revert }
          : { W: out.newW, suit: dd.suit, rank: dd.rank, revert };
        s.eff = null;
        ev.push({ t: 'demand', p: idx, demand: { ...s.demand } });
      }
      ends = true;
      break;
    }
  }
  if (p.hand.length === 0) {
    s.over = { winner: idx, reason: 'niko' };
    ev.push({ t: 'win', p: idx, reason: 'niko' });
    return { ok: true, ev };
  }
  s.turn.placed++;
  s.turn.lastKind = kind;
  if (kind === 'Q') s.turn.questionPlayed = true;
  if (ends) endTurn(s, ev, { steps });
  return { ok: true, ev };
}

// ---------- other actions ----------
export function summary(s) {
  const p = s.players[s.cur];
  const c = ctx(s);
  const out = {
    ctx: c,
    canTake: false,
    takeCount: 0,
    canPass: false,
    canAccept: false,
    canDeclare: false,
    declared: p.declared != null,
  };
  if (s.over) return out;
  if (c === 'threat') out.canAccept = true;
  else if (c === 'pending') {
    out.canTake = true;
    out.takeCount = s.pending.count;
  } else if (c === 'answer') {
    out.canTake = true;
    out.takeCount = 1;
  } else if (s.turn.placed === 0) {
    out.canTake = true;
    out.takeCount = 1;
  }
  if (s.turn.placed > 0 && !s.turn.mustAnswer) out.canPass = true;
  if (p.declared == null && !s.turn.questionPlayed && canFall(p.hand)) out.canDeclare = true;
  return out;
}

export function take(s) {
  if (s.over) return bad('over');
  const sm = summary(s);
  if (!sm.canTake) return bad("You can't take now");
  const ev = [];
  s._ev = ev;
  const idx = s.cur;
  const c = sm.ctx;
  const n = sm.takeCount;
  if (c === 'pending') s.pending = null;
  if (c === 'answer') s.turn.mustAnswer = false;
  drawCards(s, idx, n, ev, c);
  endTurn(s, ev);
  return { ok: true, ev };
}

export function pass(s) {
  if (s.over) return bad('over');
  if (!summary(s).canPass) return bad("You can't pass yet");
  const ev = [];
  s._ev = ev;
  ev.push({ t: 'pass', p: s.cur });
  endTurn(s, ev);
  return { ok: true, ev };
}

export function accept(s) {
  if (s.over) return bad('over');
  if (ctx(s) !== 'threat') return bad('Nothing to accept');
  const ev = [];
  s._ev = ev;
  ev.push({ t: 'skip', p: s.cur });
  endTurn(s, ev, { skipped: true });
  return { ok: true, ev };
}

export function declare(s) {
  if (s.over) return bad('over');
  const p = s.players[s.cur];
  if (p.declared != null) return bad('Already called');
  if (s.turn.questionPlayed) return bad('Call Niko Kadi before playing a question');
  if (!canFall(p.hand)) return bad('Your hand is not ready to fall');
  const ev = [{ t: 'declare', p: s.cur }];
  p.declared = s.turnNo;
  endTurn(s, ev);
  return { ok: true, ev };
}

// 1-minute turn limit: lose a star, auto action; out at 0 stars.
export function timeout(s) {
  if (s.over) return bad('over');
  const idx = s.cur;
  const p = s.players[idx];
  const ev = [];
  p.stars--;
  ev.push({ t: 'star', p: idx, stars: p.stars });
  if (p.stars <= 0) {
    s._ev = ev;
    eliminate(s, idx, 'stars', ev);
    if (!s.over) endTurn(s, ev);
    return { ok: true, ev };
  }
  const sm = summary(s);
  let r;
  if (sm.canAccept) r = accept(s);
  else if (sm.canTake) r = take(s);
  else if (sm.canPass) r = pass(s);
  if (r && r.ev) ev.push(...r.ev);
  return { ok: true, ev };
}

// ---------- "ready to fall" search ----------
export function orderings(S) {
  const m = S.length;
  if (m === 1) return [S];
  if (m === 2) return [S, [S[1], S[0]]];
  const out = [];
  if (m === 3) {
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 3; b++) {
        if (a === b) continue;
        out.push([S[a], S[3 - a - b], S[b]]);
      }
    return out;
  }
  for (let a = 0; a < m; a++)
    for (let b = 0; b < m; b++) {
      if (a === b) continue;
      out.push([S[a], ...S.filter((_, i) => i !== a && i !== b), S[b]]);
    }
  return out;
}

function finalNormalGroup(hand, last) {
  if (!hand.length || hand.some((card) => cat(card) !== 'N') || new Set(hand.map(rc)).size !== 1) return null;
  return orderings(hand).find((order) => last === null || fits2(order[0], last)) || null;
}

const memo = new Map();
function fallRec(rem, last, must, groupRank = null) {
  const key = rem.slice().sort((x, y) => x - y).join(',') + '|' + last + '|' + (must ? 1 : 0) + '|' + groupRank;
  if (memo.has(key)) return memo.get(key);
  if (memo.size > 60000) memo.clear();
  let result = null;
  const groups = new Map();
  for (const id of rem) {
    const g = rc(id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(id);
  }
  outer: for (const ids of groups.values()) {
    const k = cat(ids[0]);
    const rank = rc(ids[0]);
    if (must && k !== 'N' && !(k === 'Q' && rank === groupRank)) continue;
    if (!must && groupRank !== null && rank !== groupRank) continue;
    const m = ids.length;
    for (let sub = 1; sub < 1 << m; sub++) {
      const S = ids.filter((_, i) => sub & (1 << i));
      const rest = rem.filter((x) => !S.includes(x));
      if (rest.length === 0 && k !== 'N') continue;
      for (const order of orderings(S)) {
        if (last !== null && !fits2(order[0], last)) continue;
        if (rest.length === 0) {
          result = [order];
          break outer;
        }
        if (k === 'K') {
          const final = finalNormalGroup(rest, order[order.length - 1]);
          if (final) {
            result = [order, final];
            break outer;
          }
          continue;
        }
        const nextGroupRank = must ? rank : groupRank ?? rank;
        const sp = fallRec(rest, order[order.length - 1], k === 'Q', nextGroupRank);
        if (sp) {
          result = [order, ...sp];
          break outer;
        }
      }
    }
  }
  memo.set(key, result);
  return result;
}

// Can this hand be dropped in one turn, if its first card matched?
export function canFall(hand) {
  if (!hand.length) return false;
  for (const id of hand) {
    const k = cat(id);
    if (k === 'A' || k === 'P' || k === 'X') return false;
  }
  return !!fallRec(hand.slice(), null, false);
}

// Like canFall, but the first card played must satisfy firstPred (e.g. a demanded card)
export function canFallWith(hand, firstPred) {
  if (!canFall(hand)) return false;
  const groups = new Map();
  for (const id of hand) {
    const g = rc(id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(id);
  }
  for (const ids of groups.values()) {
    const k = cat(ids[0]);
    const m = ids.length;
    for (let sub = 1; sub < 1 << m; sub++) {
      const S = ids.filter((_, i) => sub & (1 << i));
      const rest = hand.filter((x) => !S.includes(x));
      if (rest.length === 0 && k !== 'N') continue;
      for (const order of orderings(S)) {
        if (!firstPred(order[0])) continue;
        if (rest.length === 0) return true;
        if (k === 'K') {
          if (finalNormalGroup(rest, order[order.length - 1])) return true;
          continue;
        }
        if (fallRec(rest, order[order.length - 1], k === 'Q', rc(order[0]))) return true;
      }
    }
  }
  return false;
}

// Winning sequence of placements from the real current state, or null.
export function winPath(s) {
  const p = s.players[s.cur];
  if (p.declared == null || p.declared >= s.turnNo) return null;
  if (!canFall(p.hand)) return null;
  const c = ctx(s);
  if (c === 'pending' || c === 'threat') return null;
  const groups = new Map();
  for (const id of p.hand) {
    const g = rc(id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(id);
  }
  for (const ids of groups.values()) {
    const k = cat(ids[0]);
    const m = ids.length;
    for (let sub = 1; sub < 1 << m; sub++) {
      const S = ids.filter((_, i) => sub & (1 << i));
      const rest = p.hand.filter((x) => !S.includes(x));
      if (rest.length === 0 && k !== 'N') continue;
      for (const order of orderings(S)) {
        if (!analyze(s, order).ok) continue;
        if (rest.length === 0) return [order];
        if (k === 'K') {
          const final = finalNormalGroup(rest, order[order.length - 1]);
          if (final) return [order, final];
          continue;
        }
        const sp = fallRec(rest, order[order.length - 1], k === 'Q', rc(order[0]));
        if (sp) return [order, ...sp];
      }
    }
  }
  return null;
}

// ---------- enumeration (bots, hints, UI dimming) ----------
export function enumPlacements(s) {
  const p = s.players[s.cur];
  const out = [];
  const seen = new Set();
  const add = (cards) => {
    const a = analyze(s, cards);
    if (!a.ok) return;
    const key = cards.slice().sort((x, y) => x - y).join(',') + '>' + cards[cards.length - 1];
    if (seen.has(key)) return;
    seen.add(key);
    if (a.kind !== 'A') {
      out.push({ cards });
      return;
    }
    for (const mode of a.modes) {
      const aa = analyze(s, cards, { mode });
      if (!aa.ok) continue;
      if (!aa.needs) out.push({ cards, opts: { mode } });
      else if (aa.needs === 'suit') for (let su = 0; su < 4; su++) out.push({ cards, opts: { mode, demand: { suit: su } } });
      else
        for (const r of NORMAL_RANKS) for (let su = 0; su < 4; su++) out.push({ cards, opts: { mode, demand: { suit: su, rank: r } } });
    }
  };
  const groups = new Map();
  const aces = [];
  const pens = [];
  for (const id of p.hand) {
    const k = cat(id);
    if (k === 'A') aces.push(id);
    else if (k === 'P') pens.push(id);
    else if (k !== 'X') {
      const g = rc(id);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(id);
    }
  }
  for (const ids of groups.values()) {
    const m = ids.length;
    for (let sub = 1; sub < 1 << m; sub++) {
      const S = ids.filter((_, i) => sub & (1 << i));
      for (const o of orderings(S)) add(o);
    }
  }
  for (let sub = 1; sub < 1 << aces.length; sub++) add(aces.filter((_, i) => sub & (1 << i)));
  // penalty stacks: DFS, every prefix is a candidate; capped
  if (pens.length) {
    let count = 0;
    const dfs = (seq) => {
      if (count > 80 || seq.length > 4) return;
      for (const c of pens) {
        if (seq.includes(c)) continue;
        if (seq.length && !stackOk(seq[seq.length - 1], c, s.rules)) continue;
        const nx = [...seq, c];
        if (analyze(s, nx).ok) {
          add(nx);
          count++;
          dfs(nx);
        } else if (seq.length) dfs(nx);
      }
    };
    dfs([]);
  }
  return out;
}

// Find an order for a user selection that makes it valid (UI: tap-to-select, any order)
export function findOrder(s, cards) {
  if (!cards.length) return null;
  const tryList = (list) => {
    for (const o of list) if (analyze(s, o).ok) return o;
    return null;
  };
  const kinds = new Set(cards.map(cat));
  if (kinds.size !== 1) return null;
  if (cards.length <= 4 && cat(cards[0]) !== 'P') {
    // prefer the user's last-tapped card on top
    const list = orderings(cards.slice());
    const want = cards[cards.length - 1];
    list.sort((x, y) => (y[y.length - 1] === want) - (x[x.length - 1] === want));
    return tryList(list);
  }
  if (cat(cards[0]) === 'P') {
    let best = null;
    const used = new Array(cards.length).fill(false);
    const dfs = (seq) => {
      if (best) return;
      if (seq.length === cards.length) {
        if (analyze(s, seq).ok) best = seq.slice();
        return;
      }
      for (let i = 0; i < cards.length; i++) {
        if (used[i]) continue;
        if (seq.length && !stackOk(seq[seq.length - 1], cards[i], s.rules)) continue;
        used[i] = true;
        seq.push(cards[i]);
        dfs(seq);
        seq.pop();
        used[i] = false;
      }
    };
    dfs([]);
    return best;
  }
  return tryList([cards]);
}

// Which cards in the current hand can open a placement right now (for dimming)
export function playableIds(s) {
  const p = s.players[s.cur];
  const ok = new Set();
  if (s.over) return ok;
  for (const id of p.hand) {
    const a = analyze(s, [id]);
    if (a.ok) ok.add(id);
    else if (
      // a card that is only blocked because it would empty the hand early is still "playable" in kind
      false
    )
      ok.add(id);
  }
  // cards that only work as part of a group (e.g. joker + 2 of same colour) are covered by the single check
  // because the first card has to be legal on its own.
  return ok;
}
