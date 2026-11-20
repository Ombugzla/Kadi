// Computer opponents: two players at each level, with distinct play styles.
import * as E from './engine.js';
import { winPattern, outsWeight, unseenCounts } from './sequence.js';
import { rankOf } from './engine.js';

const P = (o) => ({ K: 8, ...o });

// avatar spec is drawn by avatars.js
export const BOTS = [
  {
    id: 'aloyce', name: 'Aloyce', power: 250, tier: 'Easy', lb: 30,
    blurb: 'Easy-going and playful; loves local football, music, and a good laugh.',
    avatar: { photo: 'avatar12' },
    L: P({ cover: 0, starve: 0, depth: 1, K: 4, noise: 26, blunder: 0.32, declare: 0.4, hold: 0, finish: 0.2, aggr: 0.1, miss: 0.5, counter: 0.25, seq: 0.35 }),
  },
  {
    id: 'sandra', name: 'Sandra', power: 450, tier: 'Easy', lb: 55,
    blurb: 'Outgoing and warm; enjoys cooking, music, and swapping stories.',
    avatar: { photo: 'avatar1' },
    L: P({ cover: 0.5, starve: 0.4, depth: 2, K: 6, noise: 12, blunder: 0.1, declare: 0.8, hold: 0.6, finish: 0.7, aggr: 0.5, miss: 0.15, counter: 0.7, seq: 0.7 }),
  },
  {
    id: 'natalia', name: 'Natalia', power: 700, tier: 'Medium', lb: 90,
    blurb: 'Curious and upbeat; always has a film or travel idea to share.',
    avatar: { photo: 'avatar3' },
    L: P({ cover: 0.7, starve: 0.6, depth: 2, K: 7, noise: 8, blunder: 0.06, declare: 0.9, hold: 0.8, finish: 0.8, aggr: 0.7, miss: 0.08, counter: 0.85, seq: 0.8 }),
  },
  {
    id: 'haruto', name: 'Haruto', power: 900, tier: 'Medium', lb: 140,
    blurb: 'Thoughtful and calm; likes technology, nature walks, and good food.',
    avatar: { photo: 'avatar10' },
    L: P({ cover: 0.9, starve: 0.9, depth: 3, K: 8, noise: 5, blunder: 0.03, declare: 0.96, hold: 1, finish: 1, aggr: 0.9, miss: 0.03, counter: 0.95, seq: 0.9 }),
  },
  {
    id: 'alexa', name: 'Alexa', power: 1200, tier: 'Hard', lb: 230,
    blurb: 'Confident and curious; likes design, books, and discovering new places.',
    avatar: { photo: 'avatar19' },
    L: P({ cover: 1, starve: 1, depth: 3, K: 9, noise: 3, blunder: 0.01, declare: 1, hold: 1, finish: 1.1, aggr: 1, miss: 0.01, counter: 1, seq: 0.95 }),
  },
  {
    id: 'liu', name: 'Liu', power: 1450, tier: 'Hard', lb: 330,
    blurb: 'Friendly and observant; enjoys food, science, and clever jokes.',
    avatar: { photo: 'avatar13' },
    L: P({ cover: 1, starve: 1, depth: 3, K: 9, noise: 3, blunder: 0.01, declare: 1, hold: 1, finish: 1.1, aggr: 1, miss: 0.01, counter: 1, seq: 0.95 }),
  },
  {
    id: 'hachiman', name: 'Hachiman', power: 1750, tier: 'Expert', lb: 420,
    blurb: 'Dry humor and thoughtful takes; interested in books, films, and culture.',
    avatar: { photo: 'avatar8' },
    L: P({ cover: 1.1, starve: 1.1, depth: 4, K: 9, noise: 1.5, blunder: 0, declare: 1, hold: 1.1, finish: 1.2, aggr: 1.1, miss: 0, counter: 1, seq: 1 }),
  },
  {
    id: 'krystal', name: 'Krystal', power: 2000, tier: 'Expert', lb: 480,
    blurb: 'Witty and expressive; enjoys music, fashion, and lively conversations.',
    avatar: { photo: 'avatar2' },
    L: P({ cover: 1.2, starve: 1.2, depth: 4, K: 10, noise: 0.5, blunder: 0, declare: 1, hold: 1.2, finish: 1.3, aggr: 1.2, miss: 0, counter: 1, seq: 1 }),
  },
];
export const TIERS = ['Easy', 'Medium', 'Hard', 'Expert'];
export const botById = (id) => BOTS.find((b) => b.id === id) || BOTS[0];

// Pick `count` opponents: the chosen bot plus neighbours in strength.
export function pickOpponents(botId, count) {
  const found = BOTS.findIndex((b) => b.id === botId);
  const i = found < 0 ? 0 : found;
  const out = [BOTS[i]];
  let lo = i - 1, hi = i + 1;
  while (out.length < count) {
    if (hi < BOTS.length && (hi - i <= i - lo || lo < 0)) out.push(BOTS[hi++]);
    else if (lo >= 0) out.push(BOTS[lo--]);
    else out.push(BOTS[(i + out.length) % BOTS.length]);
  }
  return out;
}

// ------------------------------------------------------------ Niko Kadi
export function applyAction(s, a) {
  switch (a.type) {
    case 'place': return E.place(s, a.cards, a.opts || {});
    case 'take': return E.take(s);
    case 'pass': return E.pass(s);
    case 'accept': return E.accept(s);
    case 'declare': return E.declare(s);
  }
  return { ok: false };
}


const ALL = Array.from({ length: 54 }, (_, i) => i);
// share of possible top cards this hand can answer (aces answer anything)
function coverage(h) {
  if (!h.length) return 0;
  if (h.some((c) => E.cat(c) === 'A')) return 1;
  let ok = 0;
  for (let t = 0; t < 52; t++) if (h.some((c) => E.fits2(c, t))) ok++;
  return ok / 52;
}
// chance the next player can answer the current top with h unknown cards
function canAnswerChance(s, me, h) {
  const seen = new Set([...s.players[me].hand, ...s.discard]);
  const inf = E.info(s);
  let U = 0, f = 0;
  for (const c of ALL) {
    if (seen.has(c)) continue;
    U++;
    const k = E.cat(c);
    if (k === 'A' || (E.maskOf(c) & inf.mask) !== 0 || (inf.rc != null && E.rc(c) === inf.rc)) f++;
  }
  if (!U) return 1;
  return 1 - Math.pow(1 - f / U, h);
}

export const DEFAULT_W = {
  hand: 10, danger: 10, ace: 7, pen: 3, jk: 1.5, q: -2, ready: 35, declared: 15, setup: 140,
  cover: 30, starve: 22, pendC: 1.2, elim: 70, declAtk: 40, threat: 6, thrDecl: 35, dem: 5, demOwn: 2,
  demDecl: 20, oppSize: 0.5, takeDecl: 18,
};

function evaluate(s, me, L, rng) {
  const p = s.players[me];
  if (s.over) return s.over.winner === me ? 10000 : -6000;
  if (p.out) return -9000;
  const W = L.W || DEFAULT_W;
  const h = p.hand;
  let v = -h.length * W.hand;
  if (h.length >= 6) v -= (h.length - 5) * W.danger * Math.min(1, 0.4 + L.hold);
  for (const c of h) {
    const k = E.cat(c);
    if (k === 'A') v += W.ace * L.hold;
    else if (k === 'P') v += W.pen * L.hold;
    else if (k === 'J' || k === 'K') v += W.jk * L.hold;
    else if (k === 'Q') v += W.q * L.hold;
  }
  v += coverage(h) * W.cover * L.cover;
  const ready = E.canFall(h);
  if (ready) v += W.ready * L.finish;
  if (p.declared != null) v += W.declared * L.finish;
  // set-up win: ready hand + a demand that my cards satisfy but the others probably can't
  if (ready && s.cur !== me && s.demand) {
    const d = s.demand;
    const pred = d.W >= 2 ? (c) => E.rankOf(c) === d.rank && E.suitOf(c) === d.suit : (c) => (E.maskOf(c) & (1 << d.suit)) !== 0;
    if (E.canFallWith(h, pred)) v += W.setup * L.finish;
  }
  if (s.cur !== me) {
    const q = s.players[s.cur];
    if (s.pending) {
      const c = s.pending.count;
      v += c * W.pendC * L.aggr;
      if (q.hand.length + c > E.HAND_LIMIT) v += W.elim * L.aggr;
      if (q.declared != null) v += W.declAtk * L.aggr;
    }
    if (s.threat > 0) {
      v += W.threat * L.aggr * s.threat;
      if (q.declared != null) v += W.thrDecl * L.aggr;
    }
    if (s.demand) {
      v += W.dem * L.aggr;
      const own = h.filter((c) => E.maskOf(c) & (1 << s.demand.suit)).length;
      v += own * W.demOwn * L.aggr;
      if (q.declared != null) v += W.demDecl * L.aggr;
    }
    if (!s.pending && !s.demand && s.threat === 0 && !s.eff) v += (1 - canAnswerChance(s, me, q.hand.length)) * W.starve * L.starve;
    v += q.hand.length * W.oppSize * L.aggr;
  }
  return v;
}

function evalTake(s, me, L, rng) {
  const sm = E.summary(s);
  const p = s.players[me];
  if (p.hand.length + sm.takeCount > E.HAND_LIMIT) return -9000;
  const W = L.W || DEFAULT_W;
  const base = evaluate({ ...s, cur: me, over: null, pending: null, threat: 0, demand: null }, me, L, rng);
  return base - sm.takeCount * W.hand - (p.declared != null ? W.takeDecl * L.finish : 0) - 1;
}

function candidates(s, me, L, rng) {
  const sm = E.summary(s);
  const acts = [];
  if (sm.canAccept) acts.push({ type: 'accept' });
  if (sm.canTake) acts.push({ type: 'take' });
  if (sm.canPass) acts.push({ type: 'pass' });
  let pl = E.enumPlacements(s);
  if ((sm.ctx === 'pending' || sm.ctx === 'demand') && rng() < L.miss) pl = pl.filter((x) => E.cat(x.cards[0]) !== 'A');
  // trim ace card-requests to cards in hand (+ a couple of random ones)
  const hand = s.players[me].hand;
  pl = pl.filter((x) => {
    const d = x.opts && x.opts.demand;
    if (!d || d.rank == null) return true;
    const id = d.suit * 13 + d.rank - 1;
    return hand.includes(id) || rng() < 0.08;
  });
  pl.sort((a, b) => b.cards.length - a.cards.length + (rng() - 0.5));
  const keep = [];
  const aces = [];
  for (const x of pl) (E.cat(x.cards[0]) === 'A' ? aces : keep).push(x);
  const out = [...acts, ...keep.slice(0, L.K), ...aces.slice(0, 8)].map((a) =>
    a.type ? a : { type: 'place', cards: a.cards, opts: a.opts }
  );
  return out;
}

// depth-limited search over the rest of my turn
function search(s, me, L, rng, depth, budget) {
  let best = null;
  const acts = candidates(s, me, L, rng);
  for (const a of acts) {
    if (budget.n-- <= 0) break;
    let score;
    if (a.type === 'take') score = evalTake(s, me, L, rng);
    else {
      const s2 = E.clone(s, me);
      const r = applyAction(s2, a);
      if (!r.ok) continue;
      if (s2.over || s2.turnNo !== s.turnNo || s2.cur !== me) score = evaluate(s2, me, L, rng);
      else {
        const forced = s2.turn.mustAnswer;
        if (depth > 1 || forced) {
          const sub = search(s2, me, L, rng, forced ? depth : depth - 1, budget);
          score = sub ? sub.score : -5000;
        } else {
          // evaluate as if I passed here
          const s3 = E.clone(s2, me);
          score = E.pass(s3).ok ? evaluate(s3, me, L, rng) : evalTake(s2, me, L, rng);
        }
      }
    }
    if (!best || score > best.score) best = { score, a };
  }
  return best;
}

export function chooseAction(s, L, rng = Math.random) {
  const me = s.cur;
  const p = s.players[me];
  const sm = E.summary(s);
  // 1. winning
  if (p.declared != null && rng() > L.blunder * 0.5) {
    const wp = E.winPath(s);
    if (wp) return { type: 'place', cards: wp[0] };
  }
  // 2. say Niko Kadi
  if (sm.canDeclare && !sm.declared && rng() < L.declare) return { type: 'declare' };
  // 3. skipped by a jack
  if (sm.canAccept && rng() > L.counter) return { type: 'accept' };
  // 4. blunders (random legal move)
  if (rng() < L.blunder) {
    const acts = candidates(s, me, { ...L, miss: 0 }, rng).filter((a) => a.type !== 'take' || p.hand.length + sm.takeCount <= E.HAND_LIMIT);
    if (acts.length) return acts[(rng() * acts.length) | 0];
  }
  // 5. search
  const acts = candidates(s, me, L, rng);
  let best = null;
  const budget = { n: 700 };
  for (const a of acts) {
    let score;
    if (a.type === 'take') score = evalTake(s, me, L, rng);
    else {
      const s2 = E.clone(s, me);
      const r = applyAction(s2, a);
      if (!r.ok) continue;
      if (s2.over || s2.turnNo !== s.turnNo || s2.cur !== me) score = evaluate(s2, me, L, rng);
      else {
        const forced = s2.turn.mustAnswer;
        if (L.depth > 1 || forced) {
          const sub = search(s2, me, L, rng, forced ? L.depth : L.depth - 1, budget);
          score = sub ? sub.score : -5000;
        } else {
          const s3 = E.clone(s2, me);
          score = E.pass(s3).ok ? evaluate(s3, me, L, rng) : evalTake(s2, me, L, rng);
        }
      }
    }
    score += (rng() - 0.5) * 2 * L.noise;
    if (!best || score > best.score) best = { score, a };
  }
  return best ? best.a : acts[0];
}

// ------------------------------------------------------------ Special Sequence
function bestKeep(hand4, unseen) {
  // returns {idx, outs} of the best card to discard
  let best = null;
  for (let i = 0; i < hand4.length; i++) {
    const three = hand4.filter((_, j) => j !== i).map(rankOf);
    const w = outsWeight(three, unseen);
    if (!best || w > best.outs || (w === best.outs && Math.random() < 0.5)) best = { idx: i, outs: w };
  }
  return best;
}

export function seqChoosePick(s, L, rng = Math.random) {
  const p = s.players[s.cur];
  const known = [...p.hand, ...s.dispose];
  const unseen = unseenCounts(known);
  const topCard = s.dispose[s.dispose.length - 1];
  if (topCard === undefined) return 'dead';
  if (winPattern([...p.hand, topCard].map(rankOf)) && rng() < 0.5 + 0.5 * L.seq) return 'dispose';
  if (rng() < (1 - L.seq) * 0.5) return rng() < 0.5 ? 'dispose' : 'dead';
  const vTop = bestKeep([...p.hand, topCard], unseen).outs;
  // expectation of a blind draw
  let tot = 0, wsum = 0;
  for (let r = 1; r <= 13; r++) {
    if (!unseen[r]) continue;
    const fake = r - 1; // spades of rank r, only the rank matters
    tot += unseen[r] * bestKeep([...p.hand, fake], unseen).outs;
    wsum += unseen[r];
  }
  const vDead = wsum ? tot / wsum : 0;
  return vTop > vDead + (rng() - 0.5) * (1 - L.seq) * 6 ? 'dispose' : 'dead';
}

export function seqChooseDispose(s, L, rng = Math.random) {
  const p = s.players[s.cur];
  if (rng() < (1 - L.seq) * 0.4) return p.hand[(rng() * p.hand.length) | 0];
  const unseen = unseenCounts([...p.hand, ...s.dispose]);
  return p.hand[bestKeep(p.hand, unseen).idx];
}
