# Niko Kadi

Kenyan card games (Niko Kadi and Special Sequence) with computer opponents, ranks (RP), themes and card backs.
It is a Progressive Web App: plain HTML, CSS and JavaScript in `www/`, no build step.

## Put it online and install it on your phone

1. Create a new **public** repository on GitHub (for example `niko-kadi`).
2. Upload everything in this folder to it (drag the files into the page, or `git push`).
3. In the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
4. Open the **Actions** tab, wait for "Deploy to GitHub Pages" to turn green (about a minute).
5. Your game is at `https://<your-username>.github.io/<repository-name>/`.
6. Open that link on your phone.
   - **Android (Chrome):** menu ⋮ → **Install app** / **Add to Home screen**.
   - **iPhone (Safari):** Share → **Add to Home Screen**.

It then opens full screen like an app and works offline.

For the `Ombugzla/Kadi` repository, the root Pages workflow publishes `Kadi-Hope/niko-kadi/www`.

## Run it on your computer

```
cd www
python3 -m http.server 8000      # then open http://localhost:8000
```

Run the game-rule tests from the project root with `npm test`.

## Deploy the assistant AI worker

The assistant is named Quadra by default and uses Gemini, with Featherless as an optional fallback. API keys belong in Cloudflare Worker secrets; never put them in the browser or commit them.

1. From the repository root, enter the Worker folder and authenticate with Cloudflare:

   ```
   cd Kadi-Hope/niko-kadi/workers/ai-chat
   npx wrangler login
   ```

2. The Worker allows the current Pages origin during the domain transition and `https://play.zavhira.com`. Keep `ALLOWED_ORIGINS` as a comma-separated list of exact origins (no paths or trailing slashes).
3. This project is configured to prefer Gemini. Add your Gemini API key and deploy:

   ```
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```

   Enter the key only at Wrangler’s secure prompt. The app already points to this Worker at `www/js/ai-chat-config.js`; update that file only if the deployed Worker URL changes. Featherless is optional; if you use it, set its model in `wrangler.toml` and add its key with `npx wrangler secret put FEATHERLESS_API_KEY`.
4. Configure a Cloudflare rate-limit rule for the Worker endpoint to limit unexpected API usage. Origin checks are not authentication.

After deployment, the assistant’s text replies use recent conversation context. If the Worker is unavailable, the app uses its offline replies. AI messages are processed by the configured model provider.

## Enable online multiplayer

Supabase remains the database and online-game backend after the Clerk migration. The existing
Supabase Auth flow stays active while `www/js/clerk-config.js` is empty. Follow the Clerk
cutover section below before setting that key.

The Supabase project URL and publishable key are configured in `www/js/supabase-config.js`. The publishable key is intended for the browser; private game state and move validation stay in the Edge Function. Do not put a Supabase `service_role` key in the site.

1. In Supabase **Authentication → Providers → Email**, enable Email and **Confirm email**; also enable Google if needed and disable **Anonymous Sign-Ins**. Online play rejects unconfirmed email accounts.
2. Configure and verify a custom SMTP provider in Supabase **Authentication → SMTP Settings**. Set the sender name to **Niko Kadi Games** and use a sender address on a domain verified with your mail provider. Publish the exact SPF/DKIM records supplied by that provider, then send a test email from the provider. A custom Auth domain such as `auth.zavhira.com` does not itself send email; SMTP credentials and the mail domain's verification records are separate requirements. Supabase's default email service is rate-limited and may show Supabase branding.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://play.zavhira.com/` and allow `https://play.zavhira.com/**` as a redirect URL. Keep `https://ombugzla.github.io/Kadi/**` temporarily while migrating, and allow `http://localhost:8000/**` for local development.
4. An Auth custom domain is optional and is not needed for Google to display your verified app name. Supabase lists custom domains as a paid add-on on paid plans. If you later enable it, use the Supabase dashboard to configure `auth.zavhira.com`, add the DNS-only CNAME and verification TXT records Supabase supplies, and add its OAuth callback in Google before activating it. Keep the current project URL in `www/js/supabase-config.js` unless/until that custom domain is active and you choose to switch.
5. In Cloudflare DNS, add `play` as a **DNS-only CNAME** to `ombugzla.github.io`. The Pages artifact includes `www/CNAME`; in the repository's **Settings → Pages**, set the custom domain to `play.zavhira.com` and wait for HTTPS to become available. Keep the existing GitHub Pages URL working until the new domain is verified.

   The About and policy pages live in `www/` and are published by the Pages workflow only after changes are pushed to `main`. During the domain transition, the old GitHub Pages address may redirect to `play.zavhira.com`; if DNS or the Pages custom-domain/HTTPS setup is incomplete, that redirect can lead to a 404. Before submitting Google branding, confirm that the About, privacy, and terms URLs load publicly over HTTPS.

6. In Google Search Console, verify ownership of the **Domain** property `zavhira.com` by adding the exact TXT record Google supplies to Cloudflare DNS. Add Google's value as a separate TXT record; do not replace existing mail-related TXT records. Use a Google account that has owner access to the Search Console property and access to the OAuth project.
7. In Google Cloud **APIs & Services → Credentials**, add `https://play.zavhira.com` as an authorized JavaScript origin. Keep the current Supabase callback `https://aqsjyothxrncwuwtskny.supabase.co/auth/v1/callback` registered. In Supabase **Authentication → Providers → Google**, set the same OAuth client ID and secret.
8. In Google Cloud **Google Auth Platform → Branding**, set the app name to **Kadi Games**, support email to `support@zavhira.com`, homepage to `https://play.zavhira.com/about.html`, privacy URL to `https://play.zavhira.com/legal.html?document=privacy`, terms URL to `https://play.zavhira.com/legal.html?document=terms`, and upload the square app logo. Add `zavhira.com` under authorized domains. Publish and complete **Verify Branding** so the name/logo are shown to users. Google's current requirements are described in [Brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification). The policy pages are public drafts for review; check their accuracy and replace remaining draft language before submitting.
9. From the repository root, enter the game project folder. The Supabase CLI configuration is already present. If this checkout is not linked to the hosted project, log in and link it:

   ```
   cd Kadi-Hope/niko-kadi
   npx supabase login
   npx supabase link --project-ref aqsjyothxrncwuwtskny
   ```

   Enter your Supabase access token and database password only in the CLI prompts; do not commit them.
10. Still in `Kadi-Hope/niko-kadi`, apply the database schema and deploy the game server:

   ```
   npx supabase db push
   npx supabase functions deploy online-game
   ```

11. Deploy the changed Worker config with `npx wrangler deploy`, then publish the site. The app requires an account before it opens; users can register with a username, email, and password or continue with Google. If a signup confirmation doesn't arrive, verify SMTP delivery and the Auth redirect allowlist in the Supabase dashboard; the signup screen also offers a resend action. Online matches pair two players; private rooms support two to four and require an internet connection. Supabase plan quotas apply, but there is no application-level user cap. Signed-in users can search verified player accounts by display name and send friend requests; accepted friends can chat. Email addresses are not listed. Text messages and private voice recordings are stored in Supabase, are accessible only to conversation participants, and are not end-to-end encrypted. The shared leaderboard contains human players and ranks completed online Niko Kadi and Special Sequence games. Offline games contribute to the local RP total only.

The migrations limit direct table access with row-level security. New direct messages can be sent only between accepted friends and are readable only by their two participants. The server stores full game state, but returns each player only their own hand and public table information.
Rooms older than 30 days are purged when a new private room or public match is created.

## Switch authentication to Clerk

The Clerk integration is staged and is not active until the frontend key is set. Keep
`www/js/clerk-config.js` empty until the Clerk instance, Supabase integration, migration,
function secrets, and function deployments below are ready.

1. Create a Clerk production instance. Configure email verification and Google sign-in there.
   In Google Cloud, add the Clerk callback URL shown by Clerk to the OAuth client; retain the
   current Supabase callback until the migration is verified. Complete Google's branding and
   domain verification for Kadi Games as described above.
2. In Clerk's Supabase integration setup, activate the Supabase integration and copy the Clerk
   domain. Confirm Clerk session tokens include `role: authenticated`. In Supabase Dashboard,
   add Clerk under **Authentication → Sign In / Providers → Third-Party Auth** and enter that
   domain. This hosted setting is separate from the local CLI configuration in `supabase/config.toml`.
3. Optionally configure Clerk's custom Frontend API domain, such as `accounts.zavhira.com`.
   Add only the DNS records Clerk provides and wait for its dashboard to confirm the domain.
   Do not guess or proxy those records.
4. In Supabase Project Settings → Edge Functions → Secrets, set `CLERK_SECRET_KEY` and
   `CLERK_AUTHORIZED_PARTIES`. The latter is a comma-separated list of exact browser origins,
   for example `https://play.zavhira.com,http://localhost:8000`; include
   `https://ombugzla.github.io` only while that origin remains in use. Never put the secret key
   in the site or source control. The `clerk-identity` and `online-game` Edge Functions perform
   their own token verification; their gateway JWT checks are disabled in `config.toml` so Clerk
   tokens can reach that verification.
5. From `Kadi-Hope/niko-kadi`, back up the production database, review the pending migrations,
   then apply the identity bridge and deploy both functions:

   ```
   npx supabase db push
   npx supabase functions deploy clerk-identity
   npx supabase functions deploy online-game
   ```

6. Only after the database and functions are ready, set Clerk's production publishable key in
   `www/js/clerk-config.js`, publish the site, and verify sign-in, email verification, room
   creation/joining, leaderboard, friends, and messages. The first Clerk sign-in reuses existing
   game records only when the Clerk primary email is verified and matches the existing account.
   Passwords are not migrated; users establish credentials with Clerk. A different email creates
   a separate game account and will not automatically recover the old account's records.

## Folders

- `www/` the game (this is what gets published)
- `workers/ai-chat/` the Cloudflare Worker that keeps AI provider keys server-side
- `supabase/` the online game database migration and server-side move handler
- `tools/` scripts that generated the artwork (backgrounds, wood table, card backs)
- `tests/` rule tests

Online matches and private rooms use the Supabase service configured above.
