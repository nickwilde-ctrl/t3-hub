// Backup-Datei: alle Daten als JSON. Format bewusst einfach und lesbar, damit es lange gültig bleibt.

export const BACKUP_FORMAT = 't3hub-backup';
export const BACKUP_VERSION = 1;
export const STORE_NAMES = ['vehicles', 'fuels', 'services', 'log', 'tours'];

export function buildBackup(data, now = new Date()) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    ...Object.fromEntries(STORE_NAMES.map((n) => [n, data[n] || []])),
  };
}

/** Prüft eine eingelesene Backup-Datei. Gibt { ok, error, counts } zurück. */
export function checkBackup(obj) {
  if (!obj || typeof obj !== 'object' || obj.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'Das ist keine T3-Hub-Backup-Datei.' };
  }
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    return { ok: false, error: 'Diese Backup-Datei stammt aus einer neueren Version der App. Bitte die App aktualisieren.' };
  }
  for (const n of STORE_NAMES) {
    if (!Array.isArray(obj[n])) return { ok: false, error: `Die Backup-Datei ist unvollständig (${n} fehlt).` };
    if (obj[n].some((x) => !x || typeof x.id !== 'string')) return { ok: false, error: 'Die Backup-Datei ist beschädigt.' };
  }
  if (!obj.vehicles.length) return { ok: false, error: 'In der Backup-Datei ist kein Fahrzeug enthalten.' };
  return { ok: true, counts: Object.fromEntries(STORE_NAMES.map((n) => [n, obj[n].length])) };
}

/** Tage seit dem letzten Backup (null = noch nie). */
export function daysSince(iso, now = new Date()) {
  if (!iso) return null;
  return Math.floor((now - new Date(iso)) / 864e5);
}

export const backupFileName = (vehicleName, now = new Date()) =>
  `T3-Hub-Backup_${(vehicleName || 'T3').replace(/[^\p{L}\p{N}-]+/gu, '-')}_${now.toISOString().slice(0, 10)}.json`;
