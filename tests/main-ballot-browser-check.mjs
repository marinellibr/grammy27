import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { categoriesForMode, orderCategories } from '../src/ballot.js';
const data = JSON.parse(await readFile(new URL('../public/grammy-2027-nominations.json', import.meta.url)));
const config = JSON.parse(await readFile(new URL('../public/ballot-config.json', import.meta.url)));
const main = categoriesForMode(orderCategories(data.categories), 'main', config);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
await context.route('https://open.spotify.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Spotify player' }));
await context.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: 'YouTube player' }));
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(process.env.BALLOT_URL || 'http://127.0.0.1:4173/grammy27/');
  await page.getByRole('button', { name: 'Let’s make some picks', exact: true }).waitFor();
  assert.equal(await page.locator('.main-mode-card input').isChecked(), true);
  assert.equal(await page.locator('.main-mode-card .pill').innerText(), '30 categories');
  assert.equal(await page.locator('.main-lineup').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'View all categories' }).count(), 0);
  assert.deepEqual(await page.locator('.mode-options input').evaluateAll(inputs => inputs.map(input => input.value)), ['main', 'custom', 'full']);
  await page.getByRole('button', { name: 'Let’s make some picks', exact: true }).click();
  await page.getByRole('heading', { name: 'Best Album Cover', exact: true }).waitFor();
  assert.match(await page.locator('.stepper-copy').innerText(), /\/ 30/);
  await page.getByRole('switch', { name: 'Advance on selection' }).click();
  for (let i = 0; i < main.length; i++) {
    const category = main[i];
    await page.getByRole('heading', { name: category.name, exact: true }).waitFor();
    if ([5, 6].includes(category.official_number)) {
      assert.equal(await page.locator('.nominee-card').count(), 5);
      assert.equal(await page.locator('iframe').count(), 5);
      for (const frame of await page.locator('iframe').all()) assert.match(await frame.getAttribute('src'), /\/embed\/track\//);
      for (const caption of await page.locator('.preview-caption').all()) assert.match(await caption.innerText(), /^Example:/);
    }
    await page.locator('.nominee-label').nth(i % category.nominees.length).click();
  }
  await page.getByRole('heading', { name: 'Your ballot. Your kind of golden.' }).waitFor();
  assert.equal(await page.locator('.summary-card').count(), 30);
  assert.deepEqual(await page.locator('.summary-category').allTextContents(), main.map(category => category.name));
  await page.reload();
  await page.getByRole('button', { name: 'View my ballot', exact: true }).click();
  assert.equal(await page.locator('.summary-card').count(), 30);
  await page.getByRole('button', { name: 'Grammy 2027 home' }).click();
  await page.locator('.full-mode-card').click();
  await page.getByRole('button', { name: 'Continue my ballot', exact: true }).click();
  await page.getByRole('heading', { name: 'Best Asian Pop Music Performance', exact: true }).waitFor();
  assert.match(await page.locator('.stepper-copy').innerText(), /30 of 100 picked/);
  assert.deepEqual(errors, []);
  console.log('PASS: approved 30-category Main selection in descending order, compact generic description, first/default Main mode, one example track per nominee in categories 5/6, auto-advance, summary ordering, saved choices, and Full retaining all 100 categories.');
} finally { await browser.close(); }
