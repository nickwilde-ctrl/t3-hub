// Einstieg: Daten laden, Navigation, Bildschirme zeichnen.
import { state, load, createVehicle, createDemo, resetAll, onChange, currentKm, saveVehicle, saveItem, saveMany, deleteItem, saveWiring, removeWiring, setKmNow, filesForLog, syncFiles, deleteLog, services, exportAll, markBackup, restoreAll, importRoadTrip } from './store.js';
import { requestPersistence } from './db.js';
import { fuelStats, consumptionCheck } from './logic/fuel.js';
import { serviceStatus, vehicleStatus } from './logic/services.js';
import { todayIso } from './format.js';
import { engineFamilyOf, vehicleIdentity } from './logic/vehicle.js';
import { appliesTo } from './logic/diagnose.js';
import { MV_NO_START } from './data/diagnosen/mv-no-start.js';
import { diagnoseCard, diagnoseRunningCard, openDiagnose } from './views/diagnose.js';
import { cockpit } from './views/cockpit.js';
import { homeView } from './views/home.js';
import { vehicleCard, editVehicleSheet, photoFrameSheet, modsCard, modSheet, specsCard } from './views/vehicle.js';
import { toast, closeSheet, openSheet } from './views/sheet.js';
import { initLayers, popHandled } from './nav.js';
import { normalizeNav, sameNav, navFromHash } from './logic/nav.js';
import { readPhoto } from './photo.js';
import { tankenView, fuelSheet, setSub } from './views/tanken.js';
import { faelligView, alleView, eintraegeView, wartungTabs, serviceSheet, newServiceSheet, logSheet } from './views/wartung.js';
import { guidesView, filterGuides, setGuideGroup, setGuideFuel, openGuide, forgetProgress } from './views/guides.js';
import { guideSheet } from './views/guideEditor.js';
import { GUIDES } from './data/guides.js';
import { mergeGuides } from './logic/guides.js';
import { tourenView, tourSheet, costCard, setCostYear, setOpenTour, getOpenTour, expenseSheet, journalSheet, runningCard } from './views/touren.js';
import { stopSheet, openMapView } from './views/stops.js';
import { dataCard, backupReminder, createBackup, restoreFromFile, roadTripFromFile } from './views/daten.js';
import { installCard } from './views/install.js';
import { gameCard, openGame } from './views/game.js';
import { aboutCard } from './views/about.js';
import { feedbackCard, feedbackSheet } from './views/feedback.js';
import { openStromkarte } from './views/stromkarte.js';
import { kmSheet } from './views/km.js';
import { startCard, bulkDoneSheet, startRestoreCard } from './views/start.js';
import { showStart } from './logic/start.js';
import { elektrikView, setElPart, setElQuery, refreshWireResults, startFault, startWire, removeWiringSheet } from './views/elektrik.js';

const APP_VERSION = '0.62';
import { showSetup, closeSetup, setupAtWelcome } from './views/setup.js';

const TABS = [
  ['home', 'Home', '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>'],
  ['wartung', 'Serviceheft', '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>'],
  ['tanken', 'Tanken', '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9M14 8l3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>'],
  ['touren', 'Touren', '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>'],
  ['mehr', 'Mehr', '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'],
];

/** Mitgelieferte und eigene Anleitungen. */
const allGuides = () => mergeGuides(GUIDES, state.guides);

const currentTour = () => state.tours.find((x) => x.id === getOpenTour());

const TAB_IDS = TABS.map(([id]) => id);
let tab = navFromHash(location.hash, TAB_IDS).tab;

let wsub = 'intervalle';
let msub = '';

/** Wo wir gerade sind – das merkt sich der Browser-Verlauf, damit „Zurück“ in der App bleibt. */
const navState = () => ({ tab, wsub, msub, tour: tab === 'touren' ? getOpenTour() : null });
/** Neue Seite im Verlauf anlegen (nur wenn wir wirklich woanders sind). */
const pushNav = () => {
  if (sameNav(navState(), history.state, TAB_IDS)) return;
  history.pushState(navState(), '', '#' + tab);
};

/** Eintrag „Elektrik“ unter Mehr – nur sichtbar, wenn auf diesem Gerät eigene Plandaten geladen sind. */
const elektrikCard = (w) => (w ? `<section class="sec"><button type="button" class="card link-card" data-msub="elektrik"><span><b>Elektrik</b><br><span class="faint">Fehlersuche, Kabel und Stromkarte · nur auf diesem Gerät</span></span><span aria-hidden="true">›</span></button></section>` : '');

const VIEWS = {
  home: () => (showStart(state.vehicle, services(), currentKm()) ? startCard(state.vehicle, services(), currentKm()) : '') + (state.vehicle.demo ? '' : backupReminder(state)) + runningCard(state) + diagnoseRunningCard(MV_NO_START, state.diagnoses) + homeView({ services: services(), fuels: state.fuels, km: currentKm() }),
  wartung: () => wartungTabs(wsub) + (wsub === 'anleitungen' ? guidesView(allGuides(), engineFamilyOf(state.vehicle), state.vehicle.engineCode)
    : wsub === 'eintraege' ? eintraegeView(state.log)
      : wsub === 'alle' ? alleView(services(), currentKm(), engineFamilyOf(state.vehicle || {}))
        : faelligView(services(), currentKm())),
  tanken: () => tankenView(state),
  touren: () => tourenView(state, currentKm()),
  mehr: () => (msub === 'elektrik' && state.wiring ? '<button type="button" class="back-link" data-msub="">‹ Zurück zu Mehr</button><h1 class="page-title">Elektrik</h1>' + elektrikView(state.wiring, { diagnose: appliesTo(MV_NO_START, vehicleIdentity(state.vehicle)).ok }) : costCard(state, currentKm()) + diagnoseCard(MV_NO_START, vehicleIdentity(state.vehicle), state.diagnoses) + vehicleCard(state.vehicle) + specsCard(state.vehicle) + elektrikCard(state.wiring) + modsCard(state.vehicle)
    + startRestoreCard(state.vehicle)
    + dataCard(state)
    + feedbackCard()
    + installCard()
    + gameCard()
    + aboutCard()
    + `<p class="foot">T3 Hub · Version ${APP_VERSION} · Deine Daten bleiben auf diesem Gerät.</p>`),
};

function render() {
  // Erster Start: Einrichtung statt leerer App. Ein wiederhergestelltes Backup schließt die Begrüßung.
  if (state.needsSetup) { showSetup(createVehicle, createDemo); return; }
  if (setupAtWelcome()) closeSetup();
  if (!state.vehicle) return;
  const s = fuelStats(state.fuels);
  const km = currentKm();
  const st = services().map((x) => serviceStatus(x, km));
  document.getElementById('cockpit').innerHTML = cockpit({
    vehicle: state.vehicle,
    km,
    avg: s.avgConsumption,
    last: s.lastConsumption,
    check: consumptionCheck(state.fuels),
    due: st.filter((x) => x.state === 'over').length,
    soon: st.filter((x) => x.state === 'soon').length,
    unknown: st.filter((x) => x.state === 'unknown').length,
    level: vehicleStatus(services(), km).level,
  });
  document.getElementById('tabs').innerHTML = TABS.map(
    ([id, label, icon]) =>
      `<button type="button" data-tab="${id}" ${tab === id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${label}</button>`,
  ).join('');
  // Das Cockpit gehört auf die Startseite; im Serviceheft und unter Elektrik zählt der Platz für den Inhalt.
  document.getElementById('cockpit').hidden = tab === 'wartung' || (tab === 'mehr' && msub === 'elektrik');
  document.getElementById('view').innerHTML = (state.vehicle.demo && tab !== 'wartung' ? demoBanner() : '') + VIEWS[tab]();
}

/** Hinweis, solange der Beispielbus aktiv ist. */
const demoBanner = () => `<div class="card demo-banner"><div><b>Das ist ein Beispielbus.</b> Schau dich in Ruhe um und probier alles aus.</div>
  <button type="button" class="btn" data-action="leave-demo">Eigenen Bus einrichten</button></div>`;

document.addEventListener('click', (e) => {
  const menu = document.querySelector('details.photo-menu[open]');
  if (menu && !menu.contains(e.target)) menu.open = false;
  const action = e.target.closest('[data-action]');
  if (action && action.dataset.action === 'photo-frame') {
    if (menu) menu.open = false;
    photoFrameSheet(state.vehicle, saveVehicle);
    return;
  }
  if (action && action.dataset.action === 'open-game') { openGame(); return; }
  if (action && action.dataset.action === 'set-km') { kmSheet(currentKm(), setKmNow); return; }
  if (action && action.dataset.action === 'start-show') { saveVehicle({ ...state.vehicle, startHidden: false }); toast('Einstiegshilfe wieder da – auf der Startseite', 'info'); return; }
  if (action && action.dataset.action === 'start-hide') { saveVehicle({ ...state.vehicle, startHidden: true }); toast('Ausgeblendet', 'info'); return; }
  if (action && action.dataset.action === 'start-level') { saveVehicle({ ...state.vehicle, experience: state.vehicle.experience === 'erfahren' ? 'neu' : 'erfahren' }); return; }
  if (action && action.dataset.action === 'bulk-done') { bulkDoneSheet({ raw: state.services, shown: services(), km: currentKm(), saveMany, saveLog: (x) => saveItem('log', x) }); return; }
  if (action && action.dataset.action === 'service-done') { bulkDoneSheet({ raw: state.services, shown: services(), km: currentKm(), saveMany, saveLog: (x) => saveItem('log', x), mode: 'service' }); return; }
  if (action && action.dataset.action === 'add-mod') {
    modSheet(state.vehicle, null, saveVehicle);
    return;
  }
  const editMod = e.target.closest('[data-edit-mod]');
  if (editMod) {
    modSheet(state.vehicle, (state.vehicle.mods || []).find((m) => m.id === editMod.dataset.editMod), saveVehicle);
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
    family: engineFamilyOf(state.vehicle || {}),
    services: services(),
    saveService: (x) => saveItem('services', x),
    removeService: (id) => deleteItem('services', id),
    saveLog: (x) => saveItem('log', x),
    removeLog: (id) => deleteLog(id),
    filesForLog,
    syncFiles,
    log: state.log,
    guides: allGuides(),
  };
  const startSvc = e.target.closest('[data-start-service]');
  if (startSvc) {
    const s = services().find((x) => x.key === startSvc.dataset.startService);
    if (s) serviceSheet(s, state.services.find((x) => x.id === s.id), wOps);
    return;
  }
  const wsubBtn = e.target.closest('[data-wsub]');
  if (wsubBtn) { wsub = wsubBtn.dataset.wsub; pushNav(); render(); window.scrollTo(0, 0); return; }
  const msubBtn = e.target.closest('[data-msub]');
  if (msubBtn) { msub = msubBtn.dataset.msub; pushNav(); render(); window.scrollTo(0, 0); return; }
  const elPart = e.target.closest('[data-el-part]');
  if (elPart) { setElPart(elPart.dataset.elPart); render(); return; }
  const elChip = e.target.closest('[data-el-chip]');
  if (elChip) { setElQuery(elChip.dataset.elChip); render(); return; }
  const elFault = e.target.closest('[data-el-fault]');
  if (elFault) { startFault(elFault.dataset.elFault); return; }
  const elWire = e.target.closest('[data-el-wire]');
  if (elWire && !elWire.closest('#el-root')) { startWire(+elWire.dataset.elWire); return; }
  if (action && action.dataset.action === 'open-stromkarte') { if (state.wiring?.map) openStromkarte(state.wiring.map); return; }
  if (action && action.dataset.action === 'remove-wiring') { removeWiringSheet(removeWiring); return; }
  const fuelBtn = e.target.closest('[data-guide-fuel]');
  if (fuelBtn) { setGuideFuel(fuelBtn); return; }
  const groupBtn = e.target.closest('[data-guide-group]');
  if (groupBtn) { setGuideGroup(groupBtn); return; }
  const guideBtn = e.target.closest('[data-open-guide]');
  // Anleitung öffnen; „Ändern“ führt in den Editor und danach zurück in die gespeicherte Anleitung
  const showGuide = (id) => openGuide(id, {
    guides: allGuides(),
    engineFamily: engineFamilyOf(state.vehicle),
    code: state.vehicle.engineCode || '',
    onClose: render,
    onEdit: (g) => editGuide(g),
    onDone: (g) => {
      const s = g.serviceKey ? services().find((x) => x.key === g.serviceKey) : null;
      if (s) serviceSheet(s, state.services.find((x) => x.id === s.id), { ...wOps, log: state.log });
      else logSheet(null, { ...wOps, prefill: { title: g.title, category: 'Wartung' } });
    },
  });
  const editGuide = (g) => guideSheet(g, {
    services: services(),
    save: (row) => saveItem('guides', row),
    remove: async (id) => { await deleteItem('guides', id); forgetProgress(id); },
    onSaved: (row) => { render(); showGuide(row.id); },
    onRemoved: render,
  });
  // Geführte Diagnose: Inhalt in js/data/diagnosen/, Ablauf in js/logic/diagnose.js
  if (action && action.dataset.action === 'open-diagnose') {
    closeSheet();
    openDiagnose({
      tree: MV_NO_START,
      identity: vehicleIdentity(state.vehicle),
      vehicleId: state.vehicle.id,
      sessions: () => state.diagnoses,
      save: (s) => saveItem('diagnoses', s),
      remove: (id) => deleteItem('diagnoses', id),
      today: todayIso,
      openGuide: showGuide,
      openLog: (prefill) => logSheet(null, { ...wOps, prefill }),
      onClose: render,
    }, { resume: action.dataset.resume === '1' });
    return;
  }
  if (guideBtn) {
    closeSheet();
    showGuide(guideBtn.dataset.openGuide);
    return;
  }
  if (action && action.dataset.action === 'add-guide') { editGuide(null); return; }
  if (action && action.dataset.action === 'feedback') { feedbackSheet(APP_VERSION); return; }
  if (action && action.dataset.action === 'leave-demo') {
    openSheet({
      title: 'Eigenen Bus einrichten?',
      submitLabel: 'Beispiel löschen',
      body: '<p style="margin:0">Der Beispielbus mit allen Beispieldaten wird gelöscht. Danach richtest du deinen eigenen Bus ein.</p>',
      async onSubmit() { await resetAll(); window.scrollTo(0, 0); },
    });
    return;
  }
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
    pushNav();
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (action && action.dataset.action === 'close-tour') { setOpenTour(null); pushNav(); render(); window.scrollTo(0, 0); return; }
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
  if (b.closest('nav')) { msub = ''; if (wsub === 'alle') wsub = 'intervalle'; }
  pushNav();
  render();
  window.scrollTo(0, 0);
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'guide-q') filterGuides();
  if (e.target.id === 'el-q') refreshWireResults();
});

document.addEventListener('change', async (e) => {
  const file0 = e.target.files && e.target.files[0];
  if (e.target.id === 'restore-in' && file0) { await restoreFromFile(file0, restoreAll, saveWiring); e.target.value = ''; return; }
  if (e.target.id === 'roadtrip-in' && file0) { await roadTripFromFile(file0, importRoadTrip); e.target.value = ''; return; }
  if (e.target.id !== 'photo-in') return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const photo = await readPhoto(file);
    await saveVehicle({ ...state.vehicle, photo });
    toast('Foto gespeichert');
  } catch {
    toast('Das Foto konnte nicht gelesen werden', 'err');
  }
});

onChange(render);

// Zurück-Taste bleibt in der App: Seite aus dem Verlauf wiederherstellen, Formulare und Vollbild-Fenster schließen.
history.replaceState(navState(), '', '#' + tab);
initLayers(closeSheet);
window.addEventListener('popstate', (e) => {
  if (popHandled()) return;
  const n = normalizeNav(e.state || navFromHash(location.hash, TAB_IDS), TAB_IDS);
  tab = n.tab; wsub = n.wsub; msub = n.msub; setOpenTour(n.tour);
  if (!state.vehicle) return;
  render();
  window.scrollTo(0, 0);
});

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
