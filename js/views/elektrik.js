// Elektrik: Fehlersuche und Kabelsuche. Nur sichtbar, wenn auf diesem Gerät eigene Plandaten geladen sind.
import { esc, fmtDate, de } from '../format.js';
import { FAULTS } from '../data/faults.js';
import { searchWires, colorName, wireStops, checkWiring } from '../logic/wiring.js';
import { openSheet, toast } from './sheet.js';

const COLOR_CSS = { ge: '#e8c21b', ws: '#f4f4f4', ro: '#d23b2a', li: '#8a4fc4', bl: '#2f6fd1', gr: '#8b8b8b', gn: '#2f9a4c', br: '#7a4a22', sw: '#0e0e0e' };
const ICON = {
  blink: '<path d="M12 3v3M5 6l2 2M19 6l-2 2"/><circle cx="12" cy="14" r="5"/>',
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-6 4-6s2 4-2 6M14 12c4 0 6 1 6 4s-4 2-6-2M12 14c0 4-1 6-4 6s-2-4 2-6M10 12c-4 0-6-1-6-4s4-2 6 2"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l3-5"/>',
  start: '<path d="M12 3v9"/><path d="M6.5 7a8 8 0 1 0 11 0"/>',
  batt: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5M17 7V5M7 13h3M15 11.5v3M13.5 13h3"/>',
  horn: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  fuel: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9"/>',
  brake: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16h.01"/>',
  wiper: '<path d="M4 18a10 10 0 0 1 16 0"/><path d="M12 18l5-9"/>',
};
const CHIPS = ['Blinker', 'Lüfter', 'Tank', 'Anlasser', 'Masse', 'Klemme 15', 'Drehzahl', 'Radio'];

let part = 'fehler';
let query = '';
let wires = [];
const done = new Map(); // Häkchen der Fehlersuche, nur solange die App offen ist

export const setElPart = (p) => { part = p === 'kabel' ? 'kabel' : 'fehler'; };
export const setElQuery = (q) => { query = q; };

const swatch = (c) => {
  const [a, b] = String(c).split('/');
  const ca = COLOR_CSS[a] || 'transparent';
  const bg = b && COLOR_CSS[b] ? `linear-gradient(180deg,${ca} 0 35%,${COLOR_CSS[b]} 35% 65%,${ca} 65%)` : ca;
  return `<span class="el-sw" style="background:${bg}" aria-hidden="true"></span>`;
};
const wireRow = (w) => `<button type="button" class="row row-btn el-row" data-el-wire="${wires.indexOf(w)}">${swatch(w.c)}
  <div class="t">${esc(w.to)}</div><div class="s">${esc(colorName(w.c))} · ${esc(w.mm)} mm²${w.plan ? ` · Plan ${esc(w.plan)}` : ''}${w.unsure || w.note ? ' · <span class="el-warn">prüfen</span>' : ''}</div></button>`;

const results = () => {
  if (!query.trim()) return `<div class="card el-pad"><div class="label">Deine Plandaten</div><p>${de(wires.length)} Kabel · ${esc(current.title || '')}</p><p class="hint">Nur auf diesem Gerät gespeichert.</p></div>`;
  const hits = searchWires(wires, query);
  return `<div class="label">${de(hits.length)} Kabel</div><div class="card list">${hits.slice(0, 60).map(wireRow).join('') || '<p class="el-pad">Nichts gefunden. Probier ein anderes Wort, zum Beispiel „Masse“ oder „rot“.</p>'}</div>`;
};

let current = {};

/** Der Elektrik-Reiter. wiring = gespeicherte Plandaten. */
export function elektrikView(wiring) {
  current = wiring || {};
  wires = current.wires || [];
  const hasMap = !!current.map;
  const seg = `<div class="seg${hasMap ? ' three' : ''}"><button type="button" data-el-part="fehler" aria-pressed="${part === 'fehler'}">Fehlersuche</button><button type="button" data-el-part="kabel" aria-pressed="${part === 'kabel'}">${hasMap ? 'Kabel' : 'Kabel suchen'}</button>${hasMap ? '<button type="button" data-action="open-stromkarte" aria-pressed="false">Karte</button>' : ''}</div>`;
  const noMap = hasMap ? '' : '<p class="hint">Die Stromkarte fehlt noch. Lade die neue Plandaten-Datei (mit Karte) noch einmal über Mehr → Daten → „Backup wiederherstellen“.</p>';
  if (part === 'fehler') {
    return `<section class="sec">${seg}${noMap}<div class="label">Was ist los?</div><div class="card list">${FAULTS.map((f) => `<button type="button" class="row row-btn el-row" data-el-fault="${f.id}">
        <span class="el-ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[f.icon] || ''}</svg></span><div class="t">${esc(f.title)}</div><div class="s">${esc(f.short)}</div></button>`).join('')}</div>
      <div class="card el-pad"><div class="label">Multimeter in 30 Sekunden</div>
        <p><b>Strom da?</b> Auf 20 V Gleichspannung stellen. Schwarz an Masse (blankes Metall), Rot an das Kabel. Um 12 V heißt: Strom kommt an.</p>
        <p><b>Kabel heil?</b> Auf Durchgang (Piepser) stellen, Kabel an beiden Enden abklemmen, beide Enden messen. Piept es, ist es heil.</p></div></section>`;
  }
  return `<section class="sec">${seg}${noMap}<input type="search" id="el-q" class="el-search" placeholder="Bauteil, Farbe, Sicherung, Stecker" value="${esc(query)}" autocomplete="off">
    <div class="chips el-chips">${CHIPS.map((c) => `<button type="button" data-el-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div id="el-results">${results()}</div>
    <button type="button" class="add el-remove" data-action="remove-wiring">Plandaten von diesem Gerät entfernen</button></section>`;
}

/** Nur die Trefferliste neu zeichnen (beim Tippen bleibt das Suchfeld erhalten). */
export function refreshWireResults() {
  query = document.getElementById('el-q')?.value || '';
  const box = document.getElementById('el-results');
  if (box) box.innerHTML = results();
}

// Vollbild-Ansicht (wie bei den Anleitungen), mit Zurück für Kabel aus der Fehlersuche
const stack = [];
const closeEl = () => { document.getElementById('el-root')?.remove(); document.body.style.overflow = ''; };

function show(html) {
  closeEl();
  const root = document.createElement('div');
  root.id = 'el-root';
  root.className = 'guide-full';
  root.innerHTML = `<div class="map-bar guide-bar"><button type="button" class="btn ghost" id="el-back">${stack.length > 1 ? '‹ Zurück' : 'Schließen'}</button></div><div class="guide-body el-body">${html}</div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  root.querySelector('#el-back').onclick = () => { stack.pop(); const prev = stack.pop(); if (prev) prev(); else closeEl(); };
  root.addEventListener('click', (e) => {
    const w = e.target.closest('[data-el-wire]');
    if (w) { openWire(+w.dataset.elWire); return; }
    const s = e.target.closest('[data-el-step]');
    if (s) {
      const [id, i] = s.dataset.elStep.split(':');
      const set = done.get(id) || new Set();
      set.has(+i) ? set.delete(+i) : set.add(+i);
      done.set(id, set);
      stack.pop();
      openFault(id);
    }
  });
}

function openFault(id) {
  const f = FAULTS.find((x) => x.id === id);
  if (!f) return;
  const set = done.get(id) || new Set();
  stack.push(() => openFault(id));
  show(`<div class="eyebrow">Fehlersuche Elektrik</div><h2 class="g-title">${esc(f.title)}</h2>
    <p class="g-meta">${set.size} von ${f.steps.length} geprüft · der Reihe nach, vom Einfachen zum Aufwendigen</p>
    <ol class="el-steps">${f.steps.map((s, i) => {
      const hits = s.q ? searchWires(wires, s.q).slice(0, 3) : [];
      return `<li class="${set.has(i) ? 'done' : ''}"><button type="button" class="el-n" data-el-step="${id}:${i}" aria-label="Schritt ${i + 1} ${set.has(i) ? 'nicht mehr ' : ''}abhaken">${set.has(i) ? '✓' : i + 1}</button>
        <div><b>${esc(s.t)}</b><p>${esc(s.d)}</p>${hits.map((w) => `<button type="button" class="el-link" data-el-wire="${wires.indexOf(w)}">${swatch(w.c)}<span>${esc(colorName(w.c))}: ${esc(w.to)} ›</span></button>`).join('')}</div></li>`;
    }).join('')}</ol>
    <p class="hint">Hilft nichts davon? Unter „Kabel suchen“ dem Weg Stück für Stück folgen. Plandaten sind vom Modelljahr 1991 – vor dem Arbeiten nachmessen.</p>`);
}

function openWire(i) {
  const w = wires[i];
  if (!w) return;
  stack.push(() => openWire(i));
  show(`<div class="eyebrow">Kabel${w.plan ? ` · Plan ${esc(w.plan)}` : ''}</div>
    <h2 class="g-title el-title">${swatch(w.c)} ${esc(colorName(w.c))} · ${esc(w.mm)} mm²</h2>
    ${w.unsure ? '<p class="el-tag">unsicher gelesen</p>' : ''}${w.unk ? '<p class="el-tag">Ziel noch offen</p>' : ''}
    <p>${esc(w.what)}</p>
    <div class="g-box"><h3>Weg des Kabels</h3><ol class="el-chain">${wireStops(w).map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
    ${w.note ? `<div class="g-box g-other"><h3>Prüfen</h3><p>${esc(w.note)}</p></div>` : ''}
    <p class="hint">${w.plan ? `Plan ${esc(w.plan)} · ` : ''}Strompfad ${esc(w.path || '–')} · Modelljahr 1991. Farben können bei deinem Bus abweichen – vor dem Arbeiten nachmessen.</p>`);
}

/** Aus der Liste geöffnet: Verlauf neu beginnen. */
export const startFault = (id) => { stack.length = 0; openFault(id); };
export const startWire = (i) => { stack.length = 0; openWire(i); };

/** Plandaten-Datei laden (kommt über „Backup wiederherstellen“ herein). */
export function wiringFromObject(obj, saveWiring) {
  const check = checkWiring(obj);
  if (!check.ok) { toast(check.error); return; }
  openSheet({
    title: 'Plandaten laden?',
    submitLabel: 'Laden',
    body: `<p style="margin:0"><b>${esc(obj.title || 'Plandaten')}</b></p>
      <p class="hint" style="margin:0">${de(check.counts.wires)} Kabel${check.counts.fuses ? ` · ${de(check.counts.fuses)} Sicherungen` : ''}${check.counts.map ? ' · mit Stromkarte' : ''}${obj.createdAt ? ` · erstellt ${fmtDate(String(obj.createdAt).slice(0, 10))}` : ''}</p>
      <p style="margin:0">Die Plandaten bleiben nur auf diesem Gerät. Danach findest du unter Wartung den Reiter „Elektrik“. Deine übrigen Daten bleiben unverändert.</p>`,
    async onSubmit() {
      await saveWiring(obj);
      toast('Plandaten geladen');
    },
  });
}

export function removeWiringSheet(removeWiring) {
  openSheet({
    title: 'Plandaten entfernen?',
    submitLabel: 'Entfernen',
    body: '<p style="margin:0">Die Kabel werden von diesem Gerät gelöscht und der Reiter „Elektrik“ verschwindet. Du kannst die Datei jederzeit wieder laden.</p>',
    async onSubmit() { await removeWiring(); toast('Plandaten entfernt'); },
  });
}
