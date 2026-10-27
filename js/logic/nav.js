// Zurück-Taste: Zustand der Navigation (Reiter, Unterseiten, offene Tour) für den Browser-Verlauf. Ohne DOM.

export const WSUBS = ['intervalle', 'alle', 'eintraege', 'anleitungen'];
export const MSUBS = ['', 'elektrik'];

/** Macht aus einem gespeicherten oder fremden Wert einen gültigen Navigationszustand. */
export function normalizeNav(raw, tabs) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const tab = tabs.includes(s.tab) ? s.tab : 'home';
  return {
    tab,
    wsub: WSUBS.includes(s.wsub) ? s.wsub : 'intervalle',
    msub: MSUBS.includes(s.msub) ? s.msub : '',
    tour: tab === 'touren' && typeof s.tour === 'string' && s.tour ? s.tour : null,
  };
}

/** Gleiche Seite? Dann legt die App keinen neuen Verlaufs-Eintrag an. */
export function sameNav(a, b, tabs) {
  const x = normalizeNav(a, tabs);
  const y = normalizeNav(b, tabs);
  return x.tab === y.tab && x.wsub === y.wsub && x.msub === y.msub && x.tour === y.tour;
}

/** Aus der Adresse (#wartung) einen Zustand machen, wenn kein gespeicherter da ist. */
export const navFromHash = (hash, tabs) => normalizeNav({ tab: String(hash || '').replace(/^#/, '') }, tabs);
