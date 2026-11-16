import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validChoices, getPicks, hasChoice, categoriesForMode, getEmbed, storyPages, orderCategories } from '../src/ballot.js';
const data = JSON.parse(readFileSync(new URL('../public/grammy-2027-nominations.json', import.meta.url)));
const categories = orderCategories(data.categories);
test('every published category is preserved and all valid picks appear in the recap and stories', () => {
  const choices = Object.fromEntries(categories.map(category => [category.id, category.nominees.length - 1]));
  const picks = getPicks(categories, choices), pages = storyPages(picks);
  assert.equal(picks.length, 98);
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
  assert.equal(categoriesForMode(categories, 'full', {}).length, 98);
});
test('Spotify embeds always use real IDs and preserve representative previews', () => {
  for (const category of categories) for (const nominee of category.nominees) {
    const embed = getEmbed(nominee);
    if (embed) { assert.match(embed.id, /^[A-Za-z0-9]{22}$/); assert.ok(['track', 'album', 'artist'].includes(embed.type)); }
  }
  assert.equal(getEmbed({ spotify_id: 'bad', spotify_type: 'track' }), null);
  assert.equal(getEmbed({ preview_track_id: 'x'.repeat(22), preview_selection: 'first_available_track_on_album' }).representative, true);
});
