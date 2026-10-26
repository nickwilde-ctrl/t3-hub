import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specsFor, SPECS, SOURCE_NAMES } from '../js/data/specs.js';
import { ENGINE_FAMILIES } from '../js/data/engines.js';

test('Datenblatt je Kennbuchstabe', () => {
  const mv = specsFor('mv', 'wbx21');
  assert.equal(mv.code, 'MV');
  const k = (s) => s.rows.map((r) => r[0]);
  assert.ok(k(mv).includes('Leerlauf') && k(mv).includes('Kompression') && k(mv).includes('Ölmenge'));
  assert.ok(specsFor('JX').rows.some((r) => r[1].includes('5100')));
  assert.ok(specsFor('JX').rows.some((r) => r[0] === 'Ventilspiel (warm)'), 'Diesel-Grundwerte auch ohne Bauart');
  assert.equal(specsFor('', 'wbx19').code, '');
  assert.equal(specsFor('', 'luft'), null);
  assert.equal(specsFor('', ''), null);
});

test('jeder Wasserboxer- und Diesel-Kennbuchstabe hat ein Datenblatt, jede Quelle einen Namen', () => {
  for (const f of ENGINE_FAMILIES.filter((x) => x.id !== 'luft')) for (const c of f.codes) assert.ok(SPECS[c], c);
  for (const s of Object.values(SPECS)) for (const r of s.rows) assert.ok(SOURCE_NAMES[r[2]], r[0]);
});
