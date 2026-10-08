// Einstieg: Daten laden, Navigation, Bildschirme zeichnen.
import { state, load, onChange, currentKm, saveVehicle, saveItem, saveMany, deleteItem, services, exportAll, markBackup, restoreAll, importRoadTrip } from './store.js';
import { requestPersistence } from './db.js';
import { fuelStats } from './logic/fuel.js';
import { serviceStatus } from './logic/services.js';
import { cockpit } from './views/cockpit.js';
import { homeView } from './views/home.js';
import { vehicleCard, editVehicleSheet, photoFrameSheet } from './views/vehicle.js';
import { toast } from './views/sheet.js';
import { readPhoto } from './photo.js';
import { tankenView, fuelSheet, setSub } from './views/tanken.js';
import { wartungView, serviceSheet, newServiceSheet, logSheet } from './views/wartung.js';
import { tourenView, tourSheet, costCard, setCostYear, setOpenTour, getOpenTour, expenseSheet, journalSheet, runningCard } from './views/touren.js';
import { stopSheet, openMapView } from './views/stops.js';
import { dataCard, backupReminder, createBackup, restoreFromFile, roadTripFromFile } from './views/daten.js';
import { installCard } from './views/install.js';

const TABS = [
  ['home', 'Home', '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>'],
  ['wartung', 'Wartung', '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>'],
  ['tanken', 'Tanken', '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9M14 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>'],
  ['touren', 'Touren', '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>'],
  ['mehr', 'Mehr', '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'],
];

const currentTour = () => state.tours.find((x) => x.id === getOpenTour());

let tab = (location.hash || '#home').slice(1);
if (!TABS.some(([id]) => id === tab)) tab = 'home';

const VIEWS = {
  home: () => backupReminder(state) + runningCard(state) + homeView({ services: services(), fuels: state.fuels, km: currentKm() }),
  wartung: () => wartungView(services(), state.log, currentKm()),
  tanken: () => tankenView(state),
  touren: () => tourenView(state, currentKm()),
  mehr: () => costCard(state, currentKm()) + vehicleCard(state.vehicle)
    + dataCard(state)
    + installCard()
    + '<p class="foot">T3 Hub · Version 0.12 · Deine Daten bleiben auf diesem Gerät.</p>',
};

function render() {
  if (!state.vehicle) return;
  const s = fuelStats(state.fuels);
  const km = currentKm();
  const st = services().map((x) => serviceStatus(x, km));
  document.getElementById('cockpit').innerHTML = cockpit({
    vehicle: state.vehicle,
    km,
    avg: s.avgConsumption,
    last: s.lastConsumption,
    due: st.filter((x) => x.state === 'over' || x.state === 'soon').length,
    unknown: st.filter((x) => x.state === 'unknown').length,
  });
  document.getElementById('tabs').innerHTML = TABS.map(
    ([id, label, icon]) =>
      `<button type="button" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${label}</button>`,
  ).join('');
  document.getElementById('view').innerHTML = VIEWS[tab]();
}

document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]');
  if (action && action.dataset.action === 'photo-frame') {
    photoFrameSheet(state.vehicle, saveVehicle);
    return;
  }
  if (action && action.dataset.action === 'edit-vehicle') {
    editVehicleSheet(state.vehicle, saveVehicle);
    return;
  }
  const fuelOps = { save: (f) => saveItem('fuels', f), remove: (id) => deleteItem('fuels', id), currentKm: currentKm() };
  if (action && action.dataset.action === 'add-fuel') {
    fuelSheet(state, null, fuelOps);
    return;
  }
  const editFuel = e.target.closest('[data-edit-fuel]');
  if (editFuel) {
    fuelSheet(state, state.fuels.find((f) => f.id === editFuel.dataset.editFuel), fuelOps);
    return;
  }
  const wOps = {
    km: currentKm(),
    services: services(),
    saveService: (x) => saveItem('services', x),
    removeService: (id) => deleteItem('services', id),
    saveLog: (x) => saveItem('log', x),
    removeLog: (id) => deleteItem('log', id),
  };
  const editService = e.target.closest('[data-edit-service]');
  if (editService) {
    const id = editService.dataset.editService;
    serviceSheet(services().find((x) => x.id === id), state.services.find((x) => x.id === id), wOps);
    return;
  }
  if (action && action.dataset.action === 'add-service') { newServiceSheet(wOps.saveService); return; }
  if (action && action.dataset.action === 'add-log') { logSheet(null, wOps); return; }
  const editLog = e.target.closest('[data-edit-log]');
  if (editLog) { logSheet(state.log.find((x) => x.id === editLog.dataset.editLog), wOps); return; }
  const tOps = {
    km: currentKm(),
    saveTour: (x) => saveItem('tours', x),
    removeTour: (id) => deleteItem('tours', id),
    saveFuels: (list) => saveMany('fuels', list),
  };
  if (action && action.dataset.action === 'backup') { createBackup(exportAll, markBackup, state.vehicle.name); return; }
  if (action && action.dataset.action === 'add-tour') { tourSheet(state, null, tOps); return; }
  const openTour = e.target.closest('[data-open-tour]');
  if (openTour) {
    setOpenTour(openTour.dataset.openTour);
    tab = 'touren';
    history.replaceState(null, '', '#touren');
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (action && action.dataset.action === 'close-tour') { setOpenTour(null); render(); window.scrollTo(0, 0); return; }
  if (action && action.dataset.action === 'add-expense') { expenseSheet(currentTour(), null, tOps.saveTour); return; }
  if (action && action.dataset.action === 'add-journal') { journalSheet(currentTour(), null, tOps.saveTour); return; }
  if (action && action.dataset.action === 'add-stop') {
    const t = state.tours.find((x) => x.id === (action.dataset.tour || getOpenTour()));
    if (t) stopSheet(t, null, tOps.saveTour);
    return;
  }
  if (action && action.dataset.action === 'open-map') {
    const t = currentTour();
    if (t) openMapView(t, (id) => stopSheet(t, (t.stops || []).find((x) => x.id === id), tOps.saveTour));
    return;
  }
  const editStop = e.target.closest('[data-edit-stop]');
  if (editStop) { const t = currentTour(); if (t) stopSheet(t, (t.stops || []).find((x) => x.id === editStop.dataset.editStop), tOps.saveTour); return; }
  const editExpense = e.target.closest('[data-edit-expense]');
  if (editExpense) { const t = currentTour(); expenseSheet(t, t.expenses.find((x) => x.id === editExpense.dataset.editExpense), tOps.saveTour); return; }
  const editJournal = e.target.closest('[data-edit-journal]');
  if (editJournal) { const t = currentTour(); journalSheet(t, t.journal.find((x) => x.id === editJournal.dataset.editJournal), tOps.saveTour); return; }
  const editTour = e.target.closest('[data-edit-tour]');
  if (editTour) { tourSheet(state, state.tours.find((x) => x.id === editTour.dataset.editTour), tOps); return; }
  const yearBtn = e.target.closest('[data-cost-year]');
  if (yearBtn) { setCostYear(yearBtn.dataset.costYear); render(); return; }
  const subBtn = e.target.closest('[data-sub]');
  if (subBtn) {
    setSub(subBtn.dataset.sub);
    render();
    return;
  }
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab === 'touren' && b.closest('nav')) setOpenTour(null);
  tab = b.dataset.tab;
  history.replaceState(null, '', '#' + tab);
  render();
  window.scrollTo(0, 0);
});

document.addEventListener('change', async (e) => {
  const file0 = e.target.files && e.target.files[0];
  if (e.target.id === 'restore-in' && file0) { await restoreFromFile(file0, restoreAll); e.target.value = ''; return; }
  if (e.target.id === 'roadtrip-in' && file0) { await roadTripFromFile(file0, importRoadTrip); e.target.value = ''; return; }
  if (e.target.id !== 'photo-in') return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const photo = await readPhoto(file);
    await saveVehicle({ ...state.vehicle, photo });
    toast('Foto gespeichert');
  } catch {
    toast('Das Foto konnte nicht gelesen werden');
  }
});

onChange(render);

(async () => {
  try {
    await load();
    requestPersistence();
  } catch (err) {
    document.getElementById('view').innerHTML =
      `<div class="card soon-card"><h3>Daten konnten nicht geladen werden</h3><p>Der Browser erlaubt hier keine Speicherung (zum Beispiel im privaten Modus). Öffne die App in einem normalen Safari-Fenster.</p></div>`;
    console.error(err);
  }
})();

if ('serviceWorker' in navigator) {
  // Neue Version übernommen → Seite einmal neu laden, damit alle Dateien zusammenpassen.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch(console.error);
  });
}
