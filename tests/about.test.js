import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aboutCard, ANBIETER } from '../js/views/about.js';

test('Über T3 Hub: Impressum und Datenschutzerklärung mit den Angaben zum Anbieter', () => {
  const html = aboutCard();
  assert.match(html, /<summary>Impressum<\/summary>/);
  assert.match(html, /<summary>Datenschutzerklärung<\/summary>/);
  assert.match(html, /§ 5 Digitale-Dienste-Gesetz/);
  for (const v of Object.values(ANBIETER)) assert.ok(html.includes(v), v + ' fehlt');
  for (const w of ['GitHub', 'OpenStreetMap', 'Nominatim', 'Standort']) assert.ok(html.includes(w), w + ' fehlt in der Datenschutzerklärung');
});
