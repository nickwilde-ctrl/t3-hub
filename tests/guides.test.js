import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchGuides, guideForService, progress, usedGroups, nextStep } from '../js/logic/guides.js';
import { GUIDES, GUIDE_GROUPS } from '../js/data/guides.js';
import { DEFAULT_SERVICES } from '../js/logic/services.js';

test('Suche findet über Titel, Material und Schritte, ohne Groß/Klein und Umlaute', () => {
  assert.equal(searchGuides(GUIDES, 'ölfilter')[0].id, 'oelwechsel');
  assert.equal(searchGuides(GUIDES, 'OELFILTER')[0].id, 'oelwechsel'); // oe = ö
  assert.equal(searchGuides(GUIDES, 'kerze fühlerlehre')[0].id, 'zuendkerzen');
  assert.equal(searchGuides(GUIDES, '').length, GUIDES.length);
  assert.equal(searchGuides(GUIDES, '', 'Zündung').length, 2);
  assert.equal(searchGuides(GUIDES, 'entlüften')[0].id, 'kuehlsystem');
});

test('jede Anleitung ist vollständig und gehört zu einem echten Wartungspunkt', () => {
  const keys = DEFAULT_SERVICES.map((s) => s.key);
  for (const g of GUIDES) {
    assert.ok(g.id && g.title && g.steps.length >= 3, g.id);
    assert.ok(GUIDE_GROUPS.includes(g.group), g.id + ' Baugruppe');
    if (g.serviceKey) assert.ok(keys.includes(g.serviceKey), g.id + ' serviceKey');
    for (const s of g.steps) assert.ok(s.t && s.d, g.id + ' Schritt');
  }
  assert.equal(new Set(GUIDES.map((g) => g.id)).size, GUIDES.length, 'IDs eindeutig');
});

test('Anleitung zum Wartungspunkt', () => {
  assert.equal(guideForService(GUIDES, 'oil').id, 'oelwechsel');
  assert.equal(guideForService(GUIDES, 'hu'), null);
});

test('Fortschritt', () => {
  const g = { steps: [{}, {}, {}] };
  assert.deepEqual(progress(g, [0, 2]), { done: 2, total: 3, complete: false });
  assert.equal(progress(g, [0, 1, 2]).complete, true);
  assert.equal(progress(g, [5]).done, 0);
});

test('verwendete Baugruppen in fester Reihenfolge', () => {
  assert.deepEqual(usedGroups(GUIDES, GUIDE_GROUPS), ['Check', 'Motor', 'Zündung', 'Kühlung', 'Getriebe', 'Bremsen', 'Fahrwerk']);
});

test('Werkstatt-Modus: nächster offener Schritt', () => {
  const g = { steps: [{}, {}, {}] };
  assert.equal(nextStep(g, []), 0);
  assert.equal(nextStep(g, [0, 2]), 1);
  assert.equal(nextStep(g, [0, 1, 2]), -1);
});
