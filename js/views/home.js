import { de, esc, fmtDate, fmtMonthYear } from '../format.js';
import { serviceStatus } from '../logic/services.js';
import { fuelStats } from '../logic/fuel.js';
import { lineChart } from './charts.js';

const PILL = { ok: 'OK', soon: 'Bald', over: 'Fällig', unknown: 'Offen' };
const CLS = { ok: 'ok', soon: 'soon', over: 'over', unknown: 'unk' };

export function statusText(st) {
  if (st.state === 'unknown') return 'Letzter Wechsel unbekannt. Einmal eintragen, dann rechnet die App.';
  if (st.state === 'over') {
    const p = [];
    if (st.remainingKm != null && st.remainingKm <= 0) p.push(de(-st.remainingKm) + ' km');
    if (st.remainingDays != null && st.remainingDays <= 0) p.push(-st.remainingDays + ' Tagen');
    return 'Überfällig seit ' + p.join(' / ');
  }
  const p = [];
  if (st.remainingKm != null) p.push('in ' + de(st.remainingKm) + ' km');
  if (st.remainingDays != null) p.push(st.remainingDays > 60 ? 'bis ' + fmtMonthYear(st.dueDate) : 'in ' + st.remainingDays + ' Tagen');
  return 'Fällig ' + p.join(' oder ');
}

export const pill = (state) => `<span class="pill ${CLS[state]}">${PILL[state]}</span>`;

export function homeView({ services, fuels, km }) {
  const rows = services
    .map((s) => ({ s, st: serviceStatus(s, km) }))
    .sort((a, b) => a.st.rank - b.st.rank)
    .slice(0, 3)
    .map(({ s, st }) => `<button type="button" class="row row-btn" data-edit-service="${s.id}"><div class="t">${esc(s.name)}</div><div class="s">${statusText(st)}</div><div class="r">${pill(st.state)}</div></button>`)
    .join('');
  const s = fuelStats(fuels);
  const last = s.rows[s.rows.length - 1];
  const recent = s.series.slice(-20).map((r) => ({ date: r.date, y: r.cons, tip: `<b>${de(r.cons, 1)} l/100 km</b><br>${fmtDate(r.date)}` }));
  return `
  <section class="sec"><div class="sec-head"><h2>Als Nächstes fällig</h2><button type="button" class="add" data-tab="wartung">Alle</button></div>
    <div class="card list">${rows}</div></section>
  <section class="sec"><div class="sec-head"><h2>Tanken</h2><button type="button" class="add" data-action="add-fuel">+ Tankung</button></div>
    ${last
      ? `<div class="card list"><button type="button" class="row row-btn" data-tab="tanken"><div class="t">Letzte Tankung</div><div class="s">${fmtDate(last.date)} · ${de(last.liters, 1)} l · ${de(last.pricePerLiter, 3)} €/l</div><div class="r"><span class="num big">${de(last.liters * last.pricePerLiter, 0)} €</span></div></button></div>
         ${recent.length >= 2 ? `<div class="card pad">${lineChart('home-cons', recent, { label: 'Verbrauch der letzten Volltankungen', step: 2, dec: 0, avg: s.avgConsumption, avgDec: 1 })}<p class="hint">Verbrauch der letzten ${recent.length} Volltankungen in l/100 km</p></div>` : ''}`
      : `<div class="card soon-card"><h3>Noch keine Tankungen</h3><p>Trag deine erste Tankung ein. Deine bisherigen Daten aus Road Trip kannst du ab Schritt 2.7 übernehmen.</p></div>`}
  </section>`;
}

export function comingSoon(title, step, text) {
  return `<section class="sec"><div class="card soon-card"><span class="label">Kommt in Schritt ${step}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></div></section>`;
}
