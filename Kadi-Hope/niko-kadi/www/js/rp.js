// Rank Points (RP). How a match moves your rank, and the rank titles.
//
// RP changes stay zero-sum between equal players and scale by the number and strength of rivals.
// The base transfer is doubled for both wins and losses:
//   - the winner takes 4 RP from each rival, and each loser pays 4 RP;
//   - the pay is scaled by the strength of the rivals: beating Hard or Expert players is worth
//     more, and losing to them costs less; beating Easy players is worth less, and losing costs more.
// Offline RP uses bot levels; online RP uses rivals' current ratings.
export const TIER_W = { Easy: 0.6, Medium: 1, Hard: 1.4, Expert: 1.8 };

export const RANKS = [
  ['Rookie', 0], ['Regular', 40], ['Skilled', 100], ['Veteran', 200], ['Master', 350], ['Legend', 550],
];

export function rpDelta(won, n, rivals) {
  const s = rivals.length ? rivals.reduce((a, b) => a + (TIER_W[b.tier] || 1), 0) / rivals.length : 1;
  const base = won ? Math.max(1, Math.round(2 * (n - 1) * s)) : -Math.max(1, Math.round(2 / s));
  return base * 2;
}

export function rankInfo(rp) {
  let i = 0;
  while (i + 1 < RANKS.length && rp >= RANKS[i + 1][1]) i++;
  const [name, base] = RANKS[i];
  const nxt = RANKS[i + 1] || null;
  return { name, idx: i, base, next: nxt ? nxt[0] : null, nextAt: nxt ? nxt[1] : null, pct: nxt ? Math.round(((rp - base) / (nxt[1] - base)) * 100) : 100 };
}
