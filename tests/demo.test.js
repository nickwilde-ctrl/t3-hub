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

test('Beispielbus: die Tour liegt zwischen ihren Tankungen und bekommt sie zugeordnet', () => {
  const d = demoData('2026-10-27');
  const tour = d.tours[0];
  const inTour = d.fuels.filter((f) => f.date >= tour.from && f.date <= tour.to);
  assert.ok(inTour.length >= 1);
  const before = d.fuels.filter((f) => f.date < tour.from).pop();
  const after = d.fuels.find((f) => f.date > tour.to);
  assert.ok(tour.startKm > before.km && tour.endKm < after.km);
});
