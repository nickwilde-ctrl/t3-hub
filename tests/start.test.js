import { test } from 'node:test';
import assert from 'node:assert/strict';
import { experienceOf, startSteps, showStart, unknownServices } from '../js/logic/start.js';

const svc = (key, lastDate = null, lastKm = null) => ({ key, name: key, intervalKm: key === 'hu' ? null : 10000, intervalMonths: 24, lastDate, lastKm });

test('Erfahrung: ohne Angabe gilt neu', () => {
  assert.equal(experienceOf({}), 'neu');
  assert.equal(experienceOf({ experience: 'erfahren' }), 'erfahren');
  assert.equal(experienceOf(null), 'neu');
});

test('Schritte werden mit eingetragenen Daten erledigt', () => {
  const list = [svc('hu'), svc('oil'), svc('plugs')];
  assert.deepEqual(startSteps(list, 0).map((s) => s.done), [false, false, false, false]);
  const later = [svc('hu', '2026-05-01'), svc('oil', '2026-08-01', 140000), svc('plugs')];
  assert.deepEqual(startSteps(later, 141000).map((s) => s.done), [true, true, true, false]);
  assert.equal(unknownServices(later, 141000).length, 1);
});

test('Karte nur, wenn etwas offen ist und nicht beim Beispielbus', () => {
  const open = [svc('hu')];
  assert.equal(showStart({ name: 'Bus' }, open, 0), true);
  assert.equal(showStart({ demo: true }, open, 0), false);
  assert.equal(showStart({ startHidden: true }, open, 0), false);
  assert.equal(showStart({ name: 'Bus' }, [svc('hu', '2026-01-01')], 5000), false);
});
