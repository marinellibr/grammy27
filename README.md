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
- Mode cards are ordered Main Categories, Custom Categories, Full Experience. The main-category card has a short generic description and a category count, without listing the lineup. Full Experience always includes all 100 categories.
- White/gold light mode and black/gold dark mode; theme preference persists locally.
- Story images include verified Spotify album/single artwork, loaded with anonymous CORS. Missing or blocked artwork gets a clear placeholder without preventing PNG/ZIP export.
- Local 1080 × 1920 PNG export: one Story per official musical field, with equal space for each selected award and cover artwork. Download, native sharing when supported, and a ZIP of all images. A complete 100-category ballot creates 12 Stories.
- No backend, accounts, or official vote submission. Picks remain in browser storage.

## Main-category ballot

Edit `public/ballot-config.json` and populate `mainCategoryIds` with category IDs from the nomination JSON. An empty list leaves the option visible with “Coming soon”. The current approved shortlist has 30 categories, in descending official-number order; the order of IDs in this file is the voting and recap order. Both modes share saved picks for overlapping categories.

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

Verified against the official full list at https://www.grammy.com/news/2027-grammys-full-nominations-full-winners-nominees-list/ on November 16, 2026. 100 categories, 526 nominations, 403 confirmed Spotify matches, 313 preview URLs, 97 unresolved matches and 26 professional/film/audiobook entries handled separately. Not all nominees have Spotify embeds. Categories containing “Album” use a complete album embed and never substitute a representative track. Other artist/professional entries may use a labeled representative track. Spotify controls playback, login requirements, regional availability, and preview duration.

## Deploy

The GitHub Actions workflow installs dependencies, tests, validates the public JSON and category configuration, builds Vite, and deploys `dist/` through GitHub Pages. Keep Settings → Pages → Source set to **GitHub Actions**. The app uses `/grammy27/` as its base URL.

Run `node tests/youtube-browser-check.mjs` after starting the preview to verify the new categories, YouTube video controls, responsive layout, and saved-pick compatibility. Media provider responses are isolated in browser tests.

## Category review

The complete catalog is available at `public/categories.json`, `public/categories.csv`, and `public/categories.md`, using official category numbers and fields. Main Categories contains the 30 categories approved by the user, ordered 83 → 1 according to the configured selection. Full Experience contains all 100 categories.

The update adds Best Traditional Pop Vocal Album and Best Contemporary Instrumental Album (five nominees each), preserves existing nominee order and media IDs, and corrects Elaine L. Martone’s name to match the official complete list.

Run `node tests/album-artwork-browser-check.mjs` against the running preview for full-album players, actual CDN artwork export, compact generic main-category descriptions, mode ordering, and blocked-artwork fallback.

Categories 5 and 6 retain all nominees, with one representative song per nominee from their officially submitted works. Tracks taken from a submitted album are identified as examples rather than nominated individual songs. New visitors default to Main Categories; returning visitors keep their saved ballot mode.

Run `node tests/main-ballot-browser-check.mjs` to verify the approved 30-category descending sequence, one example song per nominee in categories 5/6, persistence, and Full Experience retaining all categories.

Custom awards are grouped in initially expanded field accordions, with expand/collapse controls. The header counts down to the official February 7, 2027 telecast (4 PM PT / 7 PM ET; February 8 at 00:00 UTC), then stays at zero. Source: https://www.grammy.com/news/how-to-watch-2027-grammys-2/
