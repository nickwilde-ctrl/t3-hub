import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eurExact, plural } from '../js/format.js';

test('Einzelbeträge mit Cent, volle Euro ohne Komma', () => {
  assert.equal(eurExact(89.9), '89,90 €');
  assert.equal(eurExact(120), '120 €');
  assert.equal(eurExact(1234.5), '1.234,50 €');
  assert.equal(eurExact(0.99), '0,99 €');
});

test('plural: Einzahl bei 1, sonst Mehrzahl', () => {
  assert.equal(plural(1, 'Tankung', 'Tankungen'), '1 Tankung');
  assert.equal(plural(0, 'Tankung', 'Tankungen'), '0 Tankungen');
  assert.equal(plural(12, 'Tankung', 'Tankungen'), '12 Tankungen');
  assert.equal(plural(1500, 'Eintrag', 'Einträge'), '1.500 Einträge');
});
