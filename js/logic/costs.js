// Touren- und Kostenauswertung. Reine Funktionen, testbar ohne Browser.
import { cost } from './fuel.js';

export const COST_CATEGORIES = ['Kraftstoff', 'Wartung', 'Reparatur', 'Ausbau', 'Reise', 'Sonstiges'];

/** Kennzahlen einer Tour. Ohne End-km zählt der aktuelle Stand (Tour läuft noch). */
export function tourStats(tour, fuels, currentKm) {
  const fs = fuels.filter((f) => f.tourId === tour.id);
  const fuelCost = fs.reduce((a, f) => a + cost(f), 0);
  const liters = fs.reduce((a, f) => a + f.liters, 0);
  const endKm = tour.endKm ?? currentKm;
  const km = Math.max(0, (endKm ?? tour.startKm) - tour.startKm);
  const from = new Date(tour.from + 'T00:00:00');
  const to = tour.to ? new Date(tour.to + 'T00:00:00') : null;
  const days = to ? Math.round((to - from) / 864e5) + 1 : null;
  const total = fuelCost + (tour.otherCost || 0);
  return { fuels: fs, fuelCost, liters, km, days, total, per100: km > 0 ? (total / km) * 100 : null, running: !tour.endKm };
}

/** Tankungen, die zu einer Tour passen: Datum im Zeitraum und – wenn bekannt – km im Bereich. */
export function fuelsInTour(tour, fuels) {
  return fuels.filter((f) => {
    if (f.date < tour.from) return false;
    if (tour.to && f.date > tour.to) return false;
    if (tour.startKm != null && f.km < tour.startKm) return false;
    if (tour.endKm != null && f.km > tour.endKm) return false;
    return true;
  });
}

/** Die Tour, die gerade läuft (kein Ende eingetragen, Start nicht in der Zukunft). */
export function runningTour(tours, todayIso) {
  return tours.filter((t) => !t.endKm && t.from <= todayIso).sort((a, b) => b.from.localeCompare(a.from))[0] || null;
}

/** Jahre, in denen es Einträge gibt, neueste zuerst. */
export function costYears({ fuels, log, tours }) {
  const ys = new Set([...fuels, ...log].map((x) => x.date.slice(0, 4)));
  tours.forEach((t) => ys.add(t.from.slice(0, 4)));
  return [...ys].sort().reverse();
}

/** Kosten nach Art. year = '2026' oder null für alles. */
export function costsByCategory({ fuels, log, tours }, year = null) {
  const inYear = (d) => !year || d.startsWith(year);
  const c = Object.fromEntries(COST_CATEGORIES.map((k) => [k, 0]));
  fuels.filter((f) => inYear(f.date)).forEach((f) => (c.Kraftstoff += cost(f)));
  log.filter((l) => inYear(l.date)).forEach((l) => {
    const k = COST_CATEGORIES.includes(l.category) ? l.category : 'Sonstiges';
    c[k] += l.cost || 0;
  });
  tours.filter((t) => inYear(t.from)).forEach((t) => (c.Reise += t.otherCost || 0));
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  return { byCategory: c, total };
}
