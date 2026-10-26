// Wartungsintervalle: Fälligkeit nach Kilometern und/oder Monaten – was zuerst eintritt.

export const SOON_KM = 1000;
export const SOON_DAYS = 45;

/**
 * Startwerte für den VW T3 mit Wasserboxer (Benziner). Werksangaben waren nicht verlässlich zu finden;
 * die Werte folgen dem Wartungsplan der T3-Fachwerkstatt GoWesty (Meilen umgerechnet und gerundet,
 * 3.500 mi ≈ 5.600 km, 15.000 mi ≈ 24.000 km, 30.000 mi ≈ 48.000 km). Alle Werte sind in der App änderbar.
 * Quelle: https://gowesty.com/blogs/article-library/maintenance-schedule-recommendation-vanagon
 * Ölmenge/-norm: 4,5 l, VW 500 00 / 501 01 / 502 00 (repareo.de, T3 2.1 70 kW).
 */
export const DEFAULTS_VERSION = 2;
export const DEFAULT_SERVICES = [
  { key: 'hu', name: 'Hauptuntersuchung (HU)', intervalKm: null, intervalMonths: 24, hint: 'Fälligkeit steht auf der Plakette und im Fahrzeugschein.' },
  { key: 'oil', name: 'Ölwechsel + Ölfilter', intervalKm: 5500, intervalMonths: 12, hint: '4,5 l mit Filter, Öl nach VW 501 01 oder 500 00 – keine Longlife-Öle (503 00/506 00).' },
  { key: 'plugs', name: 'Zündkerzen', intervalKm: 24000, intervalMonths: null, hint: '' },
  { key: 'ignition', name: 'Verteilerkappe, Verteilerfinger, Zündkabel', intervalKm: 48000, intervalMonths: null, hint: 'Kabel nur, wenn nötig.' },
  { key: 'airfilter', name: 'Luftfilter', intervalKm: 48000, intervalMonths: null, hint: 'Alle 24.000 km prüfen.' },
  { key: 'fuelfilter', name: 'Kraftstofffilter', intervalKm: 48000, intervalMonths: null, hint: '' },
  { key: 'brakefluid', name: 'Bremsflüssigkeit', intervalKm: null, intervalMonths: 24, hint: 'DOT 4, unabhängig von den Kilometern.' },
  { key: 'coolant', name: 'Kühlmittel spülen und erneuern', intervalKm: null, intervalMonths: 24, hint: 'G11 (grün) oder G12 (rot) – nie mischen – mit destilliertem Wasser.' },
  { key: 'gearoil', name: 'Getriebeöl', intervalKm: 48000, intervalMonths: null, hint: 'Schaltgetriebe: API GL4, SAE 75W-90.' },
];

/** Bisherige Platzhalter (Version 1), damit unveränderte Einträge auf die neuen Werte gehoben werden können. */
export const OLD_DEFAULTS = {
  oil: [7500, 12], plugs: [15000, 24], brakefluid: [null, 24], coolant: [null, 36], fuelfilter: [20000, null], hu: [null, 24],
};

/** Frühere Hinweistexte: werden auf den aktuellen Text gehoben (auch wenn das Intervall geändert wurde). */
export const OLD_HINTS = {
  oil: ['4,5 l, Norm VW 500 00 / 501 01 / 502 00.'],
  coolant: ['Phosphatfreies Kühlmittel mit destilliertem Wasser.'],
};

/** Wartungspunkte, die es bei einer Motor-Bauart nicht gibt. */
const NOT_FOR = {
  diesel: ['plugs', 'ignition'],   // Diesel: keine Zündkerzen, keine Zündanlage
  luft: ['coolant'],               // Luftgekühlt: kein Kühlmittel
};

/** Standard-Wartungspunkte passend zur Motor-Bauart (unbekannt = alle). */
export const servicesFor = (family) => DEFAULT_SERVICES
  .filter((d) => !(NOT_FOR[family] || []).includes(d.key))
  // Ölmenge und Ölnorm im Hinweis gelten nur für den 2,1-l-Wasserboxer (gegen Handbuch geprüft)
  .map((d) => (d.key === 'oil' && family && family !== 'wbx21' ? { ...d, hint: 'Ölmenge und Ölnorm stehen in deinem Handbuch.' } : d));

/**
 * Hebt Wartungspunkte auf die aktuellen Startwerte: fehlende Standardpunkte werden ergänzt,
 * unveränderte alte Platzhalter-Intervalle aktualisiert. Vom Nutzer geänderte Intervalle bleiben.
 * Gibt die geänderten/neuen Einträge zurück (ohne id/vehicleId für neue).
 */
export function upgradeServices(services, family) {
  const changed = [];
  for (const def of servicesFor(family)) {
    const s = services.find((x) => x.key === def.key);
    if (!s) { changed.push({ ...def, lastKm: null, lastDate: null }); continue; }
    const old = OLD_DEFAULTS[def.key];
    const untouched = old && s.intervalKm === old[0] && s.intervalMonths === old[1];
    if (untouched && (s.intervalKm !== def.intervalKm || s.intervalMonths !== def.intervalMonths || s.name !== def.name || s.hint !== def.hint)) {
      changed.push({ ...s, name: def.name, intervalKm: def.intervalKm, intervalMonths: def.intervalMonths, hint: def.hint });
    } else if (OLD_HINTS[def.key]?.includes(s.hint)) {
      changed.push({ ...s, hint: def.hint });
    }
  }
  return changed;
}

/** Sortierreihenfolge der Standardpunkte; eigene Punkte kommen danach. */
export const serviceOrder = (s) => {
  const i = DEFAULT_SERVICES.findIndex((d) => d.key === s.key);
  return i < 0 ? 100 : i;
};

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

/**
 * Letzter Stand eines Wartungspunkts: der jüngste Serviceheft-Eintrag zu diesem Punkt,
 * sonst der von Hand gesetzte Stand (z. B. „HU war im Oktober 2025“).
 */
export function withLastDone(s, log) {
  const entries = log.filter((l) => l.serviceKey === s.key && l.date)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.km || 0) - (b.km || 0));
  const e = entries[entries.length - 1];
  if (e && (!s.lastDate || e.date >= s.lastDate)) return { ...s, lastKm: e.km ?? s.lastKm, lastDate: e.date, lastFromLog: true };
  return { ...s, lastFromLog: false };
}
