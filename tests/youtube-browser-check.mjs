import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
await context.addInitScript(() => { if (window.top !== window) return; localStorage.setItem('grammy27-ballot-v1', JSON.stringify({ mode: 'custom', customCategoryIds: ['best-traditional-pop-vocal-album', 'best-music-video'], choices: { 'record-of-the-year': 1 } })); });
await context.route('https://open.spotify.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Spotify player' }));
await context.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0;background:#080808;color:white"><button style="margin:50px 20px">Play video</button></body></html>' }));
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(process.env.BALLOT_URL || 'http://127.0.0.1:4173/grammy27/');
  await page.getByRole('button', { name: 'Choose my categories', exact: true }).click();
  assert.equal(await page.getByRole('checkbox').count(), 100);
  await page.getByRole('button', { name: 'Continue with 2 categories' }).click();
  await page.getByRole('heading', { name: 'Best Traditional Pop Vocal Album', exact: true }).waitFor();
  assert.equal(await page.locator('iframe[src*="open.spotify.com/embed/"]').count(), 5);
  assert.equal(await page.locator('iframe[src*="youtube"]').count(), 0);
  await page.locator('.nominee-label').first().click();
  await page.getByRole('button', { name: 'Next category', exact: true }).click();
  await page.getByRole('heading', { name: 'Best Music Video', exact: true }).waitFor();
  assert.equal(await page.locator('iframe[src*="youtube-nocookie.com/embed/"]').count(), 5);
  assert.equal(await page.locator('iframe[src*="spotify"]').count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Watch on YouTube' }).count(), 5);
  const expectedIds = ['4KXnboPN1p4', 'x6_mbnsh6VU', '82-jTNka3uc', 'HtVcltkn3HI', 'htQBS2Ikz6c'];
  for (const [index, iframe] of (await page.locator('iframe').all()).entries()) {
    assert.ok((await iframe.getAttribute('src')).includes(expectedIds[index]));
    assert.equal(await iframe.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
  }
  await page.locator('iframe').first().contentFrame().getByRole('button', { name: 'Play video' }).click();
  assert.equal(await page.getByRole('radio', { checked: true }).count(), 0, 'Playing a video must not cast a vote');
  assert.equal(await page.getByRole('button', { name: 'See my picks' }).isDisabled(), true);
  await mkdir('qa', { recursive: true });
  await page.screenshot({ path: 'qa/youtube-mobile-light.png' });
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.nominee-label').nth(1).click();
  await page.getByRole('button', { name: 'See my picks' }).click();
  assert.equal(await page.locator('.summary-card').count(), 2);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('grammy27-ballot-v1')));
  assert.equal(saved.choices['record-of-the-year'], 1, 'Existing picks survive the data refresh');
  assert.equal(saved.choices['best-music-video'], 1);
  assert.deepEqual(errors, []);
  console.log('PASS: all 100 categories, new Spotify previews, five official YouTube embeds, independent video controls, direct links, radio/summary flow, saved old picks, dark mode and responsive widths. Provider playback is isolated.');
} finally { await browser.close(); }
