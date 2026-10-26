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

test('Öl-Hinweis mit Mengen nur beim 2,1-l-Wasserboxer', async () => {
  const { servicesFor } = await import('../js/logic/services.js');
  const oil = (f) => servicesFor(f).find((x) => x.key === 'oil').hint;
  assert.match(oil('wbx21'), /4,5 l/);
  assert.match(oil(null), /4,5 l/);
  assert.doesNotMatch(oil('diesel'), /4,5 l/);
});
