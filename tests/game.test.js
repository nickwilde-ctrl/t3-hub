import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, hits, spawnRow, CAR, VMAX, rng } from '../js/logic/game.js';

test('Kollision: überlappend ja, nebeneinander nein', () => {
  assert.ok(hits({ x: 0, y: 0, w: 30, h: 30 }, { x: 10, y: 10, w: 30, h: 30 }));
  assert.ok(!hits({ x: 0, y: 0, w: 30, h: 30 }, { x: 22, y: 22, w: 30, h: 30 }), 'Streifen am Rand zählt nicht');
  assert.ok(!hits({ x: 0, y: 0, w: 30, h: 30 }, { x: 40, y: 0, w: 30, h: 30 }));
});

test('jede Hindernisreihe lässt eine Lücke für den Bus', () => {
  const g = createGame(360, 640, 42);
  for (let i = 0; i < 300; i++) {
    g.speed = 60 + (i % 80);
    const row = spawnRow(g).filter((t) => !t.pickup);
    // Gibt es eine Stelle, an der der Bus ohne Treffer durchpasst?
    let free = false;
    for (let x = g.road.left; x <= g.road.right - CAR.w; x += 2) {
      if (!row.some((t) => x + CAR.w > t.x && x < t.x + t.w)) { free = true; break; }
    }
    assert.ok(free, 'Reihe ' + i + ' blockiert die ganze Straße');
    for (const t of row) assert.ok(t.x >= g.road.left - 0.01 && t.x + t.w <= g.road.right + 0.01, 'auf der Straße');
  }
});

test('Tempo steigt, aber nie über 141 km/h', () => {
  const g = createGame(360, 640, 1);
  g.fuel = 1e9; g.things = []; g.nextSpawn = 1e9;
  for (let i = 0; i < 4000; i++) step(g, 0.05, null);
  assert.equal(g.speed, VMAX);
  assert.ok(g.km > 0);
});

test('leerer Tank beendet das Spiel', () => {
  const g = createGame(360, 640, 1);
  g.nextSpawn = 1e9; g.fuel = 0.0001;
  for (let i = 0; i < 50 && !g.over; i++) step(g, 0.05, null);
  assert.equal(g.over, true);
  assert.equal(g.reason, 'leer');
});

test('Kanister füllt nach, Hindernis beendet das Spiel', () => {
  const g = createGame(360, 640, 1);
  g.nextSpawn = 1e9;
  g.fuel = 10;
  g.things = [{ kind: 'kanister', pickup: true, x: g.car.x, y: g.car.y, w: 20, h: 26 }];
  assert.deepEqual(step(g, 0.001, g.car.x), ['tank']);
  assert.ok(g.fuel > 20);
  g.things = [{ kind: 'schaf', x: g.car.x, y: g.car.y, w: 30, h: 26 }];
  assert.deepEqual(step(g, 0.001, g.car.x), ['crash']);
  assert.equal(g.reason, 'schaf');
});

test('Zufall ist mit Startwert reproduzierbar', () => {
  const a = rng(7), b = rng(7);
  assert.equal(a(), b());
});
