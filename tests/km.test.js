import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkKm, checkEntryKm } from '../js/logic/km.js';

test('Kilometerstand prüfen', () => {
  assert.deepEqual(checkKm('142.500', 142380), { km: 142500 });
  assert.equal(checkKm(142380, 142380).km, 142380, 'gleicher Stand ist in Ordnung');
  assert.match(checkKm('', 100).error, /eintragen/);
  assert.match(checkKm('140000', 142380).error, /niedriger/);
  assert.equal(checkKm('170000', 142380).warnings.length, 1);
  assert.equal(checkKm('170000', 0).warnings, undefined, 'erster Eintrag ohne Rückfrage');
  assert.match(checkKm('9999999', 0).error, /Tippfehler/);
});

test('Kilometer im Serviceheft: Sprung und „heute, aber niedriger“ fragen nach, alte Einträge nicht', () => {
  const ctx = { current: 142380, date: '2026-10-29', today: '2026-10-29' };
  assert.deepEqual(checkEntryKm('', ctx), {}, 'leer ist erlaubt');
  assert.deepEqual(checkEntryKm('142.500', ctx), {});
  assert.deepEqual(checkEntryKm('142380', ctx), {}, 'gleicher Stand');
  assert.equal(checkEntryKm('1.423.800', ctx).error, undefined);
  assert.equal(checkEntryKm('1423800', ctx).warnings.length, 1, 'riesiger Sprung');
  assert.equal(checkEntryKm('200000', ctx).warnings.length, 1);
  assert.equal(checkEntryKm('141000', ctx).warnings.length, 1, 'heute, aber niedriger');
  assert.equal(checkEntryKm('141000', { ...ctx, date: '2026-10-25' }).warnings.length, 1, 'vor 4 Tagen');
  assert.deepEqual(checkEntryKm('141000', { ...ctx, date: '2026-09-01' }), {}, 'alter Eintrag darf niedriger sein');
  assert.deepEqual(checkEntryKm('141000', { ...ctx, edit: true }), {}, 'beim Ändern kein „zu niedrig“');
  assert.equal(checkEntryKm('1423800', { ...ctx, edit: true }).warnings.length, 1, 'Sprung auch beim Ändern');
  assert.deepEqual(checkEntryKm('50000', { current: 0, date: '2026-10-29', today: '2026-10-29' }), {}, 'erster Stand ohne Rückfrage');
  assert.match(checkEntryKm('9999999', ctx).error, /Tippfehler/);
  assert.deepEqual(checkEntryKm('abc', ctx), {}, 'ungültige Zahl prüfen die Formulare selbst');
});
