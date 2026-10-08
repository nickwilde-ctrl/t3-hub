// Reiter „Touren“ und Kostenübersicht im Reiter „Mehr“.
import { de, eur, eurExact, esc, fmtDate, todayIso } from '../format.js';
import { parseNumber } from '../logic/fuel.js';
import { tourStats, fuelsInTour, costsByCategory, costYears, COST_CATEGORIES, TRIP_CATEGORIES, compareTours } from '../logic/costs.js';
import { openSheet, closeSheet, toast } from './sheet.js';
import { stopsSection } from './stops.js';
import { runningTour } from '../logic/costs.js';

let openTourId = null;
export const setOpenTour = (id) => { openTourId = id; };
export const getOpenTour = () => openTourId;

const dayLabel = (n) => (n === 1 ? '1 Tag' : `${n} Tage`);
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export function tourenView(state, km) {
  const open = openTourId && state.tours.find((t) => t.id === openTourId);
  if (open) return tourDetail(state, open, km);
  openTourId = null;
  const tours = [...state.tours].sort((a, b) => b.from.localeCompare(a.from));
  const head = `<div class="sec-head"><h2>Touren</h2><button type="button" class="add" data-action="add-tour">+ Tour</button></div>`;
  if (!tours.length) {
    return `<section class="sec">${head}<div class="card soon-card"><h3>Noch keine Touren</h3>
      <p>Leg eine Reise an, zum Beispiel „Dänemark“. Tankungen im Reisezeitraum ordnet die App automatisch zu. Während eine Tour läuft, landen neue Tankungen direkt darin.</p></div></section>`;
  }
  const cards = tours.map((t) => {
    const s = tourStats(t, state.fuels, km);
    const when = `${fmtDate(t.from)} – ${t.to ? fmtDate(t.to) : 'läuft'}${s.days ? ' · ' + dayLabel(s.days) : ''}`;
    const top = s.byCategory.slice(0, 3).map(([k, v]) => `${esc(k)} ${eur(v)}`).join(' · ');
    return `<button type="button" class="card list tour-card" data-open-tour="${t.id}">
      <div class="row"><div class="t tour-name">${esc(t.name)}${s.running ? '<span class="tag live">läuft</span>' : ''}</div><div class="s">${when}</div><div class="r"><span class="num big">${de(s.km)}</span><div class="label">km</div></div></div>
      <div class="row"><div class="t">Gesamt</div><div class="s">${top || 'Noch keine Kosten'}</div><div class="r num big" style="color:var(--amber)">${eur(s.total)}</div></div>
      ${(t.journal || []).length ? `<div class="row"><div class="s">${t.journal.length} Tagebuch-Einträge</div></div>` : ''}
    </button>`;
  }).join('');
  return `${runningCard(state)}<section class="sec">${head}${cards}<p class="hint">Antippen für Details, Stellplätze, Ausgaben und Tagebuch.</p></section>${compareCard(state, km)}`;
}

/** Schnellzugriff, solange eine Tour läuft: Stellplatz für heute setzen. */
export function runningCard(state) {
  const t = runningTour(state.tours, todayIso());
  if (!t) return '';
  const today = (t.stops || []).some((x) => x.date === todayIso());
  return `<section class="sec"><div class="card reminder"><div><div class="t">Unterwegs: ${esc(t.name)}</div>
    <div class="s">${today ? 'Stellplatz für heute ist gespeichert.' : 'Wo steht ihr heute Nacht?'}</div></div>
    <button type="button" class="btn" data-action="add-stop" data-tour="${t.id}">${today ? 'Noch einer' : 'Hier stehen wir'}</button></div></section>`;
}

/** Vergleich der abgeschlossenen Touren. Bester Wert je Spalte hervorgehoben. */
function compareCard(state, km) {
  const rows = compareTours(state.tours, state.fuels, km);
  if (rows.length < 2) return '';
  const best = (key) => Math.min(...rows.map((r) => r[key] ?? Infinity));
  const bDay = best('perDay'), b100 = best('per100');
  return `<section class="sec"><div class="sec-head"><h2>Touren-Vergleich</h2><span class="label">abgeschlossene Touren</span></div>
    <div class="card table-wrap"><table class="cmp">
      <thead><tr><th>Tour</th><th>km</th><th>Tage</th><th>€ / Tag</th><th>€ / 100 km</th></tr></thead>
      <tbody>${rows.map((r) => `<tr data-open-tour="${r.tour.id}">
        <td>${esc(r.tour.name)}<span class="faint"><br>${fmtDate(r.tour.from)}</span></td>
        <td class="num">${de(r.km)}</td><td class="num">${r.days ?? '–'}</td>
        <td class="num ${r.perDay === bDay ? 'best' : ''}">${r.perDay != null ? de(r.perDay, 0) : '–'}</td>
        <td class="num ${r.per100 === b100 ? 'best' : ''}">${r.per100 != null ? de(r.per100, 0) : '–'}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="hint">Gesamtkosten mit Sprit und allen Ausgaben. Hervorgehoben ist die jeweils günstigste Tour.</p></section>`;
}

function tourDetail(state, t, km) {
  const s = tourStats(t, state.fuels, km);
  const when = `${fmtDate(t.from)} – ${t.to ? fmtDate(t.to) : 'läuft'}${s.days ? ' · ' + dayLabel(s.days) : ''}`;
  const max = Math.max(1, ...s.byCategory.map(([, v]) => v));
  const stat = (l, v, u) => `<div class="stat"><div class="label">${l}</div><div class="v num">${v}<span class="u"> ${u}</span></div></div>`;
  const expenses = [...(t.expenses || [])].sort((a, b) => b.date.localeCompare(a.date));
  const journal = [...(t.journal || [])].sort((a, b) => a.date.localeCompare(b.date));
  const fuels = [...s.fuels].sort((a, b) => a.km - b.km);
  return `
  <div class="detail-head"><button type="button" class="add" data-action="close-tour">‹ Alle Touren</button><button type="button" class="add" data-edit-tour="${t.id}">Bearbeiten</button></div>
  <section class="sec"><div><h2 class="tour-title">${esc(t.name)}${s.running ? '<span class="tag live">läuft</span>' : ''}</h2><div class="hint">${when}${t.note ? ' · ' + esc(t.note) : ''}</div></div>
    <div class="card stats">
      ${stat('Gefahren', de(s.km), 'km')}
      ${stat('Gesamtkosten', de(s.total, 0), '€')}
      ${stat('Pro Tag', s.perDay != null ? de(s.perDay, 0) : '–', '€')}
      ${stat('Pro 100 km', s.per100 != null ? de(s.per100, 0) : '–', '€')}
    </div></section>
  ${stopsSection(t)}
  <section class="sec"><div class="sec-head"><h2>Kosten nach Art</h2><button type="button" class="add" data-action="add-expense">+ Ausgabe</button></div>
    ${s.byCategory.length ? `<div class="card"><div class="bars">${s.byCategory.map(([k, v], i) => `<div class="bar-row"><span>${esc(k)}</span><div class="bar"><i style="width:${((v / max) * 100).toFixed(1)}%;${i === 0 ? 'background:var(--amber)' : ''}"></i></div><span class="num" style="font-size:17px">${eur(v)}</span></div>`).join('')}</div></div>`
      : '<div class="card soon-card"><p>Noch keine Kosten. Trag Ausgaben wie Camping, Fähre oder Maut ein.</p></div>'}
    ${expenses.length ? `<div class="card list">${expenses.map((e) => `<button type="button" class="row row-btn" data-edit-expense="${e.id}"><div class="t">${esc(e.category)}</div><div class="s">${fmtDate(e.date)}${e.note ? ' · ' + esc(e.note) : ''}</div><div class="r num big">${eurExact(e.amount)}</div></button>`).join('')}</div>` : ''}
  </section>
  <section class="sec"><div class="sec-head"><h2>Reisetagebuch</h2><button type="button" class="add" data-action="add-journal">+ Eintrag</button></div>
    ${journal.length ? `<div class="card list journal">${journal.map((j) => `<button type="button" class="row row-btn" data-edit-journal="${j.id}"><div class="t">${fmtDate(j.date)}${j.place ? ' · ' + esc(j.place) : ''}</div><div class="s jtext">${esc(j.text)}</div></button>`).join('')}</div>`
      : '<div class="card soon-card"><p>Halte fest, wo ihr wart und was ihr erlebt habt. Ein Satz pro Tag reicht.</p></div>'}
  </section>
  <section class="sec"><div class="sec-head"><h2>Tankungen</h2><span class="hint">${s.fuels.length} · ${de(s.liters, 0)} l · ${eur(s.fuelCost)}</span></div>
    ${fuels.length ? `<div class="card list">${fuels.map((f) => `<button type="button" class="row row-btn" data-edit-fuel="${f.id}"><div class="t num" style="font-size:17px">${de(f.km)} km<span class="tag">${f.full ? 'Voll' : 'Teil'}</span></div><div class="s">${fmtDate(f.date)} · ${de(f.liters, 1)} l · ${de(f.pricePerLiter, 3)} €/l${f.note ? ' · ' + esc(f.note) : ''}</div><div class="r num big">${eurExact(f.liters * f.pricePerLiter)}</div></button>`).join('')}</div>`
      : '<div class="card soon-card"><p>Noch keine Tankungen auf dieser Tour.</p></div>'}
  </section>`;
}

/** Ausgabe einer Tour anlegen, ändern oder löschen. */
export function expenseSheet(tour, expense, saveTour) {
  const edit = !!expense;
  const e = expense || { date: todayIso() > (tour.to || '9') ? tour.from : todayIso(), category: TRIP_CATEGORIES[0], amount: '', note: '' };
  openSheet({
    title: edit ? 'Ausgabe bearbeiten' : 'Neue Ausgabe',
    body: `
      <div class="field"><label>Art</label><div class="chips" id="x-cats">${TRIP_CATEGORIES.map((c) => `<button type="button" class="chip-btn" data-cat="${esc(c)}" aria-pressed="${c === e.category}">${esc(c)}</button>`).join('')}</div></div>
      <div class="two"><div class="field"><label for="x-amount">Betrag in €</label><input id="x-amount" name="amount" inputmode="decimal" value="${e.amount !== '' ? String(e.amount).replace('.', ',') : ''}" placeholder="z. B. 28,50"></div>
      <div class="field"><label for="x-date">Datum</label><input id="x-date" name="date" type="date" value="${esc(e.date)}"></div></div>
      <div class="field"><label for="x-note">Notiz</label><input id="x-note" name="note" value="${esc(e.note || '')}" placeholder="z. B. Stellplatz am See"></div>
      ${edit ? '<button type="button" class="danger-link" id="x-del">Ausgabe löschen</button>' : ''}`,
    onReady(form) {
      form.querySelector('#x-cats').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-cat]'); if (!b) return;
        form.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      });
      const del = form.querySelector('#x-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) { await saveTour({ ...tour, expenses: (tour.expenses || []).filter((x) => x.id !== expense.id) }); closeSheet(); toast('Ausgabe gelöscht'); return; }
        del.dataset.armed = '1'; del.textContent = 'Wirklich löschen? Nochmal tippen';
      };
    },
    async onSubmit(form) {
      const amount = parseNumber(form.elements.amount.value);
      if (!(amount > 0)) return 'Bitte einen Betrag eintragen, z. B. 28,50.';
      const category = form.querySelector('[data-cat][aria-pressed="true"]').dataset.cat;
      const row = { id: edit ? expense.id : newId(), date: form.elements.date.value || todayIso(), category, amount: Math.round(amount * 100) / 100, note: form.elements.note.value.trim() };
      const list = (tour.expenses || []).filter((x) => x.id !== row.id).concat(row);
      await saveTour({ ...tour, expenses: list });
      toast(edit ? 'Ausgabe geändert' : 'Ausgabe gespeichert');
    },
  });
}

/** Tagebuch-Eintrag anlegen, ändern oder löschen. */
export function journalSheet(tour, entry, saveTour) {
  const edit = !!entry;
  const j = entry || { date: todayIso() > (tour.to || '9') ? (tour.to || tour.from) : todayIso(), place: '', text: '' };
  openSheet({
    title: edit ? 'Tagebuch-Eintrag bearbeiten' : 'Neuer Tagebuch-Eintrag',
    body: `
      <div class="two"><div class="field"><label for="j-date">Datum</label><input id="j-date" name="date" type="date" value="${esc(j.date)}"></div>
      <div class="field"><label for="j-place">Ort</label><input id="j-place" name="place" value="${esc(j.place || '')}" placeholder="z. B. Skagen"></div></div>
      <div class="field"><label for="j-text">Was war heute?</label><textarea id="j-text" name="text" rows="5" placeholder="Route, Stellplatz, Erlebnisse, Pannen …">${esc(j.text || '')}</textarea></div>
      ${edit ? '<button type="button" class="danger-link" id="j-del">Eintrag löschen</button>' : ''}`,
    onReady(form) {
      const del = form.querySelector('#j-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) { await saveTour({ ...tour, journal: (tour.journal || []).filter((x) => x.id !== entry.id) }); closeSheet(); toast('Eintrag gelöscht'); return; }
        del.dataset.armed = '1'; del.textContent = 'Wirklich löschen? Nochmal tippen';
      };
    },
    async onSubmit(form) {
      const text = form.elements.text.value.trim();
      const place = form.elements.place.value.trim();
      if (!text && !place) return 'Bitte einen Ort oder ein paar Worte eintragen.';
      const row = { id: edit ? entry.id : newId(), date: form.elements.date.value || todayIso(), place, text };
      await saveTour({ ...tour, journal: (tour.journal || []).filter((x) => x.id !== row.id).concat(row) });
      toast(edit ? 'Eintrag geändert' : 'Eintrag gespeichert');
    },
  });
}

export function tourSheet(state, tour, { km, saveTour, removeTour, saveFuels }) {
  const edit = !!tour;
  const t = tour || { name: '', from: todayIso(), to: '', startKm: km || '', endKm: null, otherCost: 0, note: '' };
  openSheet({
    title: edit ? 'Tour bearbeiten' : 'Neue Tour',
    body: `
      <div class="field"><label for="t-name">Name</label><input id="t-name" name="name" value="${esc(t.name)}" placeholder="z. B. Dänemark"></div>
      <div class="two"><div class="field"><label for="t-from">Von</label><input id="t-from" name="from" type="date" value="${esc(t.from)}"></div>
      <div class="field"><label for="t-to">Bis</label><input id="t-to" name="to" type="date" value="${esc(t.to || '')}"></div></div>
      <div class="two"><div class="field"><label for="t-s">Start-km</label><input id="t-s" name="startKm" inputmode="numeric" value="${t.startKm ?? ''}"></div>
      <div class="field"><label for="t-e">End-km</label><input id="t-e" name="endKm" inputmode="numeric" value="${t.endKm ?? ''}" placeholder="leer = läuft noch"></div></div>
      ${t.otherCost ? `<div class="field"><label for="t-o">Pauschalbetrag in € (alt)</label><input id="t-o" name="otherCost" inputmode="decimal" value="${String(t.otherCost).replace('.', ',')}"><span class="faint">Neue Kosten besser einzeln als Ausgabe auf der Tour-Seite eintragen.</span></div>` : ''}
      <div class="field"><label for="t-note">Kurzbeschreibung</label><input id="t-note" name="note" value="${esc(t.note || '')}" placeholder="z. B. Küste entlang bis Skagen"></div>
      <label class="check"><input type="checkbox" name="assign" ${edit ? '' : 'checked'}><span>Tankungen im Reisezeitraum dieser Tour zuordnen<br><span class="faint">Tankungen, die schon zu einer anderen Tour gehören, bleiben dort.</span></span></label>
      ${edit ? '<button type="button" class="danger-link" id="t-del">Tour löschen</button>' : ''}`,
    onReady(form) {
      const del = form.querySelector('#t-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) {
          await saveFuels(state.fuels.filter((f) => f.tourId === tour.id).map((f) => ({ ...f, tourId: null })));
          await removeTour(tour.id);
          openTourId = null;
          closeSheet();
          toast('Tour gelöscht');
          return;
        }
        del.dataset.armed = '1';
        del.textContent = 'Wirklich löschen? Nochmal tippen (Tankungen bleiben erhalten)';
      };
    },
    async onSubmit(form) {
      const el = form.elements;
      const name = el.name.value.trim();
      if (!name) return 'Bitte der Tour einen Namen geben.';
      if (!el.from.value) return 'Bitte das Startdatum eintragen.';
      if (el.to.value && el.to.value < el.from.value) return 'Das Enddatum liegt vor dem Startdatum.';
      const startKm = parseNumber(el.startKm.value, 'km');
      if (!(startKm >= 0)) return 'Bitte den Kilometerstand beim Start eintragen.';
      const endKm = el.endKm.value.trim() ? parseNumber(el.endKm.value, 'km') : null;
      if (endKm != null && !(endKm > startKm)) return 'Der End-km muss größer als der Start-km sein.';
      const otherCost = el.otherCost && el.otherCost.value.trim() ? parseNumber(el.otherCost.value) : 0;
      if (!(otherCost >= 0)) return 'Der Pauschalbetrag ist keine gültige Zahl.';
      const saved = await saveTour({ expenses: [], journal: [], ...(tour || {}), name, from: el.from.value, to: el.to.value || null, startKm: Math.round(startKm), endKm: endKm != null ? Math.round(endKm) : null, otherCost, note: el.note.value.trim() });
      if (!edit) openTourId = saved.id;
      if (el.assign.checked) {
        const match = fuelsInTour(saved, state.fuels).filter((f) => !f.tourId || f.tourId === saved.id);
        if (match.length) await saveFuels(match.map((f) => ({ ...f, tourId: saved.id })));
        toast(match.length ? `Tour gespeichert, ${match.length} Tankungen zugeordnet` : 'Tour gespeichert');
      } else {
        toast('Tour gespeichert');
      }
    },
  });
}

let costYear = null; // null = Gesamt

export const setCostYear = (y) => { costYear = y === 'all' ? null : y; };

export function costCard(state, km) {
  const years = costYears(state);
  if (!years.length) return '';
  if (costYear && !years.includes(costYear)) costYear = null;
  const { byCategory, total } = costsByCategory(state, costYear);
  const rows = COST_CATEGORIES.map((k) => [k, byCategory[k]]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(([, v]) => v));
  const firstKm = state.fuels.length ? Math.min(...state.fuels.map((f) => f.km)) : 0;
  const allTotal = costsByCategory(state, null).total;
  const chips = [['all', 'Gesamt'], ...years.map((y) => [y, y])]
    .map(([v, l]) => `<button type="button" class="chip-btn" data-cost-year="${v}" aria-pressed="${(costYear || 'all') === v}">${l}</button>`).join('');
  return `<section class="sec"><div class="sec-head"><h2>Was kostet der T3?</h2></div>
    <div class="chips">${chips}</div>
    <div class="card"><div class="bars">${rows.map(([k, v], i) => `<div class="bar-row"><span>${k}</span><div class="bar"><i style="width:${((v / max) * 100).toFixed(1)}%;${i === 0 ? 'background:var(--amber)' : ''}"></i></div><span class="num" style="font-size:17px">${eur(v)}</span></div>`).join('') || '<p class="hint" style="margin:0">Keine Kosten in diesem Zeitraum.</p>'}</div>
    <div class="row" style="border-top:1px solid var(--hair)"><div class="t">Summe ${costYear || 'gesamt'}</div>
      <div class="s">${!costYear && km > firstKm ? de((allTotal / (km - firstKm)) * 100, 0) + ' € pro 100 km seit der ersten Tankung' : ''}</div>
      <div class="r num big">${eur(total)}</div></div></div></section>`;
}
