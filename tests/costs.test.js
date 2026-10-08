import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tourStats, fuelsInTour, runningTour, costsByCategory, costYears } from '../js/logic/costs.js';

const fuels = [
  { id: 'a', date: '2026-03-14', km: 3800, liters: 40, pricePerLiter: 2, full: true },
  { id: 'b', date: '2026-03-17', km: 4587, liters: 50, pricePerLiter: 2, full: true, tourId: 't1' },
  { id: 'c', date: '2026-03-20', km: 4864, liters: 30, pricePerLiter: 2, full: true, tourId: 't1' },
];

test('Tour-Kennzahlen', () => {
  const t = { id: 't1', from: '2026-03-15', to: '2026-03-22', startKm: 3831, endKm: 5538, otherCost: 140 };
  const s = tourStats(t, fuels, 6000);
  assert.equal(s.km, 1707);
  assert.equal(s.days, 8);
  assert.equal(s.fuelCost, 160);
  assert.equal(s.total, 300);
  assert.equal(s.running, false);
});

test('laufende Tour nutzt aktuellen Kilometerstand', () => {
  const s = tourStats({ id: 'x', from: '2026-10-01', startKm: 14000, endKm: null, otherCost: 0 }, [], 14302, new Date('2026-10-03T12:00:00'));
  assert.equal(s.km, 302);
  assert.equal(s.running, true);
  assert.equal(s.days, 3);
});

test('Tankungen im Zeitraum finden', () => {
  const ids = fuelsInTour({ from: '2026-03-15', to: '2026-03-22', startKm: 3831, endKm: 5538 }, fuels).map((f) => f.id);
  assert.deepEqual(ids, ['b', 'c']);
});

test('laufende Tour erkennen', () => {
  const tours = [{ id: 1, from: '2026-03-15', endKm: 5000 }, { id: 2, from: '2026-10-01', endKm: null }, { id: 3, from: '2026-12-01', endKm: null }];
  assert.equal(runningTour(tours, '2026-10-07').id, 2);
});

test('Kosten nach Art und Jahr', () => {
  const log = [{ date: '2026-06-02', category: 'Reparatur', cost: 48 }, { date: '2025-12-01', category: 'Wartung', cost: 62 }];
  const tours = [{ from: '2026-03-15', otherCost: 140 }];
  const all = costsByCategory({ fuels, log, tours });
  assert.equal(all.total, 240 + 48 + 62 + 140);
  const y25 = costsByCategory({ fuels, log, tours }, '2025');
  assert.equal(y25.total, 62);
  assert.deepEqual(costYears({ fuels, log, tours }), ['2026', '2025']);
});

import { tripOtherCost, tripCostsByCategory, compareTours } from '../js/logic/costs.js';

test('Reisekosten: Pauschal plus einzelne Ausgaben', () => {
  const t = { id: 't1', from: '2026-03-15', to: '2026-03-22', startKm: 3831, endKm: 5538, otherCost: 40,
    expenses: [{ category: 'Fähre', amount: 120 }, { category: 'Camping / Stellplatz', amount: 25 }, { category: 'Camping / Stellplatz', amount: 30 }] };
  assert.equal(tripOtherCost(t), 215);
  assert.deepEqual(tripCostsByCategory(t, 160), [['Kraftstoff', 160], ['Fähre', 120], ['Camping / Stellplatz', 55], ['Pauschal', 40]]);
  const s = tourStats(t, fuels, 6000);
  assert.equal(s.total, 160 + 215);
  assert.equal(s.perDay, 375 / 8);
  assert.equal(costsByCategory({ fuels: [], log: [], tours: [t] }).byCategory.Reise, 215);
});

test('laufende Tour zählt Tage bis heute', () => {
  const s = tourStats({ id: 'x', from: '2026-10-01', startKm: 14000, endKm: null }, [], 14302, new Date('2026-10-08T12:00:00'));
  assert.equal(s.days, 8);
});

test('Touren-Vergleich nur mit abgeschlossenen Touren', () => {
  const tours = [{ id: 't1', from: '2026-03-15', to: '2026-03-22', startKm: 3831, endKm: 5538 }, { id: 'x', from: '2026-10-01', startKm: 14000, endKm: null }];
  const c = compareTours(tours, fuels, 14302);
  assert.equal(c.length, 1);
  assert.equal(c[0].km, 1707);
});
