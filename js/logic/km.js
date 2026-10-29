// Kilometerstand von Hand eintragen: Prüfung ohne DOM.

/** Größter Sprung, der ohne Rückfrage durchgeht (etwa ein halbes Jahr viel fahren). */
export const BIG_JUMP_KM = 20000;

/**
 * Prüft einen neuen Kilometerstand gegen den bisher höchsten.
 * Gibt { error } (nicht speichern), { warnings: [...] } (nachfragen) oder {} (in Ordnung) zurück.
 */
export function checkKm(value, current = 0) {
  const km = typeof value === 'number' ? value : Number(String(value ?? '').replace(/\./g, '').replace(',', '.').trim());
  if (!Number.isFinite(km) || km <= 0) return { error: 'Bitte einen Kilometerstand eintragen.' };
  if (km > 2000000) return { error: 'Das ist mehr, als ein Tacho anzeigen kann. Tippfehler?' };
  if (km < current) return { error: `Der Stand ist niedriger als der bisher höchste (${current.toLocaleString('de-DE')} km). Tippfehler? Einen Tachotausch kann die App noch nicht eintragen.` };
  if (km - current > BIG_JUMP_KM && current > 0) return { km, warnings: [`Das sind ${(km - current).toLocaleString('de-DE')} km mehr als bisher. Stimmt das?`] };
  return { km };
}

/** Tage von `date` bis `today` (beide „JJJJ-MM-TT“). */
const daysBetween = (date, today) => Math.round((Date.UTC(...today.split('-').map((n, i) => (i === 1 ? n - 1 : +n))) - Date.UTC(...date.split('-').map((n, i) => (i === 1 ? n - 1 : +n)))) / 864e5);

/** Bis wie viele Tage zurück ein niedrigerer Stand als der bisherige höchste fast sicher ein Tippfehler ist. */
export const RECENT_DAYS = 7;

/**
 * Kilometerangabe in einem Serviceheft-Formular prüfen (Eintrag, Service, Neuer Eintrag).
 * Anders als beim Tachostand im Cockpit wird ein niedrigerer Wert nicht abgelehnt: alte Einträge nachzutragen ist erlaubt.
 * Gibt {} (leer oder in Ordnung), { warnings: [...] } (nachfragen) oder { error } zurück.
 * edit = ein vorhandener Eintrag wird geändert (dann kein Hinweis auf „zu niedrig“, sonst ließe sich ein Tippfehler nicht korrigieren).
 */
export function checkEntryKm(value, { current = 0, date = '', today = '', edit = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return {};
  const km = typeof value === 'number' ? value : Number(raw.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(km) || km < 0) return {};
  if (km > 2000000) return { error: 'Das ist mehr, als ein Tacho anzeigen kann. Tippfehler?' };
  const de = (n) => n.toLocaleString('de-DE');
  const warnings = [];
  if (current > 0 && km - current > BIG_JUMP_KM) warnings.push(`Das sind ${de(km - current)} km mehr als bisher (${de(current)} km). Stimmt das?`);
  if (!edit && current > 0 && km < current && date && today && daysBetween(date, today) <= RECENT_DAYS) {
    warnings.push(`Der Stand ist niedriger als der bisher höchste (${de(current)} km), das Datum ist aber (fast) heute. Tippfehler?`);
  }
  return warnings.length ? { warnings } : {};
}
