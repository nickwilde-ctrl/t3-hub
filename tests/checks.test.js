import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fuelWarnings } from '../js/logic/checks.js';

const today = new Date('2026-10-08T12:00:00');
const f = (id, date, km, liters, pricePerLiter, full = true) => ({ id, date, km, liters, pricePerLiter, full });
const base = [
  f('a', '2026-09-01', 10000, 50, 2.0),
  f('b', '2026-09-08', 10400, 45, 2.05),
  f('c', '2026-09-15', 10800, 46, 1.98),
  f('d', '2026-09-22', 11200, 44, 2.02),
];
const codes = (e, fuels = base, opts = {}) => fuelWarnings(e, fuels, { today, ...opts }).map((w) => w.code);

test('normale Tankung: keine Warnung', () => {
  assert.deepEqual(codes(f(null, '2026-10-01', 11600, 45, 2.0)), []);
});

test('Datum in der Zukunft', () => {
  assert.ok(codes(f(null, '2026-12-01', 11600, 45, 2.0)).includes('future'));
});

test('Kilometerstand kleiner als vorher oder größer als später', () => {
  assert.ok(codes(f(null, '2026-10-01', 11100, 45, 2.0)).includes('km-lower'));
  assert.ok(codes(f(null, '2026-09-10', 11000, 45, 2.0)).includes('km-higher'));
});

test('zu viele Kilometer seit der letzten Tankung', () => {
  assert.ok(codes(f(null, '2026-10-01', 12300, 45, 2.0)).includes('km-gap'));
});

test('mehr Liter als der Tank fasst', () => {
  assert.ok(codes(f(null, '2026-10-01', 11600, 75, 2.0)).includes('liters'));
  assert.ok(!codes(f(null, '2026-10-01', 11600, 75, 2.0), base, { tankLiters: 80 }).includes('liters'));
});

test('Literpreis-Tippfehler (1,349 statt 2,049)', () => {
  assert.ok(codes(f(null, '2026-10-01', 11600, 45, 1.349)).includes('price'));
});

test('unrealistischer Verbrauch bei Volltankung', () => {
  // 10 l auf 400 km = 2,5 l/100 km
  assert.ok(codes(f(null, '2026-10-01', 11600, 10, 2.0)).includes('cons'));
  // als Teiltankung kein Verbrauchshinweis
  assert.ok(!codes(f(null, '2026-10-01', 11600, 10, 2.0, false)).includes('cons'));
});

test('beim Bearbeiten zählt die Tankung nicht gegen sich selbst', () => {
  assert.deepEqual(codes({ ...base[3] }), []);
});
