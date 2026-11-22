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

2. The current Worker config already allows the app origin `https://ombugzla.github.io`. If the site’s domain changes, update `ALLOWED_ORIGIN` in `wrangler.toml` to the exact origin only (no repository path or trailing slash).
3. This project is configured to prefer Gemini. Add your Gemini API key and deploy:

   ```
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```

   Enter the key only at Wrangler’s secure prompt. The app already points to this Worker at `www/js/ai-chat-config.js`; update that file only if the deployed Worker URL changes. Featherless is optional; if you use it, set its model in `wrangler.toml` and add its key with `npx wrangler secret put FEATHERLESS_API_KEY`.
4. Configure a Cloudflare rate-limit rule for the Worker endpoint to limit unexpected API usage. Origin checks are not authentication.

After deployment, the assistant’s text replies use recent conversation context. If the Worker is unavailable, the app uses its offline replies. AI messages are processed by the configured model provider.

## Enable online multiplayer

The Supabase project URL and publishable key are configured in `www/js/supabase-config.js`. The publishable key is intended for the browser; private game state and move validation stay in the Edge Function. Do not put a Supabase `service_role` key in the site.

1. In Supabase, enable the **Email** and **Google** providers and disable **Anonymous Sign-Ins**. Email accounts require address confirmation.
2. Configure a custom SMTP provider in Supabase Auth settings. Set the sender name to **Niko Kadi Games** and update the confirmation email subject/template with the game branding. Keep the confirmation link pointed at `{{ .ConfirmationURL }}`. Supabase's default email service is rate-limited and may show Supabase branding.
3. In **Authentication → URL Configuration**, set the Site URL to `https://ombugzla.github.io/Kadi/` and allow `https://ombugzla.github.io/Kadi/**` as a redirect URL. For local development, also allow `http://localhost:8000/**`; do not set localhost as the production Site URL. Email confirmations and Google sign-in return to the app URL derived from the loaded app files.
4. To enable Google sign-in, create a Google OAuth client. Add `https://ombugzla.github.io` as an authorized JavaScript origin and `https://aqsjyothxrncwuwtskny.supabase.co/auth/v1/callback` as an authorized redirect URI in Google, then enter the client ID and secret under Supabase **Authentication → Providers → Google**.
   - Google shows the Supabase callback host in its account chooser because Supabase handles the OAuth callback. Set the app name and logo in Google's OAuth consent-screen branding; replacing the displayed host requires a custom Supabase Auth domain.
5. From the repository root, enter the game project folder. This checkout does not yet include `supabase/config.toml`, so initialize it once, then log in and link the hosted project:

   ```
   cd Kadi-Hope/niko-kadi
   npx supabase init
   npx supabase login
   npx supabase link --project-ref aqsjyothxrncwuwtskny
   ```

   `supabase init` is needed only once. Enter your Supabase access token and database password only in the CLI prompts; do not commit them.
6. Still in `Kadi-Hope/niko-kadi`, apply the database schema and deploy the game server:

   ```
   npx supabase db push
   npx supabase functions deploy online-game
   ```

7. Publish the site. The app requires an account before it opens; users can register with a username, email, and password or continue with Google. Online matches pair two players; private rooms support two to four and require an internet connection. Supabase plan quotas apply, but there is no application-level user cap. Signed-in users can search verified player accounts by display name and send friend requests; accepted friends can chat. Email addresses are not listed. Text messages and private voice recordings are stored in Supabase, are accessible only to conversation participants, and are not end-to-end encrypted. The shared leaderboard contains human players and ranks completed online Niko Kadi and Special Sequence games. Offline games contribute to the local RP total only.

The migrations limit direct table access with row-level security. New direct messages can be sent only between accepted friends and are readable only by their two participants. The server stores full game state, but returns each player only their own hand and public table information.
Rooms older than 30 days are purged when a new private room or public match is created.

## Folders

- `www/` the game (this is what gets published)
- `workers/ai-chat/` the Cloudflare Worker that keeps AI provider keys server-side
- `supabase/` the online game database migration and server-side move handler
- `tools/` scripts that generated the artwork (backgrounds, wood table, card backs)
- `tests/` rule tests

Online matches and private rooms use the Supabase service configured above.
