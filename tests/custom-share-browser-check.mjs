import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin = process.env.BALLOT_URL || 'http://127.0.0.1:4173/grammy27/';
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const context = await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true});
 const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(origin);
 await page.locator('.custom-mode-card').click(); await page.getByRole('button',{name:'Choose my categories'}).click();
 const shareButton = page.getByRole('button',{name:'Share category list',exact:true});
 assert.equal(await shareButton.isDisabled(),true);
 await page.getByRole('checkbox',{name:'Album Of The Year',exact:true}).check();
 assert.equal(await shareButton.isDisabled(),true);
 await page.getByRole('checkbox',{name:'Record Of The Year',exact:true}).check();
 await shareButton.click();
 const link = await page.getByRole('textbox',{name:'Your custom ballot link'}).inputValue();
 assert.equal(new URL(link).pathname,'/grammy27/');
 await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedLink=text}},configurable:true}));
 await page.getByRole('button',{name:'Copy link',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.copiedLink),link);
 await page.getByRole('button',{name:'Close dialog'}).click();
 // A recipient's existing votes remain their own and do not come from the sender.
 const recipient = await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true});
 await recipient.addInitScript(() => { if(window.top===window) localStorage.setItem('grammy27-ballot-v1',JSON.stringify({mode:'full',choices:{'song-of-the-year':1},customCategoryIds:['best-new-artist']})); });
 const friend = await recipient.newPage(); await friend.route('https://open.spotify.com/**',r=>r.fulfill({body:'Preview'}));
 await friend.goto(link); await friend.getByRole('heading',{name:'Set your own stage.'}).waitFor();
 assert.equal(await friend.getByRole('checkbox',{checked:true}).count(),2);
 assert.equal(await friend.getByRole('checkbox',{name:'Album Of The Year',exact:true}).isChecked(),true);
 assert.equal(await friend.getByRole('checkbox',{name:'Record Of The Year',exact:true}).isChecked(),true);
 assert.equal(await friend.evaluate(()=>location.hash),'');
 const stored = await friend.evaluate(()=>JSON.parse(localStorage.getItem('grammy27-ballot-v1')));
 assert.deepEqual(stored.choices,{'song-of-the-year':1});
 assert.equal(stored.mode,'custom');
 assert.equal(await friend.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await friend.getByRole('button',{name:'Continue with 2 categories'}).click();
 assert.equal(await friend.getByRole('radio',{checked:true}).count(),0);
 // Links also import when opened in an already running tab.
 await friend.evaluate(hash => { location.hash = hash; }, new URL(link).hash);
 await friend.getByRole('heading',{name:'Set your own stage.'}).waitFor();
 assert.equal(await friend.getByRole('checkbox',{checked:true}).count(),2);
 assert.deepEqual(errors,[]);
 console.log('PASS: share minimum, copy link, fresh recipient imports exact categories, preserves personal votes, starts own ballot, mobile width.');
 await recipient.close(); await context.close();
} finally {await browser.close();}
