import { test } from 'node:test';
import assert from 'node:assert/strict';

test('alter Hinweistext wird aktualisiert, eigenes Intervall bleibt', async () => {
  const { upgradeServices, DEFAULT_SERVICES } = await import('../js/logic/services.js');
  const all = DEFAULT_SERVICES.map((d) => ({ ...d }));
  const oil = all.find((x) => x.key === 'oil');
  oil.intervalKm = 5000; oil.hint = '4,5 l, Norm VW 500 00 / 501 01 / 502 00.';
  const ch = upgradeServices(all);
  assert.equal(ch.length, 1);
  assert.equal(ch[0].intervalKm, 5000);
  assert.match(ch[0].hint, /Longlife/);
});

test('Wartungspunkte passend zur Motor-Bauart', async () => {
  const { servicesFor, upgradeServices, DEFAULT_SERVICES } = await import('../js/logic/services.js');
  const keys = (l) => l.map((x) => x.key);
  assert.ok(!keys(servicesFor('diesel')).includes('plugs'));
  assert.ok(!keys(servicesFor('diesel')).includes('ignition'));
  assert.ok(!keys(servicesFor('luft')).includes('coolant'));
  assert.equal(servicesFor('wbx21').length, DEFAULT_SERVICES.length);
  assert.equal(servicesFor(null).length, DEFAULT_SERVICES.length);
  // beim Laden kommen Zündkerzen beim Diesel nicht zurück
  assert.equal(upgradeServices(servicesFor('diesel').map((d) => ({ ...d })), 'diesel').length, 0);
});

test('Motor-Bauart aus Kennbuchstaben', async () => {
  const { familyForCode, engineText } = await import('../js/data/engines.js');
  assert.equal(familyForCode('mv'), 'wbx21');
  assert.equal(familyForCode(' JX '), 'diesel');
  assert.equal(familyForCode('XY'), null);
  assert.equal(engineText('wbx21', 'mv'), 'Wasserboxer 2,1 l · MV');
  assert.equal(engineText(null, ''), '');
});

test('Öl-Hinweis mit Mengen nur bei Wasserboxern', async () => {
  const { servicesFor } = await import('../js/logic/services.js');
  const oil = (f) => servicesFor(f).find((x) => x.key === 'oil').hint;
  assert.match(oil('wbx21'), /4,5 l/);
  assert.match(oil(null), /4,5 l/);
  assert.match(oil('wbx19'), /4,5 l/);
  assert.match(oil('diesel'), /505 00/);
  assert.doesNotMatch(oil('luft'), /4,5 l/);
});

test('Diesel bekommt Zahnriemen, Ventilspiel und Entwässern dazu, Öl alle 7.500 km', async () => {
  const { servicesFor } = await import('../js/logic/services.js');
  const d = servicesFor('diesel');
  const by = (k) => d.find((x) => x.key === k);
  assert.equal(by('timingbelt').intervalKm, 120000);
  assert.equal(by('timingbelt-check').intervalKm, 30000);
  assert.equal(by('valves').intervalKm, 30000);
  assert.equal(by('fuelwater').intervalMonths, 6);
  assert.equal(by('oil').intervalKm, 7500);
  assert.ok(!servicesFor('wbx21').some((x) => x.key === 'timingbelt'));
});

test('Version 3: unveränderte Filter-Intervalle werden auf 30.000 km gehoben, eigene bleiben', async () => {
  const { upgradeServices } = await import('../js/logic/services.js');
  const ch = upgradeServices([
    { key: 'airfilter', name: 'Luftfilter', intervalKm: 48000, intervalMonths: null, hint: 'Alle 24.000 km prüfen.', lastKm: 1 },
    { key: 'fuelfilter', name: 'Kraftstofffilter', intervalKm: 40000, intervalMonths: null, hint: '' },
  ], 'wbx21');
  const air = ch.find((c) => c.key === 'airfilter');
  assert.equal(air.intervalKm, 30000);
  assert.equal(air.lastKm, 1);
  assert.equal(ch.find((c) => c.key === 'fuelfilter'), undefined, 'selbst geändert → bleibt');
  assert.ok(ch.some((c) => c.key === 'timing' && c.intervalKm === 30000), 'Zündzeitpunkt kommt dazu');
});
