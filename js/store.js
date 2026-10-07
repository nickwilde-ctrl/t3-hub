// Lädt alle Daten des aktiven Fahrzeugs in den Speicher und stellt einfache Änderungsfunktionen bereit.
import * as db from './db.js';
import { DEFAULT_SERVICES } from './logic/services.js';

export const state = {
  vehicle: null,
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
