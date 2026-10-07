// Lädt alle Daten des aktiven Fahrzeugs in den Speicher und stellt einfache Änderungsfunktionen bereit.
import * as db from './db.js';
import { DEFAULT_SERVICES, upgradeServices, withLastDone, serviceOrder } from './logic/services.js';
import { STORE_NAMES } from './logic/backup.js';
import { matchTours, fuelKey } from './logic/roadtrip.js';

export const state = {
  vehicle: null,
  lastBackup: null,
  fuels: [],
  services: [],
  log: [],
  tours: [],
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn(state));

/** Legt beim allerersten Start ein Fahrzeug mit den Standard-Wartungspunkten an. */
async function ensureVehicle() {
  const vehicles = await db.getAll('vehicles');
  if (vehicles.length) return vehicles.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const vehicle = {
    id: db.newId(),
    name: 'Mein T3',
    model: 'VW T3',
    plate: '',
    engine: '',
    photo: null,
    facts: [],
    createdAt: new Date().toISOString(),
  };
  await db.put('vehicles', vehicle);
  await db.putMany('services', DEFAULT_SERVICES.map((s) => ({ ...s, id: db.newId(), vehicleId: vehicle.id, lastKm: null, lastDate: null })));
  return vehicle;
}

export async function load() {
  state.vehicle = await ensureVehicle();
  const id = state.vehicle.id;
  [state.fuels, state.services, state.log, state.tours] = await Promise.all(
    ['fuels', 'services', 'log', 'tours'].map((n) => db.getByVehicle(n, id)),
  );
  state.lastBackup = (await db.getMeta('lastBackup')) || null;
  // Wartungspunkte auf die aktuellen Startwerte heben (fehlende ergänzen, unveränderte Platzhalter aktualisieren)
  const upgrades = upgradeServices(state.services).map((x) => ({ ...x, id: x.id || db.newId(), vehicleId: id }));
  if (upgrades.length) {
    await db.putMany('services', upgrades);
    state.services = await db.getByVehicle('services', id);
  }
  emit();
}

/** Wartungspunkte mit ihrem tatsächlichen letzten Stand (Serviceheft oder Handeingabe), sortiert. */
export function services() {
  return state.services.map((s) => withLastDone(s, state.log)).sort((a, b) => serviceOrder(a) - serviceOrder(b) || a.name.localeCompare(b.name));
}

export async function saveVehicle(vehicle) {
  await db.put('vehicles', vehicle);
  state.vehicle = vehicle;
  emit();
}

/** Speichert einen Datensatz (neu oder geändert) in einer Liste des aktiven Fahrzeugs. */
export async function saveItem(name, item) {
  const row = { ...item, id: item.id || db.newId(), vehicleId: state.vehicle.id };
  await db.put(name, row);
  const list = state[name];
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = row; else list.push(row);
  emit();
  return row;
}

/** Mehrere Datensätze auf einmal speichern (z. B. Tankungen einer Tour zuordnen). */
export async function saveMany(name, items) {
  const rows = items.map((item) => ({ ...item, id: item.id || db.newId(), vehicleId: state.vehicle.id }));
  await db.putMany(name, rows);
  for (const row of rows) {
    const i = state[name].findIndex((x) => x.id === row.id);
    if (i >= 0) state[name][i] = row; else state[name].push(row);
  }
  emit();
}

export async function deleteItem(name, id) {
  await db.remove(name, id);
  state[name] = state[name].filter((x) => x.id !== id);
  emit();
}

/** Aktueller Kilometerstand: der höchste bekannte Wert aus allen Einträgen. */
export function currentKm() {
  return Math.max(
    0,
    ...state.fuels.map((f) => f.km),
    ...state.log.map((l) => l.km || 0),
    ...state.tours.map((t) => t.endKm || t.startKm || 0),
  );
}

/** Alle Daten aller Fahrzeuge für das Backup. */
export async function exportAll() {
  const entries = await Promise.all(STORE_NAMES.map(async (n) => [n, await db.getAll(n)]));
  return Object.fromEntries(entries);
}

export async function markBackup(iso = new Date().toISOString()) {
  await db.setMeta('lastBackup', iso);
  state.lastBackup = iso;
  emit();
}

/** Backup wiederherstellen: ersetzt alle Daten auf diesem Gerät. */
export async function restoreAll(data) {
  await db.replaceAll(data);
  await load();
}

/**
 * Road-Trip-Daten ins aktive Fahrzeug übernehmen. Bereits vorhandene Tankungen (gleiches Datum, km, Liter) werden übersprungen.
 * tourRefs: welche Touren übernommen werden sollen.
 */
export async function importRoadTrip(parsed, tourRefs) {
  const vid = state.vehicle.id;
  const tours = parsed.tours.filter((t) => tourRefs.includes(t.ref)).map(({ ref, ...t }) => ({ ...t, id: db.newId(), vehicleId: vid }));
  const existing = new Set(state.fuels.map(fuelKey));
  const fresh = parsed.fuels.filter((f) => !existing.has(fuelKey(f)));
  const idx = matchTours(fresh, tours);
  const fuels = fresh.map((f, i) => ({ ...f, id: db.newId(), vehicleId: vid, tourId: idx[i] >= 0 ? tours[idx[i]].id : null }));
  const logKeys = new Set(state.log.map((l) => `${l.date}|${l.title}`));
  const log = parsed.log.filter((l) => !logKeys.has(`${l.date}|${l.title}`)).map((l) => ({ ...l, id: db.newId(), vehicleId: vid }));
  if (tours.length) await db.putMany('tours', tours);
  if (fuels.length) await db.putMany('fuels', fuels);
  if (log.length) await db.putMany('log', log);
  await load();
  return { fuels: fuels.length, duplicates: parsed.fuels.length - fresh.length, tours: tours.length, log: log.length };
}
