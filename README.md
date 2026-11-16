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
- Full ballot covering all 100 official categories, with native radio controls and Spotify embeds where confirmed IDs are available.
- Best Music Video uses the five official YouTube music videos in responsive privacy-enhanced embeds, with direct YouTube links. Other categories keep Spotify players.
- Back/next controls, optional advance on selection, persistent picks, editable final summary.
- Mode cards are ordered Main Categories, Custom Categories, Full Experience. The main-category description shows the configured lineup in a three-line preview, with the full lineup available in a dialog. Full Experience always includes all 100 categories.
- White/gold light mode and black/gold dark mode; theme preference persists locally.
- Story images include verified Spotify album/single artwork, loaded with anonymous CORS. Missing or blocked artwork gets a clear placeholder without preventing PNG/ZIP export.
- Local 1080 × 1920 PNG export, six picks per image, with download, native sharing when supported, and a ZIP of all images. A 100-category ballot creates 17 story images, including every pick.
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

Verified against the official full list at https://www.grammy.com/news/2027-grammys-full-nominations-full-winners-nominees-list/ on November 16, 2026. 100 categories, 526 nominations, 403 confirmed Spotify matches, 312 preview URLs, 97 unresolved matches and 26 professional/film/audiobook entries handled separately. Not all nominees have Spotify embeds. Categories containing “Album” use a complete album embed and never substitute a representative track. Other artist/professional entries may use a labeled representative track. Spotify controls playback, login requirements, regional availability, and preview duration.

## Deploy

The GitHub Actions workflow installs dependencies, tests, validates the public JSON and category configuration, builds Vite, and deploys `dist/` through GitHub Pages. Keep Settings → Pages → Source set to **GitHub Actions**. The app uses `/grammy27/` as its base URL.

Run `node tests/youtube-browser-check.mjs` after starting the preview to verify the new categories, YouTube video controls, responsive layout, and saved-pick compatibility. Media provider responses are isolated in browser tests.

## Category review

The complete catalog is available at `public/categories.json`, `public/categories.csv`, and `public/categories.md`, using official category numbers and fields. Main Categories remains undecided; Full Experience currently contains all 100 categories. No new split is inferred without the user’s selection.

The update adds Best Traditional Pop Vocal Album and Best Contemporary Instrumental Album (five nominees each), preserves existing nominee order and media IDs, and corrects Elaine L. Martone’s name to match the official complete list.

Run `node tests/album-artwork-browser-check.mjs` against the running preview for full-album players, actual CDN artwork export, compact main-category descriptions, mode ordering, and blocked-artwork fallback.
