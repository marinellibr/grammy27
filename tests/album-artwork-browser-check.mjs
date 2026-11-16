import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('../public/grammy-2027-nominations.json', import.meta.url)));
const origin = process.env.BALLOT_URL || 'http://127.0.0.1:4173/grammy27/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
await context.route('https://open.spotify.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Spotify album track list' }));
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
async function saveImage(page, file) {
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image', exact: true }).click();
  const download = await waiting; await download.saveAs(file);
  const png = await readFile(file);
  assert.equal(png.readUInt32BE(16), 1080); assert.equal(png.readUInt32BE(20), 1920);
}
try {
  await page.goto(origin);
  await page.locator('.mode-options input').first().waitFor({ state: 'attached' });
  assert.deepEqual(await page.locator('.mode-options input').evaluateAll(inputs => inputs.map(input => input.value)), ['main', 'custom', 'full']);
  await page.locator('.custom-mode-card').click();
  await page.getByRole('button', { name: 'Choose my categories', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Album Of The Year', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Best Pop Vocal Album', exact: true }).check();
  await page.getByRole('button', { name: 'Continue with 2 categories' }).click();
  await page.getByRole('heading', { name: 'Album Of The Year', exact: true }).waitFor();
  for (const iframe of await page.locator('iframe').all()) {
    assert.match(await iframe.getAttribute('src'), /\/embed\/album\//);
    assert.equal(await iframe.getAttribute('height'), '352');
  }
  assert.equal(await page.locator('.preview-caption').count(), 0);
  await page.locator('.nominee-label').first().click();
  await page.getByRole('button', { name: 'Next category', exact: true }).click();
  await page.getByRole('heading', { name: 'Best Pop Vocal Album', exact: true }).waitFor();
  assert.ok((await page.locator('iframe').nth(3).getAttribute('src')).includes('3ZN01xzenGMhWHdC5kfAe9'));
  await page.locator('.nominee-label').nth(3).click();
  await page.getByRole('button', { name: 'See my picks', exact: true }).click();
  await page.getByRole('button', { name: 'Create my Instagram story', exact: true }).click();
  await page.locator('.story-preview').waitFor({ timeout: 30000 });
  await page.locator('.story-preview').evaluate(image => image.decode());
  assert.equal(await page.locator('.artwork-notice').count(), 0, 'Actual Spotify CDN covers must load with CORS and be included');
  await mkdir('qa', { recursive: true });
  await saveImage(page, 'qa/story-album-covers-light.png');
  await page.keyboard.press('Escape');
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await page.getByRole('button', { name: 'Create my Instagram story', exact: true }).click();
  await page.locator('.story-preview').waitFor();
  await saveImage(page, 'qa/story-album-covers-dark.png');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);

  // Simulate a real future shortlist without changing the published config.
  const lineupContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
  await lineupContext.route('**/ballot-config.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ mainCategoryIds: data.categories.slice(0, 18).map(category => category.id) }) }));
  const lineup = await lineupContext.newPage(); await lineup.goto(origin);
  await lineup.locator('.main-mode-card .mode-description').waitFor();
  assert.ok((await lineup.locator('.main-mode-card .mode-description').innerText()).length < 120);
  assert.equal(await lineup.getByRole('button', { name: 'View all categories', exact: true }).count(), 0);
  for (const width of [320, 390, 768, 1440]) {
    await lineup.setViewportSize({ width, height: 900 });
    assert.equal(await lineup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await lineupContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  await fallbackContext.addInitScript(() => {
    if (window.top !== window) return;
    localStorage.setItem('grammy27-ballot-v1', JSON.stringify({ mode: 'custom', customCategoryIds: ['album-of-the-year', 'best-pop-vocal-album'], choices: { 'album-of-the-year': 0, 'best-pop-vocal-album': 3 } }));
  });
  await fallbackContext.route(/https:\/\/(image-cdn-(fa|ak)\.spotifycdn\.com|i\.scdn\.co)\/image\//, route => route.abort());
  const fallback = await fallbackContext.newPage(); await fallback.goto(origin);
  await fallback.getByRole('button', { name: 'Choose my categories', exact: true }).click();
  await fallback.getByRole('button', { name: 'Continue with 2 categories' }).click();
  await fallback.getByRole('button', { name: 'Create my Instagram story', exact: true }).click();
  await fallback.locator('.story-preview').waitFor({ timeout: 30000 });
  await fallback.locator('.artwork-notice').waitFor();
  await saveImage(fallback, 'qa/story-artwork-fallback.png');
  await fallbackContext.close();
  console.log('PASS: Main/Custom/Full order, full-album 352px players, real Spotify album covers in light/dark PNGs, compact generic Main description, responsive widths, and successful PNG export when artwork is blocked.');
} finally { await browser.close(); }
