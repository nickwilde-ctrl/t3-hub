// Einstieg „So fängst du an“: welche Schritte offen sind (ohne DOM).
import { serviceStatus } from './services.js';

/** Erfahrung des Nutzers: 'neu' (erster T3) oder 'erfahren'. Ohne Angabe gilt 'neu'. */
export const experienceOf = (vehicle) => (vehicle?.experience === 'erfahren' ? 'erfahren' : 'neu');

/** Wartungspunkte ohne eingetragenes letztes Mal. */
export const unknownServices = (services, km) => services.filter((s) => serviceStatus(s, km).state === 'unknown');

/**
 * Schritte für Einsteiger. services = Wartungspunkte mit letztem Stand (store.services()).
 * Gibt [{ id, done }] zurück; die Texte stehen in der Ansicht.
 */
export function startSteps(services, km) {
  const known = (key) => { const s = services.find((x) => x.key === key); return !s || serviceStatus(s, km).state !== 'unknown'; };
  return [
    { id: 'km', done: km > 0 },
    { id: 'hu', done: known('hu') },
    { id: 'oil', done: known('oil') },
    { id: 'rest', done: unknownServices(services, km).length === 0 },
  ];
}

/** Karte zeigen? Nicht beim Beispielbus, nicht wenn ausgeblendet, nicht wenn alles erledigt ist. */
export function showStart(vehicle, services, km) {
  if (!vehicle || vehicle.demo || vehicle.startHidden) return false;
  return startSteps(services, km).some((s) => !s.done);
}
