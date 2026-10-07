import { de, esc, fmtDate, fmtMonthYear } from '../format.js';
import { serviceStatus } from '../logic/services.js';

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
    .map(({ s, st }) => `<div class="row"><div class="t">${esc(s.name)}</div><div class="s">${statusText(st)}</div><div class="r">${pill(st.state)}</div></div>`)
    .join('');
  const last = [...fuels].sort((a, b) => b.km - a.km)[0];
  return `
  <section class="sec"><div class="sec-head"><h2>Als Nächstes fällig</h2></div>
    <div class="card list">${rows}</div></section>
  <section class="sec"><div class="sec-head"><h2>Tankbuch</h2></div>
    ${last
      ? `<div class="card list"><div class="row"><div class="t">Letzte Tankung</div><div class="s">${fmtDate(last.date)} · ${de(last.liters, 1)} l</div></div></div>`
      : `<div class="card soon-card"><h3>Noch keine Tankungen</h3><p>Deine Daten aus Road Trip kannst du ab Schritt 2.7 mit einem Klick übernehmen. Tankungen eintragen kommt in Schritt 2.4.</p></div>`}
  </section>`;
}

export function comingSoon(title, step, text) {
  return `<section class="sec"><div class="card soon-card"><span class="label">Kommt in Schritt ${step}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></div></section>`;
}
