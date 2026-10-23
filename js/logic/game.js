// Minispiel „Schlaglochslalom“: reine Spiellogik ohne Browser (testbar).
// Koordinaten in Spiel-Pixeln. Die Straße läuft von oben nach unten, der Bus steht unten und fährt nach oben.

export const CAR = { w: 34, h: 58 };
export const KINDS = {
  loch: { w: 34, h: 22 },   // Schlagloch
  pylone: { w: 22, h: 26 },
  schaf: { w: 30, h: 26 },
  kanister: { w: 20, h: 26, pickup: true },
};
export const VMAX = 141;           // km/h – Peanuts Höchstgeschwindigkeit laut Fahrzeugschein
export const VSTART = 50;
export const TANK = 60;            // Liter
export const CONSUMPTION = 14;     // l/100 km – Peanuts Schnitt
const KM_PER_PX = 0.0004;          // Strecke je Pixel Fahrbahn (Spielwert)
const PX_PER_KMH = 4.2;            // Fahrbahn-Pixel pro Sekunde je km/h

/** Kleiner, reproduzierbarer Zufallsgenerator (für Tests mit festem Startwert). */
export function rng(seed = Date.now()) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function createGame(width, height, seed, bottom = 0) {
  const verge = Math.round(width * 0.08);
  return {
    width, height, verge,
    road: { left: verge, right: width - verge },
    car: { x: width / 2 - CAR.w / 2, y: height - bottom - CAR.h - 28, ...CAR },
    bottom,
    targetX: width / 2 - CAR.w / 2,
    things: [],
    speed: VSTART,
    km: 0,
    fuel: TANK * 0.6,
    time: 0,
    nextSpawn: 0,
    over: false,
    reason: '',
    rand: rng(seed),
    scroll: 0,
  };
}

/** Überlappen sich zwei Rechtecke? (mit etwas Nachsicht an den Rändern) */
export function hits(a, b, slack = 6) {
  return a.x + slack < b.x + b.w - slack && a.x + a.w - slack > b.x + slack && a.y + slack < b.y + b.h - slack && a.y + a.h - slack > b.y + slack;
}

/** Neue Reihe Hindernisse oben: lässt immer eine Lücke, durch die der Bus passt. */
export function spawnRow(g) {
  const r = g.rand;
  const { left, right } = g.road;
  const gapW = CAR.w + 34;
  const gapX = left + r() * (right - left - gapW);
  const row = [];
  const n = 1 + Math.floor(r() * (g.speed > 100 ? 3 : 2));
  for (let i = 0; i < n; i++) {
    const kind = ['loch', 'pylone', 'schaf', 'loch'][Math.floor(r() * 4)];
    const k = KINDS[kind];
    let x = left + r() * (right - left - k.w);
    // nicht in die Lücke legen
    if (x + k.w > gapX && x < gapX + gapW) x = x < gapX + gapW / 2 ? Math.max(left, gapX - k.w - 2) : Math.min(right - k.w, gapX + gapW + 2);
    row.push({ kind, x, y: -k.h - r() * 30, w: k.w, h: k.h });
  }
  // ab und zu ein Kanister – öfter, wenn der Tank leer wird
  if (r() < (g.fuel < 15 ? 0.55 : 0.22)) {
    const k = KINDS.kanister;
    row.push({ kind: 'kanister', x: gapX + (gapW - k.w) / 2, y: -k.h - 70, w: k.w, h: k.h, pickup: true });
  }
  return row;
}

/**
 * Ein Spielschritt. dt in Sekunden, targetX = gewünschte Bus-Position (Finger).
 * Gibt Ereignisse zurück: ['tank'] beim Einsammeln, ['crash'|'leer'] bei Spielende.
 */
export function step(g, dt, targetX) {
  if (g.over) return [];
  const ev = [];
  dt = Math.min(dt, 0.05);
  g.time += dt;
  if (targetX != null) g.targetX = targetX;
  // Bus gleitet zum Finger, mit Lenk-Trägheit
  const maxX = g.road.right - g.car.w, minX = g.road.left;
  const want = Math.max(minX, Math.min(maxX, g.targetX));
  g.car.x += (want - g.car.x) * Math.min(1, dt * 9);
  // Tempo steigt langsam bis VMAX
  g.speed = Math.min(VMAX, VSTART + g.time * 2.2);
  const dy = g.speed * PX_PER_KMH * dt;
  g.scroll = (g.scroll + dy) % 80;
  const dKm = dy * KM_PER_PX;
  g.km += dKm;
  g.fuel = Math.max(0, g.fuel - (dKm * CONSUMPTION) / 100 * 9); // Faktor, damit das Spiel nicht ewig dauert
  for (const t of g.things) t.y += dy;
  g.things = g.things.filter((t) => t.y < g.height + 40);
  g.nextSpawn -= dy;
  if (g.nextSpawn <= 0) {
    g.things.push(...spawnRow(g));
    g.nextSpawn = 200 + g.rand() * 100 - Math.min(80, (g.speed - VSTART) * 0.9);
  }
  for (const t of g.things) {
    if (!hits(g.car, t)) continue;
    if (t.pickup) { t.taken = true; g.fuel = Math.min(TANK, g.fuel + 15); ev.push('tank'); }
    else { g.over = true; g.reason = t.kind; ev.push('crash'); return ev; }
  }
  g.things = g.things.filter((t) => !t.taken);
  if (g.fuel <= 0) { g.over = true; g.reason = 'leer'; ev.push('leer'); }
  return ev;
}

export const reasonText = (r) => ({
  loch: 'Ins Schlagloch – Achse hin.',
  pylone: 'Pylone mitgenommen.',
  schaf: 'Schaf erwischt! (Ihm geht es gut, es ist nur beleidigt.)',
  leer: 'Tank leer – der T3 säuft halt.',
}[r] || 'Aus.');
