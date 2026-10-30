// Diagnose-Engine: führt durch einen datengetriebenen Prüfbaum (js/data/diagnosen/*.js).
// Die Engine kennt keine Bauteile und keine Werte. Alles Fachliche steht im Baum.
// Alle Funktionen sind rein: sie bekommen eine Sitzung und geben eine neue zurück.
//
// Sitzung: { id, vehicleId, caseId, treeVersion, identity, date, startedAt, updatedAt,
//            status: 'running'|'finished'|'abandoned', current, history: [Eintrag], result }
// Eintrag: { node, answer, values?, reason?, at }   answer = Antwort-Kennung oder NOT_POSSIBLE
//
// Wo ein nächster Knoten steht („next“, „fallback“), darf ein Text stehen oder eine Regelliste
// [{ when: Bedingung, to: Knoten }, …, { to: Knoten }]. Bedingungen:
//   { node, is }        letzte Antwort des Knotens ist … (is: Text oder Liste)
//   { answered }        Knoten hat eine echte Antwort (nicht „nicht möglich“)
//   { visited }         Knoten wurde aufgerufen (auch „nicht möglich“)
//   { flag }            Merker gesetzt
//   { all: [...] } { any: [...] } { not: Bedingung }

export const NOT_POSSIBLE = 'nichtmoeglich';
export const NOT_POSSIBLE_REASONS = [
  { id: 'tool', label: 'Werkzeug fehlt' },
  { id: 'person', label: 'Zweite Person fehlt' },
  { id: 'access', label: 'Ich komme nicht an die Stelle' },
  { id: 'unsure', label: 'Das traue ich mir nicht zu' },
  { id: 'unclear', label: 'Ergebnis unklar' },
];
const reasonLabel = (id) => NOT_POSSIBLE_REASONS.find((r) => r.id === id)?.label || '';

/** Zahl aus einem Eingabefeld („12,5“ → 12.5). Leer oder ungültig → null. */
export function parseValue(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Passt der Baum zum Fahrzeug? Nur eindeutig erkannte Fahrzeuge (Modell, Motorfamilie und Kennbuchstabe). */
export function appliesTo(tree, identity) {
  const s = tree.scope;
  if (!identity || identity.model !== s.model) return { ok: false, why: 'other' };
  if (!identity.code) return { ok: false, why: 'nocode' };
  if (identity.familyId === s.familyId && identity.code === s.code) return { ok: true, why: '' };
  return { ok: false, why: 'other' };
}

// ---------- Zustand aus dem Verlauf ----------

const lastEntry = (session, id) => {
  for (let i = session.history.length - 1; i >= 0; i--) if (session.history[i].node === id) return session.history[i];
  return null;
};

export function flagsOf(tree, session) {
  const flags = new Set();
  for (const e of session.history) {
    const a = tree.nodes[e.node]?.answers?.find((x) => x.id === e.answer);
    (a?.flags || []).forEach((f) => flags.add(f));
  }
  return flags;
}

export function check(cond, tree, session, flags = flagsOf(tree, session)) {
  if (!cond) return true;
  if (cond.all) return cond.all.every((c) => check(c, tree, session, flags));
  if (cond.any) return cond.any.some((c) => check(c, tree, session, flags));
  if (cond.not) return !check(cond.not, tree, session, flags);
  if (cond.flag) return flags.has(cond.flag);
  if (cond.visited) return !!lastEntry(session, cond.visited);
  if (cond.answered) { const e = lastEntry(session, cond.answered); return !!e && e.answer !== NOT_POSSIBLE; }
  if (cond.node) {
    const e = lastEntry(session, cond.node);
    if (!e) return false;
    return [].concat(cond.is).includes(e.answer);
  }
  return false;
}

/** Löst ein „next“ oder „fallback“ auf einen Knoten-Namen auf. */
export function resolve(spec, tree, session) {
  if (typeof spec === 'string') return spec;
  if (Array.isArray(spec)) {
    const flags = flagsOf(tree, session);
    const rule = spec.find((r) => check(r.when, tree, session, flags));
    return rule ? rule.to : null;
  }
  return null;
}

/** Alle Knoten, auf die ein „next“ oder „fallback“ verweisen kann (für die Baum-Prüfung). */
export const targets = (spec) => (typeof spec === 'string' ? [spec] : Array.isArray(spec) ? spec.map((r) => r.to) : []);

// ---------- Sitzung ----------

export function startSession(tree, identity, { id, vehicleId, today, now = new Date().toISOString() }) {
  return {
    id, vehicleId, caseId: tree.id, treeVersion: tree.version,
    identity: {
      model: identity.model, year: identity.year, familyId: identity.familyId,
      family: identity.family ? identity.family.label : '', code: identity.code, fuel: identity.fuel, gearbox: identity.gearboxLabel || '',
    },
    date: today, startedAt: now, updatedAt: now, status: 'running', current: tree.start, history: [], result: null,
  };
}

/** Kommt man an einem Endknoten an, müssen seine Voraussetzungen belegt sein, sonst gibt es nur „Diagnose offen“. */
function arrive(tree, session, nodeId, now) {
  let id = nodeId;
  let node = tree.nodes[id];
  if (!node) throw new Error('Unbekannter Knoten: ' + id);
  if (node.end && node.requires && !node.requires.every((c) => check(c, tree, session))) {
    id = node.elseEnd || 'END_OPEN';
    node = tree.nodes[id];
  }
  return { ...session, current: id, status: node.end ? 'finished' : 'running', result: node.end ? id : null, updatedAt: now };
}

export const currentNode = (tree, session) => tree.nodes[session.current];

/** Antwort geben. values: Messwerte (nur die eingegebenen). Gibt die neue Sitzung zurück. */
export function answerNode(tree, session, answerId, values = {}, now = new Date().toISOString()) {
  const node = currentNode(tree, session);
  const ans = node?.answers?.find((a) => a.id === answerId);
  if (!ans || node.end) throw new Error('Antwort passt nicht zum Knoten');
  const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== undefined && v !== ''));
  const entry = { node: node.id, answer: answerId, ...(Object.keys(clean).length ? { values: clean } : {}), at: now };
  const next = { ...session, history: [...session.history, entry] };
  return arrive(tree, next, resolve(ans.next, tree, next), now);
}

/** „Prüfung nicht möglich“: Der Knoten bleibt offen, weiter geht es am Ausweichknoten. */
export function markNotPossible(tree, session, reason, now = new Date().toISOString()) {
  const node = currentNode(tree, session);
  if (!node || node.end) throw new Error('Hier gibt es keine Prüfung');
  const entry = { node: node.id, answer: NOT_POSSIBLE, reason, at: now };
  const next = { ...session, history: [...session.history, entry] };
  return arrive(tree, next, resolve(node.fallback, tree, next) || 'END_OPEN', now);
}

/** Einen Schritt zurück: der letzte Eintrag verschwindet, alles danach auch (Merker werden neu aus dem Verlauf gelesen). */
export function goBack(tree, session, now = new Date().toISOString()) {
  if (!session.history.length) return session;
  const history = session.history.slice(0, -1);
  const prev = session.history[session.history.length - 1];
  return { ...session, history, current: prev.node, status: 'running', result: null, updatedAt: now };
}

export const abandon = (session, now = new Date().toISOString()) => (session.status === 'running' ? { ...session, status: 'abandoned', updatedAt: now } : session);

/** Ein eingegebener Wert kann nur dort eine Antwort vorschlagen, wo der Grenzwert „A“ ist (freigegeben). */
export function suggestAnswer(node, values) {
  const s = node.suggest;
  if (!s || node.source !== 'A') return null;
  const v = parseValue(values?.[s.input]);
  if (v === null) return null;
  return v >= s.gte ? s.yes : s.no;
}

/** Zahl der echten Prüfungen bisher (ohne Maßnahmen und „nicht möglich“). Für eine ehrliche Fortschrittsanzeige ohne Gesamtzahl. */
export const checksDone = (tree, session) => session.history.filter((e) => e.answer !== NOT_POSSIBLE && tree.nodes[e.node]?.kind !== 'action').length;

// ---------- Protokoll ----------

const fmt = (n) => String(n).replace('.', ',');
const isOpen = (session, id) => lastEntry(session, id)?.answer === NOT_POSSIBLE;

export function summary(tree, session) {
  const identity = session.identity;
  const checked = [];
  const actions = [];
  const measurements = [];
  const used = new Set();
  for (const e of session.history) {
    const node = tree.nodes[e.node];
    if (!node) continue;
    const ans = node.answers?.find((a) => a.id === e.answer);
    if (e.answer !== NOT_POSSIBLE) {
      used.add(node.id);
      (node.kind === 'action' ? actions : checked).push({ node: node.id, text: ans?.log || node.short, tone: ans?.tone || 'neutral' });
    }
    for (const input of node.inputs || []) {
      if (e.values && e.values[input.id] !== undefined) {
        measurements.push({ node: node.id, label: input.logLabel || input.label, value: `${fmt(e.values[input.id])}${input.unit ? ' ' + input.unit : ''}`, source: input.source || node.source });
      }
    }
  }
  const open = [];
  for (const e of session.history) {
    const node = tree.nodes[e.node];
    if (e.answer === NOT_POSSIBLE && isOpen(session, e.node) && !open.some((o) => o.node === e.node)) {
      open.push({ node: e.node, text: node.short, reason: reasonLabel(e.reason) });
    }
  }
  const end = session.status === 'finished' ? tree.nodes[session.current] : null;
  const next = [];
  if (end?.next) next.push(...end.next);
  if (session.status === 'running') next.push(`Als Nächstes: ${tree.nodes[session.current].short}`);
  const likely = (end?.likely || []).map((id) => tree.suspects.find((s) => s.id === id)?.label).filter(Boolean);
  const notProven = tree.suspects.filter((s) => !(end?.likely || []).includes(s.id)).map((s) => s.label);
  const flags = [...flagsOf(tree, session)].map((f) => tree.flags?.[f]).filter(Boolean);
  const provisional = [...used].some((id) => ['B', 'C'].includes(tree.nodes[id].source)) || (end && ['B', 'C'].includes(end.source));
  return {
    title: tree.title, date: session.date, status: session.status, identity,
    checked, actions, measurements, open, next,
    result: end ? { id: end.id, kind: end.kind, title: end.title, text: end.text, notThis: end.notThis || [], provisional: !!end.provisional } : null,
    likely, notProven, notes: flags,
    provisionalNote: provisional ? 'Einige Prüfungen und Werte sind noch nicht am VW-Originalleitfaden bestätigt und gelten vorläufig.' : '',
  };
}

export function identityText(identity) {
  return [identity.model, identity.year ? `Baujahr ${identity.year}` : '', identity.family, identity.code ? `Kennbuchstabe ${identity.code}` : '', identity.fuel, identity.gearbox].filter(Boolean).join(' · ');
}

/** Das Protokoll als Text, zum Zeigen oder Weitergeben (z. B. an eine Werkstatt). */
export function summaryText(sm, formatDate = (d) => d) {
  const L = [];
  const list = (head, items) => { if (items.length) { L.push('', head, ...items.map((x) => '- ' + x)); } };
  L.push(`T3 Hub – Diagnoseprotokoll`, sm.title, `Datum: ${formatDate(sm.date)}`, `Fahrzeug: ${identityText(sm.identity)}`);
  if (sm.result) L.push('', `Ergebnis: ${sm.result.title}`, sm.result.text, ...(sm.result.notThis.length ? sm.result.notThis.map((t) => 'Nicht tun: ' + t) : []));
  else L.push('', sm.status === 'abandoned' ? 'Diagnose vorzeitig beendet, ohne Ergebnis.' : 'Diagnose läuft noch.');
  list('Geprüft', sm.checked.map((c) => c.text));
  list('Maßnahmen', sm.actions.map((c) => c.text));
  list('Messwerte', sm.measurements.map((m) => `${m.label}: ${m.value}`));
  list('Noch offen', [...sm.open.map((o) => `${o.text}${o.reason ? ' (' + o.reason + ')' : ''}`), ...sm.next]);
  if (sm.likely.length) list('Wahrscheinlich, aber nicht bewiesen', sm.likely);
  list('Noch nicht nachgewiesen', sm.notProven);
  list('Hinweise', [...sm.notes, ...(sm.provisionalNote ? [sm.provisionalNote] : [])]);
  return L.join('\n');
}

// ---------- Prüfung des Baums (für Tests und Entwicklung) ----------

/** Gibt eine Liste von Fehlern im Baum zurück (leer = in Ordnung). */
export function validateTree(tree) {
  const bad = [];
  const need = (id, from) => { if (!tree.nodes[id]) bad.push(`${from}: Ziel ${id} fehlt`); };
  need(tree.start, 'start');
  if (!tree.nodes.END_OPEN) bad.push('END_OPEN fehlt');
  for (const [key, n] of Object.entries(tree.nodes)) {
    if (n.id !== key) bad.push(`${key}: id stimmt nicht`);
    if (!['A', 'B', 'C', 'Q'].includes(n.source)) bad.push(`${key}: Quellenstatus fehlt`);
    if (n.end) {
      if (!n.title || !n.text) bad.push(`${key}: Endknoten ohne Text`);
      if (!['result', 'open', 'stop', 'info', 'done', 'redirect'].includes(n.kind)) bad.push(`${key}: Endart fehlt`);
      if (n.likely?.length && !n.requires?.length) bad.push(`${key}: nennt ein Bauteil als wahrscheinlich, aber ohne Voraussetzungen`);
      if (n.requires?.length) need(n.elseEnd || 'END_OPEN', key);
      continue;
    }
    if (!n.answers?.length) bad.push(`${key}: keine Antworten`);
    if (!n.fallback) bad.push(`${key}: kein Ausweichknoten für „Prüfung nicht möglich“`);
    targets(n.fallback).forEach((t) => need(t, `${key} (nicht möglich)`));
    for (const a of n.answers || []) targets(a.next).forEach((t) => need(t, `${key}/${a.id}`));
    if (!n.title || !n.short) bad.push(`${key}: Titel fehlt`);
  }
  return bad;
}

/** Alle Knoten mit Quellenstatus B oder C: das ist die Liste dessen, was noch gegen das Original geprüft werden muss. */
export const toVerify = (tree) => Object.values(tree.nodes).filter((n) => ['B', 'C'].includes(n.source)).map((n) => ({ id: n.id, source: n.source, short: n.short || n.title }));
