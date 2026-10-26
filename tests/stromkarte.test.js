import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMap, wireWidth, pairIndex, wirePath, inArea, visibleIn, fitBox, searchMap } from '../js/logic/stromkarte.js';
import { checkWiring, WIRING_FORMAT } from '../js/logic/wiring.js';

// Ausgedachte Mini-Karte – echte Plandaten gehören nicht ins Repository.
const map = {
  nodes: [{ id: 'a', code: 'S1', name: 'Sicherung', x: 0, y: 0 }, { id: 'b', code: 'L', name: 'Lampe vorn', x: 100, y: 0 }, { id: 'm', code: '30', name: 'Masse', x: 100, y: 100, k: 'ground' }],
  wires: [
    { c: 'ro', mm: '1,5', kl: '30', pts: ['a', 'b'], a: 'S1', b: 'Lampe', what: 'Plus', sys: ['licht'] },
    { c: 'br', mm: '1,0', kl: '31', pts: ['b', 'm'], a: 'Lampe', b: 'Masse', what: 'Masse', sys: ['licht', 'innen'] },
    { c: 'ro', mm: '1,5', kl: '30', pts: ['b', 'a'], a: 'Lampe', b: 'S1', what: 'zweites Kabel', sys: ['innen'] },
  ],
};

test('Kartendaten prüfen', () => {
  assert.equal(checkMap(map), true);
  assert.equal(checkMap({ nodes: [], wires: [{ pts: ['x', 'y'] }] }), false);
  assert.equal(checkMap(null), false);
  const file = { format: WIRING_FORMAT, version: 1, wires: [{ c: 'ro', from: 'a', to: 'b' }] };
  assert.equal(checkWiring({ ...file, map }).counts.map, true);
  assert.match(checkWiring({ ...file, map: { nodes: 1 } }).error, /Stromkarte/);
  assert.equal(checkWiring(file).ok, true, 'Plandaten ohne Karte bleiben gültig');
});

test('Linien: Stärke, parallele Kabel, Pfad', () => {
  assert.equal(wireWidth('–'), 5);
  assert.ok(wireWidth('70,0') <= 14 && wireWidth('0,5') >= 4);
  assert.deepEqual(pairIndex(map.wires), [0, 0, 1], 'a–b und b–a zählen als dasselbe Paar');
  assert.match(wirePath([{ x: 0, y: 0 }, { x: 100, y: 0 }], 0), /^M 0 0 Q 50 12 100 0$/);
});

test('Bereiche zeigen nur ihre Kabel und Bauteile', () => {
  assert.equal(inArea(map.wires[0], 'alle'), true);
  assert.equal(inArea(map.wires[0], 'innen'), false);
  const v = visibleIn(map, 'innen');
  assert.deepEqual([...v.wires], [1, 2]);
  assert.deepEqual([...v.nodes].sort(), ['a', 'b', 'm']);
  assert.equal(visibleIn(map, 'licht').wires.size, 2);
});

test('Ausschnitt hat das gewünschte Seitenverhältnis', () => {
  const b = fitBox(map.nodes, 2, 50);
  assert.equal(Math.round(b.w / b.h), 2);
  assert.ok(b.x <= -50 && b.x + b.w >= 150);
  assert.equal(fitBox([]), null);
});

test('Suche im Bereich', () => {
  assert.deepEqual(searchMap(map, 'Lampe', 'alle').nodes, ['b']);
  assert.deepEqual(searchMap(map, 'zweites', 'licht').wires, [], 'Kabel aus anderem Bereich wird nicht gefunden');
  assert.deepEqual(searchMap(map, 'zweites', 'innen').wires, [2]);
  assert.deepEqual(searchMap(map, 'S1', 'alle').nodes, ['a']);
});
