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

test('Öl-Hinweis: Intervall-Erklärung steht seit 0.46 im Herkunfts-Kasten, Hinweis wird gekürzt', async () => {
  const { upgradeServices, OLD_HINTS } = await import('../js/logic/services.js');
  const long = OLD_HINTS.oil[1];
  const s = { key: 'oil', name: 'Ölwechsel + Ölfilter', intervalKm: 5500, intervalMonths: 12, hint: long };
  const up = upgradeServices([s], 'wbx21').find((x) => x.key === 'oil');
  assert.ok(up, 'Ölwechsel wird aktualisiert');
  assert.doesNotMatch(up.hint, /GoWesty/);
  assert.match(up.hint, /4,5 l/);
  // gekürzter Hinweis bleibt danach stabil
  assert.ok(!upgradeServices([{ ...s, hint: up.hint }], 'wbx21').some((x) => x.key === 'oil'));
});

test('Sicherheits-Prüfpunkte: ergänzt bei alten Daten, Kühlrohre nicht beim Luftgekühlten', async () => {
  const { DEFAULT_SERVICES, servicesFor, upgradeServices, isSafety } = await import('../js/logic/services.js');
  const safety = DEFAULT_SERVICES.filter((d) => d.safety).map((d) => d.key);
  assert.deepEqual(safety, ['brakecheck', 'steering', 'fuelhoses', 'fuelhoses-new', 'coolantpipes']);
  const old = servicesFor('wbx21').filter((d) => !d.safety).map((d) => ({ ...d }));
  const added = upgradeServices(old, 'wbx21').map((x) => x.key);
  assert.deepEqual(added, safety);
  assert.ok(!servicesFor('luft').some((d) => d.key === 'coolantpipes'));
  assert.ok(isSafety({ key: 'steering' }) && !isSafety({ key: 'oil' }));
});

test('Herkunft der Intervalle: Wartungsplan, Empfehlung, gesetzlich, eigenes', async () => {
  const { servicesFor, intervalOrigin, intervalText, ALL_SERVICES, ORIGIN } = await import('../js/logic/services.js');
  const def = (k, fam = 'wbx21') => ({ ...servicesFor(fam).find((d) => d.key === k) });
  assert.equal(intervalOrigin(def('airfilter'), 'wbx21').kind, 'plan');
  const oil = intervalOrigin(def('oil'), 'wbx21');
  assert.equal(oil.kind, 'empfehlung');
  assert.match(oil.werk, /15\.000/);
  assert.equal(intervalOrigin(def('oil', 'diesel'), 'diesel').kind, 'plan');
  assert.equal(intervalOrigin(def('hu'), 'wbx21').kind, 'gesetz');
  assert.equal(intervalOrigin(def('plugs'), 'wbx21').werk, null); // noch nicht geprüft
  const changed = intervalOrigin({ ...def('oil'), intervalKm: 7500 }, 'wbx21');
  assert.equal(changed.kind, 'eigen');
  assert.match(changed.basis, /5\.500 km/);
  assert.equal(intervalOrigin({ key: 'custom-x', intervalKm: 1000 }, 'wbx21').kind, 'eigen');
  // jeder Standardpunkt hat eine Herkunft
  for (const d of ALL_SERVICES) assert.ok(ORIGIN[d.key], d.key);
  assert.equal(intervalText({ intervalKm: 5500, intervalMonths: 12 }), 'alle 5.500 km oder alle 12 Monate');
});
