// Wartungsintervalle: Fälligkeit nach Kilometern und/oder Monaten – was zuerst eintritt.

export const SOON_KM = 1000;
export const SOON_DAYS = 45;

/** Platzhalter-Intervalle. Die richtigen Werte für den Motor werden in Schritt 2.5 recherchiert. */
export const DEFAULT_SERVICES = [
  { key: 'hu', name: 'Hauptuntersuchung (HU)', intervalKm: null, intervalMonths: 24 },
  { key: 'oil', name: 'Ölwechsel + Ölfilter', intervalKm: 7500, intervalMonths: 12 },
  { key: 'plugs', name: 'Zündkerzen', intervalKm: 15000, intervalMonths: 24 },
  { key: 'brakefluid', name: 'Bremsflüssigkeit', intervalKm: null, intervalMonths: 24 },
  { key: 'coolant', name: 'Kühlmittel', intervalKm: null, intervalMonths: 36 },
  { key: 'fuelfilter', name: 'Kraftstofffilter', intervalKm: 20000, intervalMonths: null },
];

function addMonths(isoDate, months) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Status eines Wartungspunkts.
 * @returns {{state:'unknown'|'ok'|'soon'|'over', remainingKm:number|null, remainingDays:number|null, dueDate:Date|null, dueKm:number|null, rank:number}}
 */
export function serviceStatus(s, currentKm, today = new Date()) {
  const t = new Date(today); t.setHours(0, 0, 0, 0);
  if (s.lastKm == null && !s.lastDate) {
    return { state: 'unknown', remainingKm: null, remainingDays: null, dueDate: null, dueKm: null, rank: 0.4 };
  }
  const dueKm = s.intervalKm && s.lastKm != null ? s.lastKm + s.intervalKm : null;
  const dueDate = s.intervalMonths && s.lastDate ? addMonths(s.lastDate, s.intervalMonths) : null;
  const remainingKm = dueKm != null ? dueKm - currentKm : null;
  const remainingDays = dueDate ? Math.round((dueDate - t) / 864e5) : null;
  let state = 'ok';
  if ((remainingKm != null && remainingKm <= 0) || (remainingDays != null && remainingDays <= 0)) state = 'over';
  else if ((remainingKm != null && remainingKm < SOON_KM) || (remainingDays != null && remainingDays < SOON_DAYS)) state = 'soon';
  const rank = Math.min(remainingKm != null ? remainingKm / 15000 : Infinity, remainingDays != null ? remainingDays / 365 : Infinity);
  return { state, remainingKm, remainingDays, dueDate, dueKm, rank };
}
