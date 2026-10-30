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
  assert.equal(intervalOrigin(def('plugs'), 'wbx21').kind, 'plan'); // seit 0.47 laut Handbuch
  const changed = intervalOrigin({ ...def('oil'), intervalKm: 7500 }, 'wbx21');
  assert.equal(changed.kind, 'eigen');
  assert.match(changed.basis, /5\.500 km/);
  assert.equal(intervalOrigin({ key: 'custom-x', intervalKm: 1000 }, 'wbx21').kind, 'eigen');
  // jeder Standardpunkt hat eine Herkunft
  for (const d of ALL_SERVICES) assert.ok(ORIGIN[d.key], d.key);
  assert.equal(intervalText({ intervalKm: 5500, intervalMonths: 12 }), 'alle 5.500 km oder alle 12 Monate');
});

test('Zündkerzen: alter Startwert 24.000 km wird auf 30.000 km gehoben, geänderter bleibt', async () => {
  const { upgradeServices, servicesFor } = await import('../js/logic/services.js');
  const base = servicesFor('wbx21').map((d) => ({ ...d }));
  const old = base.map((d) => (d.key === 'plugs' ? { ...d, intervalKm: 24000, hint: '' } : d));
  const up = upgradeServices(old, 'wbx21').find((x) => x.key === 'plugs');
  assert.equal(up.intervalKm, 30000);
  const own = base.map((d) => (d.key === 'plugs' ? { ...d, intervalKm: 20000 } : d));
  assert.equal(upgradeServices(own, 'wbx21').find((x) => x.key === 'plugs'), undefined);
});

test('Fällig-Seite: Kurztext, Gruppen und nächste Fälligkeit', async () => {
  const { dueShort, planGroups, nextDueText, serviceStatus } = await import('../js/logic/services.js');
  const today = new Date('2026-10-27T12:00:00');
  const oil = { id: 'a', key: 'oil', intervalKm: 5500, intervalMonths: 12, lastKm: 140230, lastDate: '2026-08-26' };
  const cool = { id: 'b', key: 'coolant', intervalKm: null, intervalMonths: 24, lastKm: null, lastDate: '2024-11-20' };
  const hu = { id: 'c', key: 'hu', intervalKm: null, intervalMonths: 24, lastKm: null, lastDate: '2025-12-31' };
  const plugs = { id: 'd', key: 'plugs', intervalKm: 30000, intervalMonths: null, lastKm: null, lastDate: null };
  const brake = { id: 'e', key: 'brakefluid', intervalKm: null, intervalMonths: 24, lastKm: null, lastDate: '2024-01-01' };
  assert.equal(dueShort(serviceStatus(oil, 142380, today)), 'in 3.350 km');
  assert.equal(dueShort(serviceStatus(cool, 142380, today)), 'in 24 Tagen');
  assert.equal(dueShort(serviceStatus(hu, 142380, today)), 'bis 12.2027');
  assert.equal(dueShort(serviceStatus(plugs, 142380, today)), 'noch nicht eingetragen');
  assert.equal(dueShort(serviceStatus(brake, 142380, today)), 'überfällig');
  const g = planGroups([oil, cool, hu, plugs, brake], 142380, today);
  assert.equal(g.next.s.key, 'brakefluid');
  assert.deepEqual(g.then.map((x) => x.s.key), ['coolant', 'oil', 'hu']);
  assert.deepEqual(g.unknown.map((x) => x.s.key), ['plugs']);
  assert.equal(g.urgent.length, 2);
  assert.equal(nextDueText(oil, { km: 140230, date: '2026-08-26' }), 'bei 145.730 km oder bis 08.2027');
  assert.equal(nextDueText(hu, { km: null, date: '2025-12-31' }), 'bis 12.2027');
  assert.equal(planGroups([], 0, today).next, null);
});

test('Startseite: nur fällige Punkte, sonst der nächste', async () => {
  const { homeDue } = await import('../js/logic/services.js');
  const today = new Date('2026-10-27T12:00:00');
  const oil = { id: 'a', key: 'oil', intervalKm: 5500, intervalMonths: 12, lastKm: 140230, lastDate: '2026-08-26' };
  const cool = { id: 'b', key: 'coolant', intervalKm: null, intervalMonths: 24, lastKm: null, lastDate: '2024-11-20' };
  const hu = { id: 'c', key: 'hu', intervalKm: null, intervalMonths: 24, lastKm: null, lastDate: '2025-12-31' };
  const plugs = { id: 'd', key: 'plugs', intervalKm: 30000, intervalMonths: null, lastKm: null, lastDate: null };
  const brake = { id: 'e', key: 'brakefluid', intervalKm: null, intervalMonths: 24, lastKm: null, lastDate: '2024-01-01' };
  // Bremsflüssigkeit überfällig, Kühlmittel bald; Öl und HU sind OK und gehören nicht dazu
  const h = homeDue([oil, cool, hu, plugs, brake], 142380, today);
  assert.deepEqual(h.due.map((x) => x.s.key), ['brakefluid', 'coolant']);
  assert.equal(h.next, null);
  assert.equal(h.moreDue, 0);
  assert.equal(h.unknown, 1);
  // nichts fällig → nur der nächste Punkt
  const calm = homeDue([oil, hu, plugs], 142380, today);
  assert.deepEqual(calm.due, []);
  assert.equal(calm.next.s.key, 'oil');
  // mehr als drei fällig → drei zeigen, Rest zählen
  const late = (key) => ({ id: key, key, intervalKm: null, intervalMonths: 12, lastKm: null, lastDate: '2024-01-01' });
  const many = homeDue(['a', 'b', 'c', 'd', 'e'].map(late), 0, today);
  assert.equal(many.due.length, 3);
  assert.equal(many.moreDue, 2);
  // gar nichts eingetragen
  const none = homeDue([plugs], 0, today);
  assert.equal(none.next, null);
  assert.equal(none.unknown, 1);
});

test('Sammel-Eintrag: der Stand kommt aus dem Eintrag, Löschen nimmt ihn wieder weg', async () => {
  const { withLastDone, entryServiceKeys } = await import('../js/logic/services.js');
  const oil = { key: 'oil', lastDate: null, lastKm: null };
  const plugs = { key: 'plugs', lastDate: '2025-01-10', lastKm: 100000 };
  const sammel = { id: 'x', date: '2026-10-20', km: 142000, serviceKeys: ['oil', 'plugs'] };
  assert.deepEqual(entryServiceKeys(sammel), ['oil', 'plugs']);
  assert.deepEqual(entryServiceKeys({ serviceKey: 'hu' }), ['hu']);
  assert.deepEqual(entryServiceKeys({ serviceKey: 'hu', serviceKeys: ['hu', 'oil'] }), ['hu', 'oil'], 'ohne Doppelte');
  assert.deepEqual(entryServiceKeys({ title: 'alt' }), [], 'ältere Einträge haben keinen Wartungspunkt');
  assert.equal(withLastDone(oil, [sammel]).lastDate, '2026-10-20');
  assert.equal(withLastDone(plugs, [sammel]).lastKm, 142000);
  assert.equal(withLastDone(plugs, [{ ...sammel, date: '2026-10-21', km: 143000 }]).lastKm, 143000, 'Änderung wirkt sofort');
  assert.equal(withLastDone(oil, []).lastDate, null, 'ohne den gelöschten Eintrag ist der Punkt wieder offen');
  assert.equal(withLastDone(plugs, []).lastKm, 100000, 'und der frühere Stand gilt wieder');
});

test('Vorwarnschwelle: bald fällig ab 500 km oder 30 Tagen, was zuerst kommt', async () => {
  const { serviceStatus, SOON_KM, SOON_DAYS } = await import('../js/logic/services.js');
  assert.equal(SOON_KM, 500);
  assert.equal(SOON_DAYS, 30);
  const today = new Date('2026-10-27T12:00:00');
  const byKm = (rest) => serviceStatus({ intervalKm: 5000, lastKm: 1000 - 5000 + rest, lastDate: null }, 1000, today).state;
  assert.equal(byKm(501), 'ok');
  assert.equal(byKm(499), 'soon');
  assert.equal(byKm(0), 'over');
  const byDays = (rest) => { const d = new Date(today); d.setDate(d.getDate() + rest); d.setFullYear(d.getFullYear() - 1); return serviceStatus({ intervalMonths: 12, lastDate: d.toISOString().slice(0, 10) }, 0, today).state; };
  assert.equal(byDays(31), 'ok');
  assert.equal(byDays(29), 'soon');
  assert.equal(byDays(0), 'over');
  // beides: der zuerst erreichte Wert zählt
  assert.equal(serviceStatus({ intervalKm: 5000, intervalMonths: 12, lastKm: 1000 - 5000 + 400, lastDate: '2026-10-27' }, 1000, today).state, 'soon');
});
