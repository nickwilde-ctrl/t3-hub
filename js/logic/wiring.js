// Plandaten (Kabel aus dem Stromlaufplan): Datei prüfen, Kabel suchen, Weg eines Kabels.
// Die Plandaten selbst stehen NICHT im Repository. Jeder lädt seine eigene Datei, sie bleibt auf dem Gerät.

import { checkMap } from './stromkarte.js';

export const WIRING_FORMAT = 't3hub-wiring';
export const WIRING_VERSION = 1;

export const WIRE_COLORS = {
  ge: 'gelb', ws: 'weiß', ro: 'rot', li: 'lila', bl: 'blau', gr: 'grau', gn: 'grün', br: 'braun', sw: 'schwarz',
};

/** „ro/sw“ → „rot-schwarz“ */
export const colorName = (c = '') => String(c).split('/').map((x) => WIRE_COLORS[x] || x).join('-');

/** Prüft eine eingelesene Plandaten-Datei. Gibt { ok, error, counts } zurück. */
export function checkWiring(obj) {
  if (!obj || typeof obj !== 'object' || obj.format !== WIRING_FORMAT) return { ok: false, error: 'Das ist keine Plandaten-Datei.' };
  if (typeof obj.version !== 'number' || obj.version > WIRING_VERSION) return { ok: false, error: 'Diese Plandaten stammen aus einer neueren Version der App. Bitte die App aktualisieren.' };
  if (!Array.isArray(obj.wires) || !obj.wires.length) return { ok: false, error: 'In der Datei sind keine Kabel enthalten.' };
  if (obj.wires.some((w) => !w || typeof w.c !== 'string' || typeof w.from !== 'string' || typeof w.to !== 'string')) return { ok: false, error: 'Die Plandaten-Datei ist beschädigt.' };
  if (obj.map !== undefined && !checkMap(obj.map)) return { ok: false, error: 'Die Stromkarte in der Datei ist beschädigt.' };
  return { ok: true, counts: { wires: obj.wires.length, fuses: Array.isArray(obj.fuses) ? obj.fuses.length : 0, map: !!obj.map } };
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

/** Suchtext eines Kabels: Farbe (Kürzel und ausgeschrieben), Dicke, Weg, Funktion, Stichwörter. */
const hay = (w) => norm([w.c, colorName(w.c), w.mm, w.from, w.via, w.to, w.what, w.tags, w.note, w.plan ? 'plan ' + w.plan : '', 'strompfad ' + (w.path || '')].join(' '));

/**
 * Kabel suchen. Alle Wörter müssen vorkommen. Kürzel wie „S1“ oder „G2“ zählen nur als ganzes Wort,
 * damit „S1“ nicht auch S13 oder S19 findet.
 */
export function searchWires(wires = [], q = '') {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const tests = words.map((y) => (/^[a-z]+\d+$/.test(y)
    ? ((h) => new RegExp(`(^|[^a-z0-9])${y}($|[^0-9])`).test(h))
    : ((h) => h.includes(y))));
  return wires.filter((w) => { const h = hay(w); return tests.every((t) => t(h)); });
}

/** Stationen eines Kabels von Anfang bis Ende. */
export const wireStops = (w) => [w.from, ...(w.via ? String(w.via).split(' → ') : []), w.to].filter(Boolean);
