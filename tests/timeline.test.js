import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeline, timelineByYear } from '../js/logic/timeline.js';

const data = {
  fuels: [{ id: 'f1', date: '2026-05-01', km: 1000, liters: 50, pricePerLiter: 2, full: true }, { id: 'f2', date: '2026-06-10', km: 1500, liters: 40, pricePerLiter: 1.5, full: false }],
  log: [{ id: 'l1', date: '2026-06-10', km: 1400, title: 'Ölwechsel', category: 'Wartung', cost: 58.4 }, { id: 'l2', date: '2025-12-01', km: 500, title: 'HU', cost: null }],
  tours: [{ id: 't1', name: 'Ostsee', from: '2026-05-20', to: '2026-05-25' }],
};

test('Chronik mischt alle Bereiche, neueste zuerst', () => {
  assert.deepEqual(timeline(data).map((x) => x.id), ['f2', 'l1', 't1', 'f1', 'l2']);
});

test('gleicher Tag: höherer Kilometerstand steht oben', () => {
  const t = timeline(data);
  assert.equal(t[0].id, 'f2');
  assert.equal(t[1].id, 'l1');
});

test('Beträge: Tankung = Liter × Preis, Eintrag = Kosten, Tour ohne Betrag', () => {
  const by = Object.fromEntries(timeline(data).map((x) => [x.id, x.amount]));
  assert.equal(by.f1, 100);
  assert.equal(by.l1, 58.4);
  assert.equal(by.l2, null);
  assert.equal(by.t1, null);
});

test('leere und fehlende Listen ergeben eine leere Chronik', () => {
  assert.deepEqual(timeline({}), []);
  assert.deepEqual(timeline({ fuels: [], log: [], tours: [] }), []);
});

test('Einträge ohne Datum werden übersprungen statt die Sortierung zu stören', () => {
  assert.deepEqual(timeline({ log: [{ id: 'x', title: 'ohne Datum' }, { id: 'y', date: '2026-01-01', title: 'mit' }] }).map((x) => x.id), ['y']);
});

test('Gruppierung nach Jahr', () => {
  const y = timelineByYear(timeline(data));
  assert.deepEqual(y.map((g) => [g.year, g.items.length]), [['2026', 4], ['2025', 1]]);
});

test('die Chronik verändert die Ausgangsdaten nicht', () => {
  const before = JSON.stringify(data);
  timeline(data);
  assert.equal(JSON.stringify(data), before);
});

test('Startseite: je Bereich nur das Neueste, neueste zuerst', async () => {
  const { latestPerType } = await import('../js/logic/timeline.js');
  assert.deepEqual(latestPerType(timeline(data)).map((x) => x.id), ['f2', 'l1', 't1']);
  assert.deepEqual(latestPerType(timeline({ fuels: data.fuels })).map((x) => x.id), ['f2']);
  assert.deepEqual(latestPerType([]), []);
});
