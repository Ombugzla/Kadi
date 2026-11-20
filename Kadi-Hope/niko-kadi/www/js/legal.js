// Policy texts describing offline and online play.
// They are drafts and must be reviewed before a public launch (see section 8 of the product spec).
const draft = '<span class="draft">Draft for the pre-launch version</span>';

export const TERMS = `<div class="legal">${draft}
<h3>1. What this is</h3>
<p>Niko Kadi is a free card-game app with Niko Kadi and Special Sequence, played against computer opponents or other players online. By using it you agree to these terms.</p>
<h3>2. Play for fun</h3>
<p>The app is for entertainment. Nothing in it costs money, and nothing in it can be won, bet or cashed out. Rank Points (RP), ranks, streaks and the leaderboard are game scores only and have no value outside the app.</p>
<h3>3. Your profile</h3>
<p>You choose a display name and an avatar. Keep them respectful. Do not use another person's name, or anything hateful, sexual or abusive.</p>
<h3>4. Using the app</h3>
<ul><li>Do not copy, resell or tamper with the app or its artwork.</li><li>Do not try to break the game or its scoring.</li><li>Use a respectful display name and do not disrupt other players' games.</li></ul>
<h3>5. No guarantees</h3>
<p>We work hard to make the rules and the computer players behave correctly, but the app is provided as it is. We are not liable for lost progress, for example if you clear your phone's data.</p>
<h3>6. Changes</h3>
<p>We may update these terms as the app grows. The latest version is always in More.</p>
<h3>7. Contact</h3>
<p>A support address will be published here before launch.</p></div>`;

export const PRIVACY = `<div class="legal">${draft}
<h3>Online play data</h3>
<p>Online play uses Supabase anonymous authentication and stores an anonymous account ID, your chosen display name and built-in avatar, room membership, and game state and moves. Room participants can see one another's display names and avatars. The game server keeps full card state private and returns each player only their own hand and public table information. Online games require an internet connection.</p>
<h3>Local data</h3>
<p>Settings, offline scores, Rank Points, history and inbox remain on your device. Online match results are recorded locally but do not change your offline Rank Points.</p>
<h3>What we do not request</h3>
<ul><li>No email address, phone number, contacts or location is required to play online.</li><li>No advertising or tracking is used.</li><li>Custom profile photos are not sent to the online game server.</li></ul>
<h3>AI bot conversations</h3>
<p>If AI replies are enabled, messages sent to bot chats and recent conversation context are sent to the configured AI provider (Gemini or Featherless) to generate a reply.</p>
<h3>Deleting your data</h3>
<p>Reset progress clears local scores and settings. Clearing browser data signs you out but does not immediately delete the server-side anonymous account. Room records are removed after 30 days when a new room or match is created.</p>
<h3>Children</h3>
<p>There is no live player-to-player text chat or purchase flow. Online players can see your chosen display name; a parent or guardian should decide whether a child may play online or use AI bot chats.</p></div>`;

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
<h3>Online games</h3>
<p>Online moves are checked by the game server. Private card hands are not sent to other players. Do not use abusive display names or attempt to disrupt other players' games.</p></div>`;

export const ABOUT = `<p>Niko Kadi is a Kenyan card-game app. It brings two games played at tables across Kenya to your phone: <b>Niko Kadi</b>, the shedding game where you must call it before you win, and <b>Special Sequence</b>, a quick draw-and-discard game.</p>
<p>Play offline against eight computer players, with two at each level, or join public matches and private rooms online. The bot league plays a daily round on this device, while your Rank Points track your own Niko Kadi wins.</p>
<p>The rules follow the Niko Kadi concept document, with house rules you can switch on for games against the computer.</p>
<h3>Version</h3><p>0.5 &middot; online multiplayer</p>
<h3>Coming later</h3><p>Clubs and sound packs.</p>`;

export const RP_HELP = `<p>Rank Points (RP) decide your rank and your place on the leaderboard. They are earned in Niko Kadi games against the computer. Special Sequence earns no RP.</p>
<h3>How a game moves your RP</h3>
<p>In offline games, the winner <b>takes 2 RP from each rival</b>. Every loser <b>pays 2 RP</b>. Online match results do not change offline RP.</p>
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
