// Chronik: „Zuletzt“ auf der Startseite und die ganze Zeitleiste unter Mehr.
import { de, esc, eurExact, fmtDate } from '../format.js';
import { timeline, timelineByYear, latestPerType } from '../logic/timeline.js';
import { icon, emptyState } from './icons.js';

const ICON = { fuel: 'fuel', log: 'wrench', tour: 'map' };
const ATTR = { fuel: 'data-edit-fuel', log: 'data-edit-log', tour: 'data-open-tour' };
const title = (x) => (x.type === 'fuel' ? (x.full ? 'Vollgetankt' : 'Getankt') : x.type === 'tour' ? 'Tour: ' + x.title : x.title);
const sub = (x) => [fmtDate(x.date), x.type === 'fuel' ? de(x.liters, 1) + ' l' : '', x.type === 'tour' && x.to ? 'bis ' + fmtDate(x.to) : '', x.type !== 'tour' && x.km != null ? de(x.km) + ' km' : '',
  x.type === 'log' && x.category !== 'Wartung' ? x.category : ''].filter(Boolean).join(' · ');
const row = (x) => `<button type="button" class="row row-btn chron-row" ${ATTR[x.type]}="${esc(x.id)}"><span class="chron-ico">${icon(ICON[x.type])}</span>
  <div class="t">${esc(title(x))}</div><div class="s">${esc(sub(x))}</div><div class="r num">${x.amount ? eurExact(x.amount) : ''}</div></button>`;

/** Startseite: das Neueste aus Tanken, Serviceheft und Touren. Ohne Daten erscheint nichts. */
export function recentCard(state) {
  const items = timeline(state);
  if (!items.length) return '';
  return `<section class="sec"><div class="sec-head"><h2>Zuletzt</h2>${items.length > 3 ? '<button type="button" class="add" data-msub-go="chronik">Alle</button>' : ''}</div>
    <div class="card list">${latestPerType(items).map(row).join('')}</div></section>`;
}

/** Ganze Chronik, nach Jahr gruppiert. */
export function chronikView(state) {
  const items = timeline(state);
  const head = '<div class="sec-head"><h2>Chronik</h2></div>';
  if (!items.length) return `<section class="sec">${head}${emptyState('clock', 'Noch nichts passiert', 'Tankungen, Einträge im Serviceheft und Touren erscheinen hier in einer Liste.')}</section>`;
  return `<section class="sec">${head}</section>` + timelineByYear(items).map(({ year, items: list }) => `<section class="sec"><div class="sec-head"><h2 class="muted-h">${year}</h2><span class="label">${list.length === 1 ? '1 Ereignis' : list.length + ' Ereignisse'}</span></div>
    <div class="card list">${list.map(row).join('')}</div></section>`).join('');
}
