// Reparaturleitfäden: Suche, Filter, Fortschritt. Reine Funktionen ohne Browser.

const norm = (s) => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');

/** Volltext über Titel, Baugruppe, Werkzeug, Material und Schritte. Mehrere Wörter müssen alle vorkommen. */
export function searchGuides(guides, query = '', group = '') {
  const words = norm(query).split(/\s+/).filter(Boolean);
  return guides.filter((g) => {
    if (group && g.group !== group) return false;
    if (!words.length) return true;
    const hay = norm([g.title, g.group, ...(g.tools || []), ...(g.material || []), ...(g.steps || []).flatMap((s) => [s.t, s.d])].join(' '));
    return words.every((w) => hay.includes(w));
  });
}

/** Anleitung zu einem Wartungspunkt. */
export const guideForService = (guides, serviceKey) => guides.find((g) => g.serviceKey && g.serviceKey === serviceKey) || null;

/** Fortschritt aus abgehakten Schritt-Nummern. */
export function progress(guide, done = []) {
  const total = guide.steps.length;
  const n = done.filter((i) => i >= 0 && i < total).length;
  return { done: n, total, complete: total > 0 && n === total };
}

/** Schwierigkeit als Text. */
export const levelText = (l) => ['', 'Einfach', 'Mittel', 'Anspruchsvoll'][l] || '';

/** Baugruppen, die in den Anleitungen vorkommen (in fester Reihenfolge). */
export const usedGroups = (guides, order) => order.filter((g) => guides.some((x) => x.group === g));
