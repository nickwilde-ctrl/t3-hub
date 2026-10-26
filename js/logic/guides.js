// Reparaturleitfäden: Suche, Filter, Fortschritt. Reine Funktionen ohne Browser.
import { ENGINE_FAMILIES } from '../data/engines.js';

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

/** Erster noch nicht erledigter Schritt (für den Werkstatt-Modus), -1 wenn alles erledigt ist. */
export function nextStep(guide, done = []) {
  for (let i = 0; i < guide.steps.length; i++) if (!done.includes(i)) return i;
  return -1;
}

// ---------- Eigene Anleitungen ----------

/**
 * Mitgelieferte und eigene Anleitungen zusammenführen.
 * Eine eigene Kopie (basedOn) ersetzt das Original an dessen Platz; ganz neue eigene stehen vorne.
 */
export function mergeGuides(builtIn, own = []) {
  const mine = own.map((g) => ({ ...g, own: true }));
  const copies = new Map(mine.filter((g) => g.basedOn).map((g) => [g.basedOn, g]));
  const fresh = mine.filter((g) => !g.basedOn || !builtIn.some((b) => b.id === g.basedOn));
  fresh.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return [...fresh, ...builtIn.map((b) => copies.get(b.id) || b)];
}

/** Eigene Kopie einer mitgelieferten Anleitung (noch ohne id – die vergibt der Speicher). */
export function copyGuide(g) {
  const { id, own, verified, ...rest } = structuredClone(g);
  return { ...rest, basedOn: id, source: `Eigene Fassung von „${g.title}“ (Vorlage: T3 Hub). ${g.source || ''}`.trim() };
}

/** Text mit einer Zeile pro Punkt → Liste ohne leere Zeilen. */
export const lines = (text = '') => String(text).split('\n').map((x) => x.replace(/^\s*[-•*]\s*/, '').trim()).filter(Boolean);

/** Prüft eine eigene Anleitung vor dem Speichern. Gibt einen Fehlertext oder '' zurück. */
export function checkGuide(g) {
  if (!g.title?.trim()) return 'Bitte einen Titel eintragen.';
  if (!g.steps?.length) return 'Bitte mindestens einen Schritt eintragen.';
  if (g.steps.some((s) => !s.t?.trim())) return 'Jeder Schritt braucht eine kurze Überschrift.';
  if (!(g.minutes > 0)) return 'Bitte die ungefähre Dauer in Minuten eintragen.';
  return '';
}

// ---------- Passend zum Motor ----------

/** Passt die Anleitung zur Motor-Bauart? Unbekannte Bauart oder Anleitung ohne Angabe = passt. */
export const fitsEngine = (guide, family) => !family || !guide.families?.length || guide.families.includes(family);

/** Passende Anleitungen zuerst, Reihenfolge sonst unverändert. */
export const sortForEngine = (guides, family) => [...guides.filter((g) => fitsEngine(g, family)), ...guides.filter((g) => !fitsEngine(g, family))];

/**
 * Werte einer Anleitung passend zum Motor. Werte mit `codes` gelten nur für diese Kennbuchstaben.
 * Ist der Kennbuchstabe bekannt, werden nur seine Werte gezeigt; sonst alle der Bauart (familyCodes); sonst alle.
 * missing = true, wenn die Anleitung motorabhängige Werte hat, aber keinen für diesen Kennbuchstaben.
 */
export function valuesFor(guide, { code = '', familyCodes = null } = {}) {
  const all = guide.values || [];
  const c = String(code).trim().toUpperCase();
  const coded = all.filter((v) => v.codes?.length);
  let list;
  if (c) list = all.filter((v) => !v.codes?.length || v.codes.includes(c));
  else if (familyCodes?.length) list = all.filter((v) => !v.codes?.length || v.codes.some((x) => familyCodes.includes(x)));
  else list = all;
  const missing = !!c && coded.length > 0 && !coded.some((v) => v.codes.includes(c));
  return { list, missing };
}

/** Kraftstoff einer Motor-Bauart: 'Benzin', 'Diesel' oder ''. */
export const fuelOfFamily = (family) => ENGINE_FAMILIES.find((f) => f.id === family)?.fuel || '';

/** Passt die Anleitung zum gewählten Kraftstoff? Ohne Auswahl oder ohne Motorangabe (gilt für alle) = ja. */
export const matchesFuel = (guide, fuel) => !fuel || !guide.families?.length || guide.families.some((f) => fuelOfFamily(f) === fuel);
