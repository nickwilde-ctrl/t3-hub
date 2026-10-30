import { de, esc, fmtDate, fmtMonthYear } from '../format.js';
import { homeDue, dueShort, vehicleStatus } from '../logic/services.js';
import { fuelStats } from '../logic/fuel.js';
import { lineChart } from './charts.js';

const PILL = { ok: 'OK', soon: 'Bald', over: 'Fällig', unknown: 'Offen' };
const CLS = { ok: 'ok', soon: 'soon', over: 'over', unknown: 'unk' };

export function statusText(st) {
  if (st.state === 'unknown') return 'Noch nicht eingetragen. Einmal eintragen, wann es zuletzt gemacht wurde, dann rechnet die App.';
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

// Gleiche Formulierung wie im Serviceheft: überfällig mit „seit …“, sonst der Kurztext.
const dueText = (st) => (st.state === 'over' ? statusText(st) : 'Fällig ' + dueShort(st));
const dueRow = ({ s, st }) => `<button type="button" class="row row-btn" data-edit-service="${s.id}"><div class="t">${esc(s.name)}</div><div class="s">${esc(dueText(st))}</div><div class="r">${pill(st.state)}</div></button>`;

const STATUS_ICON = { green: 'ok', yellow: 'soon', red: 'over' };

/** Fahrzeugstatus oben auf der Startseite (Grün / Gelb / Rot), berechnet in vehicleStatus. */
function statusCard(services, km) {
  const v = vehicleStatus(services, km);
  const lamp = { green: 'Grün', yellow: 'Gelb', red: 'Rot' }[v.level];
  return `<section class="sec"><div class="card vstatus ${STATUS_ICON[v.level]}" role="status"><span class="lamp" aria-hidden="true"></span>
    <div><h3><span class="sr">${lamp}: </span>${esc(v.title)}</h3>${v.text ? `<p>${esc(v.text)}</p>` : ''}${v.note ? `<p class="vs-note">${esc(v.note)}</p>` : ''}</div></div></section>`;
}

export function homeView({ services, fuels, km }) {
  const h = homeDue(services, km);
  const rows = h.due.map(dueRow).join('')
    + (h.next ? dueRow(h.next) : '');
  const extra = [
    h.moreDue ? `<button type="button" class="link-row" data-tab="wartung"><span>${h.moreDue === 1 ? 'Noch 1 Punkt ist' : 'Noch ' + h.moreDue + ' Punkte sind'} dran</span><span aria-hidden="true">›</span></button>` : '',
    h.unknown ? `<button type="button" class="link-row quiet" data-action="bulk-done"><span>${h.unknown === 1 ? '1 Punkt hat' : h.unknown + ' Punkte haben'} noch kein Datum</span><span class="go">Eintragen ›</span></button>` : '',
  ].join('');
  const s = fuelStats(fuels);
  const last = s.rows[s.rows.length - 1];
  const recent = s.series.slice(-20).map((r) => ({ date: r.date, y: r.cons, tip: `<b>${de(r.cons, 1)} l/100 km</b><br>${fmtDate(r.date)}` }));
  return `
  ${statusCard(services, km)}
  <section class="sec"><div class="sec-head"><h2>${h.due.length ? 'Als Nächstes fällig' : 'Als Nächstes'}</h2><button type="button" class="add" data-tab="wartung">Alle</button></div>
    ${rows ? `<div class="card list">${rows}</div>` : ''}${extra ? `<div class="links">${extra}</div>` : ''}</section>
  <section class="sec"><div class="sec-head"><h2>Tanken</h2><button type="button" class="add" data-action="add-fuel">+ Tankung</button></div>
    ${last
      ? `<div class="card list"><button type="button" class="row row-btn" data-tab="tanken"><div class="t">Letzte Tankung</div><div class="s">${fmtDate(last.date)} · ${de(last.liters, 1)} l · ${de(last.pricePerLiter, 3)} €/l</div><div class="r"><span class="num big">${de(last.liters * last.pricePerLiter, 0)} €</span></div></button></div>
         ${recent.length >= 2 ? `<div class="card pad">${lineChart('home-cons', recent, { label: 'Verbrauch der letzten Volltankungen', step: 2, dec: 0, avg: s.avgConsumption, avgDec: 1 })}<p class="hint">Verbrauch der letzten ${recent.length} Volltankungen in l/100 km</p></div>` : ''}`
      : `<div class="card soon-card"><h3>Noch keine Tankungen</h3><p>Trag deine erste Tankung ein. Hast du bisher die App Road Trip benutzt? Unter Mehr → Daten übernimmst du deine alten Tankungen.</p></div>`}
  </section>`;
}

export function comingSoon(title, step, text) {
  return `<section class="sec"><div class="card soon-card"><span class="label">Kommt in Schritt ${step}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></div></section>`;
}
