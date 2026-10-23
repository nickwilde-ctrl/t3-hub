// Reparaturleitfäden: Liste (im Reiter Wartung) und Vollbild-Ansicht mit Werkstatt-Modus.
import { esc } from '../format.js';
import { GUIDES, GUIDE_GROUPS } from '../data/guides.js';
import { searchGuides, progress, levelText, usedGroups } from '../logic/guides.js';

const store = {
  get(id) { try { return JSON.parse(localStorage.getItem('t3hub-guide-' + id)) || []; } catch { return []; } },
  set(id, v) { try { localStorage.setItem('t3hub-guide-' + id, JSON.stringify(v)); } catch { /* egal */ } },
};

const WR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/></svg>';
const wrenches = (l) => `<span class="wr" title="Schwierigkeit ${l} von 3">${WR.repeat(l)}</span>`;

function row(g) {
  const p = progress(g, store.get(g.id));
  return `<button type="button" class="row row-btn" data-open-guide="${esc(g.id)}">
    <div class="t">${esc(g.title)}<span class="tag">${esc(g.group)}</span></div>
    <div class="s">${levelText(g.level)} · ca. ${g.minutes} Min. · ${g.steps.length} Schritte${p.done && !p.complete ? ` · <b class="amber">begonnen (${p.done}/${p.total})</b>` : ''}${g.verified ? '' : ' · <span class="faint">Werte ungeprüft</span>'}</div>
    <div class="r" aria-hidden="true">${wrenches(g.level)}</div></button>`;
}

export function guidesView() {
  const groups = usedGroups(GUIDES, GUIDE_GROUPS);
  return `<section class="sec">
    <div class="field"><label for="guide-q">Anleitung suchen</label><input id="guide-q" type="search" placeholder="z. B. Ölfilter, Zündkerze" autocomplete="off"></div>
    <div class="chips" role="group" aria-label="Baugruppe">
      <button type="button" data-guide-group="" aria-pressed="true">Alle</button>
      ${groups.map((g) => `<button type="button" data-guide-group="${esc(g)}" aria-pressed="false">${esc(g)}</button>`).join('')}
    </div>
    <div class="card list" id="guide-list">${GUIDES.map(row).join('')}</div>
    <p class="hint" id="guide-empty" hidden>Keine Anleitung gefunden. Weitere Anleitungen kommen nach und nach dazu.</p>
    <p class="hint">Die Anleitungen sind eigene Texte von T3 Hub. Drehmomente und Füllmengen immer mit deinem Reparaturhandbuch abgleichen, solange „Werte ungeprüft“ dabeisteht.</p>
  </section>`;
}

/** Filtert die Liste ohne neu zu zeichnen (damit die Tastatur offen bleibt). */
export function filterGuides() {
  const q = document.getElementById('guide-q')?.value || '';
  const g = document.querySelector('[data-guide-group][aria-pressed="true"]')?.dataset.guideGroup || '';
  const ids = new Set(searchGuides(GUIDES, q, g).map((x) => x.id));
  document.querySelectorAll('#guide-list [data-open-guide]').forEach((b) => (b.hidden = !ids.has(b.dataset.openGuide)));
  const empty = document.getElementById('guide-empty');
  if (empty) empty.hidden = ids.size > 0;
}

export function setGuideGroup(btn) {
  btn.parentElement.querySelectorAll('[data-guide-group]').forEach((b) => b.setAttribute('aria-pressed', b === btn));
  filterGuides();
}

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}

export function closeGuide() {
  keepAwake(false);
  document.getElementById('guide-root')?.remove();
  document.body.style.overflow = '';
}

/**
 * Vollbild-Anleitung. onDone(guide) wird bei „Fertig – ins Serviceheft“ aufgerufen (nur mit serviceKey).
 */
export function openGuide(id, { onDone, onClose } = {}) {
  const g = GUIDES.find((x) => x.id === id);
  if (!g) return;
  closeGuide();
  let done = store.get(g.id);
  const root = document.createElement('div');
  root.id = 'guide-root';
  root.className = 'guide-full';
  const list = (items) => `<ul class="g-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  root.innerHTML = `
    <div class="map-bar guide-bar"><button type="button" class="btn ghost" id="g-close">Zurück</button>
      <button type="button" class="btn ghost" id="g-shop" aria-pressed="false">Werkstatt-Modus</button></div>
    <div class="guide-body">
      <div class="eyebrow">${esc(g.group)} · ${esc(g.engine || 'T3')}</div>
      <h2 class="g-title">${esc(g.title)}</h2>
      <p class="g-meta">${levelText(g.level)} ${wrenches(g.level)} · ca. ${g.minutes} Min. · ${g.steps.length} Schritte</p>
      ${g.values?.length ? `<div class="g-box"><h3>Wichtige Werte</h3><dl class="g-values">${g.values.map((v) => `<dt>${esc(v.k)}</dt><dd>${esc(v.v)}${v.check ? ' <span class="g-ok">geprüft</span>' : v.src ? ` <span class="g-src">laut ${esc(v.src)}</span>` : ` <span class="g-warn">${v.missing ? 'fehlt' : 'ungeprüft'}</span>`}</dd>`).join('')}</dl></div>` : ''}
      ${g.warnings?.length ? `<div class="g-box g-danger"><h3>Achtung</h3>${list(g.warnings)}</div>` : ''}
      <details class="g-box" open><summary><h3>Werkzeug</h3></summary>${list(g.tools)}</details>
      <details class="g-box" open><summary><h3>Material</h3></summary>${list(g.material)}</details>
      <div class="g-steps-head"><h3>Schritte</h3><span id="g-prog" class="label"></span></div>
      <ol class="g-steps">${g.steps.map((s, i) => `<li><label><input type="checkbox" data-step="${i}" ${done.includes(i) ? 'checked' : ''}><span><b>${esc(s.t)}</b><br>${esc(s.d)}</span></label></li>`).join('')}</ol>
      ${g.hint ? `<p class="hint g-hint">Tipp: ${esc(g.hint)}</p>` : ''}
      <div class="g-end">
        ${g.serviceKey ? '<button type="button" class="btn" id="g-done">Fertig – ins Serviceheft eintragen</button>' : ''}
        <button type="button" class="add" id="g-reset">Häkchen zurücksetzen</button>
      </div>
      <p class="hint">${esc(g.source)}</p>
    </div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  const prog = root.querySelector('#g-prog');
  const update = () => {
    const p = progress(g, done);
    prog.textContent = `${p.done} von ${p.total} erledigt`;
    root.querySelectorAll('[data-step]').forEach((c) => c.closest('li').classList.toggle('done', c.checked));
  };
  update();
  root.addEventListener('change', (e) => {
    const c = e.target.closest('[data-step]');
    if (!c) return;
    const i = +c.dataset.step;
    done = c.checked ? [...new Set([...done, i])] : done.filter((x) => x !== i);
    store.set(g.id, done);
    update();
  });
  root.querySelector('#g-close').onclick = () => { closeGuide(); onClose?.(); };
  const shop = root.querySelector('#g-shop');
  shop.onclick = () => {
    const on = shop.getAttribute('aria-pressed') !== 'true';
    shop.setAttribute('aria-pressed', on);
    root.classList.toggle('workshop', on);
    keepAwake(on);
  };
  root.querySelector('#g-reset').onclick = () => {
    done = []; store.set(g.id, done);
    root.querySelectorAll('[data-step]').forEach((c) => (c.checked = false));
    update();
  };
  const fin = root.querySelector('#g-done');
  if (fin) fin.onclick = () => {
    store.set(g.id, []);
    closeGuide();
    onDone?.(g);
  };
}
