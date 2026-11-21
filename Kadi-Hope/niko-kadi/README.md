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

## Enable AI replies in bot chats

Bot conversations can use Gemini, with Featherless as a fallback. The API keys belong in the Cloudflare Worker secrets; never put them in the browser or commit them.

1. Create a Cloudflare account and install Wrangler (`npm install --global wrangler`), then run `wrangler login`.
2. In `workers/ai-chat/wrangler.toml`, set `ALLOWED_ORIGIN` to the exact origin of the deployed app (for example, `https://your-name.github.io`—no repository path or trailing slash).
3. If using Featherless, set `FEATHERLESS_MODEL` to a model available to your account. `AI_PROVIDER` selects the preferred provider (`gemini` or `featherless`); the other is used if configured and the preferred provider fails.
4. From `workers/ai-chat`, set the secrets and deploy:

   ```
   wrangler secret put GEMINI_API_KEY
   wrangler secret put FEATHERLESS_API_KEY
   wrangler deploy
   ```

   Enter each key only at Wrangler's secure prompt. If you only want one provider, set only that key.
5. Copy the deployed Worker URL ending in `/api/chat` into `AI_CHAT_API_URL` in `www/js/ai-chat-config.js`, then publish the updated site.
6. Configure a Cloudflare rate-limit rule for the Worker endpoint to limit unexpected API usage. The Worker restricts browser origins and request sizes, but origin checks alone are not authentication.

When the endpoint is configured, text messages to the eight bot chats get AI-generated replies using recent chat context and each bot's personality. Other chats, invites, and voice notes keep their existing behavior. If the endpoint is unset, bot chats use varied offline replies covering everyday topics as well as the card games. Messages sent for AI replies are processed by the configured model provider.

## Enable online multiplayer

The Supabase project URL and publishable key are configured in `www/js/supabase-config.js`. The publishable key is intended for the browser; private game state and move validation stay in the Edge Function. Do not put a Supabase `service_role` key in the site.

1. In Supabase, enable the **Email** provider and disable **Anonymous Sign-Ins** if they were enabled for the earlier multiplayer setup. Configure a production SMTP service for sign-in emails; Supabase's default email service is rate-limited for testing.
2. In **Authentication → URL Configuration**, set the production app as the Site URL and allow its exact URL as a redirect URL. Email sign-in links return to the page that requested them.
3. Install the Supabase CLI and link this project from the repository folder:

   ```
   npx supabase login
   npx supabase link --project-ref aqsjyothxrncwuwtskny
   ```

   Enter the database password only at the CLI prompt; do not commit it.
4. Apply the database schema and deploy the game server:

   ```
   npx supabase db push
   npx supabase functions deploy online-game
   ```

5. Publish the site. Online matches pair two players; private rooms support two to four. Both require an email account and an internet connection and are subject to Supabase plan quotas. There is no application-level 50-user cap. Signed-in users can search display names; availability is shown only while a user has Find Players open, and email addresses are never listed. The shared leaderboard contains human players and ranks completed online Niko Kadi games; offline games, bots, and Special Sequence do not affect it.

The migration limits direct table access with row-level security. The server stores full game state, but returns each player only their own hand and public table information.
Rooms older than 30 days are purged when a new private room or public match is created.

## Folders

- `www/` the game (this is what gets published)
- `workers/ai-chat/` the Cloudflare Worker that keeps AI provider keys server-side
- `supabase/` the online game database migration and server-side move handler
- `tools/` scripts that generated the artwork (backgrounds, wood table, card backs)
- `tests/` rule tests

Online matches and private rooms use the Supabase service configured above.
