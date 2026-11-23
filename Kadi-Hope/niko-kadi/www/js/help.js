// Help text. The spec asks for the house-rule options to be explained in the help section.
export const HELP_NK = `
<h3>The basics</h3>
<p>2 to 4 players. Everyone gets 3 cards and one normal card starts the pile. On your turn match the top card by <b>suit or rank</b>, or <b>draw one</b>. Once you play a rank, you can only play more cards of that rank for the rest of your turn; you may put matching-rank cards down one at a time or together, then tap <b>Pass</b>. A normal card answering a Question is allowed. Queen and 8 count as the same rank.</p>
<p>You have <b>1 minute</b> a turn and <b>3 stars</b>. Run out of time and the app draws a card for you and you lose a star. No stars, or more than <b>8 cards</b> in hand, and you are out.</p>
<h3>The cards</h3>
<ul>
<li><b>Normal</b> &mdash; 4 5 6 7 9 10. Play freely on suit or rank. You must finish on one.</li>
<li><b>Question</b> &mdash; Queen and 8. Stack Queens and 8s together regardless of suit; one normal card matching the top Question by suit answers the whole stack. No answer: draw one and your turn ends.</li>
<li><b>Jump</b> &mdash; Jack skips the next player. Stack Jacks to skip more. A skipped player holding a Jack may counter and add one of their own.</li>
<li><b>Kickback</b> &mdash; King reverses the direction. Two Kings cancel out. With two players a King just ends your turn.</li>
<li><b>Penalty</b> &mdash; 2 = draw 2, 3 = draw 3, Joker = draw 5. Pass it on with another penalty card of the same suit or rank (a black Joker follows spades and clubs, a red Joker hearts and diamonds), or cancel it with an Ace. Forwarded penalties add up.</li>
<li><b>Ace</b> &mdash; plays on anything. One Ace names the suit to follow. The Ace of Spades (Ace Congress) counts as two Aces; it or two ordinary Aces can request one exact normal card. Additional Aces increase the demand strength. Counter-Aces can reduce it to suit-only, or cancel it fully; when fully cancelled, play resumes from the card that was on top before the Ace demand.</li>
</ul>
<h3>Niko Kadi</h3>
<p>On the turn <b>before</b> you win, press <b>Niko Kadi</b> during your own turn when your whole hand can go down in one move. The button lights up when you can call; pressing it ends your turn and passes play to the next player. Once your turn has passed, you cannot call retroactively. Then finish in a single move, ending on a normal card, while rivals still hold cards. No call, no win.</p>
<h3>House rules (offline games)</h3>
<ul>
<li><b>Flow</b> &mdash; an Ace played on a penalty can be passed on to the next player instead of cancelling it.</li>
<li><b>Special J &amp; K</b> &mdash; a Jack on a penalty passes it forward. A King passes it back and reverses direction.</li>
<li><b>Liberal</b> &mdash; penalty cards, and special Jacks and Kings, can be stacked on any suit.</li>
</ul>`;

export const HELP_SS = `
<h3>Special Sequence</h3>
<p>2 to 4 players, 52 cards, no Jokers. Everyone holds 3 cards. On your turn take the top card of the <b>dead pile</b> (face down) or the top of the <b>dispose pile</b> (face up). If your four cards make a winning set you win straight away. If not, throw one card onto the dispose pile.</p>
<h3>Winning fours</h3>
<ul>
<li>Four consecutive ranks (Ace counts as 1), such as Ace 2 3 4 or 2 3 4 5. Their order in your hand does not matter, so 3 2 4 5 also wins. It wraps round, so Queen King Ace 2 counts.</li>
<li>Three of a kind plus any card.</li>
<li>Two pairs (four of a kind counts too).</li>
<li>A, K, 4, 7.</li>
</ul>
<p>Card order runs Ace, 2 to 10, Jack, Queen, King, and then round to Ace again. Both games award RP and share the same rating.</p>`;
