import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWiring, searchWires, colorName, wireStops, WIRING_FORMAT } from '../js/logic/wiring.js';
import { FAULTS } from '../js/data/faults.js';
import { checkBackup } from '../js/logic/backup.js';

// Ausgedachte Beispielkabel – echte Plandaten gehören nicht ins Repository.
const wires = [
  { c: 'sw/bl', mm: '1,5', from: 'Sicherung S19 (10 A)', to: 'Schalter, Klemme 15', what: 'Zündungsplus', tags: 'Blinker Klemme 15' },
  { c: 'ro/ws', mm: '2,5', from: 'Sicherung S1 (30 A)', via: 'T1i → T2', to: 'Thermoschalter', what: 'Plus Lüfter', tags: 'Lüfter' },
  { c: 'br', mm: '1,0', from: 'Sicherung S13', to: 'Massepunkt 30', what: 'Masse' },
];

test('Plandaten-Datei prüfen', () => {
  assert.equal(checkWiring({ format: WIRING_FORMAT, version: 1, wires }).ok, true);
  assert.equal(checkWiring({ format: 't3hub-backup' }).ok, false);
  assert.match(checkWiring({ format: WIRING_FORMAT, version: 9, wires }).error, /neueren Version/);
  assert.match(checkWiring({ format: WIRING_FORMAT, version: 1, wires: [] }).error, /keine Kabel/);
  assert.match(checkWiring({ format: WIRING_FORMAT, version: 1, wires: [{ c: 'ro' }] }).error, /beschädigt/);
});

test('Kabelsuche: alle Wörter, Umlaute, Farbnamen, Kürzel als ganzes Wort', () => {
  assert.equal(searchWires(wires, 'lüfter rot').length, 1);
  assert.equal(searchWires(wires, 'LUEFTER').length, 1);
  assert.equal(searchWires(wires, 'schwarz-blau').length, 1);
  assert.equal(searchWires(wires, 'S1').length, 1, 'S1 findet nicht S13 oder S19');
  assert.equal(searchWires(wires, 'S19')[0].mm, '1,5');
  assert.equal(searchWires(wires, '').length, 0);
});

test('Farbnamen und Weg eines Kabels', () => {
  assert.equal(colorName('ro/sw'), 'rot-schwarz');
  assert.deepEqual(wireStops(wires[1]), ['Sicherung S1 (30 A)', 'T1i', 'T2', 'Thermoschalter']);
});

test('Fehlersuche: eindeutige IDs, mindestens drei Schritte mit Text', () => {
  assert.equal(new Set(FAULTS.map((f) => f.id)).size, FAULTS.length);
  for (const f of FAULTS) {
    assert.ok(f.steps.length >= 3, f.id);
    for (const s of f.steps) assert.ok(s.t && s.d, f.id);
  }
});

test('Backups mit und ohne Plandaten bleiben gültig', () => {
  const base = { format: 't3hub-backup', version: 1, exportedAt: '2026-10-26T00:00:00Z', vehicles: [{ id: 'v' }], fuels: [], services: [], log: [], tours: [] };
  assert.equal(checkBackup(base).ok, true);
  const r = checkBackup({ ...base, wiring: [{ id: 'w', vehicleId: 'v', wires }] });
  assert.equal(r.ok, true);
  assert.equal(r.counts.wiring, 1);
});
