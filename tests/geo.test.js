import { test } from 'node:test';
import assert from 'node:assert/strict';
import { project, fitView, tilesFor, toScreen, distanceKm, sortStops } from '../js/logic/geo.js';

test('Projektion: Nullpunkt liegt in der Weltmitte', () => {
  const p = project(0, 0, 1);
  assert.equal(p.x, 256);
  assert.ok(Math.abs(p.y - 256) < 1e-9);
});

test('Kachel für Berlin bei Zoom 10', () => {
  const p = project(52.52, 13.405, 10);
  assert.equal(Math.floor(p.x / 256), 550);
  assert.equal(Math.floor(p.y / 256), 335);
});

test('Ansicht passt alle Punkte ein', () => {
  const pts = [{ lat: 57.72, lon: 10.58 }, { lat: 54.65, lon: 11.35 }, { lat: 55.68, lon: 12.57 }]; // Skagen, Puttgarden-Nähe, Kopenhagen
  const w = 360, h = 240, v = fitView(pts, w, h);
  for (const p of pts) {
    const s = toScreen(p, v, w, h);
    assert.ok(s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h, 'Punkt im Bild');
  }
  assert.ok(v.zoom >= 5 && v.zoom <= 8);
  assert.ok(tilesFor(v, w, h).length >= 2);
});

test('ein einzelner Punkt bekommt einen festen Zoom', () => {
  assert.equal(fitView([{ lat: 52.5, lon: 13.4 }], 360, 240).zoom, 12);
  assert.equal(fitView([], 360, 240), null);
});

test('Luftlinie Berlin–Hamburg etwa 255 km', () => {
  const d = distanceKm({ lat: 52.52, lon: 13.405 }, { lat: 53.551, lon: 9.993 });
  assert.ok(d > 250 && d < 260);
});

test('Stellplätze nach Datum sortiert', () => {
  const s = sortStops([{ date: '2026-03-17' }, { date: '2026-03-15' }]);
  assert.equal(s[0].date, '2026-03-15');
});
