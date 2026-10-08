import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withConsumption, fuelStats, consumptionByMonth, consumptionCheck } from '../js/logic/fuel.js';
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

import { completeFill, parseNumber } from '../js/logic/fuel.js';

test('Zapfsäulen-Rechner: zwei von drei Werten reichen', () => {
  assert.deepEqual(completeFill({ liters: 51.51, pricePerLiter: 1.709, total: NaN }), { liters: 51.51, pricePerLiter: 1.709, total: 88.03 });
  assert.deepEqual(completeFill({ liters: 51.51, pricePerLiter: NaN, total: 88.03 }), { liters: 51.51, pricePerLiter: 1.709, total: 88.03 });
  assert.deepEqual(completeFill({ liters: NaN, pricePerLiter: 1.709, total: 88.03 }), { liters: 51.51, pricePerLiter: 1.709, total: 88.03 });
  assert.equal(completeFill({ liters: 40, pricePerLiter: NaN, total: NaN }), null);
});

test('deutsche Zahleneingaben', () => {
  assert.equal(parseNumber('48,30'), 48.3);
  assert.equal(parseNumber('1,729'), 1.729);
  assert.equal(parseNumber('14.302', 'km'), 14302);
  assert.equal(parseNumber('14302', 'km'), 14302);
  assert.equal(parseNumber('1.234,5'), 1234.5);
  assert.equal(parseNumber('1.729'), 1.729);
  assert.ok(Number.isNaN(parseNumber('')));
});

import { upgradeServices, withLastDone, DEFAULT_SERVICES } from '../js/logic/services.js';

test('Wartung: alte Platzhalter werden aktualisiert, eigene Werte bleiben', () => {
  const services = [
    { key: 'oil', name: 'Ölwechsel + Ölfilter', intervalKm: 7500, intervalMonths: 12, lastKm: 100, lastDate: '2026-01-01' },
    { key: 'plugs', name: 'Zündkerzen', intervalKm: 20000, intervalMonths: null },
  ];
  const changed = upgradeServices(services);
  const oil = changed.find((c) => c.key === 'oil');
  assert.equal(oil.intervalKm, 5500);
  assert.equal(oil.lastKm, 100);
  assert.equal(changed.find((c) => c.key === 'plugs'), undefined);
  assert.equal(changed.filter((c) => !c.id && c.key !== 'oil').length, DEFAULT_SERVICES.length - 2);
});

test('Wartung: letzter Serviceheft-Eintrag zählt, sonst Handeingabe', () => {
  const s = { key: 'oil', intervalKm: 5500, lastKm: 1000, lastDate: '2026-01-01' };
  assert.equal(withLastDone(s, []).lastKm, 1000);
  const log = [{ serviceKey: 'oil', date: '2026-05-01', km: 6000 }, { serviceKey: 'oil', date: '2026-03-01', km: 3000 }, { serviceKey: 'plugs', date: '2026-09-01', km: 9000 }];
  assert.equal(withLastDone(s, log).lastKm, 6000);
  assert.equal(withLastDone({ ...s, lastDate: '2026-06-01', lastKm: 7000 }, log).lastKm, 7000);
});

const tank = (km, liters, full = true) => ({ date: '2026-01-01', km, liters, pricePerLiter: 2, full });
// Abschnitte à 400 km mit 52 l = 13 l/100 km
const normal = [tank(1000, 40), tank(1400, 52), tank(1800, 52), tank(2200, 52)];

test('Verbrauchs-Lampe: zu wenig Daten → keine Bewertung', () => {
  assert.equal(consumptionCheck(normal).state, 'none');
});

test('Verbrauchs-Lampe: letzte Tankung im üblichen Bereich → ok', () => {
  const r = consumptionCheck([...normal, tank(2600, 58)]); // 14,5 → +11,5 %
  assert.equal(r.state, 'ok');
  assert.ok(Math.abs(r.base - 13) < 1e-9);
});

test('Verbrauchs-Lampe: deutlich über dem eigenen Schnitt → hoch', () => {
  assert.equal(consumptionCheck([...normal, tank(2600, 64)]).state, 'high'); // 16 → +23 %
});

test('Verbrauchs-Lampe: sparsamer als sonst ist ok', () => {
  assert.equal(consumptionCheck([...normal, tank(2600, 40)]).state, 'ok');
});
