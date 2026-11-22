import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectLanguage, translate, categoryLabel, fieldName, messages } from '../src/i18n.js';
const data = JSON.parse(readFileSync(new URL('../public/grammy-2027-nominations.json', import.meta.url)));
test('browser regional preferences select supported languages and saved choice takes priority', () => {
 assert.equal(detectLanguage(['pt-BR','en-US']), 'pt');
 assert.equal(detectLanguage(['es-MX']), 'es');
 assert.equal(detectLanguage(['de-DE','es-AR']), 'es');
 assert.equal(detectLanguage(['fr-FR']), 'en');
 assert.equal(detectLanguage(['pt-PT'],'en'), 'en');
 assert.equal(detectLanguage(['es-ES'],'invalid'), 'es');
});
test('all 100 category names and 12 fields have Portuguese and Spanish translations', () => {
 for (const locale of ['pt','es']) for (const category of data.categories) {
  assert.notEqual(categoryLabel(category, locale), category.name);
  assert.ok(messages[category.name]?.[locale]);
  assert.ok(fieldName(category.field, locale));
 }
 for (const [key, locales] of Object.entries(messages)) for (const locale of ['pt','es']) {
  assert.ok(locales[locale], `${key} missing ${locale}`);
  assert.deepEqual([...locales[locale].matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(), [...key.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(), key);
 }
 assert.equal(translate('pt','Continue with {0} {1}',2,'categorias'),'Continuar com 2 categorias');
 assert.equal(translate('es','Unknown title'),'Unknown title');
});
