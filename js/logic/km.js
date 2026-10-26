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
  if (km < current) return { error: `Der Stand ist niedriger als der bisher höchste (${current.toLocaleString('de-DE')} km). Tippfehler? Wurde der Tacho getauscht, trag das bitte im Serviceheft ein.` };
  if (km - current > BIG_JUMP_KM && current > 0) return { km, warnings: [`Das sind ${(km - current).toLocaleString('de-DE')} km mehr als bisher. Stimmt das?`] };
  return { km };
}
