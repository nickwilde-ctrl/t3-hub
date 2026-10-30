// Fahrzeugidentität: Modell → Baujahr → Motorfamilie → Kennbuchstabe → Kraftstoff → Getriebe.
// Alles wird aus den gespeicherten Feldern (year, engineFamily, engineCode, gearbox) gelesen, nichts davon
// aus Freitext. Der Kraftstoff gehört zur Motorfamilie und wird nicht gespeichert.
import { familyById, familyForCode, gearboxById } from '../data/engines.js';

export const MODEL = 'VW T3';
export const YEAR_MIN = 1979;
export const YEAR_MAX = 1992;

/** Motorfamilie des Fahrzeugs: die gespeicherte, sonst die zum Kennbuchstaben passende, sonst null. */
export const engineFamilyOf = (v = {}) => (familyById(v.engineFamily) ? v.engineFamily : familyForCode(v.engineCode));

export function vehicleIdentity(v = {}) {
  const familyId = engineFamilyOf(v);
  const family = familyById(familyId);
  const gearbox = gearboxById(v.gearbox);
  return {
    model: MODEL,
    year: Number.isInteger(v.year) ? v.year : null,
    familyId,
    family,
    code: String(v.engineCode || '').trim().toUpperCase(),
    fuel: family ? family.fuel : '',
    gearbox: gearbox ? gearbox.id : null,
    gearboxLabel: gearbox ? gearbox.label : '',
  };
}

/** Das alte Textfeld „model“ bleibt aus Kompatibilitätsgründen bestehen: „VW T3 · Baujahr 1985“. */
export const modelText = (year) => (year ? `${MODEL} · Baujahr ${year}` : MODEL);

/** Baujahr aus einem alten Modelltext erkennen (nur als Vorschlag, z. B. „VW T3 · Baujahr 1985“). */
export function yearFromModelText(text) {
  const m = /(?:^|\D)(19\d\d)(?!\d)/.exec(String(text || ''));
  const y = m ? parseInt(m[1], 10) : null;
  return y >= YEAR_MIN && y <= YEAR_MAX ? y : null;
}

/** Baujahr aus einem Eingabefeld: leer erlaubt; sonst Zahl im T3-Zeitraum. Gibt { year } oder { error } zurück. */
export function parseYear(text) {
  const t = String(text ?? '').trim();
  if (!t) return { year: null };
  const year = /^\d{4}$/.test(t) ? parseInt(t, 10) : NaN;
  if (!(year >= YEAR_MIN && year <= YEAR_MAX)) {
    return { error: 'Der T3 wurde von 1979 bis 1992 gebaut (Syncro und Südafrika auch länger). Bitte das Baujahr prüfen oder leer lassen.' };
  }
  return { year };
}
