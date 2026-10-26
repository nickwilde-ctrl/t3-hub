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
