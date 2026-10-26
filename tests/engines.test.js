import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineLabel } from '../js/data/engines.js';

test('engineLabel: Bauart und Kennbuchstaben', () => {
  assert.equal(engineLabel({ engineFamily: 'wbx21', engineCode: 'mv', engine: 'alt' }), 'Wasserboxer 2,1 l · MV');
});

test('engineLabel: Bauart aus Kennbuchstaben abgeleitet', () => {
  assert.equal(engineLabel({ engineCode: 'DG' }), 'Wasserboxer 1,9 l · DG');
});

test('engineLabel: alter Freitext nur, wenn nichts gewählt', () => {
  assert.equal(engineLabel({ engine: '2,1 l WBX' }), '2,1 l WBX');
  assert.equal(engineLabel({}), '');
});
