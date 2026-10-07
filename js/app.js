// Einstieg: Daten laden, Navigation, Bildschirme zeichnen.
import { state, load, onChange, currentKm } from './store.js';
import { requestPersistence } from './db.js';
import { fuelStats } from './logic/fuel.js';
import { serviceStatus } from './logic/services.js';
import { cockpit } from './views/cockpit.js';
import { homeView, comingSoon } from './views/home.js';

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
  tanken: () => comingSoon('Tankbuch und Auswertung', '2.4', 'Tankungen eintragen, bearbeiten und löschen, dazu Verbrauch, Verbrauch je Monat und Spritpreise.'),
  touren: () => comingSoon('Touren und Kosten', '2.6', 'Echte Reisen mit zugeordneten Tankungen und sonstigen Kosten.'),
  mehr: () => comingSoon('Fahrzeugakte, Backup und Import', '2.3 und 2.7', 'Foto und Fahrzeugdaten bearbeiten, Daten sichern und aus Road Trip übernehmen.')
    + '<p class="foot">T3 Hub · Version 0.2 (Grundgerüst)</p>',
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
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  history.replaceState(null, '', '#' + tab);
  render();
  window.scrollTo(0, 0);
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
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
}
