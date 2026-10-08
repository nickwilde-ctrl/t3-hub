// Kopfbereich: Foto, Name, Kennzeichen und das Kombiinstrument.
import { de, esc } from '../format.js';
import { photoStyleAttr } from './vehicle.js';

let swept = false;

/** Rundinstrument für den Verbrauch (0–25 l/100 km), Zeiger = letzter Wert, Marke = Durchschnitt. */
export function dial(val, avg) {
  const W = 200, cx = 100, cy = 100, r = 84, max = 25, a0 = -225, span = 270;
  const ang = (v) => ((a0 + (Math.max(0, Math.min(max, v)) / max) * span) * Math.PI) / 180;
  const pt = (v, rr) => [cx + Math.cos(ang(v)) * rr, cy + Math.sin(ang(v)) * rr];
  const f = (n) => n.toFixed(1);
  let ticks = '';
  for (let v = 0; v <= max; v++) {
    const major = v % 5 === 0;
    const [x1, y1] = pt(v, r), [x2, y2] = pt(v, r - (major ? 12 : 6));
    ticks += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${major ? 'var(--inst-fg)' : 'var(--inst-tick)'}" stroke-width="${major ? 2.2 : 1.2}"/>`;
    if (major) {
      const [tx, ty] = pt(v, r - 24);
      ticks += `<text x="${f(tx)}" y="${f(ty + 5)}" font-size="15" fill="var(--inst-fg)" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="600">${v}</text>`;
    }
  }
  const arc = (v1, v2, rr) => {
    const [x1, y1] = pt(v1, rr), [x2, y2] = pt(v2, rr);
    return `M${f(x1)},${f(y1)}A${rr},${rr} 0 0 1 ${f(x2)},${f(y2)}`;
  };
  let needle = '';
  if (val != null) {
    // Spitze bei 0, Ende genau gegenüber (180°), damit der Zeiger durch die Mitte läuft
    const [n0x, n0y] = pt(0, r - 16), t0x = 2 * cx - pt(0, 14)[0], t0y = 2 * cy - pt(0, 14)[1];
    const rot = ((Math.max(0, Math.min(max, val)) / max) * span).toFixed(1);
    // Drehung als SVG-Attribut um den Mittelpunkt (100|100). Eine CSS-Drehung sitzt in Safari auf dem iPhone nicht mittig.
    // Der Zeiger schwenkt nur beim ersten Öffnen der App hoch, nicht bei jedem Wechsel des Reiters.
    const still = swept || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    swept = true;
    const sweep = still ? '' : `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="${rot} ${cx} ${cy}" dur="1.1s" begin="0.15s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.7 0.2 1"/>`;
    needle = `<g class="needle" transform="rotate(${still ? rot : 0} ${cx} ${cy})">${sweep}<line x1="${f(t0x)}" y1="${f(t0y)}" x2="${f(n0x)}" y2="${f(n0y)}" stroke="var(--needle)" stroke-width="3.5" stroke-linecap="round"/></g>`;
  }
  let avgMark = '';
  if (avg != null) {
    const [ax1, ay1] = pt(avg, r + 1), [ax2, ay2] = pt(avg, r - 14);
    avgMark = `<line x1="${f(ax1)}" y1="${f(ay1)}" x2="${f(ax2)}" y2="${f(ay2)}" stroke="var(--amber)" stroke-width="4" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Letzter Verbrauch ${val != null ? de(val, 1) : 'unbekannt'} Liter pro 100 Kilometer">
    <defs>
      <radialGradient id="face" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#22231f"/><stop offset="1" stop-color="#0f100e"/></radialGradient>
      <linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4b45"/><stop offset=".5" stop-color="#1c1d1a"/><stop offset="1" stop-color="#3a3b36"/></linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r + 11}" fill="url(#bezel)"/><circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="url(#face)"/>
    <path d="${arc(15, 25, r - 3)}" fill="none" stroke="var(--needle)" stroke-width="4" opacity=".55"/>
    ${ticks}${avgMark}
    <text x="${cx}" y="${cy + 30}" font-size="11" fill="var(--inst-tick)" text-anchor="middle" letter-spacing="1.5">L/100 KM</text>
    <text x="${cx}" y="${cy + 52}" font-size="24" fill="var(--inst-fg)" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="700">${val != null ? de(val, 1) : '–'}</text>
    ${needle}
    <circle cx="${cx}" cy="${cy}" r="10" fill="#2a2b27" stroke="#4a4b45"/><circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="url(#glass)" pointer-events="none"/>
  </svg>`;
}

/** Kennzeichen als dezentes Schild: nur Umriss und Schrift, ohne Farben. */
export function plateTag(plate) {
  return `<span class="plate" aria-label="Kennzeichen ${esc(plate)}">${esc(plate.trim().replace(/\s+/g, ' '))}</span>`;
}

const WRENCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/></svg>';

export function cockpit({ vehicle, km, avg, last, due, unknown, check = { state: 'none' } }) {
  const lamp = {
    ok: ['var(--ok)', `Letzte Tankung im üblichen Bereich (${check.diff != null ? (check.diff > 0 ? '+' : '−') + de(Math.abs(check.diff), 0) : ''} % zum bisherigen Schnitt)`],
    high: ['var(--amber)', `Letzte Tankung ${check.diff != null ? de(check.diff, 0) : ''} % über dem bisherigen Schnitt`],
    none: ['var(--muted)', 'Noch zu wenige Volltankungen für eine Bewertung'],
  }[check.state];
  const v = vehicle;
  const meta = `<div class="meta">${v.plate ? plateTag(v.plate) : ''}${v.engine ? `<span>${esc(v.engine)}</span>` : ''}</div>`;
  const file = '<input type="file" id="photo-in" accept="image/*">';
  const hero = v.photo
    ? `<div class="hero"><img src="${v.photo}" alt="Foto von ${esc(v.name)}" style="${photoStyleAttr(v.photoPos)}"><details class="photo-menu"><summary aria-label="Foto einstellen">${WRENCH}</summary><div class="pm-list"><button type="button" data-action="photo-frame">Ausschnitt anpassen</button><label>Foto ändern${file}</label></div></details><div class="cap"><div class="eyebrow">${esc(v.model)}</div><h1>${esc(v.name)}</h1>${meta}</div></div>`
    : `<div class="hero empty"><div><div class="eyebrow" style="color:var(--muted)">${esc(v.model)}</div><h1>${esc(v.name)}</h1>${meta}<label class="photo-btn">Foto von ${esc(v.name)} hinzufügen${file}</label></div></div>`;
  const digits = String(Math.round(km)).padStart(6, '0').split('').map((x) => `<span>${x}</span>`).join('');
  return `${hero}
    <div class="cluster">
      <div class="dial">${dial(last, avg)}</div>
      <div class="readouts">
        <div class="ro"><div class="k">Tachostand</div><div class="odo" aria-label="${de(km)} km">${digits}</div></div>
        <div class="ro"><div class="k">Ø Verbrauch</div><div class="v"><span class="lamp" style="background:${lamp[0]}" title="${esc(lamp[1])}" role="img" aria-label="${esc(lamp[1])}"></span>${avg != null ? de(avg, 1) : '–'} <small>l/100 km</small></div></div>
        <div class="ro"><div class="k">Wartung</div><div class="v"><span class="lamp" style="background:${due ? 'var(--bad)' : 'var(--ok)'}"></span>${due} <small>fällig</small> · ${unknown} <small>offen</small></div></div>
      </div>
    </div>`;
}
