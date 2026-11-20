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

## Run it on your computer

```
cd www
python3 -m http.server 8000      # then open http://localhost:8000
npm test                         # game-rule tests (from the project root)
```

## Folders

- `www/` the game (this is what gets published)
- `tools/` scripts that generated the artwork (backgrounds, wood table, card backs)
- `tests/` rule tests

Online matches and private rooms are not connected to a server yet; they are wired through `www/js/online.js`.
