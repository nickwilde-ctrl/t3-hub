// Reiter „Touren“ und Kostenübersicht im Reiter „Mehr“.
import { de, eur, esc, fmtDate, todayIso } from '../format.js';
import { parseNumber } from '../logic/fuel.js';
import { tourStats, fuelsInTour, costsByCategory, costYears, COST_CATEGORIES } from '../logic/costs.js';
import { openSheet, closeSheet, toast } from './sheet.js';

export function tourenView(state, km) {
  const tours = [...state.tours].sort((a, b) => b.from.localeCompare(a.from));
  const head = `<div class="sec-head"><h2>Touren</h2><button type="button" class="add" data-action="add-tour">+ Tour</button></div>`;
  if (!tours.length) {
    return `<section class="sec">${head}<div class="card soon-card"><h3>Noch keine Touren</h3>
      <p>Leg eine Reise an, zum Beispiel „Dänemark“. Tankungen im Reisezeitraum ordnet die App automatisch zu. Während eine Tour läuft, landen neue Tankungen direkt darin.</p></div></section>`;
  }
  return `<section class="sec">${head}${tours.map((t) => {
    const s = tourStats(t, state.fuels, km);
    const when = `${fmtDate(t.from)} – ${t.to ? fmtDate(t.to) : 'läuft'}${s.days ? ' · ' + s.days + (s.days === 1 ? ' Tag' : ' Tage') : ''}`;
    return `<button type="button" class="card list tour-card" data-edit-tour="${t.id}">
      <div class="row"><div class="t tour-name">${esc(t.name)}${s.running ? '<span class="tag live">läuft</span>' : ''}</div><div class="s">${when}</div><div class="r"><span class="num big">${de(s.km)}</span><div class="label">km</div></div></div>
      <div class="row"><div class="t">Kraftstoff</div><div class="s">${s.fuels.length} Tankungen · ${de(s.liters, 0)} l</div><div class="r num big">${eur(s.fuelCost)}</div></div>
      <div class="row"><div class="t">Sonstiges</div><div class="s">${t.note ? esc(t.note) : 'Camping, Fähre, Maut …'}</div><div class="r num big">${eur(t.otherCost || 0)}</div></div>
      <div class="row"><div class="t">Gesamt</div><div class="s">${s.per100 != null ? de(s.per100, 0) + ' € pro 100 km' : ''}</div><div class="r num big" style="color:var(--amber)">${eur(s.total)}</div></div>
    </button>`;
  }).join('')}<p class="hint">Antippen zum Bearbeiten.</p></section>`;
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
      <div class="field"><label for="t-o">Sonstige Kosten in €</label><input id="t-o" name="otherCost" inputmode="decimal" value="${t.otherCost ? String(t.otherCost).replace('.', ',') : ''}" placeholder="Camping, Fähre, Maut …"></div>
      <div class="field"><label for="t-note">Notiz</label><input id="t-note" name="note" value="${esc(t.note || '')}" placeholder="Route, Highlights …"></div>
      <label class="check"><input type="checkbox" name="assign" ${edit ? '' : 'checked'}><span>Tankungen im Reisezeitraum dieser Tour zuordnen<br><span class="faint">Tankungen, die schon zu einer anderen Tour gehören, bleiben dort.</span></span></label>
      ${edit ? '<button type="button" class="danger-link" id="t-del">Tour löschen</button>' : ''}`,
    onReady(form) {
      const del = form.querySelector('#t-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) {
          await saveFuels(state.fuels.filter((f) => f.tourId === tour.id).map((f) => ({ ...f, tourId: null })));
          await removeTour(tour.id);
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
      const otherCost = el.otherCost.value.trim() ? parseNumber(el.otherCost.value) : 0;
      if (!(otherCost >= 0)) return 'Die sonstigen Kosten sind keine gültige Zahl.';
      const saved = await saveTour({ ...(tour || {}), name, from: el.from.value, to: el.to.value || null, startKm: Math.round(startKm), endKm: endKm != null ? Math.round(endKm) : null, otherCost, note: el.note.value.trim() });
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
