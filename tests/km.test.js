import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkKm } from '../js/logic/km.js';

test('Kilometerstand prüfen', () => {
  assert.deepEqual(checkKm('142.500', 142380), { km: 142500 });
  assert.equal(checkKm(142380, 142380).km, 142380, 'gleicher Stand ist in Ordnung');
  assert.match(checkKm('', 100).error, /eintragen/);
  assert.match(checkKm('140000', 142380).error, /niedriger/);
  assert.equal(checkKm('170000', 142380).warnings.length, 1);
  assert.equal(checkKm('170000', 0).warnings, undefined, 'erster Eintrag ohne Rückfrage');
  assert.match(checkKm('9999999', 0).error, /Tippfehler/);
});
