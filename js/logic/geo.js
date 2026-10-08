// Kartenrechnung für die Stellplatz-Karte (OpenStreetMap-Kacheln, 256 px, Web-Mercator).
// Reine Funktionen, testbar ohne Browser.

export const TILE = 256;
export const MAX_ZOOM = 15;
export const SINGLE_ZOOM = 12;

/** Längen-/Breitengrad → Weltpixel bei Zoomstufe z. */
export function project(lat, lon, z) {
  const n = TILE * 2 ** z;
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return { x: ((lon + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}

/**
 * Wählt Zoom und Mitte so, dass alle Punkte mit Rand in ein Bild der Größe w × h passen.
 * @returns {{ zoom, cx, cy }} cx/cy = Mitte in Weltpixeln bei diesem Zoom
 */
export function fitView(points, w, h, pad = 28) {
  if (!points.length) return null;
  let zoom = SINGLE_ZOOM;
  if (points.length > 1) {
    zoom = MAX_ZOOM;
    for (; zoom > 1; zoom--) {
      const ps = points.map((p) => project(p.lat, p.lon, zoom));
      const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
      if (Math.max(...xs) - Math.min(...xs) <= w - 2 * pad && Math.max(...ys) - Math.min(...ys) <= h - 2 * pad) break;
    }
  }
  const ps = points.map((p) => project(p.lat, p.lon, zoom));
  const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
  return { zoom, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/** Kacheln, die ein Bild w × h um die Mitte (cx, cy) abdecken, mit Position im Bild. */
export function tilesFor(view, w, h) {
  const left = view.cx - w / 2, top = view.cy - h / 2;
  const max = 2 ** view.zoom;
  const out = [];
  for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + h) / TILE); ty++) {
    if (ty < 0 || ty >= max) continue;
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w) / TILE); tx++) {
      const wx = ((tx % max) + max) % max;
      out.push({ z: view.zoom, x: wx, y: ty, left: tx * TILE - left, top: ty * TILE - top });
    }
  }
  return out;
}

/** Punkt → Position im Bild (Pixel). */
export function toScreen(p, view, w, h) {
  const q = project(p.lat, p.lon, view.zoom);
  return { x: q.x - view.cx + w / 2, y: q.y - view.cy + h / 2 };
}

/** Luftlinie in km (Haversine). */
export function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Stellplätze einer Tour in Reihenfolge (Datum, dann Anlegezeit). */
export const sortStops = (stops = []) => [...stops].sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''));
