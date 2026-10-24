// Reparaturleitfäden: Liste (im Reiter Wartung) und Vollbild-Ansicht mit Werkstatt-Modus.
import { esc } from '../format.js';
import { GUIDES, GUIDE_GROUPS } from '../data/guides.js';

let current = GUIDES; // zuletzt gezeigte Liste (mitgelieferte + eigene)
import { searchGuides, progress, levelText, usedGroups, nextStep } from '../logic/guides.js';

const store = {
  get(id) { try { return JSON.parse(localStorage.getItem('t3hub-guide-' + id)) || []; } catch { return []; } },
  set(id, v) { try { localStorage.setItem('t3hub-guide-' + id, JSON.stringify(v)); } catch { /* egal */ } },
};

const WR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/></svg>';
const wrenches = (l) => `<span class="wr" title="Schwierigkeit ${l} von 3">${WR.repeat(l)}</span>`;

function valueState(g) {
  if (g.verified) return '';
  if (g.own) {
    const v = g.values || [];
    if (!v.length) return '';
    return v.every((x) => x.check) ? ' · <span class="faint">Werte geprüft</span>' : ' · <span class="faint">Werte teils ungeprüft</span>';
  }
  const v = g.values || [];
  if (v.some((x) => x.missing)) return ' · <span class="faint">Werte teils offen</span>';
  if (v.length && v.every((x) => x.check || x.src)) return ' · <span class="faint">Werte laut T3-Pedia</span>';
  return ' · <span class="faint">Werte ungeprüft</span>';
}

function row(g) {
  const p = progress(g, store.get(g.id));
  return `<button type="button" class="row row-btn" data-open-guide="${esc(g.id)}">
    <div class="t">${esc(g.title)}<span class="tag">${esc(g.group)}</span>${g.own ? `<span class="tag own">${g.basedOn ? 'Eigene Fassung' : 'Eigene'}</span>` : ''}</div>
    <div class="s">${levelText(g.level)} · ca. ${g.minutes} Min. · ${g.steps.length} Schritte${p.done && !p.complete ? ` · <b class="amber">begonnen (${p.done}/${p.total})</b>` : ''}${valueState(g)}</div>
    <div class="r" aria-hidden="true">${wrenches(g.level)}</div></button>`;
}

export function guidesView(list = GUIDES) {
  current = list;
  const groups = usedGroups(list, GUIDE_GROUPS);
  return `<section class="sec">
    <div class="sec-head"><span class="label">${list.length} Anleitungen</span><button type="button" class="add" data-action="add-guide">+ Eigene Anleitung</button></div>
    <div class="field"><label for="guide-q">Anleitung suchen</label><input id="guide-q" type="search" placeholder="z. B. Ölfilter, Zündkerze" autocomplete="off"></div>
    <div class="chips" role="group" aria-label="Baugruppe">
      <button type="button" data-guide-group="" aria-pressed="true">Alle</button>
      ${groups.map((g) => `<button type="button" data-guide-group="${esc(g)}" aria-pressed="false">${esc(g)}</button>`).join('')}
    </div>
    <div class="card list" id="guide-list">${list.map(row).join('')}</div>
    <p class="hint" id="guide-empty" hidden>Keine Anleitung gefunden. Weitere Anleitungen kommen nach und nach dazu.</p>
    <p class="hint">Die Anleitungen sind eigene Texte von T3 Hub. Drehmomente und Füllmengen immer mit deinem Reparaturhandbuch abgleichen, solange „Werte ungeprüft“ dabeisteht. Jede Anleitung kannst du als eigene Fassung anpassen.</p>
  </section>`;
}

/** Filtert die Liste ohne neu zu zeichnen (damit die Tastatur offen bleibt). */
export function filterGuides() {
  const q = document.getElementById('guide-q')?.value || '';
  const g = document.querySelector('[data-guide-group][aria-pressed="true"]')?.dataset.guideGroup || '';
  const ids = new Set(searchGuides(current, q, g).map((x) => x.id));
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

/** Häkchen einer gelöschten Anleitung entfernen. */
export const forgetProgress = (id) => { try { localStorage.removeItem('t3hub-guide-' + id); } catch { /* egal */ } };

export function closeGuide() {
  keepAwake(false);
  document.getElementById('guide-root')?.remove();
  document.body.style.overflow = '';
}

/**
 * Vollbild-Anleitung. onDone(guide) wird bei „Fertig“ aufgerufen (mit serviceKey → Wartungspunkt, sonst freier Serviceheft-Eintrag).
 */
export function openGuide(id, { onDone, onClose, onEdit, guides = current } = {}) {
  const g = guides.find((x) => x.id === id);
  if (!g) return;
  closeGuide();
  let done = store.get(g.id);
  const root = document.createElement('div');
  root.id = 'guide-root';
  root.className = 'guide-full';
  const list = (items) => `<ul class="g-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  root.innerHTML = `
    <div class="map-bar guide-bar"><button type="button" class="btn ghost" id="g-close">Schließen</button>
      <button type="button" class="btn ghost" id="g-shop" aria-pressed="false">Werkstatt-Modus</button></div>
    <div class="guide-body">
      <div class="eyebrow">${esc(g.group)} · ${esc(g.engine || 'T3')}</div>
      <h2 class="g-title">${esc(g.title)}</h2>
      <p class="g-meta">${levelText(g.level)} ${wrenches(g.level)} · ca. ${g.minutes} Min. · ${g.steps.length} Schritte</p>
      ${onEdit ? `<button type="button" class="add g-edit" id="g-edit">${g.own ? '✎ Anleitung ändern' : '✎ Eigene Fassung erstellen'}</button>` : ''}
      ${g.values?.length ? `<div class="g-box"><h3>Wichtige Werte</h3><dl class="g-values">${g.values.map((v) => `<dt>${esc(v.k)}</dt><dd>${esc(v.v)}${v.check ? ' <span class="g-ok">geprüft</span>' : v.src ? ` <span class="g-src">laut ${esc(v.src)}</span>` : ` <span class="g-warn">${v.missing ? 'fehlt' : 'ungeprüft'}</span>`}</dd>`).join('')}</dl></div>` : ''}
      ${g.warnings?.length ? `<div class="g-box g-danger"><h3>Achtung</h3>${list(g.warnings)}</div>` : ''}
      ${g.tools?.length ? `<details class="g-box" open><summary><h3>Werkzeug</h3></summary>${list(g.tools)}</details>` : ''}
      ${g.material?.length ? `<details class="g-box" open><summary><h3>Material</h3></summary>${list(g.material)}</details>` : ''}
      <div class="g-steps-head"><h3>Schritte</h3><span id="g-prog" class="label"></span></div>
      <ol class="g-steps">${g.steps.map((s, i) => `<li><label><input type="checkbox" data-step="${i}" ${done.includes(i) ? 'checked' : ''}><span><b>${esc(s.t)}</b>${s.d ? `<br>${esc(s.d)}` : ''}</span></label></li>`).join('')}</ol>
      ${g.hint ? `<p class="hint g-hint">Tipp: ${esc(g.hint)}</p>` : ''}
      <div class="g-end">
        <button type="button" class="btn" id="g-done">${g.serviceKey ? 'Fertig – ins Serviceheft eintragen' : 'Fertig – im Serviceheft notieren'}</button>
        <button type="button" class="add" id="g-reset">Häkchen zurücksetzen</button>
      </div>
      ${g.source ? `<p class="hint">${esc(g.source)}</p>` : ''}
    </div>
    <div class="g-focus" id="g-focus" hidden></div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  const prog = root.querySelector('#g-prog');
  const focus = root.querySelector('#g-focus');
  let cur = 0;
  const update = () => {
    const p = progress(g, done);
    prog.textContent = `${p.done} von ${p.total} erledigt`;
    root.querySelectorAll('[data-step]').forEach((c) => { c.checked = done.includes(+c.dataset.step); c.closest('li').classList.toggle('done', c.checked); });
  };
  const valuesBox = g.values?.length ? `<details class="g-box f-values"><summary><h3>Wichtige Werte</h3></summary><dl class="g-values">${g.values.map((v) => `<dt>${esc(v.k)}</dt><dd>${esc(v.v)}</dd>`).join('')}</dl></details>` : '';
  // Werkstatt-Modus: immer nur ein Schritt, groß, mit „Erledigt – weiter“.
  const renderFocus = () => {
    const total = g.steps.length;
    const pct = Math.round((progress(g, done).done / total) * 100);
    const bar = `<div class="f-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;
    if (cur < 0) {
      focus.innerHTML = `${bar}<div class="f-card f-done"><div class="f-count">Alle ${total} Schritte erledigt</div><h2 class="f-title">Geschafft!</h2>
        <p class="f-text">${g.serviceKey ? 'Trag die Arbeit jetzt ins Serviceheft ein – mit Kilometerstand und Teilen.' : 'Notier die Arbeit im Serviceheft, dann weißt du später, wann es war.'}</p></div>
        <div class="f-actions"><button type="button" class="btn f-next" id="f-finish">${g.serviceKey ? 'Ins Serviceheft eintragen' : 'Im Serviceheft notieren'}</button>
        <button type="button" class="btn ghost" id="f-back">Letzten Schritt ansehen</button></div>`;
      return;
    }
    const s = g.steps[cur];
    focus.innerHTML = `${bar}
      ${cur === 0 && g.warnings?.length ? `<div class="g-box g-danger f-warn"><h3>Vorher beachten</h3><ul class="g-list">${g.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
      <div class="f-card"><div class="f-count">Schritt ${cur + 1} von ${total}${done.includes(cur) ? ' · erledigt' : ''}</div>
        <h2 class="f-title">${esc(s.t)}</h2>${s.d ? `<p class="f-text">${esc(s.d)}</p>` : ''}</div>
      <div class="f-actions"><button type="button" class="btn f-next" id="f-next">${cur === total - 1 ? 'Erledigt – fertig' : 'Erledigt – weiter'}</button>
        ${cur > 0 ? '<button type="button" class="btn ghost" id="f-back">← Vorheriger Schritt</button>' : ''}</div>
      ${valuesBox}`;
  };
  focus.addEventListener('click', (e) => {
    if (e.target.closest('#f-next')) {
      done = [...new Set([...done, cur])];
      store.set(g.id, done);
      const n = nextStep(g, done);
      cur = n === -1 ? -1 : (cur + 1 < g.steps.length && !done.includes(cur + 1) ? cur + 1 : n);
      update(); renderFocus(); focus.scrollTop = 0;
    } else if (e.target.closest('#f-back')) {
      cur = cur < 0 ? g.steps.length - 1 : Math.max(0, cur - 1);
      renderFocus(); focus.scrollTop = 0;
    } else if (e.target.closest('#f-finish')) {
      store.set(g.id, []);
      closeGuide();
      onDone?.(g);
    }
  });
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
  const edit = root.querySelector('#g-edit');
  if (edit) edit.onclick = () => { closeGuide(); onEdit(g); };
  const shop = root.querySelector('#g-shop');
  shop.onclick = () => {
    const on = shop.getAttribute('aria-pressed') !== 'true';
    shop.setAttribute('aria-pressed', on);
    root.classList.toggle('workshop', on);
    shop.textContent = on ? 'Alle Schritte zeigen' : 'Werkstatt-Modus';
    root.querySelector('.guide-body').hidden = on;
    focus.hidden = !on;
    if (on) { cur = nextStep(g, done); renderFocus(); }
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
