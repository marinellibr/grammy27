import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validChoices, getPicks, hasChoice, categoriesForMode, getEmbed, storyPages, orderCategories } from '../src/ballot.js';
const data = JSON.parse(readFileSync(new URL('../public/grammy-2027-nominations.json', import.meta.url)));
const categories = orderCategories(data.categories);
test('every published category is preserved and all valid picks appear in the recap and stories', () => {
  const choices = Object.fromEntries(categories.map(category => [category.id, category.nominees.length - 1]));
  const picks = getPicks(categories, choices), pages = storyPages(picks);
  assert.equal(picks.length, data.categories_count);
  assert.deepEqual(pages.flat(), picks);
  assert.ok(pages.every(page => page.length <= 6));
  assert.equal(pages.length, 17);
});
test('invalid or outdated stored picks never count as complete', () => {
  const clean = validChoices({ [categories[0].id]: -1, [categories[1].id]: 999, [categories[2].id]: '0', [categories[3].id]: 0, unrelated: 0 }, categories);
  assert.deepEqual(clean, { [categories[3].id]: 0 });
  assert.equal(hasChoice(clean, categories[0]), false);
  assert.equal(hasChoice(clean, categories[3]), true);
});
test('main categories remain undecided until configured, and can be enabled without code changes', () => {
  assert.equal(categoriesForMode(categories, 'main', { mainCategoryIds: [] }).length, 0);
  assert.deepEqual(categoriesForMode(categories, 'main', { mainCategoryIds: [categories[0].id, categories[3].id] }).map(c => c.id), [categories[0].id, categories[3].id]);
  assert.equal(categoriesForMode(categories, 'full', {}).length, data.categories_count);
});
test('Spotify embeds always use real IDs and preserve representative previews', () => {
  for (const category of categories) for (const nominee of category.nominees) {
    const embed = getEmbed(nominee);
    if (embed) { assert.match(embed.id, /^[A-Za-z0-9]{22}$/); assert.ok(['track', 'album', 'artist'].includes(embed.type)); }
  }
  assert.equal(getEmbed({ spotify_id: 'bad', spotify_type: 'track' }), null);
  assert.equal(getEmbed({ preview_track_id: 'x'.repeat(22), preview_selection: 'first_available_track_on_album' }).representative, true);
});

test('custom ballots require two distinct valid categories and contain only the chosen categories', async () => {
  const { validCustomCategories, canStartBallot } = await import('../src/ballot.js');
  const ids = [categories[4].id, categories[0].id, categories[0].id, 'unknown-category'];
  const clean = validCustomCategories(ids, categories);
  assert.deepEqual(clean, [categories[0].id, categories[4].id]);
  assert.deepEqual(validCustomCategories(null, categories), []);
  assert.equal(canStartBallot(categoriesForMode(categories, 'custom', {}, []), 'custom'), false);
  assert.equal(canStartBallot(categoriesForMode(categories, 'custom', {}, [categories[0].id, categories[0].id, 'unknown-category']), 'custom'), false);
  const custom = categoriesForMode(categories, 'custom', {}, clean);
  assert.equal(canStartBallot(custom, 'custom'), true);
  const choices = Object.fromEntries(categories.map(category => [category.id, 0]));
  assert.deepEqual(getPicks(custom, choices).map(pick => pick.category.id), clean);
  assert.equal(storyPages(getPicks(custom, choices)).flat().length, 2);
});

test('saved custom selections survive reload while invalid categories and old ballot formats stay safe', async () => {
  const { readSaved } = await import('../src/ballot.js');
  const original = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: () => JSON.stringify({ mode: 'custom', customCategoryIds: [categories[0].id, categories[0].id, categories[3].id, 'invalid'], choices: { [categories[0].id]: 1 } }) };
    const saved = readSaved(categories);
    assert.equal(saved.mode, 'custom');
    assert.deepEqual(saved.customCategoryIds, [categories[0].id, categories[3].id]);
    assert.equal(saved.choices[categories[0].id], 1);
    globalThis.localStorage = { getItem: () => JSON.stringify({ mode: 'full', choices: {} }) };
    assert.deepEqual(readSaved(categories).customCategoryIds, []);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('the refreshed official list has all 100 categories and 526 nominees with a matching review catalog', () => {
  const catalog = JSON.parse(readFileSync(new URL('../public/categories.json', import.meta.url)));
  assert.equal(data.categories_count, 100);
  assert.equal(data.categories.length, 100);
  assert.equal(new Set(data.categories.map(category => category.id)).size, 100);
  assert.equal(data.categories.reduce((total, category) => total + category.nominees.length, 0), 526);
  assert.equal(data.nominations_count, 526);
  assert.equal(new Set(data.categories.map(category => category.field)).size, 12);
  assert.match(data.categories.find(category => category.id === 'best-contemporary-instrumental-album').field, /^Field 4:/);
  assert.deepEqual(catalog.categories.map(category => category.id), data.categories.map(category => category.id));
  assert.deepEqual(catalog.categories.map(category => category.number), Array.from({ length: 100 }, (_, index) => index + 1));
  for (const id of ['best-traditional-pop-vocal-album', 'best-contemporary-instrumental-album']) {
    const category = data.categories.find(category => category.id === id);
    assert.equal(category.nominees.length, 5);
    assert.ok(category.nominees.every(nominee => nominee.spotify_type === 'album' && nominee.spotify_status === 'verified' && nominee.preview_track_id));
  }
});

test('all five nominated music videos have official YouTube IDs and unsafe values cannot become embeds', async () => {
  const { getYouTubeVideo } = await import('../src/ballot.js');
  const videos = data.categories.find(category => category.id === 'best-music-video').nominees;
  assert.equal(videos.length, 5);
  for (const nominee of videos) {
    const video = getYouTubeVideo(nominee);
    assert.match(video.id, /^[A-Za-z0-9_-]{11}$/);
    assert.equal(video.url, nominee.youtube_url);
    assert.ok(video.embedUrl.startsWith('https://www.youtube-nocookie.com/embed/'));
    assert.equal(nominee.youtube_verified_source, nominee.youtube_url);
  }
  assert.equal(getYouTubeVideo({ youtube_video_id: 'javascript:bad' }), null);
  assert.equal(getYouTubeVideo({}), null);
});

test('album categories always embed the complete album rather than a representative track', async () => {
  const { isAlbumCategory } = await import('../src/ballot.js');
  assert.equal(isAlbumCategory('Best Pop Vocal Album'), true);
  assert.equal(isAlbumCategory('Melhor Álbum'), true);
  assert.equal(isAlbumCategory('Record Of The Year'), false);
  for (const category of data.categories.filter(category => isAlbumCategory(category.name))) {
    for (const nominee of category.nominees) {
      const embed = getEmbed(nominee, category.name);
      if (embed) { assert.equal(embed.type, 'album'); assert.equal(embed.representative, false); }
    }
  }
  const nominee = { spotify_id: 'a'.repeat(22), spotify_type: 'album', preview_track_id: 'b'.repeat(22) };
  assert.equal(getEmbed(nominee, 'Album Of The Year').id, 'a'.repeat(22));
  assert.equal(getEmbed(nominee, 'Record Of The Year').id, 'b'.repeat(22));
  assert.equal(getEmbed({ preview_track_id: 'b'.repeat(22) }, 'Album Of The Year'), null);
});

test('story artwork URLs are verified media metadata and do not include unsafe schemes', () => {
  const nominees = data.categories.flatMap(category => category.nominees);
  const covers = nominees.filter(nominee => nominee.artwork_url);
  assert.equal(covers.length, data.artwork_summary.nominations_with_artwork);
  assert.ok(covers.length >= 394);
  for (const nominee of covers) {
    assert.match(nominee.artwork_url, /^https:\/\/(?:image-cdn-(?:fa|ak)\.spotifycdn\.com|i\.scdn\.co)\/image\//);
    assert.ok(nominee.artwork_source_url.startsWith('https://open.spotify.com/'));
  }
});

test('the approved Main ballot contains exactly 30 requested categories in descending official order', () => {
  const config = JSON.parse(readFileSync(new URL('../public/ballot-config.json', import.meta.url)));
  const main = categoriesForMode(categories, 'main', config);
  const expected = [83, 81, 80, 79, 78, 77, 76, 68, 63, 62, 30, 29, 26, 24, 20, 18, 17, 14, 13, 12, 11, 10, 8, 7, 6, 5, 4, 3, 2, 1];
  assert.deepEqual(main.map(category => category.official_number), expected);
  assert.equal(categoriesForMode(categories, 'full', config).length, 100);
  assert.equal(getPicks(main, Object.fromEntries(main.map(category => [category.id, 0]))).length, 30);
});

test('Producer and Songwriter of the Year each have one track example per nominee from an official submitted work', () => {
  for (const category of data.categories.filter(category => [5, 6].includes(category.official_number))) {
    assert.equal(category.nominees.length, 5);
    for (const nominee of category.nominees) {
      assert.equal(getEmbed(nominee, category.name).type, 'track');
      assert.ok(nominee.preview_example_title);
      assert.ok(nominee.submitted_works.some(work => work.title === nominee.preview_example_work));
      assert.equal(nominee.preview_selection, 'submitted_work_example');
    }
  }
});
