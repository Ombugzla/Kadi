// Policy texts describing offline and online play.
// They are drafts and must be reviewed before a public launch (see section 8 of the product spec).
const draft = '<span class="draft">Pre-launch version</span>';

export const TERMS = `<div class="legal">${draft}
<h3>1. What this is</h3>
<p>Niko Kadi is a free card-game app with Niko Kadi and Special Sequence, played against computer opponents or other players online. By using it you agree to these terms.</p>
<h3>2. Play for fun</h3>
<p>The app is for entertainment. Nothing in it costs money, and nothing in it can be won, bet or cashed out. Rank Points (RP), ranks, streaks and the leaderboard are game scores only and have no value outside the app.</p>
<h3>3. Your profile</h3>
<p>You choose a display name and an avatar. Keep them respectful. Do not use another person's name, or anything hateful, sexual or abusive.</p>
<h3>4. Using the app</h3>
<ul><li>Do not copy, resell or tamper with the app or its artwork.</li><li>Do not try to break the game or its scoring.</li><li>Use a respectful display name and do not disrupt games or send abusive messages to other players.</li></ul>
<h3>5. No guarantees</h3>
<p>We work hard to make the rules and the computer players behave correctly, but the app is provided as it is. We are not liable for lost progress, for example if you clear your phone's data.</p>
<h3>6. Changes</h3>
<p>We may update these terms as the app grows. The latest version is always in More.</p>
<h3>7. Contact</h3>
<p>For help with the game or your account, contact <a href="mailto:support@zavhira.com">support@zavhira.com</a>.</p></div>`;

export const PRIVACY = `<div class="legal">${draft}
<h3>Online play data</h3>
<p>Opening the app requires an account with a verified email address. You can register with email and a password or use Google. Supabase stores your email address and account ID; your email is not shown to other players. Your display name and built-in avatar are associated with your account and can be used across devices; an uploaded photo remains on the device where it was selected. The app also stores room membership and game state and moves. Signed-in players can search the player directory and see display names and built-in avatars. They can send friend requests; direct messages are available after a request is accepted. The shared online leaderboard shows display names, built-in avatars, RP, and win/loss totals from both Niko Kadi and Special Sequence matches to signed-in players. Room participants can see one another's display names and avatars. The game server keeps full card state private and returns each player only their own hand and public table information. Online games require an internet connection.</p>
<h3>Player messages</h3>
<p>Text messages and voice-note references are cached on this device; text and private voice recordings are stored in Supabase. They are accessible only to the two participants in that conversation and are not end-to-end encrypted. Do not send passwords, financial details, or other sensitive information.</p>
<h3>Local data</h3>
<p>Settings, offline scores, Rank Points, history and inbox remain on your device. Online match results are recorded locally but do not change your offline Rank Points.</p>
<h3>What we do not request</h3>
<ul><li>No phone number, contacts or location is required to play online.</li><li>No advertising or tracking is used.</li><li>Custom profile photos are not sent to the online game server.</li></ul>
<h3>AI assistant conversations</h3>
<p>If AI replies are enabled, messages sent to the assistant (Quadra by default) and recent conversation context are sent to the configured AI provider (Gemini or Featherless) to generate a reply.</p>
<h3>Deleting your data</h3>
<p>Reset clears local scores and settings. Signing out or clearing browser data does not delete your server-side email account; contact <a href="mailto:support@zavhira.com">support@zavhira.com</a> to request account deletion. Room records are removed after 30 days when a new room or public match is created.</p>
<h3>Contact</h3>
<p>For privacy questions or account deletion requests, email <a href="mailto:support@zavhira.com">support@zavhira.com</a>.</p>
<h3>Children</h3>
<p>Friends can send text and voice messages to one another; there is no purchase flow. Online players can see your chosen display name; a parent or guardian should decide whether a child may play online or use player or AI assistant chats.</p></div>`;

export const FAIR = `<div class="legal">${draft}
<h3>Random shuffles</h3>
<p>Every deck is shuffled on your device before each game, and nobody, including us, picks the cards you get.</p>
<h3>Computer players</h3>
<p>The computer players are built to use what a person at the table could use: their own cards, the cards that have been played, and how many cards everyone holds. They do not get extra cards or special draws. Easy players make mistakes on purpose, and Expert players make very few.</p>
<h3>Fair scoring</h3>
<p>RP is zero-sum between equal players: the winner takes 4 RP from each rival and each loser pays 4 RP. Beating stronger players is worth more and losing to them costs less, so you cannot climb fast by only playing the easiest players. The full table is under How RP works on the Leaderboard.</p>
<h3>No pay-to-win</h3>
<p>Shop items such as card backs and table colours are cosmetic. Nothing you can unlock changes the rules, your cards or your RP.</p>
<h3>No gambling</h3>
<p>There is no wagering, no prizes of value and no random-reward purchases in Niko Kadi.</p>
<h3>Online games</h3>
<p>Online moves are checked by the game server. Private card hands are not sent to other players. Do not use abusive display names or attempt to disrupt other players' games.</p></div>`;

export const ABOUT = `<p>Niko Kadi is a Kenyan card-game app. It brings two games played at tables across Kenya to your phone: <b>Niko Kadi</b>, the shedding game where you must call it before you win, and <b>Special Sequence</b>, a quick draw-and-discard game.</p>
<p>Play offline against eight computer players, with two at each level, or join public matches and private rooms online. Offline RP and the daily bot league stay on this device. Both games award local offline RP and contribute to one shared online leaderboard when played online.</p>
<p>The rules follow the Niko Kadi concept document, with house rules you can switch on for games against the computer.</p>
<h3>Version</h3><p>0.5 &middot; online multiplayer</p>
<h3>Coming later</h3><p>Clubs and sound packs.</p>`;

export const RP_HELP = `<p>Offline RP is saved on this device. Shared online RP is stored on the server and determines your place on the human leaderboard. Both Niko Kadi and Special Sequence award RP in offline and online matches, using one rating for both games.</p>
<h3>Offline games</h3>
<p>The winner <b>takes 4 RP from each rival</b>. Every loser <b>pays 4 RP</b>, scaled by the bot's level. Offline RP never changes your shared online standing.</p>
<h3>Online games</h3>
<p>Online RP starts at 10 and changes only after a completed human match in either game. With equally rated players, the winner gains <b>4 RP from each rival</b>. The transfer is smaller against lower-rated rivals and larger against higher-rated rivals, generally 2–8 RP and limited by each loser's available RP. A player cannot drop below 0.</p>
<h3>Offline bot level</h3>
<p>The pay is scaled by the level of the players you face:</p>
<table class="rp-table"><tr><th>Level</th><th>Win</th><th>Loss</th></tr>
<tr><td>Easy</td><td>&times;0.6</td><td>&times;1.7</td></tr>
<tr><td>Medium</td><td>&times;1</td><td>&times;1</td></tr>
<tr><td>Hard</td><td>&times;1.4</td><td>&times;0.7</td></tr>
<tr><td>Expert</td><td>&times;1.8</td><td>&times;0.55</td></tr></table>
<p style="margin-top:8px">Example: offline, win a two-player game against Krystal (Expert) for +8 RP. Lose to Aloyce (Easy) and it costs 6 RP. You never drop below 0.</p>
<h3>Ranks</h3>
<table class="rp-table"><tr><th>Rank</th><th>From</th></tr>
<tr><td>Rookie</td><td>0 RP</td></tr><tr><td>Regular</td><td>40 RP</td></tr><tr><td>Skilled</td><td>100 RP</td></tr>
<tr><td>Veteran</td><td>200 RP</td></tr><tr><td>Master</td><td>350 RP</td></tr><tr><td>Legend</td><td>550 RP</td></tr></table>`;
