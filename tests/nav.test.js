import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNav, sameNav, navFromHash } from '../js/logic/nav.js';

const TABS = ['home', 'wartung', 'tanken', 'touren', 'mehr'];

test('Navigation: ungültige Werte werden zu Home und Standard-Unterseiten', () => {
  assert.deepEqual(normalizeNav(null, TABS), { tab: 'home', wsub: 'intervalle', msub: '', tour: null });
  assert.deepEqual(normalizeNav({ tab: 'x', wsub: 'y', msub: 'z', tour: 5 }, TABS), { tab: 'home', wsub: 'intervalle', msub: '', tour: null });
  assert.deepEqual(normalizeNav({ tab: 'wartung', wsub: 'alle' }, TABS), { tab: 'wartung', wsub: 'alle', msub: '', tour: null });
  assert.equal(normalizeNav({ tab: 'mehr', msub: 'elektrik' }, TABS).msub, 'elektrik');
});

test('Navigation: eine offene Tour gibt es nur im Reiter Touren', () => {
  assert.equal(normalizeNav({ tab: 'touren', tour: 'abc' }, TABS).tour, 'abc');
  assert.equal(normalizeNav({ tab: 'tanken', tour: 'abc' }, TABS).tour, null);
});

test('Navigation: gleiche Seite erkennen und Adresse lesen', () => {
  assert.equal(sameNav({ tab: 'wartung' }, { tab: 'wartung', wsub: 'intervalle', layer: 1 }, TABS), true);
  assert.equal(sameNav({ tab: 'wartung', wsub: 'alle' }, { tab: 'wartung' }, TABS), false);
  assert.equal(sameNav({ tab: 'touren', tour: 'a' }, { tab: 'touren' }, TABS), false);
  assert.equal(navFromHash('#tanken', TABS).tab, 'tanken');
  assert.equal(navFromHash('', TABS).tab, 'home');
  assert.equal(navFromHash('#quatsch', TABS).tab, 'home');
});
