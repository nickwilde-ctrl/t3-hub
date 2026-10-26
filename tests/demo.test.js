import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoData } from '../js/logic/demo.js';
import { fuelStats } from '../js/logic/fuel.js';

test('Beispielbus: plausible Daten', () => {
  const d = demoData('2026-10-26');
  assert.equal(d.vehicle.demo, true);
  const kms = d.fuels.map((f) => f.km);
  assert.deepEqual(kms, [...kms].sort((a, b) => a - b), 'Kilometer steigen');
  const dates = d.fuels.map((f) => f.date);
  assert.deepEqual(dates, [...dates].sort(), 'Daten steigen');
  assert.ok(dates.every((x) => x <= '2026-10-26'), 'nichts in der Zukunft');
  const avg = fuelStats(d.fuels.map((f, i) => ({ ...f, id: 'f' + i }))).avgConsumption;
  assert.ok(avg > 11 && avg < 16, 'Verbrauch wie ein T3: ' + avg);
  assert.ok(d.tours[0].endKm > d.tours[0].startKm);
});
