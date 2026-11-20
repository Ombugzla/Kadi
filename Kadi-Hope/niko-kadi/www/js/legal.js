// Policy texts. These describe the app as it is today (offline, nothing leaves the phone).
// They are drafts and must be reviewed before a public launch (see section 8 of the product spec).
const draft = '<span class="draft">Draft for the pre-launch version</span>';

export const TERMS = `<div class="legal">${draft}
<h3>1. What this is</h3>
<p>Niko Kadi is a free card-game app with two games, Niko Kadi and Special Sequence, played against computer opponents. By using it you agree to these terms.</p>
<h3>2. Play for fun</h3>
<p>The app is for entertainment. Nothing in it costs money, and nothing in it can be won, bet or cashed out. Rank Points (RP), ranks, streaks and the leaderboard are game scores only and have no value outside the app.</p>
<h3>3. Your profile</h3>
<p>You choose a display name and an avatar. Keep them respectful. Do not use another person's name, or anything hateful, sexual or abusive.</p>
<h3>4. Using the app</h3>
<ul><li>Do not copy, resell or tamper with the app or its artwork.</li><li>Do not try to break the game or its scoring.</li><li>Online play, clubs and purchases are not in this version. They will have their own terms when they arrive.</li></ul>
<h3>5. No guarantees</h3>
<p>We work hard to make the rules and the computer players behave correctly, but the app is provided as it is. We are not liable for lost progress, for example if you clear your phone's data.</p>
<h3>6. Changes</h3>
<p>We may update these terms as the app grows. The latest version is always in More.</p>
<h3>7. Contact</h3>
<p>A support address will be published here before launch.</p></div>`;

export const PRIVACY = `<div class="legal">${draft}
<h3>What stays on your phone</h3>
<p>Your display name, avatar, settings, game results, RP, match history and inbox are saved on your device only. They are not sent to us or to anyone else.</p>
<h3>What we do not collect</h3>
<ul><li>No account, email address or phone number.</li><li>No location, contacts, photos or microphone.</li><li>No advertising or tracking.</li></ul>
<h3>Deleting your data</h3>
<p>Open More, then Settings, then Reset progress to clear your scores. Clearing the app's data in your phone settings removes everything.</p>
<h3>When online play arrives</h3>
<p>Accounts, friends and online matches need some data, such as a username and match records. Before they launch we will say exactly what is collected and why, ask for your consent where it is required, and review the app against the Kenya Data Protection Act, 2019. Until then none of this applies.</p>
<h3>Children</h3>
<p>The app has no chat and no purchases. A parent or guardian should still decide what a child may install.</p></div>`;

export const FAIR = `<div class="legal">${draft}
<h3>Random shuffles</h3>
<p>Every deck is shuffled on your device before each game, and nobody, including us, picks the cards you get.</p>
<h3>Computer players</h3>
<p>The computer players are built to use what a person at the table could use: their own cards, the cards that have been played, and how many cards everyone holds. They do not get extra cards or special draws. Easy players make mistakes on purpose, and Expert players make very few.</p>
<h3>Fair scoring</h3>
<p>RP is zero-sum between equal players: the winner takes 2 RP from each rival and each loser pays 2 RP. Beating stronger players is worth more and losing to them costs less, so you cannot climb fast by only playing the easiest players. The full table is under How RP works on the Leaderboard.</p>
<h3>No pay-to-win</h3>
<p>Shop items such as card backs and table colours are cosmetic. Nothing you can unlock changes the rules, your cards or your RP.</p>
<h3>No gambling</h3>
<p>There is no wagering, no prizes of value and no random-reward purchases in Niko Kadi.</p>
<h3>When online play arrives</h3>
<p>Online games will be run by a server that checks every move, so the app on your phone is never trusted to decide a result. Cheating, abusive names and harassment will be reportable, and accounts that abuse the game can be removed.</p></div>`;

export const ABOUT = `<p>Niko Kadi is a Kenyan card-game app. It brings two games played at tables across Kenya to your phone: <b>Niko Kadi</b>, the shedding game where you must call it before you win, and <b>Special Sequence</b>, a quick draw-and-discard game.</p>
<p>Play offline against six computer players, from Easy to Expert, climb the leaderboard with Rank Points, and make the table your own with themes, card backs and table colours.</p>
<p>The rules follow the Niko Kadi concept document, with house rules you can switch on for games against the computer.</p>
<h3>Version</h3><p>0.4 &middot; plays offline</p>
<h3>Coming later</h3><p>Online rooms with friends, public matches, clubs, and sound packs.</p>`;

export const RP_HELP = `<p>Rank Points (RP) decide your rank and your place on the leaderboard. They are earned in Niko Kadi games against the computer. Special Sequence earns no RP.</p>
<h3>How a game moves your RP</h3>
<p>The winner <b>takes 2 RP from each rival</b>. Every loser <b>pays 2 RP</b>. So at a four-player table the winner gains 6 and each loser pays 2. Between equal players nobody drifts up or down over time.</p>
<h3>Rival level</h3>
<p>The pay is scaled by the level of the players you face:</p>
<table class="rp-table"><tr><th>Level</th><th>Win</th><th>Loss</th></tr>
<tr><td>Easy</td><td>&times;0.6</td><td>&times;1.7</td></tr>
<tr><td>Medium</td><td>&times;1</td><td>&times;1</td></tr>
<tr><td>Hard</td><td>&times;1.4</td><td>&times;0.7</td></tr>
<tr><td>Expert</td><td>&times;1.8</td><td>&times;0.55</td></tr></table>
<p style="margin-top:8px">Example: win a two-player game against Krystal (Expert) for +4 RP. Lose to Aloyce (Easy) and it costs 3 RP. You never drop below 0.</p>
<h3>Ranks</h3>
<table class="rp-table"><tr><th>Rank</th><th>From</th></tr>
<tr><td>Rookie</td><td>0 RP</td></tr><tr><td>Regular</td><td>40 RP</td></tr><tr><td>Skilled</td><td>100 RP</td></tr>
<tr><td>Veteran</td><td>200 RP</td></tr><tr><td>Master</td><td>350 RP</td></tr><tr><td>Legend</td><td>550 RP</td></tr></table>`;
