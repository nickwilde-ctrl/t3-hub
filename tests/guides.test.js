import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchGuides, guideForService, progress, usedGroups, nextStep } from '../js/logic/guides.js';
import { GUIDES, GUIDE_GROUPS } from '../js/data/guides.js';
import { ALL_SERVICES } from '../js/logic/services.js';

test('Suche findet über Titel, Material und Schritte, ohne Groß/Klein und Umlaute', () => {
  assert.equal(searchGuides(GUIDES, 'ölfilter')[0].id, 'oelwechsel');
  assert.equal(searchGuides(GUIDES, 'OELFILTER')[0].id, 'oelwechsel'); // oe = ö
  assert.equal(searchGuides(GUIDES, 'kerze fühlerlehre')[0].id, 'zuendkerzen');
  assert.equal(searchGuides(GUIDES, '').length, GUIDES.length);
  assert.equal(searchGuides(GUIDES, '', 'Zündung').length, 2);
  assert.equal(searchGuides(GUIDES, 'entlüften')[0].id, 'kuehlsystem');
});

test('jede Anleitung ist vollständig und gehört zu einem echten Wartungspunkt', () => {
  const keys = ALL_SERVICES.map((s) => s.key);
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
  assert.deepEqual(usedGroups(GUIDES, GUIDE_GROUPS), ['Check', 'Motor', 'Zündung', 'Kühlung', 'Kraftstoff', 'Getriebe', 'Bremsen', 'Fahrwerk']);
});

test('Werkstatt-Modus: nächster offener Schritt', () => {
  const g = { steps: [{}, {}, {}] };
  assert.equal(nextStep(g, []), 0);
  assert.equal(nextStep(g, [0, 2]), 1);
  assert.equal(nextStep(g, [0, 1, 2]), -1);
});

import { mergeGuides, copyGuide, lines, checkGuide } from '../js/logic/guides.js';

test('eigene Anleitungen: Kopie ersetzt Original, neue stehen vorne', () => {
  const built = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
  const own = [{ id: 'x', title: 'Meine', updatedAt: '2026-10-01' }, { id: 'y', title: 'B (meins)', basedOn: 'b' }];
  const m = mergeGuides(built, own);
  assert.deepEqual(m.map((g) => g.id), ['x', 'a', 'y']);
  assert.equal(m[2].own, true);
  assert.equal(m[1].own, undefined);
  // Kopie einer Anleitung, die es nicht mehr gibt, bleibt sichtbar
  assert.deepEqual(mergeGuides([], own).map((g) => g.id).sort(), ['x', 'y']);
});

test('Kopie übernimmt alles außer id und verweist aufs Original', () => {
  const g = GUIDES.find((x) => x.id === 'oelwechsel');
  const c = copyGuide(g);
  assert.equal(c.id, undefined);
  assert.equal(c.basedOn, 'oelwechsel');
  assert.equal(c.steps.length, g.steps.length);
  c.steps[0].t = 'geändert';
  assert.notEqual(g.steps[0].t, 'geändert', 'Original bleibt unverändert');
  assert.match(c.source, /Eigene Fassung/);
});

test('Zeilen und Prüfung', () => {
  assert.deepEqual(lines('- Nuss 19\n\n • Lappen \n'), ['Nuss 19', 'Lappen']);
  assert.match(checkGuide({ title: '', steps: [] }), /Titel/);
  assert.match(checkGuide({ title: 'X', steps: [] }), /Schritt/);
  assert.match(checkGuide({ title: 'X', steps: [{ t: '' }], minutes: 5 }), /Überschrift/);
  assert.equal(checkGuide({ title: 'X', steps: [{ t: 'a', d: '' }], minutes: 5 }), '');
});

import { fitsEngine, sortForEngine } from '../js/logic/guides.js';

test('Anleitungen passend zum Motor', () => {
  const plugs = GUIDES.find((g) => g.id === 'zuendkerzen');
  const rad = GUIDES.find((g) => g.id === 'radwechsel');
  assert.ok(fitsEngine(plugs, 'wbx21'));
  assert.ok(fitsEngine(plugs, null), 'unbekannter Motor: alles passt');
  assert.ok(!fitsEngine(plugs, 'diesel'), 'Diesel hat keine Zündkerzen');
  assert.ok(fitsEngine(GUIDES.find((g) => g.id === 'oelwechsel'), 'diesel'));
  assert.ok(fitsEngine(rad, 'diesel'), 'ohne Angabe passt sie für alle');
  const sorted = sortForEngine(GUIDES, 'diesel');
  const firstOther = sorted.findIndex((g) => !fitsEngine(g, 'diesel'));
  assert.ok(sorted.slice(firstOther).every((g) => !fitsEngine(g, 'diesel')));
  assert.equal(sorted.length, GUIDES.length);
});

import { valuesFor } from '../js/logic/guides.js';

test('Werte passend zum Kennbuchstaben', () => {
  const z = GUIDES.find((g) => g.id === 'zuendzeitpunkt');
  const mv = valuesFor(z, { code: 'mv' }).list.map((v) => v.k);
  assert.ok(mv.includes('MV, SS: Sollwert'));
  assert.ok(!mv.some((k) => k.startsWith('DF')));
  assert.ok(mv.includes('Öltemperatur'), 'allgemeine Werte bleiben');
  const df = valuesFor(z, { code: 'DF' }).list.map((v) => v.k);
  assert.ok(df.includes('DF: Sollwert') && !df.includes('MV, SS: Sollwert'));
  // nur Bauart bekannt: alle Werte dieser Bauart
  const fam19 = valuesFor(z, { familyCodes: ['DF', 'DG', 'DH', 'GW', 'EY', 'SP'] }).list.map((v) => v.k);
  assert.ok(fam19.includes('DF: Sollwert') && fam19.includes('GW: Sollwert') && !fam19.includes('MV, SS: Sollwert'));
  assert.equal(valuesFor(z).list.length, z.values.length);
  // Kennbuchstabe ohne eigene Werte → missing
  assert.equal(valuesFor(z, { code: 'SP' }).missing, true);
  assert.equal(valuesFor(z, { code: 'MV' }).missing, false);
  // Anleitung ohne motorabhängige Werte → nie missing
  assert.equal(valuesFor(GUIDES.find((g) => g.id === 'radwechsel'), { code: 'SP' }).missing, false);
});

test('Ölwechsel zeigt dem Diesel nur Diesel-Werte', () => {
  const oil = GUIDES.find((g) => g.id === 'oelwechsel');
  const jx = valuesFor(oil, { code: 'JX' }).list.map((v) => v.k);
  assert.ok(jx.includes('Ölmenge Diesel') && jx.includes('Ölsorte Turbodiesel (JX)') && jx.includes('Ölablassschraube Diesel'));
  assert.ok(!jx.includes('Ölmenge Wasserboxer') && !jx.includes('Ölsorte Saugdiesel (CS, KY)'));
  const mv = valuesFor(oil, { code: 'MV' }).list.map((v) => v.k);
  assert.ok(mv.includes('Ölmenge Wasserboxer') && !mv.includes('Ölmenge Diesel'));
});
