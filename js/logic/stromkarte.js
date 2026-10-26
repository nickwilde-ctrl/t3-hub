// Stromkarte: Rechenlogik ohne DOM (Linienverlauf, Bereiche, Zoom-Ausschnitt, Suche).
// Die Kartendaten (Bauteile, Kabel, Lage) kommen aus den privaten Plandaten, nie aus dem Repository.

/** Prüft die Kartendaten in einer Plandaten-Datei. */
export function checkMap(map) {
  if (!map || typeof map !== 'object' || !Array.isArray(map.nodes) || !Array.isArray(map.wires)) return false;
  const ids = new Set(map.nodes.map((n) => n && n.id));
  if (map.nodes.some((n) => !n || typeof n.id !== 'string' || typeof n.x !== 'number' || typeof n.y !== 'number')) return false;
  return map.wires.every((w) => w && Array.isArray(w.pts) && w.pts.length >= 2 && w.pts.every((p) => ids.has(p)));
}

/** Linienstärke nach Kabelquerschnitt (mm² als Text wie „1,5“). */
export function wireWidth(mm) {
  const v = parseFloat(String(mm).replace(',', '.'));
  return Number.isNaN(v) ? 5 : Math.max(4, Math.min(14, 3 + v * 1.1));
}

/** Laufende Nummer je Punktpaar, damit parallele Kabel nebeneinander statt übereinander liegen. */
export function pairIndex(wires) {
  const count = {};
  return wires.map((w) => {
    const key = [w.pts[0], w.pts[w.pts.length - 1]].sort().join('|');
    count[key] = (count[key] ?? -1) + 1;
    return count[key];
  });
}

/** SVG-Pfad durch alle Punkte, mit leichtem Bogen; k verschiebt parallele Kabel. */
export function wirePath(points, k = 0) {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let j = 1; j < points.length; j++) {
    const a = points[j - 1], b = points[j];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const bend = 0.12 * len + k * 16;
    const cx = (a.x + b.x) / 2 - (dy / len) * bend, cy = (a.y + b.y) / 2 + (dx / len) * bend;
    d += ` Q ${Math.round(cx)} ${Math.round(cy)} ${b.x} ${b.y}`;
  }
  return d;
}

export const inArea = (w, area) => !area || area === 'alle' || (w.sys || []).includes(area);

/** Sichtbare Kabel (Indizes) und Bauteile (IDs) in einem Bereich. */
export function visibleIn(map, area) {
  const wires = new Set(), nodes = new Set();
  map.wires.forEach((w, i) => { if (inArea(w, area)) { wires.add(i); w.pts.forEach((p) => nodes.add(p)); } });
  return { wires, nodes };
}

/** Ausschnitt, der alle Punkte zeigt, im Seitenverhältnis ratio (Breite/Höhe). */
export function fitBox(points, ratio = 2, pad = 100) {
  if (!points.length) return null;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  let w = Math.max(x1 - x0, 400), h = Math.max(y1 - y0, 300);
  if (w / h < ratio) w = h * ratio; else h = w / ratio;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const tester = (q) => {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const tests = words.map((y) => (/^[a-z]+\d+$/.test(y) ? (h) => new RegExp(`(^|[^a-z0-9])${y}($|[^0-9])`).test(h) : (h) => h.includes(y)));
  return words.length ? (h) => tests.every((t) => t(norm(h))) : null;
};

/** Suche in einem Bereich: { nodes: [id], wires: [index] }. */
export function searchMap(map, q, area, colorName = (c) => c) {
  const test = tester(q);
  if (!test) return { nodes: [], wires: [] };
  const vis = visibleIn(map, area);
  return {
    nodes: map.nodes.filter((n) => vis.nodes.has(n.id) && test(`${n.code} ${n.name}`)).map((n) => n.id),
    wires: map.wires.map((w, i) => [w, i]).filter(([w, i]) => vis.wires.has(i) && test([w.c, colorName(w.c), w.mm, w.a, w.b, w.what].join(' '))).map(([, i]) => i),
  };
}
