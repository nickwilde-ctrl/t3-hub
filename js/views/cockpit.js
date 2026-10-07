// Kopfbereich: Foto, Name, Kennzeichen und das Kombiinstrument.
import { de, esc } from '../format.js';

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
    const [n0x, n0y] = pt(0, r - 16), [t0x, t0y] = pt(12.5, 14);
    const rot = ((Math.max(0, Math.min(max, val)) / max) * span).toFixed(1);
    needle = `<g class="needle" style="transform:rotate(${rot}deg)"><line x1="${f(t0x)}" y1="${f(t0y)}" x2="${f(n0x)}" y2="${f(n0y)}" stroke="var(--needle)" stroke-width="3.5" stroke-linecap="round"/></g>`;
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

/** Deutsches Kennzeichen als Vektorgrafik. Ein H am Ende wird direkt an die Ziffern gesetzt. */
export function plateSvg(plate) {
  const parts = plate.trim().split(/\s+/);
  const city = parts[0];
  const rest = parts.slice(1).join(' ').replace(/\s+([HE])$/, '$1');
  let stars = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    stars += `<circle cx="${(26 + Math.cos(a) * 14).toFixed(1)}" cy="${(36 + Math.sin(a) * 14).toFixed(1)}" r="2.6" fill="#ffcc00"/>`;
  }
  const cw = city.length * 44;
  const F = 'font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="80" fill="#141414"';
  return `<svg class="plate" viewBox="0 0 520 112" role="img" aria-label="Kennzeichen ${esc(plate)}">
    <rect x="3" y="3" width="514" height="106" rx="10" fill="#f5f4ee" stroke="#141414" stroke-width="6"/>
    <path d="M6,13a7,7 0 0 1 7,-7H52V106H13a7,7 0 0 1 -7,-7Z" fill="#1d4fa8"/>
    ${stars}<text x="29" y="95" font-family="Barlow,Arial,sans-serif" font-weight="700" font-size="30" fill="#f5f4ee" text-anchor="middle">D</text>
    <text x="68" y="86" ${F} textLength="${cw}" lengthAdjust="spacingAndGlyphs">${esc(city)}</text>
    <circle cx="${70 + cw + 30}" cy="34" r="17" fill="#3a8f5c" stroke="#141414" stroke-width="1.5"/>
    <circle cx="${70 + cw + 30}" cy="78" r="17" fill="#d9d6cc" stroke="#141414" stroke-width="1.5"/>
    ${rest ? `<text x="${70 + cw + 60}" y="86" ${F} textLength="${438 - (cw + 60)}" lengthAdjust="spacingAndGlyphs">${esc(rest)}</text>` : ''}
  </svg>`;
}

export function cockpit({ vehicle, km, avg, last, due, unknown }) {
  const v = vehicle;
  const meta = `<div class="meta">${v.plate ? plateSvg(v.plate) : ''}${v.engine ? `<span>${esc(v.engine)}</span>` : ''}</div>`;
  const file = '<input type="file" id="photo-in" accept="image/*">';
  const hero = v.photo
    ? `<div class="hero"><img src="${v.photo}" alt="Foto von ${esc(v.name)}"><label class="photo-change">Foto ändern${file}</label><div class="cap"><div class="eyebrow">${esc(v.model)}</div><h1>${esc(v.name)}</h1>${meta}</div></div>`
    : `<div class="hero empty"><div><div class="eyebrow" style="color:var(--muted)">${esc(v.model)}</div><h1>${esc(v.name)}</h1>${meta}<label class="photo-btn">Foto von ${esc(v.name)} hinzufügen${file}</label></div></div>`;
  const digits = String(Math.round(km)).padStart(6, '0').split('').map((x) => `<span>${x}</span>`).join('');
  return `${hero}
    <div class="cluster">
      <div class="dial">${dial(last, avg)}</div>
      <div class="readouts">
        <div class="ro"><div class="k">Tachostand</div><div class="odo" aria-label="${de(km)} km">${digits}</div></div>
        <div class="ro"><div class="k">Ø Verbrauch</div><div class="v"><span class="lamp" style="background:var(--amber)"></span>${avg != null ? de(avg, 1) : '–'} <small>l/100 km</small></div></div>
        <div class="ro"><div class="k">Wartung</div><div class="v"><span class="lamp" style="background:${due ? 'var(--bad)' : 'var(--ok)'}"></span>${due} <small>fällig</small> · ${unknown} <small>offen</small></div></div>
      </div>
    </div>`;
}
