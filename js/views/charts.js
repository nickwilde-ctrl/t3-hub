// Kleine SVG-Diagramme mit Antippen-/Hover-Anzeige. Eine Datenreihe, Farben aus den Design-Tokens.
import { de, esc } from '../format.js';

export const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const toDate = (s) => new Date(s + 'T00:00:00');
const monthLabel = (s) => { const d = toDate(s); return MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); };
const points = {}; // Diagramm-ID → Punkte für den Tooltip

function niceRange(vals, step) {
  const mn = Math.floor(Math.min(...vals) / step) * step;
  const mx = Math.ceil(Math.max(...vals) / step) * step;
  return [mn, mx === mn ? mn + step : mx];
}

/** Linie über die Zeit. pts: [{date, y, tip}] */
export function lineChart(id, pts, { label, step, dec, avg, avgDec }) {
  if (pts.length < 2) return '<div class="empty">Ab zwei Werten erscheint hier ein Diagramm.</div>';
  const W = 340, H = 180, L = 34, R = 10, T = 14, B = 24;
  const xs = pts.map((p) => toDate(p.date).getTime()), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const [mn, mx] = niceRange(pts.map((p) => p.y), step);
  const X = (t) => L + ((t - x0) / (x1 - x0 || 1)) * (W - L - R);
  const Y = (v) => T + ((mx - v) / (mx - mn)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((i) => mn + ((mx - mn) * i) / 3);
  // Achsenbeschriftung: Anfang, Mitte, Ende – doppelte Monatsnamen weglassen
  const marks = (pts.length >= 5 ? [[pts[0], 'start'], [pts[Math.floor(pts.length / 2)], 'middle'], [pts[pts.length - 1], 'end']] : [[pts[0], 'start'], [pts[pts.length - 1], 'end']])
    .filter(([p], i, arr) => i === 0 || monthLabel(p.date) !== monthLabel(arr[i - 1][0].date));
  const xl = marks.map(([p, anchor]) => `<text x="${X(toDate(p.date).getTime())}" y="${H - 6}" font-size="10" fill="var(--muted)" text-anchor="${anchor}">${monthLabel(p.date)}</text>`).join('');
  const line = pts.map((p) => `${X(toDate(p.date).getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  points[id] = pts.map((p) => ({ px: X(toDate(p.date).getTime()), py: Y(p.y), html: p.tip }));
  const last = pts[pts.length - 1];
  return `<div class="chart" data-chart="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(v) + 3.5}" font-size="10" fill="var(--muted)" text-anchor="end">${de(v, dec)}</text>`).join('')}
    ${avg != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(avg)}" y2="${Y(avg)}" stroke="var(--sand)" stroke-width="1.5" stroke-dasharray="4 4"/><text x="${W - R}" y="${Y(avg) - 5}" font-size="10" fill="var(--fg)" text-anchor="end" font-weight="600">Ø ${de(avg, avgDec)}</text>` : ''}
    <polyline points="${line}" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(toDate(last.date).getTime())}" cy="${Y(last.y)}" r="4" fill="var(--amber)" stroke="var(--panel)" stroke-width="2"/>
    <line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--muted)" visibility="hidden"/>
    <circle class="xd" r="5" fill="var(--amber)" stroke="var(--panel)" stroke-width="2" visibility="hidden"/>
    ${xl}</svg><div class="tip" hidden></div></div>`;
}

/** Balken. rows: [{y, short, tip}]. Höchster und niedrigster Wert werden hervorgehoben. */
export function barChart(id, rows, { label, step, dec }) {
  if (!rows.length) return '<div class="empty">Noch keine Daten.</div>';
  const W = 340, H = 170, L = 34, R = 6, T = 16, B = 24, gap = 2;
  const [, mx] = niceRange(rows.map((r) => r.y), step);
  const bw = (W - L - R) / rows.length, Y = (v) => T + ((mx - v) / mx) * (H - T - B);
  const hi = rows.reduce((a, r) => (r.y > a.y ? r : a)), lo = rows.reduce((a, r) => (r.y < a.y ? r : a));
  points[id] = rows.map((r, i) => ({ px: L + i * bw + bw / 2, py: Y(r.y), html: r.tip, bar: true }));
  return `<div class="chart" data-chart="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    ${[0, mx / 2, mx].map((v) => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${Y(v) + 3.5}" font-size="10" fill="var(--muted)" text-anchor="end">${de(v, 0)}</text>`).join('')}
    ${rows.map((r, i) => {
      const x = L + i * bw + gap / 2, w = bw - gap, y = Y(r.y), h = H - B - y, rr = Math.min(4, w / 2, h);
      const strong = r === hi || r === lo;
      return `<path d="M${x},${H - B}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${H - B}Z" fill="${strong ? 'var(--amber)' : 'var(--sand)'}" opacity="${strong ? 1 : 0.55}"/>
        ${strong ? `<text x="${x + w / 2}" y="${y - 4}" font-size="10" fill="var(--fg)" text-anchor="middle" font-weight="600">${de(r.y, dec)}</text>` : ''}
        ${i % 2 === 0 || rows.length < 8 ? `<text x="${x + w / 2}" y="${H - 8}" font-size="9.5" fill="var(--muted)" text-anchor="middle">${r.short}</text>` : ''}`;
    }).join('')}
    <line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--muted)" visibility="hidden"/>
    </svg><div class="tip" hidden></div></div>`;
}

function hover(e) {
  const c = e.target.closest && e.target.closest('.chart');
  if (!c) return;
  const pts = points[c.dataset.chart];
  if (!pts) return;
  const svg = c.querySelector('svg'), r = svg.getBoundingClientRect(), k = r.width / 340;
  const mx = (e.clientX - r.left) / k;
  const best = pts.reduce((a, p) => (Math.abs(p.px - mx) < Math.abs(a.px - mx) ? p : a));
  const xh = svg.querySelector('.xh'), xd = svg.querySelector('.xd'), tip = c.querySelector('.tip');
  xh.setAttribute('x1', best.px); xh.setAttribute('x2', best.px); xh.setAttribute('visibility', 'visible');
  if (xd) { xd.setAttribute('cx', best.px); xd.setAttribute('cy', best.py); xd.setAttribute('visibility', 'visible'); }
  tip.innerHTML = best.html;
  tip.hidden = false;
  const tw = tip.offsetWidth;
  tip.style.left = Math.max(0, Math.min(r.width - tw, best.px * k - tw / 2)) + 'px';
  tip.style.top = Math.max(0, best.py * k - tip.offsetHeight - 12) + 'px';
}

document.addEventListener('pointermove', hover);
document.addEventListener('pointerdown', hover);
document.addEventListener('pointerout', (e) => {
  const c = e.target.closest && e.target.closest('.chart');
  if (c && !c.contains(e.relatedTarget) && e.pointerType === 'mouse') {
    c.querySelector('.tip').hidden = true;
    c.querySelectorAll('.xh,.xd').forEach((x) => x.setAttribute('visibility', 'hidden'));
  }
});
