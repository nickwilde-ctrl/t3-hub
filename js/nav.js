// Zurück-Taste: Formulare und Vollbild-Fenster bekommen je einen Verlaufs-Eintrag, damit „Zurück“ sie schließt,
// statt die App zu verlassen. Erkennt die Fenster am Einfügen in die Seite, die Fenster selbst bleiben unverändert.

/** Vollbild-Fenster und Formulare: Auswahl → wie sie per Zurück geschlossen werden. */
const LAYERS = [
  ['#sheet-root', (el, closeSheet) => closeSheet()],
  ['#guide-root', (el) => el.querySelector('#g-close')?.click()],
  ['#dx-root', (el) => (el.querySelector('#dx-back') || el.querySelector('#dx-close'))?.click()],
  ['#el-root', (el) => el.querySelector('#el-back')?.click()],
  ['#map-full', (el) => el.querySelector('#map-close')?.click()],
  ['#sk-root', (el) => el.querySelector('#sk-close')?.click()],
  ['#game-root', (el) => el.querySelector('#game-x')?.click()],
  ['.att-viewer', (el) => el.click()],
];

let layers = []; // offene Fenster, das oberste zuletzt
let ignored = 0; // vom Programm ausgelöste history.back() – keine Nutzer-Rückschritte
let handled = false;

const matcher = (el) => (el.nodeType === 1 ? LAYERS.find(([sel]) => el.matches(sel)) : null);

/** Wahr (einmalig), wenn der letzte „Zurück“ nur ein Fenster geschlossen hat. */
export function popHandled() {
  const h = handled;
  handled = false;
  return h;
}

function push(el, entry) {
  layers.push({ el, entry });
  history.pushState({ ...(history.state || {}), layer: layers.length }, '', location.href);
}

function drop() {
  ignored += 1;
  history.back();
}

export function initLayers(closeSheet) {
  const observer = new MutationObserver((records) => {
    const removed = [];
    const added = [];
    for (const r of records) {
      r.removedNodes.forEach((n) => { const i = layers.findIndex((l) => l.el === n); if (i >= 0) removed.push(layers.splice(i, 1)[0]); });
      r.addedNodes.forEach((n) => { const m = matcher(n); if (m) added.push([n, m]); });
    }
    // Ein Fenster, das gleich durch ein neues ersetzt wird, behält seinen Verlaufs-Eintrag.
    while (removed.length && added.length) { removed.shift(); const [el, m] = added.shift(); layers.push({ el, entry: m }); }
    removed.forEach(() => drop());
    added.forEach(([el, m]) => push(el, m));
  });
  observer.observe(document.body, { childList: true });
  window.addEventListener('popstate', () => {
    if (ignored > 0) { ignored -= 1; handled = true; return; }
    const top = layers.pop();
    if (!top) return;
    handled = true;
    top.entry[1](top.el, closeSheet);
    if (top.el.isConnected) push(top.el, top.entry); // Fenster blieb offen (z. B. Schritt zurück): Eintrag erneuern
  });
}
