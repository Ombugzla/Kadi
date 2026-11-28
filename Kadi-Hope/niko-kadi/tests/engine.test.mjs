import * as E from '../www/js/engine.js';
const { cardId: C } = E;
let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); pass++; } catch (e) { fail++; console.log('FAIL', name, '\n  ', e.message); }
};
const eq = (a, b, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); };
const ok = (r, m = '') => { if (!r.ok) throw new Error(`${m} expected ok, got: ${r.reason}`); };
const no = (r, m = '') => { if (r.ok) throw new Error(`${m} expected rejection`); };

// build a state with exact hands
function mk({ hands, top = '5H', rules = {}, cur = 0, extra = [] }) {
  const s = E.newGame({ players: hands.map((_, i) => ({ name: 'P' + (i + 1) })), rules, seed: 7 });
  const used = new Set();
  s.players.forEach((p, i) => { p.hand = hands[i].map(C); p.hand.forEach((c) => used.add(c)); });
  const topId = C(top); used.add(topId);
  s.discard = [topId];
  s.draw = E.shuffle(Array.from({ length: 54 }, (_, i) => i).filter((c) => !used.has(c)), s);
  s.cur = cur;
  return s;
}
const play = (s, str, opts) => E.place(s, str.split(' ').map(C), opts);

t('match by suit / rank, illegal otherwise', () => {
  const s = mk({ hands: [['9H', '4C', '10S'], ['5S']], top: '5H' });
  no(play(s, '4C'));
  ok(play(s, '9H'));
});

t('same-rank cards can be played in batches across a turn, but not a different rank', () => {
  const s = mk({ hands: [['5H', '5S', '5C', '9S', 'KD'], ['6C', '7C', '4C']], top: '5D' });
  ok(play(s, '5H 5S'));
  ok(play(s, '5C'));
  no(play(s, '9S'));
  ok(E.pass(s));
  eq(s.cur, 1);
});

t('normal cards of a new rank and a Jack after a King are blocked within the turn', () => {
  const s = mk({ hands: [['6S', '7S', '6D', '6H'], ['4C']], top: '5S' });
  ok(play(s, '6S'));
  no(play(s, '7S'));
  ok(play(s, '6D'));
  ok(play(s, '6H'));
  ok(E.pass(s));

  const specials = mk({ hands: [['KS', 'JS'], ['4C']], top: '5S' });
  ok(play(specials, 'KS'));
  no(play(specials, 'JS'));
});

t('Queen and 8 are the same rank', () => {
  const s = mk({ hands: [['QH', '8S', '6S', '4C'], ['4D', '5D']], top: '9H' });
  ok(play(s, 'QH 8S'));
  eq(E.ctx(s), 'answer');
  no(play(s, '4C'), 'wrong suit answer'); // 8S on top -> needs spade
  ok(play(s, '6S'));
  ok(E.pass(s));
});

t('a Queen and 8 can be placed one at a time as Question cards', () => {
  const s = mk({ hands: [['QH', '8S', '6S', '4C'], ['4D', '5D']], top: '9H' });
  ok(play(s, 'QH'));
  ok(play(s, '8S'));
  eq(s.turn.mustAnswer, true);
  no(play(s, '4C'), 'wrong suit answer');
  ok(play(s, '6S'));
  eq(s.turn.mustAnswer, false);
  ok(E.pass(s));
});

t('multiple Question cards need only one normal answer', () => {
  const s = mk({ hands: [['QH', '8S', 'QC', '6C', '4D'], ['4H']], top: '9H' });
  ok(play(s, 'QH 8S QC'));
  eq(s.turn.mustAnswer, true);
  ok(play(s, '6C'));
  eq(s.turn.mustAnswer, false);
});

t('8 and Queen stack regardless of suit and one normal card answers', () => {
  const s = mk({ hands: [['8H', 'QS', '5S', '4D'], ['4H']], top: '9H' });
  ok(play(s, '8H QS'));
  eq(s.turn.mustAnswer, true);
  no(play(s, '5C'));
  ok(play(s, '5S'));
  eq(s.turn.mustAnswer, false);
});

t('a multi-card Question play can be selected starting with the mismatched suit', () => {
  const s = mk({ hands: [['QH', '8S', '6S'], ['4D', '5D']], top: '9S' });
  const order = E.findOrder(s, [C('QH'), C('8S')]);
  eq(order, [C('8S'), C('QH')]);
  ok(E.place(s, order));
  eq(E.ctx(s), 'answer');
});

t('unanswered question => draw one, turn ends', () => {
  const s = mk({ hands: [['QH', '8S', 'KC'], ['4D', '5D']], top: '9H' });
  ok(play(s, 'QH 8S'));
  const before = s.players[0].hand.length;
  ok(E.take(s));
  eq(s.players[0].hand.length, before + 1);
  eq(s.cur, 1);
});

t('penalty: 2D then red joker => next draws 7 (spec example)', () => {
  const s = mk({ hands: [['2D', '4C'], ['RJ', '4S'], ['5C'], ['9S']], top: '5D' });
  ok(play(s, '2D'));
  eq(s.cur, 0); eq(s.pending.count, 2);
  ok(E.pass(s));
  eq(s.cur, 1); eq(s.pending.count, 2);
  ok(play(s, 'RJ'));
  eq(s.cur, 1); eq(s.pending.count, 7);
  ok(E.pass(s));
  eq(s.cur, 2); eq(s.pending.count, 7);
  const h = s.players[2].hand.length;
  ok(E.take(s));
  eq(s.players[2].hand.length, h + 7);
});

t('penalty strict: black joker allowed on red joker, spade 2 not on red joker', () => {
  const s = mk({ hands: [['RJ', '4C'], ['2S', '9S'], ['BJ'], ['5C']], top: '5H' });
  ok(play(s, 'RJ'));
  ok(E.pass(s));
  no(play(s, '2S'));
  ok(E.take(s)); // 5 cards... P2 has 2 cards +5 = 7 ok
  // after RJ + draw, next player matches red (top red joker)
});

t('penalty stack: red joker + 2H + 2S in one move', () => {
  const s = mk({ hands: [['RJ', '2H', '2S', '9C'], ['4D']], top: '5H' });
  const r = E.findOrder(s, ['RJ', '2H', '2S'].map(C));
  eq(r && r.length, 3);
  ok(E.place(s, r));
  eq(s.pending.count, 9);
});

t('standard penalty stack allows suit-matched 2, 3, and Joker in one move', () => {
  const s = mk({ hands: [['2H', '3H', 'RJ', '9C'], ['4D']], top: '5H' });
  ok(play(s, '2H 3H RJ'));
  eq(s.pending.count, 10);
});

t('penalty cards can be played sequentially during one turn before passing', () => {
  const s = mk({ hands: [['2H', '3H', 'RJ', '9C'], ['4D']], top: '5H' });
  ok(play(s, '2H'));
  eq(s.cur, 0);
  eq(s.pending.count, 2);
  eq(E.summary(s).canTake, false);
  eq(E.summary(s).canPass, true);
  ok(play(s, '3H'));
  eq(s.cur, 0);
  eq(s.pending.count, 5);
  ok(play(s, 'RJ'));
  eq(s.cur, 0);
  eq(s.pending.count, 10);
  ok(E.pass(s));
  eq(s.cur, 1);
  eq(E.summary(s).canTake, true);
});

t('penalty strict: 2H + 3S not stackable in one move; liberal allows', () => {
  let s = mk({ hands: [['2H', '3S', '9C'], ['4D']], top: '5H' });
  no(play(s, '2H 3S'));
  s = mk({ hands: [['2H', '3S', '9C'], ['4D']], top: '5H', rules: { liberal: true } });
  ok(play(s, '2H 3S'));
  eq(s.pending.count, 5);
});

t('ace cancels penalty and returns to prior suit', () => {
  const s = mk({ hands: [['3H', '9C'], ['AC', '4D'], ['4S']], top: '5H' });
  ok(play(s, '3H'));
  ok(E.pass(s));
  ok(play(s, 'AC'));
  eq(s.pending, null);
  eq(s.cur, 2);
  eq(E.info(s).mask, 2); // hearts
  no(play(s, '4S'));
});

t('ace flow variant: forward penalty', () => {
  const s = mk({ hands: [['3H', '9C'], ['AC', '4D'], ['4S']], top: '5H', rules: { flow: true } });
  ok(play(s, '3H'));
  ok(E.pass(s));
  ok(play(s, 'AC', { mode: 'forward' }));
  eq(s.pending.count, 3); eq(s.cur, 2);
});

t('ace: suit demand binds next player', () => {
  const s = mk({ hands: [['AD', '9C'], ['4S', '6H'], ['5C']], top: '5H' });
  no(play(s, 'AD'), 'needs suit');
  ok(play(s, 'AD', { demand: { suit: 0 } }));
  eq(s.demand.W, 1);
  no(play(s, '6H'));
  ok(play(s, '4S'));
  eq(s.demand, null);
});

t('two aces request a specific card; players draw until played; ace cancels', () => {
  const s = mk({ hands: [['AD', 'AC', '9C'], ['4S', '6H'], ['5C', 'AH']], top: '5H' });
  ok(play(s, 'AD AC', { demand: { suit: 0, rank: 4 } }));
  eq(s.demand.W, 2);
  ok(play(s, '4S')); // P2 has the card
  eq(s.demand, null);
  // second run: P2 lacks it
  const s2 = mk({ hands: [['AD', 'AC', '9C'], ['6H', '7H'], ['AH', '5C']], top: '5H' });
  ok(play(s2, 'AD AC', { demand: { suit: 0, rank: 4 } }));
  no(play(s2, '6H'));
  ok(E.take(s2)); // P2 draws one
  eq(s2.cur, 2);
  ok(play(s2, 'AH')); // one normal ace cancels one demand -> suit demand remains
  eq(s2.demand.W, 1); eq(s2.demand.suit, 0);
});

t('Ace of Spades cancels two ordinary Aces and restores the previous top card', () => {
  const s = mk({ hands: [['AD', 'AC', '4H', '6C'], ['AS', '7D']], top: '5H' });
  ok(play(s, 'AD AC', { demand: { suit: 0, rank: 4 } }));
  eq(s.demand.W, 2);
  ok(play(s, 'AS'));
  eq(s.demand, null);
  eq(E.info(s).mask, 2);
  ok(play(s, '4H'));
});

t('ace congress (A♠) = two aces => request', () => {
  const s = mk({ hands: [['AS', '9C'], ['4D']], top: '5H' });
  const a = E.analyze(s, [C('AS')]);
  eq(a.needs, 'card');
});

t('lock: 3 aces worth => 2 aces reduce, 3 cancel', () => {
  const s = mk({ hands: [['AD', 'AC', 'AH', '9C'], ['AS', '6H'], ['AD']], top: '5H' });
  ok(play(s, 'AD AC AH', { demand: { suit: 0, rank: 4 } }));
  eq(s.demand.W, 3);
  // P2 holds A♠ (worth 2) -> reduces to suit demand, no leftover
  ok(play(s, 'AS'));
  eq(s.demand.W, 1);
});

t('Ace of Spades plus one ordinary Ace takes two counter-Aces to reduce to suit-only', () => {
  const s = mk({ hands: [['AS', 'AD', '9C'], ['AC', 'AH', '5S']], top: '5H' });
  ok(play(s, 'AS AD', { demand: { suit: 0, rank: 4 } }));
  eq(s.demand.W, 3);
  ok(play(s, 'AC AH'));
  eq(s.demand.W, 1);
  eq(s.demand.suit, 0);
});

t('Ace of Spades plus two ordinary Aces needs three counter-Ace value to reduce to suit-only', () => {
  const s = { pending: null, demand: { W: 4, suit: 0, rank: 4 } };
  eq(E.aceOutcome(s, 2, 'cancel'), null);
  eq(E.aceOutcome(s, 3, 'cancel'), { k: 'reduce', newW: 0 });
});

t('lock: one ace cannot touch a locked demand', () => {
  const s = mk({ hands: [['AD', 'AC', 'AH', '9C'], ['AD'.replace('D', 'S') === 'AS' ? '5S' : '5S', '6H']], top: '5H' });
  s.players[1].hand.push(C('AC') === C('AC') ? 13 * 2 : 0); // A♦ is id 26
  ok(play(s, 'AD AC AH', { demand: { suit: 0, rank: 4 } }));
  const a = E.analyze(s, [26]);
  eq(a.ok, false);
});

t('ace congress cancelling a suit demand leaves leftover single demand', () => {
  const s = mk({ hands: [['AD', '9C'], ['AS', '6H'], ['4S']], top: '5H' });
  ok(play(s, 'AD', { demand: { suit: 2 } }));
  const a = E.analyze(s, [C('AS')]);
  eq(a.needs, 'suit');
  ok(play(s, 'AS', { demand: { suit: 3 } }));
  eq(s.demand.suit, 3);
});

t('jack skips next; counter with jack (spec example)', () => {
  const s = mk({ hands: [['JH', 'JS', '9C'], ['JD', 'JC', '4C'], ['5C'], ['6C']], top: '5H' });
  ok(play(s, 'JH JS'));
  ok(E.pass(s)); // skips P2? P2 has jacks -> prompted
  eq(s.cur, 1); eq(s.threat, 2);
  ok(play(s, 'JD JC')); // counter + add another
  eq(s.carry, 1); eq(s.turn.jumps, 1);
  ok(E.pass(s));
  // P3 and P4 skipped, back to P1
  eq(s.cur, 0);
});

t('jack without counter just skips', () => {
  const s = mk({ hands: [['JH', '9C'], ['4S'], ['6C']], top: '5H' });
  ok(play(s, 'JH'));
  ok(E.pass(s));
  eq(s.cur, 2);
});

t('two players: jack gives another turn', () => {
  const s = mk({ hands: [['JH', '9C', '4H'], ['4S']], top: '5H' });
  ok(play(s, 'JH'));
  ok(E.pass(s));
  eq(s.cur, 0);
});

t('king reverses (1-2-3-4, P2 plays king => P1 next)', () => {
  const s = mk({ hands: [['4C'], ['KH', '9C'], ['5S'], ['6S']], top: '5H', cur: 1 });
  ok(play(s, 'KH'));
  ok(E.pass(s));
  eq(s.cur, 0);
});

t('two kings = no effect', () => {
  const s = mk({ hands: [['4C'], ['KH', 'KS', '9C'], ['5S'], ['6S']], top: '5H', cur: 1 });
  ok(play(s, 'KH KS'));
  ok(E.pass(s));
  eq(s.cur, 2);
});

t('two players: king does not alter order', () => {
  const s = mk({ hands: [['KH', '9C'], ['4S']], top: '5H' });
  ok(play(s, 'KH'));
  ok(E.pass(s));
  eq(s.cur, 1);
});

t('special J&K in pending: jack forwards, king bounces back and reverses', () => {
  let s = mk({ hands: [['3H', '9C'], ['JH', '4D'], ['5S'], ['6S']], top: '5H', rules: { specialJK: true } });
  ok(play(s, '3H'));
  ok(E.pass(s));
  ok(play(s, 'JH'));
  eq(s.pending.count, 3); eq(s.cur, 2);
  s = mk({ hands: [['9C'], ['3H', '4S'], ['KH', '4D'], ['6S']], top: '5H', rules: { specialJK: true }, cur: 1 });
  ok(play(s, '3H'));
  ok(E.pass(s));
  eq(s.cur, 2);
  ok(play(s, 'KH'));
  eq(s.cur, 1); eq(s.dir, -1); eq(s.pending.count, 3);
});

t('default: jack cannot be used against a penalty', () => {
  const s = mk({ hands: [['3H', '9C'], ['JH', '4D'], ['5S']], top: '5H' });
  ok(play(s, '3H'));
  ok(E.pass(s));
  no(play(s, 'JH'));
});

t('declaring ends the turn and the player can win on their next turn', () => {
  const s = mk({ hands: [['5S', '5D'], ['4H', '6D', '7D']], top: '5H' });
  ok(E.declare(s));
  eq(s.cur, 1);
  eq(s.turnNo, 2);
  eq(s.players[0].declared, 1);
  ok(E.take(s));
  eq(s.cur, 0);
  const path = E.winPath(s);
  eq(path && path.length, 2);
  ok(E.place(s, path[0]));
  ok(E.place(s, path[1]));
  eq(s.over.winner, 0);
});

t('Niko Kadi cannot be called after play has passed to another player', () => {
  const s = mk({ hands: [['5S', '5D'], ['AS', '4H']], top: '5H' });
  ok(E.declare(s));
  eq(s.cur, 1);
  eq(E.summary(s).canDeclare, false);
  no(E.declare(s));
  eq(s.players[0].declared, 1);
});

t('cannot win without declaring', () => {
  const s = mk({ hands: [['5S'], ['4S', '6D', '7D']], top: '5H' });
  no(play(s, '5S'));
});

t('declaration is dropped if hand no longer ready; drawing resets it', () => {
  const s = mk({ hands: [['5S', '9S', 'AC'], ['4S']], top: '5H' });
  eq(E.canFall(s.players[0].hand), false); // ace in hand
  no(E.declare(s));
});

t('a question can be answered during the same turn', () => {
  const s = mk({ hands: [['QH', '6H', '9H'], ['4D', '5C', '6C']], top: '5H' });
  ok(play(s, 'QH'));
  eq(E.ctx(s), 'answer');
  ok(play(s, '6H'));
  ok(E.pass(s));
  eq(s.cur, 1);
});

t('a question and answer may win when Niko was declared beforehand', () => {
  const s = mk({ hands: [['QH', '6H'], ['4D', '5C', '6C']], top: '5H' });
  s.players[0].declared = 0; // declared on a previous turn
  eq(E.canFall(s.players[0].hand), true);
  const path = E.winPath(s);
  eq(path && path.length, 2);
  ok(E.place(s, path[0]));
  ok(E.place(s, path[1]));
  eq(s.over.winner, 0);
});

t('a stacked Question can be answered to finish after Niko was declared', () => {
  const s = mk({ hands: [['8S', '6S'], ['4D', '5C', '6C']], top: 'QH' });
  s.players[0].declared = s.turnNo - 1;
  s.turn.placed = 1;
  s.turn.groupRank = E.rc(C('QH'));
  s.turn.mustAnswer = true;
  s.turn.questionPlayed = true;
  const path = E.winPath(s);
  eq(path?.map((group) => group.length), [1, 1]);
  eq(path?.[0][0], C('8S'));
  eq(path?.[1][0], C('6S'));
  ok(E.place(s, path[0]));
  ok(E.place(s, path[1]));
  eq(s.over.winner, 0);
});

t('Niko cannot be declared after a question has been played this turn', () => {
  const s = mk({ hands: [['QH', '6H'], ['4D', '5C', '6C']], top: '5H' });
  ok(E.place(s, [C('QH')]));
  eq(E.summary(s).canDeclare, false);
  no(E.declare(s));
  eq(s.players[0].declared, null);
});

t('a declared Niko finish may play Kings then a matching final normal card', () => {
  const s = mk({ hands: [['7D', 'KC', 'KH', '9H'], ['KD', '4C']], top: '6D' });
  ok(play(s, '7D'));
  eq(E.summary(s).canDeclare, true);
  ok(E.declare(s));
  eq(s.cur, 1);
  ok(play(s, 'KD'));
  ok(E.pass(s));
  eq(s.cur, 0);
  const path = E.winPath(s);
  eq(path && path.length, 2);
  eq(path && path[0].length, 2);
  eq(path && path[1], [C('9H')]);
  ok(E.place(s, path[0]));
  ok(E.place(s, path[1]));
  eq(s.over.winner, 0);
});

t('the final normal card after a King chain must still match the top card', () => {
  const s = mk({ hands: [['KC', 'KH', '9D'], ['4D', '5C', '6C']], top: 'KC' });
  s.players[0].declared = 0;
  eq(E.canFall(s.players[0].hand), false);
  eq(E.winPath(s), null);
});

t('eight-card limit disqualifies', () => {
  const s = mk({ hands: [['3H', '9C'], ['4D', '5D', '6D', '7D', '9D', '10D', '4H', '5H']], top: '5H' });
  ok(play(s, '3H'));
  ok(E.pass(s));
  ok(E.take(s));
  eq(s.players[1].out, true);
  eq(s.over.winner, 0);
});

t('timeout costs a star and draws', () => {
  const s = mk({ hands: [['3H', '9C'], ['4D']], top: '5H' });
  eq(s.players[0].stars, 3);
  const r = E.timeout(s);
  ok(r);
  eq(s.players[0].stars, 2);
  eq(s.cur, 1);
  for (let i = 0; i < 2; i++) { s.cur = 0; E.timeout(s); if (s.over) break; }
  eq(s.players[0].out, true);
});

t('refill reshuffles discard', () => {
  const s = mk({ hands: [['3H', '9C'], ['4D']], top: '5H' });
  s.discard = [1, 2, 3, 4, 5, C('5H')];
  s.draw = [];
  ok(E.take(s));
  eq(s.players[0].hand.length, 3);
  eq(s.discard.length, 1);
});

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
