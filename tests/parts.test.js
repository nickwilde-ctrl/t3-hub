import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partsTotal } from '../js/views/parts.js';

test('Teilesumme: Menge × Preis, Teile ohne Preis zählen nicht', () => {
  assert.equal(partsTotal([{ price: 8.26, qty: 2 }, { price: null, qty: 1 }, { price: 3.5 }]), 8.26 * 2 + 3.5);
  assert.equal(partsTotal([]), 0);
});
