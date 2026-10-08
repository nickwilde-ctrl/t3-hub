// Plausibilitätsprüfung für Tankungen: findet Werte, die „komisch“ aussehen.
// Das sind nur Hinweise – der Nutzer kann trotzdem speichern.
import { withConsumption } from './fuel.js';
import { de, fmtDate } from '../format.js';

export const DEFAULT_TANK_LITERS = 60;
export const MAX_KM_BETWEEN = 900; // mehr als eine Tankfüllung beim T3
export const PRICE_DEVIATION = 0.2; // 20 % Abweichung vom Schnitt der letzten Tankungen
export const CONS_MIN = 6;
export const CONS_MAX = 30;

const byDateKm = (a, b) => a.date.localeCompare(b.date) || a.km - b.km;

/**
 * @param entry  die neue oder geänderte Tankung { id?, date, km, liters, pricePerLiter, full }
 * @param fuels  alle gespeicherten Tankungen des Fahrzeugs
 * @returns Liste von { code, text }
 */
export function fuelWarnings(entry, fuels, { tankLiters = DEFAULT_TANK_LITERS, today = new Date() } = {}) {
  const out = [];
  const add = (code, text) => out.push({ code, text });
  const others = fuels.filter((f) => f.id !== entry.id).sort(byDateKm);
  const todayIso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  if (entry.date > todayIso) add('future', 'Das Datum liegt in der Zukunft.');

  const before = others.filter((f) => byDateKm(f, entry) <= 0 || f.date <= entry.date);
  const prev = before[before.length - 1];
  const next = others.find((f) => f.date > entry.date);

  if (prev && entry.km < prev.km) {
    add('km-lower', `Der Kilometerstand ist niedriger als bei der Tankung am ${fmtDate(prev.date)} (${de(prev.km)} km).`);
  }
  if (next && entry.km > next.km) {
    add('km-higher', `Der Kilometerstand ist höher als bei der späteren Tankung am ${fmtDate(next.date)} (${de(next.km)} km).`);
  }
  if (prev && entry.km - prev.km > MAX_KM_BETWEEN) {
    add('km-gap', `Seit der letzten Tankung sind es ${de(entry.km - prev.km)} km – mehr als eine Tankfüllung. Fehlt eine Tankung?`);
  }

  if (entry.liters > tankLiters * 1.1) {
    add('liters', `${de(entry.liters, 1)} Liter sind mehr, als in den Tank passen (${de(tankLiters)} l).`);
  }

  const recent = before.slice(-5);
  if (recent.length >= 3) {
    const avg = recent.reduce((a, f) => a + f.pricePerLiter, 0) / recent.length;
    if (Math.abs(entry.pricePerLiter - avg) / avg > PRICE_DEVIATION) {
      add('price', `Der Literpreis weicht stark von deinen letzten Tankungen ab (Schnitt ${de(avg, 3)} €/l). Tippfehler?`);
    }
  }

  if (entry.full) {
    const probe = { ...entry, id: entry.id || '__neu__' };
    const row = withConsumption([...others, probe]).find((r) => r.id === probe.id);
    if (row && row.cons != null && (row.cons < CONS_MIN || row.cons > CONS_MAX)) {
      add('cons', `Das ergibt ${de(row.cons, 1)} l/100 km. War die vorige Volltankung wirklich voll, oder fehlt eine Tankung?`);
    }
  }
  return out;
}
