# Grammy 2027 — the fan ballot

A mobile-first React app to listen to Grammy nominees, make picks category by category, and export the complete ballot as Instagram Story images.

Live: https://marinellibr.github.io/grammy27/

## Run locally

```sh
npm ci
npm run dev
```

Vite serves the app under `/grammy27/`. `npm test` checks ballot integrity, stored choices, Spotify embed IDs and story pagination; `npm run build` creates `dist/`.

After starting `npm run preview -- --port 4173`, run `npm run test:browser` for the complete browser flow. This uses `/usr/bin/chromium` by default; set `CHROMIUM_PATH` or `BALLOT_URL` to override. Run `node tests/custom-browser-check.mjs` to verify custom selection, the two-category minimum, persistence, and the custom voting/export flow. Spotify iframe responses are isolated in these tests; playback remains controlled by Spotify.

## Features

- Custom ballot builder with one selectable card for each category, search, select-all/clear actions, and a minimum of two categories. Selections persist locally, and voting, summaries, and Stories include only the chosen categories.
- Full ballot covering all 98 published categories, with native radio controls and Spotify embeds where confirmed IDs are available.
- Back/next controls, optional advance on selection, persistent picks, editable final summary.
- White/gold light mode and black/gold dark mode; theme preference persists locally.
- Local 1080 × 1920 PNG export, six picks per image, with download, native sharing when supported, and a ZIP of all images. A 98-category ballot creates 17 story images, including every pick.
- No backend, accounts, or official vote submission. Picks remain in browser storage.

## Configure the main-category ballot

Edit `public/ballot-config.json` and populate `mainCategoryIds` with category IDs from the nomination JSON. An empty list leaves the option visible with “Coming soon”; no shortlist is assumed. Both modes share saved picks for overlapping categories.

```json
{
  "mainCategoryIds": ["album-of-the-year", "record-of-the-year"]
}
```

This is only a configuration example, not the selected lineup.

## Data

The original JSON endpoints remain available:

- https://marinellibr.github.io/grammy27/grammy-2027-nominations.json
- https://marinellibr.github.io/grammy27/grammy-2027-spotify-pendencias.json

Snapshot from https://www.grammy.com/live-blog/ on November 16, 2026. 98 categories, 516 nominations, 388 confirmed Spotify matches, 302 preview URLs, 102 unresolved matches and 26 professional/film/audiobook entries handled separately. Not all nominees have Spotify embeds. Album/artist/professional entries may use a representative track, labeled in the UI. Spotify controls playback, login requirements, regional availability, and preview duration.

## Deploy

The GitHub Actions workflow installs dependencies, tests, validates the public JSON and category configuration, builds Vite, and deploys `dist/` through GitHub Pages. Keep Settings → Pages → Source set to **GitHub Actions**. The app uses `/grammy27/` as its base URL.
