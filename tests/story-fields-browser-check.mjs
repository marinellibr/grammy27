import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  await page.route('https://open.spotify.com/**', r => r.fulfill({ body: 'Preview' }));
  await page.goto('http://127.0.0.1:4174/grammy27/');
  const data = JSON.parse(await readFile('public/grammy-2027-nominations.json', 'utf8'));
  await mkdir('qa', { recursive: true });
  for (const count of [1, 2, 15]) for (const theme of ['light', 'dark']) {
    const result = await page.evaluate(async ({ categories, count, theme }) => {
      const { generateStories } = await import('/grammy27/src/story.js');
      const picks = categories.slice(0, count).map(category => ({ category: { ...category, field: 'Pop & Dance/Electronic' }, nominee: category.nominees[0] }));
      const stories = await generateStories(picks, theme);
      const image = new Image(); image.src = stories[0].url; await image.decode();
      document.body.replaceChildren(image); image.style.cssText = 'width:540px;height:960px;display:block';
      return { count: stories.length, awards: stories[0].awardCount, width: image.naturalWidth, height: image.naturalHeight };
    }, { categories: data.categories, count, theme });
    assert.deepEqual(result, { count: 1, awards: count, width: 1080, height: 1920 });
    await page.locator('img').screenshot({ path: `qa/field-story-${count}-${theme}.png` });
  }
  console.log('PASS: one story per field with 1, 2 and 15 awards, both themes, 1080×1920 with covers.');
} finally { await browser.close(); }
