// Einstieg: Daten laden, Navigation, Bildschirme zeichnen.
import { state, load, onChange, currentKm, saveVehicle, saveItem, deleteItem } from './store.js';
import { requestPersistence } from './db.js';
import { fuelStats } from './logic/fuel.js';
import { serviceStatus } from './logic/services.js';
import { cockpit } from './views/cockpit.js';
import { homeView, comingSoon } from './views/home.js';
import { vehicleCard, editVehicleSheet } from './views/vehicle.js';
import { toast } from './views/sheet.js';
import { readPhoto } from './photo.js';
import { tankenView, fuelSheet, setSub } from './views/tanken.js';

const TABS = [
  ['home', 'Home', '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>'],
  ['wartung', 'Wartung', '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>'],
  ['tanken', 'Tanken', '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9M14 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>'],
  ['touren', 'Touren', '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>'],
  ['mehr', 'Mehr', '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'],
];

let tab = (location.hash || '#home').slice(1);
if (!TABS.some(([id]) => id === tab)) tab = 'home';

const VIEWS = {
  home: () => homeView({ services: state.services, fuels: state.fuels, km: currentKm() }),
  wartung: () => comingSoon('Wartung und Serviceheft', '2.5', 'Intervalle mit den richtigen Werten für deinen Motor, Serviceheft und Fälligkeits-Ampel.'),
  tanken: () => tankenView(state),
  touren: () => comingSoon('Touren und Kosten', '2.6', 'Echte Reisen mit zugeordneten Tankungen und sonstigen Kosten.'),
  mehr: () => vehicleCard(state.vehicle)
    + comingSoon('Backup und Import', '2.7', 'Daten als Datei sichern und deine Tankungen aus Road Trip übernehmen.')
    + '<p class="foot">T3 Hub · Version 0.4 · Deine Daten bleiben auf diesem Gerät.</p>',
};

function render() {
  if (!state.vehicle) return;
  const s = fuelStats(state.fuels);
  const km = currentKm();
  const st = state.services.map((x) => serviceStatus(x, km));
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
  const subBtn = e.target.closest('[data-sub]');
  if (subBtn) {
    setSub(subBtn.dataset.sub);
    render();
    return;
  }
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  history.replaceState(null, '', '#' + tab);
  render();
  window.scrollTo(0, 0);
});

document.addEventListener('change', async (e) => {
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
