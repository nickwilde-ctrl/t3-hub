// Reiter „Serviceheft“ (intern: wartung): Fällig, Alle Wartungspunkte, Einträge, Formulare.
import { de, eur, eurExact, esc, fmtDate, todayIso } from '../format.js';
import { serviceStatus, isSafety, intervalText, intervalOrigin, dueShort, planGroups, nextDueText } from '../logic/services.js';
import { parseNumber } from '../logic/fuel.js';
import { GUIDES } from '../data/guides.js';
import { guideForService } from '../logic/guides.js';
import { partsEditor, wireParts, partsList, partsTotal } from './parts.js';
import { attachEditor, wireAttachments, attachmentSummary } from './attachments.js';
import { statusText, pill } from './home.js';
import { openSheet, closeSheet, toast } from './sheet.js';

/** Kasten „Woher kommt das Intervall?“ im Wartungspunkt. */
function originBox(o, s) {
  let werk = '';
  if (o.werk) werk = ` Wartungsplan ab Werk: ${esc(o.werk)}.`;
  else if (o.werk === null) werk = ' Das Werksintervall ist in T3 Hub noch nicht mit dem Handbuch geprüft.';
  return `<div class="origin"><div class="label">Intervall · ${esc(o.label)}</div><p>${esc(intervalText(s).replace(/^./, (c) => c.toUpperCase()))}. ${esc(o.basis)}${werk}</p></div>`;
}

export const CATEGORIES = ['Wartung', 'Reparatur', 'Ausbau', 'Sonstiges'];

/** Umschalter oben im Serviceheft. */
export const wartungTabs = (sub) => `<h1 class="page-title">Serviceheft</h1>
  <div class="seg sub wsub three" role="tablist">
    <button type="button" data-wsub="intervalle" aria-pressed="${sub === 'intervalle' || sub === 'alle'}">Fällig</button>
    <button type="button" data-wsub="eintraege" aria-pressed="${sub === 'eintraege'}">Einträge</button>
    <button type="button" data-wsub="anleitungen" aria-pressed="${sub === 'anleitungen'}">Anleitungen</button></div>`;

const DUE_CLS = { over: 'over', soon: 'soon', ok: 'ok' };
const dueRow = ({ s, st }) => `<button type="button" class="row row-btn due-row" data-edit-service="${s.id}">
  <div class="t">${esc(s.name)}</div><div class="r"><span class="pill ${DUE_CLS[st.state] || 'ok'}">${esc(dueShort(st))}</span></div></button>`;

/** Seite „Fällig“: der dringendste Punkt groß, die nächsten drei, Rest einen Tipp entfernt. */
export function faelligView(services, km) {
  const g = planGroups(services, km);
  const n = g.next;
  const label = !n ? '' : n.st.state === 'over' ? 'Jetzt dran · überfällig' : n.st.state === 'soon' ? 'Jetzt dran' : 'Als Nächstes';
  const hero = n ? `<section class="sec"><div class="card next-card next-${DUE_CLS[n.st.state]}">
      <div class="label">${label}</div>
      <h2>${esc(n.s.name)}</h2>
      <div class="next-due">${esc(n.st.state === 'over' ? statusText(n.st) : dueShort(n.st))}</div>
      <button type="button" class="btn" data-edit-service="${n.s.id}">Erledigt eintragen</button></div></section>`
    : `<section class="sec"><div class="card next-card"><div class="label">Als Nächstes</div><h2>Noch nichts eingetragen</h2><p class="hint" style="margin:0">Trag ein, wann zuletzt Ölwechsel, HU und Co. gemacht wurden – dann zeigt die App hier, was als Nächstes dran ist.</p></div></section>`;
  const more = g.urgent.length > 1 ? `<p class="hint urgent-hint">Außerdem jetzt dran: ${g.urgent.slice(1).map((x) => esc(x.s.name)).join(', ')}</p>` : '';
  return `${hero}${more}
  <button type="button" class="btn wide" data-action="service-done">+ Service eintragen</button>
  ${g.then.length ? `<section class="sec"><div class="sec-head"><h2 class="muted-h">Danach</h2></div><div class="card list">${g.then.map(dueRow).join('')}</div></section>` : ''}
  <section class="sec links">
    <button type="button" class="link-row" data-wsub="alle"><span>Alle ${g.total} Wartungspunkte</span><span aria-hidden="true">›</span></button>
    ${g.unknown.length ? `<button type="button" class="link-row quiet" data-action="bulk-done"><span>${g.unknown.length === 1 ? '1 Punkt hat' : g.unknown.length + ' Punkte haben'} noch kein Datum</span><span class="go">Eintragen ›</span></button>` : ''}
  </section>`;
}

/** Alle Wartungspunkte („Was gehört zum Service meines T3?“). Details erst beim Antippen. */
export function alleView(services, km, family = null) {
  const rows = services.map((s) => {
    const st = serviceStatus(s, km);
    return `<button type="button" class="row row-btn" data-edit-service="${s.id}">
      <div class="t">${esc(s.name)}${isSafety(s) ? '<span class="tag">Sicherheit</span>' : ''}</div>
      <div class="s">${esc(dueShort(st).replace(/^./, (c) => c.toUpperCase()))}<br><span class="faint">${intervalText(s)} · ${esc(intervalOrigin(s, family).label)}</span></div>
      <div class="r">${pill(st.state)}</div></button>`;
  }).join('');
  return `<section class="sec"><button type="button" class="back-link" data-wsub="intervalle">‹ Zurück</button>
    <div class="sec-head"><h2>Alle Wartungspunkte</h2><span class="label">Stand ${de(km)} km</span></div>
    <div class="card list">${rows}</div>
    <div class="sec-foot"><p class="hint" style="margin:0">Antippen für Details, Herkunft des Intervalls und zum Eintragen.</p>
    <button type="button" class="add" data-action="add-service">+ Wartungspunkt</button></div></section>`;
}

/** Einträge im Serviceheft, nach Jahr gruppiert mit Summe. */
export function eintraegeView(log) {
  const entries = [...log].sort((a, b) => b.date.localeCompare(a.date) || (b.km || 0) - (a.km || 0));
  const add = '<button type="button" class="btn wide" data-action="add-log">+ Neuer Eintrag</button>';
  if (!entries.length) return `${add}<section class="sec"><div class="card soon-card"><h3>Noch keine Einträge</h3><p>Hier landen Wartungen, Reparaturen und Ausbauten mit Datum, Kilometerstand und Kosten.</p></div></section>`;
  const years = [];
  for (const l of entries) {
    const y = l.date.slice(0, 4);
    if (!years.length || years[years.length - 1].y !== y) years.push({ y, items: [] });
    years[years.length - 1].items.push(l);
  }
  return add + years.map(({ y, items }) => {
    const sum = items.reduce((a, l) => a + (l.cost || 0), 0);
    return `<section class="sec"><div class="sec-head"><h2>${y}</h2><span class="label">${sum ? eur(sum) + ' · ' : ''}${items.length === 1 ? '1 Eintrag' : items.length + ' Einträge'}</span></div>
    <div class="card list">${items.map((l) => `<button type="button" class="row row-btn" data-edit-log="${l.id}">
      <div class="t">${esc(l.title)}${l.category && l.category !== 'Wartung' ? `<span class="tag">${esc(l.category)}</span>` : ''}</div>
      <div class="s">${fmtDate(l.date).slice(0, 6)}${l.km != null ? ' · ' + de(l.km) + ' km' : ''}${l.by === 'werkstatt' ? ' · Werkstatt' : l.by === 'selbst' ? ' · selbst' : ''}${l.parts?.length ? ' · ' + (l.parts.length === 1 ? '1 Teil' : l.parts.length + ' Teile') : ''}${l.attachments?.length ? ' · 📎 ' + attachmentSummary(l.attachments) : ''}</div>
      <div class="r num big">${l.cost ? eurExact(l.cost) : ''}</div></button>`).join('')}</div></section>`;
  }).join('');
}

/** Wer hat es gemacht? Zwei Knöpfe statt freier Notiz. */
export const byField = (by = '') => `<div class="field"><label>Durchgeführt von</label><div class="seg by-seg" role="radiogroup">
  <label class="by-opt"><input type="radio" name="by" value="selbst" ${by === 'selbst' ? 'checked' : ''}><span>Selbst</span></label>
  <label class="by-opt"><input type="radio" name="by" value="werkstatt" ${by === 'werkstatt' ? 'checked' : ''}><span>Werkstatt</span></label></div></div>`;

export function serviceSheet(service, raw, { km, family = null, saveService, saveLog, removeService, log = [], filesForLog, syncFiles, guides = GUIDES }) {
  // service = mit tatsächlichem letzten Stand (zum Anzeigen), raw = gespeicherter Datensatz (zum Speichern)
  const s = service;
  const custom = !s.key || s.key.startsWith('custom-');
  const lastWithParts = log.filter((l) => l.serviceKey === s.key && l.parts?.length).sort((a, b) => b.date.localeCompare(a.date))[0];
  const lastParts = lastWithParts ? lastWithParts.parts : [];
  let readParts = () => [];
  let att = null;
  const guide = guideForService(guides, s.key);
  let mode = 'done';
  openSheet({
    title: s.name,
    submitLabel: 'Speichern',
    body: `
      ${s.hint ? `<p class="hint" style="margin:0">${esc(s.hint)}</p>` : ''}
      ${originBox(intervalOrigin(s, family), s)}
      ${guide ? `<button type="button" class="add guide-link" data-open-guide="${esc(guide.id)}">Anleitung öffnen: ${esc(guide.title)}</button>` : ''}
      <div class="seg" role="group" aria-label="Was möchtest du tun?">
        <button type="button" data-mode="done" aria-pressed="true">Erledigt eintragen</button>
        <button type="button" data-mode="interval" aria-pressed="false">Intervall ändern</button></div>
      <div data-pane="done" class="pane">
        <div class="two"><div class="field"><label for="s-date">Datum</label><input id="s-date" name="date" type="date" value="${todayIso()}"></div>
        <div class="field"><label for="s-km">Kilometerstand</label><input id="s-km" name="km" inputmode="numeric" value="${km || ''}"></div></div>
        ${lastParts.length ? `<div class="last-parts"><div class="label">Zuletzt verbaut (${fmtDate(lastWithParts.date)})</div>${partsList(lastParts)}</div>` : ''}
        ${partsEditor([], lastParts)}
        ${attachEditor()}
        <div class="field"><label for="s-cost">Kosten in €</label><input id="s-cost" name="cost" inputmode="decimal" placeholder="leer = Summe der Teile"></div>
        ${byField()}
        <div class="field"><label for="s-note">Notiz</label><input id="s-note" name="note" placeholder="Werkstatt, Auffälligkeiten …"></div>
        <label class="check"><input type="checkbox" name="onlyState"><span>Nur den Stand merken, kein Eintrag ins Serviceheft<br><span class="faint">Zum Beispiel, wenn du nur ungefähr weißt, wann es zuletzt gemacht wurde.</span></span></label>
      </div>
      <div data-pane="interval" class="pane" hidden>
        ${custom ? `<div class="field"><label for="s-name">Name</label><input id="s-name" name="name" value="${esc(s.name)}"></div>` : ''}
        <div class="two"><div class="field"><label for="s-ikm">Alle … km</label><input id="s-ikm" name="intervalKm" inputmode="numeric" value="${s.intervalKm ?? ''}" placeholder="leer = ohne"></div>
        <div class="field"><label for="s-imo">Alle … Monate</label><input id="s-imo" name="intervalMonths" inputmode="numeric" value="${s.intervalMonths ?? ''}" placeholder="leer = ohne"></div></div>
        <p class="hint" style="margin:0">Fällig ist, was zuerst eintritt. Ein Feld leer lassen, wenn es nur nach Zeit oder nur nach Kilometern geht.</p>
        ${custom ? '<button type="button" class="danger-link" id="s-del">Wartungspunkt löschen</button>' : ''}
      </div>`,
    onReady(form) {
      readParts = wireParts(form, lastParts);
      att = wireAttachments(form, null, filesForLog);
      form.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => {
        mode = b.dataset.mode;
        form.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
        form.querySelectorAll('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== mode));
      }));
      const del = form.querySelector('#s-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) { await removeService(s.id); closeSheet(); toast('Wartungspunkt gelöscht'); return; }
        del.dataset.armed = '1';
        del.textContent = 'Wirklich löschen? Nochmal tippen';
      };
    },
    async onSubmit(form) {
      const el = form.elements;
      if (mode === 'interval') {
        const ikm = el.intervalKm.value.trim() ? parseNumber(el.intervalKm.value, 'km') : null;
        const imo = el.intervalMonths.value.trim() ? parseNumber(el.intervalMonths.value, 'km') : null;
        if ((ikm != null && !(ikm > 0)) || (imo != null && !(imo > 0))) return 'Bitte nur positive Zahlen eintragen.';
        await saveService({ ...raw, name: custom && el.name ? el.name.value.trim() || raw.name : raw.name, intervalKm: ikm ? Math.round(ikm) : null, intervalMonths: imo ? Math.round(imo) : null });
        toast('Intervall gespeichert');
        return;
      }
      const date = el.date.value;
      const kmVal = el.km.value.trim() ? parseNumber(el.km.value, 'km') : null;
      if (!date) return 'Bitte ein Datum eintragen.';
      if (kmVal != null && !(kmVal >= 0)) return 'Der Kilometerstand ist keine gültige Zahl.';
      if (el.onlyState.checked) {
        await saveService({ ...raw, lastDate: date, lastKm: kmVal != null ? Math.round(kmVal) : null });
        toast('Stand gespeichert');
        return;
      }
      const parts = readParts();
      const cost = el.cost.value.trim() ? parseNumber(el.cost.value) : partsTotal(parts);
      if (!(cost >= 0)) return 'Die Kosten sind keine gültige Zahl.';
      const by = form.querySelector('input[name=by]:checked')?.value || null;
      const row = await saveLog({ date, km: kmVal != null ? Math.round(kmVal) : null, title: s.name, category: 'Wartung', cost, note: el.note.value.trim(), serviceKey: s.key, parts, by });
      if (att && syncFiles && att.ready() && att.added().length) await saveLog({ ...row, attachments: await syncFiles(row.id, att.keep(), att.added()) });
      const next = nextDueText(raw, { km: kmVal != null ? Math.round(kmVal) : null, date });
      toast(next ? `Eingetragen · nächstes Mal ${next}` : 'Im Serviceheft eingetragen');
    },
  });
}

/** Neuer eigener Wartungspunkt. */
export function newServiceSheet(saveService) {
  openSheet({
    title: 'Neuer Wartungspunkt',
    body: `
      <div class="field"><label for="n-name">Name</label><input id="n-name" name="name" placeholder="z. B. Keilriemen prüfen"></div>
      <div class="two"><div class="field"><label for="n-ikm">Alle … km</label><input id="n-ikm" name="intervalKm" inputmode="numeric" placeholder="leer = ohne"></div>
      <div class="field"><label for="n-imo">Alle … Monate</label><input id="n-imo" name="intervalMonths" inputmode="numeric" placeholder="leer = ohne"></div></div>`,
    async onSubmit(form) {
      const el = form.elements;
      const name = el.name.value.trim();
      if (!name) return 'Bitte einen Namen eintragen.';
      const ikm = el.intervalKm.value.trim() ? parseNumber(el.intervalKm.value, 'km') : null;
      const imo = el.intervalMonths.value.trim() ? parseNumber(el.intervalMonths.value, 'km') : null;
      if (!ikm && !imo) return 'Bitte mindestens ein Intervall eintragen: Kilometer oder Monate.';
      await saveService({ key: 'custom-' + Date.now().toString(36), name, intervalKm: ikm ? Math.round(ikm) : null, intervalMonths: imo ? Math.round(imo) : null, hint: '', lastKm: null, lastDate: null });
      toast('Wartungspunkt angelegt');
    },
  });
}

/** Serviceheft-Eintrag anlegen oder bearbeiten. */
export function logSheet(entry, { km, saveLog, removeLog, services, prefill, filesForLog, syncFiles }) {
  const edit = !!entry;
  const e = entry || { date: todayIso(), km, title: '', category: 'Reparatur', cost: '', note: '', ...(prefill || {}) };
  const linked = edit && e.serviceKey ? services.find((s) => s.key === e.serviceKey) : null;
  let readParts = () => [];
  let att = null;
  openSheet({
    title: edit ? 'Eintrag bearbeiten' : 'Neuer Eintrag',
    body: `
      <div class="field"><label for="l-title">Was wurde gemacht?</label><input id="l-title" name="title" value="${esc(e.title)}" placeholder="z. B. Wasserpumpe getauscht"></div>
      <div class="field"><label for="l-cat">Art</label><select id="l-cat" name="category">${CATEGORIES.map((c) => `<option ${c === e.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="two"><div class="field"><label for="l-date">Datum</label><input id="l-date" name="date" type="date" value="${esc(e.date)}"></div>
      <div class="field"><label for="l-km">Kilometerstand</label><input id="l-km" name="km" inputmode="numeric" value="${e.km ?? ''}"></div></div>
      ${partsEditor(e.parts || [])}
      ${attachEditor()}
      <div class="field"><label for="l-cost">Kosten in €</label><input id="l-cost" name="cost" inputmode="decimal" value="${e.cost ? String(e.cost).replace('.', ',') : ''}" placeholder="leer = Summe der Teile"></div>
      ${byField(e.by || '')}
      <div class="field"><label for="l-note">Notiz</label><input id="l-note" name="note" value="${esc(e.note || '')}" placeholder="Werkstatt, Auffälligkeiten …"></div>
      ${linked ? `<p class="hint" style="margin:0">Gehört zum Wartungspunkt „${esc(linked.name)}“.${nextDueText(linked, e) ? ` Nächstes Mal fällig ${esc(nextDueText(linked, e))}.` : ''}</p>` : ''}
      ${edit ? '<button type="button" class="danger-link" id="l-del">Eintrag löschen</button>' : ''}`,
    onReady(form) {
      readParts = wireParts(form);
      att = wireAttachments(form, edit ? entry.id : null, filesForLog);
      const del = form.querySelector('#l-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) { await removeLog(entry.id); closeSheet(); toast('Eintrag gelöscht'); return; }
        del.dataset.armed = '1';
        del.textContent = 'Wirklich löschen? Nochmal tippen';
      };
    },
    async onSubmit(form) {
      const el = form.elements;
      const title = el.title.value.trim();
      if (!title) return 'Bitte kurz beschreiben, was gemacht wurde.';
      if (!el.date.value) return 'Bitte ein Datum eintragen.';
      const kmVal = el.km.value.trim() ? parseNumber(el.km.value, 'km') : null;
      if (kmVal != null && !(kmVal >= 0)) return 'Der Kilometerstand ist keine gültige Zahl.';
      const parts = readParts();
      const cost = el.cost.value.trim() ? parseNumber(el.cost.value) : partsTotal(parts);
      if (!(cost >= 0)) return 'Die Kosten sind keine gültige Zahl.';
      const row = await saveLog({ ...(entry || {}), title, category: el.category.value, date: el.date.value, km: kmVal != null ? Math.round(kmVal) : null, cost, note: el.note.value.trim(), parts, by: form.querySelector('input[name=by]:checked')?.value || entry?.by || null });
      if (att && syncFiles && att.ready() && (att.added().length || edit)) await saveLog({ ...row, attachments: await syncFiles(row.id, att.keep(), att.added()) });
      toast(edit ? 'Eintrag geändert' : 'Eintrag gespeichert');
    },
  });
}
