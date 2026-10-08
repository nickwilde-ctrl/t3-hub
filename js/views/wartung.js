// Reiter „Wartung“: Intervalle mit Ampel, Serviceheft, Formulare.
import { de, eur, eurExact, esc, fmtDate, todayIso } from '../format.js';
import { serviceStatus } from '../logic/services.js';
import { parseNumber } from '../logic/fuel.js';
import { partsEditor, wireParts, partsList, partsTotal } from './parts.js';
import { statusText, pill } from './home.js';
import { openSheet, closeSheet, toast } from './sheet.js';

export const CATEGORIES = ['Wartung', 'Reparatur', 'Ausbau', 'Sonstiges'];

const intervalText = (s) => {
  const p = [];
  if (s.intervalKm) p.push('alle ' + de(s.intervalKm) + ' km');
  if (s.intervalMonths) p.push(s.intervalMonths % 12 === 0 ? `alle ${s.intervalMonths / 12 === 1 ? '12 Monate' : s.intervalMonths / 12 + ' Jahre'}` : `alle ${s.intervalMonths} Monate`);
  return p.join(' oder ') || 'ohne Intervall';
};

export function wartungView(services, log, km) {
  const rows = services.map((s) => {
    const st = serviceStatus(s, km);
    const last = s.lastDate || s.lastKm != null ? `Zuletzt ${s.lastDate ? fmtDate(s.lastDate) : ''}${s.lastKm != null ? ' bei ' + de(s.lastKm) + ' km' : ''}` : '';
    return `<button type="button" class="row row-btn" data-edit-service="${s.id}">
      <div class="t">${esc(s.name)}</div>
      <div class="s">${statusText(st)}<br><span class="faint">${intervalText(s)}${last ? ' · ' + last : ''}</span></div>
      <div class="r">${pill(st.state)}</div></button>`;
  }).join('');
  const entries = [...log].sort((a, b) => b.date.localeCompare(a.date) || (b.km || 0) - (a.km || 0));
  return `
  <section class="sec"><div class="sec-head"><h2>Intervalle</h2><span class="label">Stand ${de(km)} km</span></div>
    <div class="card list">${rows}</div>
    <div class="sec-foot"><p class="hint" style="margin:0">Antippen, um etwas als erledigt einzutragen oder das Intervall zu ändern. Startwerte nach Empfehlung einer T3-Fachwerkstatt.</p>
    <button type="button" class="add" data-action="add-service">+ Wartungspunkt</button></div></section>
  <section class="sec"><div class="sec-head"><h2>Serviceheft</h2><button type="button" class="add" data-action="add-log">+ Eintrag</button></div>
    ${entries.length ? `<div class="card list">${entries.map((l) => `<button type="button" class="row row-btn" data-edit-log="${l.id}">
      <div class="t">${esc(l.title)}<span class="tag">${esc(l.category)}</span></div>
      <div class="s">${fmtDate(l.date)}${l.km != null ? ' · ' + de(l.km) + ' km' : ''}${l.parts?.length ? ' · ' + (l.parts.length === 1 ? '1 Teil' : l.parts.length + ' Teile') : ''}${l.note ? ' · ' + esc(l.note) : ''}</div>
      <div class="r num big">${l.cost ? eurExact(l.cost) : ''}</div></button>`).join('')}</div>`
      : '<div class="card soon-card"><h3>Noch keine Einträge</h3><p>Hier landen Wartungen, Reparaturen und Ausbauten mit Datum, Kilometerstand und Kosten.</p></div>'}
  </section>`;
}

/** Wartungspunkt: als erledigt eintragen, Stand setzen oder Intervall ändern. */
export function serviceSheet(service, raw, { km, saveService, saveLog, removeService, log = [] }) {
  // service = mit tatsächlichem letzten Stand (zum Anzeigen), raw = gespeicherter Datensatz (zum Speichern)
  const s = service;
  const custom = !s.key || s.key.startsWith('custom-');
  const lastWithParts = log.filter((l) => l.serviceKey === s.key && l.parts?.length).sort((a, b) => b.date.localeCompare(a.date))[0];
  const lastParts = lastWithParts ? lastWithParts.parts : [];
  let readParts = () => [];
  let mode = 'done';
  openSheet({
    title: s.name,
    submitLabel: 'Speichern',
    body: `
      ${s.hint ? `<p class="hint" style="margin:0">${esc(s.hint)}</p>` : ''}
      <div class="seg" role="group" aria-label="Was möchtest du tun?">
        <button type="button" data-mode="done" aria-pressed="true">Erledigt eintragen</button>
        <button type="button" data-mode="interval" aria-pressed="false">Intervall ändern</button></div>
      <div data-pane="done" class="pane">
        <div class="two"><div class="field"><label for="s-date">Datum</label><input id="s-date" name="date" type="date" value="${todayIso()}"></div>
        <div class="field"><label for="s-km">Kilometerstand</label><input id="s-km" name="km" inputmode="numeric" value="${km || ''}"></div></div>
        ${lastParts.length ? `<div class="last-parts"><div class="label">Zuletzt verbaut (${fmtDate(lastWithParts.date)})</div>${partsList(lastParts)}</div>` : ''}
        ${partsEditor([], lastParts)}
        <div class="field"><label for="s-cost">Kosten in €</label><input id="s-cost" name="cost" inputmode="decimal" placeholder="leer = Summe der Teile"></div>
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
      await saveLog({ date, km: kmVal != null ? Math.round(kmVal) : null, title: s.name, category: 'Wartung', cost, note: el.note.value.trim(), serviceKey: s.key, parts });
      toast('Im Serviceheft eingetragen');
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
export function logSheet(entry, { km, saveLog, removeLog, services }) {
  const edit = !!entry;
  const e = entry || { date: todayIso(), km, title: '', category: 'Reparatur', cost: '', note: '' };
  const linked = edit && e.serviceKey ? services.find((s) => s.key === e.serviceKey) : null;
  let readParts = () => [];
  openSheet({
    title: edit ? 'Eintrag bearbeiten' : 'Neuer Eintrag',
    body: `
      <div class="field"><label for="l-title">Was wurde gemacht?</label><input id="l-title" name="title" value="${esc(e.title)}" placeholder="z. B. Wasserpumpe getauscht"></div>
      <div class="field"><label for="l-cat">Art</label><select id="l-cat" name="category">${CATEGORIES.map((c) => `<option ${c === e.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="two"><div class="field"><label for="l-date">Datum</label><input id="l-date" name="date" type="date" value="${esc(e.date)}"></div>
      <div class="field"><label for="l-km">Kilometerstand</label><input id="l-km" name="km" inputmode="numeric" value="${e.km ?? ''}"></div></div>
      ${partsEditor(e.parts || [])}
      <div class="field"><label for="l-cost">Kosten in €</label><input id="l-cost" name="cost" inputmode="decimal" value="${e.cost ? String(e.cost).replace('.', ',') : ''}" placeholder="leer = Summe der Teile"></div>
      <div class="field"><label for="l-note">Notiz</label><input id="l-note" name="note" value="${esc(e.note || '')}" placeholder="Werkstatt, Auffälligkeiten …"></div>
      ${linked ? `<p class="hint" style="margin:0">Gehört zum Wartungspunkt „${esc(linked.name)}“.</p>` : ''}
      ${edit ? '<button type="button" class="danger-link" id="l-del">Eintrag löschen</button>' : ''}`,
    onReady(form) {
      readParts = wireParts(form);
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
      await saveLog({ ...(entry || {}), title, category: el.category.value, date: el.date.value, km: kmVal != null ? Math.round(kmVal) : null, cost, note: el.note.value.trim(), parts });
      toast(edit ? 'Eintrag geändert' : 'Eintrag gespeichert');
    },
  });
}
