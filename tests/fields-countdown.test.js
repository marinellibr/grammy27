import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdown, GRAMMY_START } from '../src/countdown.js';
import { storyPages, groupCategories } from '../src/ballot.js';
test('countdown uses the official telecast instant and never becomes negative', () => {
  assert.deepEqual(countdown(GRAMMY_START - 90061000), { days: 1, hours: 1, minutes: 1, seconds: 1, ended: false });
  assert.equal(countdown(GRAMMY_START - 1).seconds, 1);
  for (const now of [GRAMMY_START, GRAMMY_START + 86400000]) assert.deepEqual(countdown(now), { days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
});
test('one story per field preserves every award and ballot order within each field', () => {
  const categories = [{ id: 'a', field: 'Field 1: Pop' }, { id: 'b', field: 'General Field' }, { id: 'c', field: 'Field 1: Pop' }];
  const picks = categories.map(category => ({ category, nominee: {} }));
  assert.deepEqual(storyPages(picks), [[picks[0], picks[2]], [picks[1]]]);
  assert.equal(groupCategories(categories)[0].label, 'Pop');
  assert.deepEqual(storyPages([]), []);
});
