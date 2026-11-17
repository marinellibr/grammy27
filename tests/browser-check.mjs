import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { orderCategories } from '../src/ballot.js';

const origin = process.env.BALLOT_URL || 'http://127.0.0.1:4173/grammy27/';
const data = JSON.parse(await readFile(new URL('../public/grammy-2027-nominations.json', import.meta.url)));
const categories = orderCategories(data.categories);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
// Test the app independently from Spotify login, playback, cookies, and regional restrictions.
await context.route('https://open.spotify.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html lang="en"><body style="margin:0;background:#181818;color:white;font:12px sans-serif;display:flex;align-items:center;height:80px;padding:0 16px">Spotify player</body></html>' }));
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
await mkdir(new URL('../qa/', import.meta.url), { recursive: true });
const screenshot = async name => page.screenshot({ path: new URL(`../qa/${name}.png`, import.meta.url).pathname, fullPage: true });
async function noOverflow() { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow'); }
try {
  await page.goto(origin);
  await page.getByRole('heading', { name: 'Your picks. Your spotlight.' }).waitFor();
  await noOverflow(); await screenshot('home-mobile-light');
  await page.locator('.mode-card:has(input[value="main"]) .mode-choice').click();
  assert.equal(await page.locator('.main-mode-card .pill').innerText(), '30 categories');
  assert.equal(await page.getByRole('button', { name: 'Let’s make some picks' }).isEnabled(), true);
  await page.locator('.mode-card:has(input[value="full"])').click();
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.reload();
  await page.getByRole('heading', { name: 'Your picks. Your spotlight.' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.getByRole('button', { name: 'Let’s make some picks' }).click();
  await page.getByRole('heading', { name: 'Album Of The Year', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Next category' }).isDisabled(), true);
  assert.match(await page.locator('iframe').first().getAttribute('src'), /open\.spotify\.com\/embed\/album\/.*theme=0/);
  await page.locator('.nominee-label').nth(1).click();
  await page.getByRole('button', { name: 'Next category' }).click();
  await page.getByRole('heading', { name: 'Record Of The Year', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  assert.equal(await page.getByRole('radio').nth(1).isChecked(), true);
  await page.reload();
  await page.getByRole('button', { name: 'Continue my ballot' }).click();
  await page.getByRole('heading', { name: 'Record Of The Year', exact: true }).waitFor();
  await noOverflow(); await screenshot('ballot-mobile-dark');
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await page.getByRole('switch', { name: 'Advance on selection' }).click();
  for (let i = 1; i < categories.length; i++) {
    await page.getByRole('heading', { name: categories[i].name.replace(/\s*\(new for 2027\)/i, ''), exact: true }).waitFor();
    await page.locator('.nominee-label').nth(i % categories[i].nominees.length).click();
  }
  await page.getByRole('heading', { name: 'Your ballot. Your kind of golden.' }).waitFor();
  assert.equal(await page.locator('.summary-card').count(), categories.length);
  await noOverflow();
  await page.screenshot({ path: new URL('../qa/summary-mobile-light.png', import.meta.url).pathname });
  await page.getByRole('button', { name: 'Edit your pick for Album Of The Year', exact: true }).click();
  await page.getByRole('radio').nth(1).waitFor();
  assert.equal(await page.getByRole('radio').nth(1).isChecked(), true);
  await page.locator('.nominee-label').nth(2).click();
  await page.getByRole('button', { name: 'Save pick', exact: true }).click();
  assert.match(await page.locator('.summary-card').first().innerText(), /Dandelion/);
  await page.getByRole('button', { name: 'Create my Instagram story', exact: true }).click();
  await page.locator('.story-preview').waitFor({ timeout: 30000 });
  assert.match(await page.locator('.story-pagination').innerText(), /Story 1 of 12/);
  const img = await page.locator('.story-preview').evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight }));
  assert.deepEqual(img, { width: 1080, height: 1920 });
  await screenshot('story-mobile-light');
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image', exact: true }).click();
  const download = await downloadWait;
  assert.match(download.suggestedFilename(), /\.png$/);
  const png = await readFile(await download.path());
  assert.equal(png.readUInt32BE(16), 1080); assert.equal(png.readUInt32BE(20), 1920);
  const zipWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all 12 stories (ZIP)', exact: true }).click();
  const archive = await zipWait, files = unzipSync(new Uint8Array(await readFile(await archive.path())));
  assert.equal(Object.keys(files).length, 12);
  for (const bytes of Object.values(files)) { const image = Buffer.from(bytes); assert.equal(image.readUInt32BE(16), 1080); assert.equal(image.readUInt32BE(20), 1920); }
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Start a fresh ballot', exact: true }).click();
  await page.getByRole('button', { name: 'Keep my picks', exact: true }).click();
  assert.equal(await page.locator('.summary-card').count(), categories.length);
  await page.getByRole('button', { name: 'Grammy 2027 home' }).click();
  for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await noOverflow(); }
  await screenshot('home-desktop-light');
  await page.getByRole('switch', { name: 'Dark mode' }).click();
  await screenshot('home-desktop-dark');
  assert.deepEqual(errors, []);
  console.log('PASS: 100-category ballot, next/back, auto-advance, resume, main-mode placeholder, themes, summary editing, modal, PNG/12-image ZIP export, responsive widths, no JS errors. Spotify iframe URLs verified; playback isolated.');
} finally { await browser.close(); }
