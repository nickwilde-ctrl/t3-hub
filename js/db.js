// Dauerhafte Speicherung im Browser (IndexedDB). Alle Daten bleiben auf dem Gerät.
// Jeder Datensatz außer dem Fahrzeug selbst trägt eine vehicleId – so sind später mehrere Fahrzeuge möglich.

const DB_NAME = 't3hub';
const DB_VERSION = 1;
export const STORES = ['vehicles', 'fuels', 'services', 'log', 'tours'];

let dbPromise = null;

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore('vehicles', { keyPath: 'id' });
      for (const name of ['fuels', 'services', 'log', 'tours']) {
        const s = db.createObjectStore(name, { keyPath: 'id' });
        s.createIndex('vehicleId', 'vehicleId');
      }
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbPromise;
}

async function store(name, mode = 'readonly') {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function getAll(name) {
  return req((await store(name)).getAll());
}

export async function getByVehicle(name, vehicleId) {
  return req((await store(name)).index('vehicleId').getAll(vehicleId));
}

export async function put(name, value) {
  await req((await store(name, 'readwrite')).put(value));
  return value;
}

export async function putMany(name, values) {
  const db = await openDb();
  const tx = db.transaction(name, 'readwrite');
  const s = tx.objectStore(name);
  values.forEach((v) => s.put(v));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(values.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function remove(name, id) {
  return req((await store(name, 'readwrite')).delete(id));
}

/** Ersetzt den kompletten Inhalt aller Listen in einem Schritt (für das Wiederherstellen eines Backups). */
export async function replaceAll(data) {
  const db = await openDb();
  const tx = db.transaction(STORES, 'readwrite');
  for (const name of STORES) {
    const s = tx.objectStore(name);
    s.clear();
    (data[name] || []).forEach((row) => s.put(row));
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getMeta(key) {
  const row = await req((await store('meta')).get(key));
  return row ? row.value : undefined;
}

export async function setMeta(key, value) {
  return req((await store('meta', 'readwrite')).put({ key, value }));
}

/**
 * Bittet den Browser, die Daten nicht automatisch zu löschen, wenn der Speicher knapp wird.
 * Auf dem iPhone wirkt das am zuverlässigsten, wenn die App vom Home-Bildschirm gestartet wird.
 */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch { /* nicht unterstützt */ }
  return false;
}

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
