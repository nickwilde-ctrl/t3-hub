// Lädt alle Daten des aktiven Fahrzeugs in den Speicher und stellt einfache Änderungsfunktionen bereit.
import * as db from './db.js';
import { servicesFor, upgradeServices, withLastDone, serviceOrder } from './logic/services.js';
import { STORE_NAMES } from './logic/backup.js';
import { matchTours, fuelKey } from './logic/roadtrip.js';
import { demoData } from './logic/demo.js';

export const state = {
  vehicle: null,
  lastBackup: null,
  fuels: [],
  services: [],
  log: [],
  needsSetup: false,
  tours: [],
  guides: [], // eigene Anleitungen
  wiring: null, // eigene Plandaten (Elektrik), nur auf diesem Gerät
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn(state));

/** Erstes Fahrzeug (ältestes) – oder null, wenn die App noch nicht eingerichtet ist. */
async function firstVehicle() {
  const vehicles = await db.getAll('vehicles');
  return vehicles.length ? vehicles.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] : null;
}

/**
 * Fahrzeug aus der Einrichtung anlegen.
 * setup: { name, photo, year, family, code, engine, km, oilKm, oilDate }
 */
export async function createVehicle(setup) {
  const today = new Date().toISOString().slice(0, 10);
  const vehicle = {
    id: db.newId(),
    name: setup.name,
    model: setup.year ? `VW T3 · Baujahr ${setup.year}` : 'VW T3',
    year: setup.year || null,
    plate: '',
    engine: setup.engine || '',
    engineFamily: setup.family || null,
    engineCode: setup.code || '',
    photo: setup.photo || null,
    facts: [],
    kmStart: setup.km != null ? { km: setup.km, date: today } : null,
    createdAt: new Date().toISOString(),
  };
  await db.put('vehicles', vehicle);
  await db.putMany('services', servicesFor(vehicle.engineFamily).map((s) => {
    const row = { ...s, id: db.newId(), vehicleId: vehicle.id, lastKm: null, lastDate: null };
    if (s.key === 'oil' && (setup.oilKm != null || setup.oilDate)) { row.lastKm = setup.oilKm ?? null; row.lastDate = setup.oilDate || null; }
    return row;
  }));
  await load();
  return vehicle;
}

/** Beispielbus zum Ausprobieren anlegen (vehicle.demo = true). */
export async function createDemo() {
  const d = demoData();
  const id = db.newId();
  const withIds = (list) => list.map((x) => ({ ...x, id: db.newId(), vehicleId: id }));
  const vehicle = { ...d.vehicle, id, mods: d.vehicle.mods.map((m) => ({ ...m, id: db.newId() })), kmStart: null, createdAt: new Date().toISOString() };
  await db.put('vehicles', vehicle);
  await db.putMany('services', servicesFor(vehicle.engineFamily).map((s) => ({ ...s, id: db.newId(), vehicleId: id, lastKm: d.serviceLast[s.key]?.km ?? null, lastDate: d.serviceLast[s.key]?.date ?? null })));
  await db.putMany('fuels', withIds(d.fuels));
  await db.putMany('log', withIds(d.log));
  await db.putMany('tours', withIds(d.tours).map((t) => ({ ...t, expenses: t.expenses.map((e) => ({ ...e, id: db.newId() })), journal: t.journal.map((j) => ({ ...j, id: db.newId() })) })));
  await load();
}

/** Alles auf diesem Gerät löschen (z. B. Beispielbus verlassen). Danach startet die Einrichtung. */
export async function resetAll() {
  await db.replaceAll({});
  await db.setMeta('lastBackup', null);
  await load();
}

export async function load() {
  state.vehicle = await firstVehicle();
  state.needsSetup = !state.vehicle;
  if (!state.vehicle) { emit(); return; }
  const id = state.vehicle.id;
  let wiring;
  [state.fuels, state.services, state.log, state.tours, state.guides, wiring] = await Promise.all(
    ['fuels', 'services', 'log', 'tours', 'guides', 'wiring'].map((n) => db.getByVehicle(n, id)),
  );
  state.wiring = wiring[0] || null;
  state.lastBackup = (await db.getMeta('lastBackup')) || null;
  // Wartungspunkte auf die aktuellen Startwerte heben (fehlende ergänzen, unveränderte Platzhalter aktualisieren)
  const upgrades = upgradeServices(state.services, state.vehicle.engineFamily).map((x) => ({ ...x, id: x.id || db.newId(), vehicleId: id }));
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

/** Plandaten speichern (ersetzt vorhandene des aktiven Fahrzeugs). */
export async function saveWiring(obj) {
  const { format, version, title, source, createdAt, wires, fuses, map } = obj;
  const row = { id: state.wiring?.id || db.newId(), vehicleId: state.vehicle.id, format, version, title: title || '', source: source || '', createdAt: createdAt || null, importedAt: new Date().toISOString(), wires, fuses: fuses || [], map: map || null };
  await db.put('wiring', row);
  state.wiring = row;
  emit();
}

export async function removeWiring() {
  if (state.wiring) await db.remove('wiring', state.wiring.id);
  state.wiring = null;
  emit();
}

/** Fotos und Rechnungen eines Serviceheft-Eintrags (mit Bilddaten). */
export const filesForLog = (logId) => db.getByIndex('files', 'logId', logId);

/** Speichert neue Anhänge und löscht entfernte. Gibt die Kurzinfo für den Eintrag zurück. */
export async function syncFiles(logId, keep, added) {
  const old = await filesForLog(logId);
  const keepIds = new Set(keep.map((f) => f.id));
  for (const f of old) if (!keepIds.has(f.id)) await db.remove('files', f.id);
  const rows = added.map((f) => ({ ...f, id: f.id || db.newId(), logId, vehicleId: state.vehicle.id, createdAt: new Date().toISOString() }));
  if (rows.length) await db.putMany('files', rows);
  return [...keep, ...rows].map(({ id, kind, name, mime }) => ({ id, kind, name, mime }));
}

/** Serviceheft-Eintrag samt seinen Fotos und Rechnungen löschen. */
export async function deleteLog(id) {
  for (const f of await filesForLog(id)) await db.remove('files', f.id);
  await deleteItem('log', id);
}

/** Aktueller Kilometerstand: der höchste bekannte Wert aus allen Einträgen. */
export function currentKm() {
  return Math.max(
    0,
    state.vehicle?.kmStart?.km || 0,
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
