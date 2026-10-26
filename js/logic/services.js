// Wartungsintervalle: Fälligkeit nach Kilometern und/oder Monaten – was zuerst eintritt.

export const SOON_KM = 1000;
export const SOON_DAYS = 45;

/**
 * Startwerte für den VW T3 mit Wasserboxer (Benziner). Werksangaben waren nicht verlässlich zu finden;
 * die Werte folgen dem Wartungsplan der T3-Fachwerkstatt GoWesty (Meilen umgerechnet und gerundet,
 * 3.500 mi ≈ 5.600 km, 15.000 mi ≈ 24.000 km, 30.000 mi ≈ 48.000 km). Alle Werte sind in der App änderbar.
 * Quelle: https://gowesty.com/blogs/article-library/maintenance-schedule-recommendation-vanagon
 * Version 3: Luftfilter, Kraftstofffilter und Zündzeitpunkt nach dem Wartungsplan in „Jetzt helfe ich mir selbst“ (alle 30.000 km).
 * Version 4: Sicherheits-Prüfpunkte. Prüfintervall „15.000 km oder jährlich“ nach dem Wartungsplan in
 * „Jetzt helfe ich mir selbst“ (Bremsanlage, Lenkungsspiel, Spurstangenköpfe, Traggelenke, Undichtigkeiten).
 * Kraftstoffschläuche erneuern (5 Jahre) ist kein Werkswert, sondern Empfehlung von T3-Fachleuten.
 */
export const DEFAULTS_VERSION = 4;
export const DEFAULT_SERVICES = [
  { key: 'hu', name: 'Hauptuntersuchung (HU)', intervalKm: null, intervalMonths: 24, hint: 'Fälligkeit steht auf der Plakette und im Fahrzeugschein.' },
  { key: 'oil', name: 'Ölwechsel + Ölfilter', intervalKm: 5500, intervalMonths: 12, hint: '4,5 l mit Filter, Öl nach VW 501 01 oder 500 00 – keine Longlife-Öle (503 00/506 00). Das Werk nannte 7.500 km (bis 7/85) bzw. 15.000 km (ab 8/85); T3 Hub startet mit der kürzeren Empfehlung der T3-Fachwerkstatt GoWesty. Du kannst das Intervall ändern.' },
  { key: 'plugs', name: 'Zündkerzen', intervalKm: 24000, intervalMonths: null, hint: '' },
  { key: 'ignition', name: 'Verteilerkappe, Verteilerfinger, Zündkabel', intervalKm: 48000, intervalMonths: null, hint: 'Kabel nur, wenn nötig.' },
  { key: 'timing', name: 'Zündzeitpunkt prüfen', intervalKm: 30000, intervalMonths: null, hint: 'Sollwert für deinen Motor: siehe Anleitung oder Sollwerte unter „Mehr“.' },
  { key: 'airfilter', name: 'Luftfilter wechseln', intervalKm: 30000, intervalMonths: null, hint: 'Alle 15.000 km reinigen.' },
  { key: 'fuelfilter', name: 'Kraftstofffilter', intervalKm: 30000, intervalMonths: null, hint: '' },
  { key: 'brakefluid', name: 'Bremsflüssigkeit', intervalKm: null, intervalMonths: 24, hint: 'DOT 4, unabhängig von den Kilometern.' },
  { key: 'coolant', name: 'Kühlmittel spülen und erneuern', intervalKm: null, intervalMonths: 24, hint: 'G11 (grün) oder G12 (rot) – nie mischen – mit destilliertem Wasser.' },
  { key: 'gearoil', name: 'Getriebeöl', intervalKm: 48000, intervalMonths: null, hint: 'Schaltgetriebe: API GL4, SAE 75W-90.' },
  // Sicherheits-Prüfpunkte (Version 4)
  { key: 'brakecheck', name: 'Bremsen prüfen (Schläuche, Leitungen, Beläge)', intervalKm: 15000, intervalMonths: 12, safety: true, hint: 'Bremsschläuche: Risse, Scheuerstellen, Aufquellen beim Treten? Dann tauschen. Leitungen auf Rost, Beläge auf Stärke. Die Beläge vorne laut Handbuch schon alle 7.500 km ansehen.' },
  { key: 'steering', name: 'Lenkung und Achsgelenke prüfen', intervalKm: 15000, intervalMonths: 12, safety: true, hint: 'Lenkungsspiel, Spurstangenköpfe, Traggelenke und ihre Manschetten. Spiel oder gerissene Manschette: bald in die Werkstatt – das betrifft die Lenkung.' },
  { key: 'fuelhoses', name: 'Kraftstoffschläuche prüfen', intervalKm: 15000, intervalMonths: 12, safety: true, hint: 'Risse, feuchte Stellen, Benzingeruch? Nicht fahren, erst tauschen. Undichte Kraftstoffschläuche sind beim T3 die häufigste Brandursache.' },
  { key: 'fuelhoses-new', name: 'Kraftstoffschläuche erneuern', intervalKm: null, intervalMonths: 60, safety: true, hint: 'Gummi altert auch von innen, man sieht es nicht immer. Kein Werkswert, sondern Empfehlung von T3-Fachleuten. Bei Einspritzern zwischen Pumpe und Einspritzleiste nur druckfesten Einspritzschlauch verwenden.' },
  { key: 'coolantpipes', name: 'Kühlmittelrohre und -schläuche prüfen', intervalKm: 15000, intervalMonths: 12, safety: true, hint: 'Die langen Rohre unter dem Bus nach vorne zum Kühler: Rost, Nässe, lockere Schellen? Typische T3-Schwachstelle – ein Leck kann den Motor überhitzen.' },
];

/** Gehört der Punkt zu den Sicherheits-Prüfpunkten? (nach Schlüssel, damit es auch für alte Einträge gilt) */
export const isSafety = (s) => !!DEFAULT_SERVICES.find((d) => d.key === s.key)?.safety;

/** Wartungspunkte, die nicht zu einem normalen Service gehören (beim „Alles auf einmal eintragen“ nicht vorab anhaken). */
export const NOT_IN_SERVICE = ['hu', 'fuelhoses-new'];

/** Bisherige Platzhalter (Version 1), damit unveränderte Einträge auf die neuen Werte gehoben werden können. */
export const OLD_DEFAULTS = {
  oil: [[7500, 12]], plugs: [[15000, 24]], brakefluid: [[null, 24]], coolant: [[null, 36]], hu: [[null, 24]],
  // Version 2 (GoWesty) → Version 3 (Wartungsplan „Jetzt helfe ich mir selbst“, 26.10.2026)
  fuelfilter: [[20000, null], [48000, null]], airfilter: [[48000, null]],
};

/** Frühere Hinweistexte: werden auf den aktuellen Text gehoben (auch wenn das Intervall geändert wurde). */
export const OLD_HINTS = {
  oil: ['4,5 l, Norm VW 500 00 / 501 01 / 502 00.', '4,5 l mit Filter, Öl nach VW 501 01 oder 500 00 – keine Longlife-Öle (503 00/506 00).'],
  coolant: ['Phosphatfreies Kühlmittel mit destilliertem Wasser.'],
};

/** Zusätzliche Wartungspunkte je Motor-Bauart (Wartungsplan „Jetzt helfe ich mir selbst“). */
export const EXTRA_SERVICES = {
  diesel: [
    { key: 'fuelwater', name: 'Kraftstofffilter entwässern', intervalKm: 7500, intervalMonths: 6, hint: 'Wasser aus dem Diesel-Kraftstofffilter ablassen.' },
    { key: 'valves', name: 'Ventilspiel prüfen', intervalKm: 30000, intervalMonths: null, hint: 'Warm messen (Kühlmittel ab 35 °C). Ventildeckeldichtung erneuern.' },
    { key: 'timingbelt-check', name: 'Zahnriemen prüfen (Zustand und Spannung)', intervalKm: 30000, intervalMonths: null, hint: 'Verölt, rissig, Zähne abgenutzt? Dann sofort ersetzen.' },
    { key: 'timingbelt', name: 'Zahnriemen wechseln', intervalKm: 120000, intervalMonths: null, hint: 'Reißt er, ist der Motor meist kaputt. Danach Förderbeginn einstellen lassen (Werkstatt).' },
  ],
};

/** Alle Standard- und Zusatzpunkte (z. B. für Prüfungen und die Sortierung). */
export const ALL_SERVICES = [...DEFAULT_SERVICES, ...Object.values(EXTRA_SERVICES).flat()];

/** Wartungspunkte, die es bei einer Motor-Bauart nicht gibt. */
const NOT_FOR = {
  diesel: ['plugs', 'ignition', 'timing'], // Diesel: keine Zündkerzen, keine Zündanlage
  luft: ['coolant', 'coolantpipes'], // Luftgekühlt: kein Kühlmittel
};

/** Standard-Wartungspunkte passend zur Motor-Bauart (unbekannt = alle). */
export const servicesFor = (family) => [...DEFAULT_SERVICES, ...(EXTRA_SERVICES[family] || [])]
  .filter((d) => !(NOT_FOR[family] || []).includes(d.key))
  // Ölmenge und Ölnorm im Hinweis gelten für die Wasserboxer (gegen Handbuch geprüft)
  .map((d) => (d.key === 'oil' && family === 'diesel' ? { ...d, intervalKm: 7500, intervalMonths: 6, hint: '4,5 l mit Filter (neuer Peilstab), Öl nach VW 505 00 – Ölfilter bei jedem Wechsel. Keine Longlife-Öle.' }
    : d.key === 'oil' && family && !['wbx21', 'wbx19'].includes(family) ? { ...d, hint: 'Ölmenge und Ölnorm stehen in deinem Handbuch.' } : d));

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
    const untouched = (OLD_DEFAULTS[def.key] || []).some(([km, mo]) => s.intervalKm === km && s.intervalMonths === mo);
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
  const i = ALL_SERVICES.findIndex((d) => d.key === s.key);
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
