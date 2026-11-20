// Special Sequence — rules engine.  52 cards (no jokers). Order: Ace, 2-10, King, Jack, Queen, then round to Ace again.
// A player holds 3 cards, picks one (dead pile top or dispose pile top) → 4 cards.
// If the 4 form a winning set they win; otherwise they dispose one card face-up.
import { shuffle, rand, rankOf, posOfRank, MIN_PLAYERS, MAX_PLAYERS } from './engine.js';

export const SEQ_PATTERNS = {
  run: 'Four in a row',
  trips: 'Three of a kind + one',
  pairs: 'Two pairs',
  akf: 'Ace, King, 4, 7',
};

// ranks: array of 4 ranks (1..13). Returns pattern key or null.
export function winPattern(ranks) {
  if (ranks.length !== 4) return null;
  const cnt = new Map();
  for (const r of ranks) cnt.set(r, (cnt.get(r) || 0) + 1);
  const counts = [...cnt.values()].sort((a, b) => b - a);
  if (counts[0] >= 3) return 'trips';
  if (counts[0] === 2 && counts[1] === 2) return 'pairs';
  if (cnt.size === 4) {
    const set = new Set(ranks);
    if (set.has(1) && set.has(13) && set.has(4) && set.has(7)) return 'akf';
    const ps = new Set(ranks.map(posOfRank));
    for (let start = 1; start <= 13; start++) {
      let all = true;
      for (let k = 0; k < 4; k++) if (!ps.has(((start - 1 + k) % 13) + 1)) all = false;
      if (all) return 'run';
    }
  }
  return null;
}

export function newSeqGame({ players, seed = (Math.random() * 2 ** 31) | 0 }) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new Error(`Special Sequence needs ${MIN_PLAYERS}-${MAX_PLAYERS} players`);
  const s = {
    seed,
    n: players.length,
    players: players.map((p, i) => ({ id: i, name: p.name, bot: p.bot || null, avatar: p.avatar || null, hand: [] })),
    dead: [],
    dispose: [],
    cur: 0,
    phase: 'pick', // pick → dispose
    turnNo: 1,
    over: null,
  };
  const deck = shuffle(Array.from({ length: 52 }, (_, i) => i), s);
  for (let r = 0; r < 3; r++) for (const p of s.players) p.hand.push(deck.pop());
  s.dead = deck;
  return s;
}

function refill(s, ev) {
  if (s.dispose.length > 1) {
    const t = s.dispose.pop();
    s.dead = shuffle(s.dispose, s);
    s.dispose = [t];
    ev.push({ t: 'refill' });
  }
}

export function seqPick(s, from) {
  if (s.over || s.phase !== 'pick') return { ok: false, reason: 'Not now' };
  const ev = [];
  const p = s.players[s.cur];
  let card;
  if (from === 'dispose') {
    if (!s.dispose.length) return { ok: false, reason: 'The dispose pile is empty' };
    card = s.dispose.pop();
  } else {
    if (!s.dead.length) refill(s, ev);
    if (!s.dead.length) return { ok: false, reason: 'No cards left' };
    card = s.dead.pop();
  }
  p.hand.push(card);
  ev.push({ t: 'pick', p: s.cur, from, card });
  const pat = winPattern(p.hand.map(rankOf));
  if (pat) {
    s.over = { winner: s.cur, pattern: pat };
    ev.push({ t: 'win', p: s.cur, pattern: pat });
  } else s.phase = 'dispose';
  return { ok: true, ev };
}

export function seqDispose(s, card) {
  if (s.over || s.phase !== 'dispose') return { ok: false, reason: 'Not now' };
  const p = s.players[s.cur];
  const i = p.hand.indexOf(card);
  if (i < 0) return { ok: false, reason: 'Not in hand' };
  p.hand.splice(i, 1);
  s.dispose.push(card);
  const ev = [{ t: 'dispose', p: s.cur, card }];
  s.cur = (s.cur + 1) % s.n;
  s.turnNo++;
  s.phase = 'pick';
  ev.push({ t: 'turn', p: s.cur });
  return { ok: true, ev };
}

// ---- helpers for bots ----
// number of ranks that would complete a 3-card hand (weighted by copies still unseen)
export function outsWeight(three, unseen) {
  let w = 0;
  for (let r = 1; r <= 13; r++) if (winPattern([...three, r])) w += unseen[r];
  return w;
}

export function unseenCounts(known) {
  const u = new Array(14).fill(4);
  u[0] = 0;
  for (const id of known) u[rankOf(id)]--;
  return u.map((x) => Math.max(0, x));
}
