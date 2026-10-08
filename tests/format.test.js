import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eurExact } from '../js/format.js';

test('Einzelbeträge mit Cent, volle Euro ohne Komma', () => {
  assert.equal(eurExact(89.9), '89,90 €');
  assert.equal(eurExact(120), '120 €');
  assert.equal(eurExact(1234.5), '1.234,50 €');
  assert.equal(eurExact(0.99), '0,99 €');
});
