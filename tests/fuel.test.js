import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withConsumption, fuelStats, consumptionByMonth } from '../js/logic/fuel.js';
import { serviceStatus } from '../js/logic/services.js';

const f = (date, km, liters, pricePerLiter, full = true) => ({ date, km, liters, pricePerLiter, full });

test('erste Volltankung ist nur Startwert', () => {
  const r = withConsumption([f('2025-10-14', 0, 60, 1.699)]);
  assert.equal(r[0].cons, null);
});

test('Verbrauch zwischen zwei Volltankungen', () => {
  const r = withConsumption([f('2025-11-12', 249, 51.51, 1.709), f('2025-10-14', 0, 60, 1.699)]);
  // Road Trip zeigt hier 20,6867
  assert.equal(r[1].cons.toFixed(4), '20.6867');
});

test('Teiltankungen zählen zur nächsten Volltankung (Werte aus Road Trip)', () => {
  const r = withConsumption([
    f('2025-11-12', 249, 51.51, 1.709),
    f('2025-11-19', 559, 10, 1.689, false),
    f('2025-11-24', 581, 47.16, 1.669),
  ]);
  assert.equal(r[1].cons, null);
  assert.equal(r[2].cons.toFixed(4), '17.2169');
  assert.equal(r[2].segKm, 332);
});

test('Gesamtwerte', () => {
  const s = fuelStats([f('2025-10-14', 0, 60, 1.5), f('2025-11-01', 400, 50, 2.0)]);
  assert.equal(s.km, 400);
  assert.equal(s.totalLiters, 110);
  assert.equal(s.totalCost, 190);
  assert.equal(s.avgConsumption, 12.5);
  assert.equal(s.costPer100, 25);
  assert.equal(s.cheapest.pricePerLiter, 1.5);
});

test('Verbrauch je Monat gewichtet nach Kilometern', () => {
  const m = consumptionByMonth([f('2026-01-01', 0, 50, 2), f('2026-01-10', 100, 10, 2), f('2026-01-20', 400, 30, 2)]);
  assert.equal(m.length, 1);
  assert.equal(m[0].consumption, 10); // 40 l auf 400 km
});

test('Wartung: unbekannt, ok, bald, fällig', () => {
  const today = new Date('2026-10-07T12:00:00');
  assert.equal(serviceStatus({ intervalKm: 7500, intervalMonths: 12, lastKm: null, lastDate: null }, 14000, today).state, 'unknown');
  assert.equal(serviceStatus({ intervalKm: 7500, intervalMonths: 12, lastKm: 10000, lastDate: '2026-05-01' }, 14000, today).state, 'ok');
  assert.equal(serviceStatus({ intervalKm: 7500, intervalMonths: 12, lastKm: 7000, lastDate: '2026-05-01' }, 14000, today).state, 'soon');
  assert.equal(serviceStatus({ intervalKm: null, intervalMonths: 24, lastKm: null, lastDate: '2024-09-20' }, 14000, today).state, 'over');
});
