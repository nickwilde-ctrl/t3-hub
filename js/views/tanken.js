// Reiter „Tanken“: Auswertung und Tankbuch, dazu das Formular für Tankungen.
import { de, eur, eurExact, esc, fmtDate, todayIso } from '../format.js';
import { fuelStats, consumptionByMonth, withConsumption, completeFill, parseNumber, consumptionCheck } from '../logic/fuel.js';
import { lineChart, barChart, MONTHS } from './charts.js';
import { openSheet, closeSheet, toast } from './sheet.js';
import { runningTour } from '../logic/costs.js';
import { fuelWarnings, DEFAULT_TANK_LITERS } from '../logic/checks.js';

let sub = 'auswertung';
export const setSub = (s) => { sub = s; };

export function tankenView(state) {
  const tabs = `<div class="tank-head"><div class="seg sub" role="tablist">
    <button type="button" data-sub="auswertung" aria-pressed="${sub === 'auswertung'}">Auswertung</button>
    <button type="button" data-sub="tankbuch" aria-pressed="${sub === 'tankbuch'}">Tankbuch</button></div>
    <button type="button" class="btn add-main" data-action="add-fuel" aria-label="Tankung eintragen">+ Tankung</button></div>`;
  if (!state.fuels.length) {
    return `<section class="sec"><div class="card soon-card"><h3>Noch keine Tankungen</h3>
      <p>Trag deine erste Tankung ein. Deine bisherigen Daten aus Road Trip kannst du ab Schritt 2.7 übernehmen.</p>
      <button type="button" class="btn" data-action="add-fuel" style="justify-self:start;margin-top:6px">+ Tankung eintragen</button></div></section>`;
  }
  return tabs + (sub === 'auswertung' ? auswertung(state) : tankbuch(state));
}

function auswertung(state) {
  const s = fuelStats(state.fuels);
  const stat = (l, v, u, small) => `<div class="stat"><div class="label">${l}</div><div class="v num">${v}<span class="u"> ${u}</span></div>${small ? `<div class="s">${small}</div>` : ''}</div>`;
  const consPts = s.series.map((r) => ({ date: r.date, y: r.cons, tip: `<b>${de(r.cons, 1)} l/100 km</b><br>${fmtDate(r.date)} · ${de(r.segKm)} km` }));
  const pricePts = s.rows.map((r) => ({ date: r.date, y: r.pricePerLiter, tip: `<b>${de(r.pricePerLiter, 3)} €/l</b><br>${fmtDate(r.date)} · ${de(r.liters, 1)} l` }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const months = consumptionByMonth(state.fuels).map((m) => {
    const [y, mo] = m.month.split('-');
    return { y: m.consumption, short: MONTHS[+mo - 1], tip: `<b>${de(m.consumption, 1)} l/100 km</b><br>${MONTHS[+mo - 1]} ${y} · ${de(m.km)} km` };
  });
  const minmax = (a, al, b, bl) => `<div class="mm"><div><span class="label">${al}</span>${a}</div><div><span class="label">${bl}</span>${b}</div></div>`;
  const val = (v, unit, date) => `<b class="num">${v} ${unit}</b><span>${fmtDate(date)}</span>`;
  return `
  <section class="sec"><div class="sec-head"><h2>Seit Beginn</h2><span class="label">ab ${fmtDate(s.since)}</span></div>
    <div class="card stats">
      ${stat('Gefahren', de(s.km), 'km')}
      ${stat('Getankt', de(s.totalLiters, 0), 'l', s.count + ' Tankungen')}
      ${stat('Spritkosten', de(s.totalCost, 0), '€')}
      ${stat('Ø Verbrauch', de(s.avgConsumption, 1), 'l/100 km')}
      ${stat('Ø Preis', de(s.avgPrice, 3), '€/l', 'nach Litern gewichtet')}
      ${stat('Sprit je 100 km', de(s.costPer100, 2), '€')}
    </div></section>
  <section class="sec"><div class="sec-head"><h2>Verbrauch</h2><span class="label">l/100 km je Volltankung</span></div>
    <div class="card pad">${lineChart('cons', consPts, { label: 'Verbrauch je Volltankung', step: 2, dec: 0, avg: s.avgConsumption, avgDec: 1 })}
    ${s.best ? minmax(val(de(s.best.cons, 1), 'l', s.best.date), 'Bester Wert', val(de(s.worst.cons, 1), 'l', s.worst.date), 'Höchster Wert') : ''}
    ${checkLine(consumptionCheck(state.fuels))}</div></section>
  <section class="sec"><div class="sec-head"><h2>Verbrauch je Monat</h2><span class="label">l/100 km</span></div>
    <div class="card pad">${barChart('mon', months, { label: 'Verbrauch je Monat', step: 5, dec: 1 })}
    <p class="hint">Jede Volltankung zählt zu dem Monat, in dem sie war. Monate ohne Volltankung fehlen.</p></div></section>
  <section class="sec"><div class="sec-head"><h2>Spritpreise</h2><span class="label">€/l je Tankung</span></div>
    <div class="card pad">${lineChart('price', pricePts, { label: 'Spritpreis je Tankung', step: 0.2, dec: 2, avg: s.avgPrice, avgDec: 3 })}
    ${minmax(val(de(s.cheapest.pricePerLiter, 3), '€', s.cheapest.date), 'Günstigste', val(de(s.priciest.pricePerLiter, 3), '€', s.priciest.date), 'Teuerste')}</div></section>
  <p class="hint">Tippe auf ein Diagramm, um einzelne Werte zu sehen.</p>`;
}

function tankbuch(state) {
  const tourName = (id) => (state.tours.find((t) => t.id === id) || {}).name;
  const rows = withConsumption(state.fuels).reverse();
  return `<section class="sec"><div class="sec-head"><h2>Tankbuch</h2><span class="label">${state.fuels.length} Einträge</span></div>
    <div class="card list">${rows.map((f) => `<button type="button" class="row row-btn" data-edit-fuel="${f.id}">
      <div class="t num" style="font-size:18px">${de(f.km)} km<span class="tag">${f.full ? 'Voll' : 'Teil'}</span>${f.tourId && tourName(f.tourId) ? `<span class="tag">${esc(tourName(f.tourId))}</span>` : ''}</div>
      <div class="s">${fmtDate(f.date)} · ${de(f.liters, 2)} l · ${de(f.pricePerLiter, 3)} €/l · ${eurExact(f.liters * f.pricePerLiter)}${f.note ? ' · ' + esc(f.note) : ''}</div>
      <div class="r">${f.cons != null ? `<span class="num big">${de(f.cons, 1)}</span><div class="label">l/100 km</div>` : `<span class="hint">${f.full ? 'Startwert' : 'zählt zur nächsten<br>Volltankung'}</span>`}</div>
    </button>`).join('')}</div>
    <p class="hint">Antippen zum Bearbeiten oder Löschen. Verbrauch wird zwischen zwei Volltankungen berechnet, Teiltankungen dazwischen zählen mit.</p></section>`;
}

/** Formular für eine neue oder bestehende Tankung. */
export function fuelSheet(state, fuel, { save, remove, currentKm }) {
  const edit = !!fuel;
  const running = runningTour(state.tours, todayIso());
  const f = fuel || { date: todayIso(), km: '', liters: '', pricePerLiter: '', full: true, tourId: running ? running.id : null, note: '' };
  const num = (n, d) => (n === '' || n == null ? '' : n.toLocaleString('de-DE', { maximumFractionDigits: d, useGrouping: false }));
  const tours = [...state.tours].sort((a, b) => b.from.localeCompare(a.from));
  const tourSelect = state.tours.length
    ? `<div class="field"><label for="f-tour">Zu Tour</label><select id="f-tour" name="tour"><option value="">Keine Tour</option>${tours.map((t) => `<option value="${t.id}" ${t.id === f.tourId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>`
    : '';
  let full = f.full;
  openSheet({
    title: edit ? 'Tankung bearbeiten' : 'Tankung eintragen',
    body: `
      <div class="seg" role="group" aria-label="Tankart"><button type="button" id="f-full" aria-pressed="${full}">Volltankung</button><button type="button" id="f-part" aria-pressed="${!full}">Teiltankung</button></div>
      <div class="two"><div class="field"><label for="f-date">Datum</label><input id="f-date" name="date" type="date" value="${esc(f.date)}"></div>
      <div class="field"><label for="f-km">Kilometerstand</label><input id="f-km" name="km" inputmode="numeric" value="${num(f.km, 0)}" placeholder="${currentKm ? de(currentKm + 300) : 'z. B. 14.600'}"></div></div>
      <div class="three">
        <div class="field"><label for="f-l">Liter</label><input id="f-l" name="liters" inputmode="decimal" value="${num(f.liters, 2)}" placeholder="48,50"></div>
        <div class="field"><label for="f-p">€ pro Liter</label><input id="f-p" name="price" inputmode="decimal" value="${num(f.pricePerLiter, 3)}" placeholder="1,729"></div>
        <div class="field"><label for="f-t">Betrag €</label><input id="f-t" name="total" inputmode="decimal" value="${edit ? num(Math.round(f.liters * f.pricePerLiter * 100) / 100, 2) : ''}" placeholder="83,86"></div>
      </div>
      <p class="hint" id="f-calc" style="margin:0">Zwei der drei Werte reichen, den dritten rechnet die App aus.</p>
      ${tourSelect}
      <div class="field"><label for="f-note">Notiz</label><input id="f-note" name="note" value="${esc(f.note || '')}" placeholder="Ort, Autobahn, Anhänger …"></div>
      ${edit ? '<button type="button" class="danger-link" id="f-del">Tankung löschen</button>' : ''}`,
    onReady(form) {
      const set = (v) => { full = v; form.querySelector('#f-full').setAttribute('aria-pressed', v); form.querySelector('#f-part').setAttribute('aria-pressed', !v); };
      form.querySelector('#f-full').onclick = () => set(true);
      form.querySelector('#f-part').onclick = () => set(false);
      const calc = form.querySelector('#f-calc');
      const fields = ['liters', 'price', 'total'].map((n) => form.elements[n]);
      const update = () => {
        const [l, p, t] = fields.map((x) => parseNumber(x.value));
        const filled = fields.filter((x) => x.value.trim());
        if (filled.length === 2) {
          const r = completeFill({ liters: l, pricePerLiter: p, total: t });
          if (r) {
            const empty = fields.find((x) => !x.value.trim());
            calc.textContent = empty === fields[0] ? `Berechnet: ${de(r.liters, 2)} Liter` : empty === fields[1] ? `Berechnet: ${de(r.pricePerLiter, 3)} € pro Liter` : `Berechnet: ${de(r.total, 2)} €`;
            return;
          }
        }
        calc.textContent = filled.length === 3 ? 'Alle drei Werte eingetragen. Gespeichert werden Liter und Preis pro Liter.' : 'Zwei der drei Werte reichen, den dritten rechnet die App aus.';
      };
      fields.forEach((x) => x.addEventListener('input', update));
      // Beim Bearbeiten sind alle drei gefüllt. Ändert man Liter oder Preis, wird der Betrag neu gerechnet.
      if (edit) fields.slice(0, 2).forEach((x) => x.addEventListener('input', () => { fields[2].value = ''; update(); }));
      update();
      const del = form.querySelector('#f-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) { await remove(fuel.id); closeSheet(); toast('Tankung gelöscht'); return; }
        del.dataset.armed = '1';
        del.textContent = 'Wirklich löschen? Nochmal tippen';
      };
    },
    async onSubmit(form, { confirmed }) {
      const km = parseNumber(form.elements.km.value, 'km');
      if (!(km >= 0) || form.elements.km.value.trim() === '') return 'Bitte den Kilometerstand eintragen.';
      const r = completeFill({
        liters: parseNumber(form.elements.liters.value),
        pricePerLiter: parseNumber(form.elements.price.value),
        total: parseNumber(form.elements.total.value),
      });
      if (!r) return 'Bitte mindestens zwei der drei Werte eintragen: Liter, Preis pro Liter oder Betrag.';
      if (r.liters > 120) return 'Mehr als 120 Liter? Bitte die Menge prüfen.';
      if (r.pricePerLiter > 5 || r.pricePerLiter < 0.5) return 'Der Preis pro Liter wirkt ungewöhnlich. Bitte prüfen, z. B. 1,729.';
      const date = form.elements.date.value || todayIso();
      if (!confirmed) {
        const probe = { id: fuel ? fuel.id : undefined, date, km: Math.round(km), liters: r.liters, pricePerLiter: r.pricePerLiter, full };
        const warnings = fuelWarnings(probe, state.fuels, { tankLiters: state.vehicle.tankLiters || DEFAULT_TANK_LITERS });
        if (warnings.length) return { warnings: warnings.map((w) => w.text) };
      }
      await save({
        ...(fuel || {}),
        date,
        km: Math.round(km),
        liters: r.liters,
        pricePerLiter: r.pricePerLiter,
        full,
        tourId: form.elements.tour ? form.elements.tour.value || null : (fuel ? fuel.tourId || null : null),
        note: form.elements.note.value.trim(),
      });
      toast(edit ? 'Tankung geändert' : 'Tankung gespeichert');
    },
  });
}

/** Erklärt die Verbrauchs-Lampe im Cockpit. */
function checkLine(c) {
  if (c.state === 'none') return '<p class="hint cons-check"><span class="lamp" style="background:var(--muted)"></span>Ab vier Volltankungen bewertet die App die letzte Tankung gegen den Schnitt deines Busses.</p>';
  const d = `${c.diff > 0 ? '+' : '−'}${de(Math.abs(c.diff), 0)}\u00a0%`;
  return c.state === 'high'
    ? `<p class="hint cons-check"><span class="lamp" style="background:var(--amber)"></span>Letzte Tankung ${de(c.last, 1)} l/100 km – deutlich über deinem bisherigen Schnitt von ${de(c.base, 1)} (${d}). Einmal ist kein Grund zur Sorge (Dachlast, Autobahn, Stau). Bleibt es mehrmals so, lohnt ein Blick auf Reifendruck, Luftfilter und Lambdasonde.</p>`
    : `<p class="hint cons-check"><span class="lamp" style="background:var(--ok)"></span>Letzte Tankung ${de(c.last, 1)} l/100 km – im üblichen Bereich deines Busses (Schnitt bisher ${de(c.base, 1)}, ${d}). Die Lampe im Cockpit wird orange, wenn eine Tankung mehr als 15 % darüber liegt.</p>`;
}
