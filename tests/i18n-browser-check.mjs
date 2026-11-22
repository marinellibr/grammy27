import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.BALLOT_URL || 'http://127.0.0.1:4173/grammy27/';
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 await mkdir('qa',{recursive:true});
 for (const [locale, value, main] of [['pt-BR','pt','Categorias principais'],['es-MX','es','Categorías principales'],['fr-FR','en','Main categories']]) {
  const context=await browser.newContext({locale,viewport:{width:320,height:844},ignoreHTTPSErrors:true});
  const page=await context.newPage();await page.goto(origin);
  await page.getByText(main,{exact:true}).waitFor();assert.equal(await page.locator('select').inputValue(),value);
  assert.match(await page.locator('.countdown-digits b').first().innerText(), /^\d+$/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`qa/home-${value}-320.png`,fullPage:true});await context.close();
 }
 const context=await browser.newContext({locale:'pt-BR',viewport:{width:390,height:844},ignoreHTTPSErrors:true});
 await context.addInitScript(()=>{
  window.canvasText=[];const original=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.canvasText.push(text);return original.call(this,text,...args)};
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://open.spotify.com/**',r=>r.fulfill({body:'Spotify preview'}));
 await page.goto(origin);await page.locator('.custom-mode-card').click();await page.getByRole('button',{name:'Escolher minhas categorias'}).click();
 assert.equal(await page.locator('.field-heading').count(),12);
 await page.getByRole('checkbox',{name:'Álbum do Ano',exact:true}).check();
 await page.getByRole('checkbox',{name:'Gravação do Ano',exact:true}).check();
 await page.locator('select').selectOption('es');
 assert.equal(await page.getByRole('checkbox',{checked:true}).count(),2);
 await page.getByRole('button',{name:'Compartir lista de categorías',exact:true}).click();
 await page.getByRole('textbox',{name:'Enlace de tu votación personalizada'}).waitFor();
 await page.getByRole('button',{name:'Cerrar ventana'}).click();
 await page.locator('select').selectOption('pt');
 await page.getByRole('button',{name:'Continuar com 2 categorias'}).click();
 await page.getByRole('heading',{name:'Álbum do Ano',exact:true}).waitFor();
 const title=await page.locator('.nominee-title').first().innerText();
 await page.locator('.nominee-label').first().click();
 await page.locator('select').selectOption('es');
 assert.equal(await page.getByRole('radio',{checked:true}).count(),1);
 assert.equal(await page.locator('.nominee-title').first().innerText(),title);
 await page.getByRole('button',{name:'Siguiente categoría'}).click();
 await page.locator('.nominee-label').first().click();await page.getByRole('button',{name:'Ver mis elecciones'}).click();
 await page.getByRole('button',{name:'Crear mi Story de Instagram'}).click();
 await page.locator('.story-preview').waitFor({timeout:30000});
 const drawn=await page.evaluate(()=>window.canvasText);
 assert.ok(drawn.includes('GRAMMY 2027 · MIS ELECCIONES'));
 assert.ok(drawn.includes('ÁLBUM DEL AÑO'));
 assert.ok(drawn.includes('GRABACIÓN DEL AÑO'));
 assert.ok(drawn.includes('TUS ELECCIONES. TU PROTAGONISMO.'));
 await page.getByRole('button',{name:'Cerrar ventana'}).click();
 await page.reload();await page.getByText('Categorías personalizadas',{exact:true}).waitFor();
 assert.equal(await page.locator('select').inputValue(),'es');
 assert.equal(await page.locator('html').getAttribute('lang'),'es');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('grammy27-ballot-v1')));assert.equal(Object.keys(stored.choices).length,2);
 assert.deepEqual(errors,[]);await context.close();
 console.log('PASS: automatic PT/ES/EN, 320px layout, live switching, translated categories/dialog/Story canvas, unchanged titles and votes, persistence.');
} finally {await browser.close();}
