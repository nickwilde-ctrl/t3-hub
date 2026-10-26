// Stromkarte: der Bus von oben mit allen Bauteilen und Kabeln. Zoomen, verschieben, antippen und verfolgen.
// Vollbild wie die Anleitungen. Nur mit eigenen Plandaten (map) sichtbar.
import { esc } from '../format.js';
import { colorName } from '../logic/wiring.js';
import { wirePath, wireWidth, pairIndex, visibleIn, fitBox, searchMap } from '../logic/stromkarte.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = { ge: '#e8c21b', ws: '#f4f4f4', ro: '#d23b2a', li: '#8a4fc4', bl: '#2f6fd1', gr: '#8b8b8b', gn: '#2f9a4c', br: '#8a5a2e', sw: '#111' };
const KL = { 30: 'Dauerplus (Klemme 30)', 15: 'Zündungsplus (Klemme 15)', X: 'Entlastung (Klemme X)', 31: 'Masse (Klemme 31)', 50: 'Startsignal (Klemme 50)', 58: 'Licht (Klemme 56/58)', sig: 'Signal' };
const FILTERS = [['30', 'Dauerplus'], ['15', 'Zündung'], ['31', 'Masse'], ['58', 'Licht'], ['sig', 'Signale']];

let area = 'alle';

const mk = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const swatch = (c) => {
  const [a, b] = String(c).split('/');
  const ca = COLORS[a] || '#888';
  const bg = b && COLORS[b] ? `linear-gradient(180deg,${ca} 0 35%,${COLORS[b]} 35% 65%,${ca} 65%)` : ca;
  return `<span class="sk-sw" style="background:${bg}" aria-hidden="true"></span>`;
};

export function closeStromkarte() {
  document.getElementById('sk-root')?.remove();
  document.body.style.overflow = '';
}

/** Stromkarte öffnen. map = Kartendaten aus den Plandaten. */
export function openStromkarte(map) {
  closeStromkarte();
  const N = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
  const W = map.wires.map((w, i) => ({ ...w, i }));
  const areas = map.areas?.length ? map.areas : [{ id: 'alle', label: 'Alle' }];
  const full = { x: 0, y: 0, w: map.view?.w || 2100, h: map.view?.h || 1000 };

  const root = document.createElement('div');
  root.id = 'sk-root';
  root.className = 'sk';
  root.innerHTML = `
    <div class="sk-top"><button type="button" class="btn ghost" id="sk-close">Schließen</button>
      <input type="search" id="sk-q" placeholder="Suchen: S19, Zündspule, gelb …" autocomplete="off" aria-label="Bauteil oder Kabel suchen"></div>
    <div class="sk-areas" role="tablist" aria-label="Bereiche">${areas.map((a) => `<button type="button" role="tab" data-sk-area="${esc(a.id)}" aria-selected="${a.id === area}">${esc(a.label)}</button>`).join('')}</div>
    <div class="sk-filters">${FILTERS.map(([k, l]) => `<button type="button" data-sk-kl="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
    <div class="sk-map" id="sk-map"><svg id="sk-svg" role="img" aria-label="Bus von oben mit Bauteilen und Kabeln"><g id="sk-bg"></g><g id="sk-wires"></g><g id="sk-nodes"></g></svg>
      <div class="sk-zoom"><button type="button" id="sk-zin" aria-label="Hineinzoomen">+</button><button type="button" id="sk-zout" aria-label="Herauszoomen">−</button><button type="button" id="sk-zfit" aria-label="Ganzen Bereich zeigen">⤢</button></div></div>
    <div class="sk-panel" id="sk-panel" aria-live="polite"></div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  const svg = root.querySelector('#sk-svg'), mapEl = root.querySelector('#sk-map'), panel = root.querySelector('#sk-panel');

  // Hintergrund: Bus von oben
  const bg = root.querySelector('#sk-bg');
  (map.bg?.rects || []).forEach(([cls, x, y, w, h, rx]) => mk('rect', { class: 'sk-' + cls, x, y, width: w, height: h, rx }, bg));
  (map.bg?.paths || []).forEach(([cls, d]) => mk('path', { class: 'sk-' + cls, d }, bg));
  (map.bg?.labels || []).forEach(([t, x, y, s]) => { const e = mk('text', { class: 'sk-label', x, y }, bg); e.textContent = t; if (s) e.style.fontSize = s + 'px'; });

  // Kabel
  const ks = pairIndex(W);
  const wiresG = root.querySelector('#sk-wires');
  W.forEach((w, i) => {
    const d = wirePath(w.pts.map((p) => N[p]), ks[i]), sw = wireWidth(w.mm);
    const [c1, c2] = String(w.c).split('/');
    const g = mk('g', { class: 'sk-wire', 'data-w': i }, wiresG);
    mk('path', { class: 'edge', d, 'stroke-width': sw + 4 }, g);
    mk('path', { class: 'base', d, stroke: COLORS[c1] || '#888', 'stroke-width': sw }, g);
    if (c2) mk('path', { class: 'base', d, stroke: COLORS[c2] || '#888', 'stroke-width': Math.max(2, sw * 0.38), 'stroke-dasharray': '14 10' }, g);
    mk('path', { class: 'hit', d }, g);
    w.el = g;
  });

  // Bauteile
  const nodesG = root.querySelector('#sk-nodes');
  map.nodes.forEach((n) => {
    const g = mk('g', { class: 'sk-node ' + (n.k || 'part'), 'data-n': n.id, transform: `translate(${n.x} ${n.y})` }, nodesG);
    if (n.k === 'plug') mk('rect', { class: 'shape', x: -11, y: -11, width: 22, height: 22, transform: 'rotate(45)' }, g);
    else if (n.k === 'ground') mk('path', { class: 'shape', d: 'M -15 -10 L 15 -10 L 0 14 Z' }, g);
    else if (n.k === 'fuse') mk('rect', { class: 'shape', x: -14, y: -14, width: 28, height: 28, rx: 4 }, g);
    else mk('circle', { class: 'shape', r: 22 }, g);
    if (!n.k) { const c = mk('text', { class: 'code', 'text-anchor': 'middle', y: 5 }, g); c.textContent = n.code.length > 4 ? n.code.slice(0, 3) : n.code; }
    const l = mk('text', { 'text-anchor': 'middle', y: n.k ? 30 : 42 }, g);
    l.textContent = n.k === 'ground' ? `Masse ${n.code}` : n.k ? n.code : n.short || n.name.split(' (')[0];
    n.el = g;
  });

  // Ausschnitt
  let view = { ...full };
  const setView = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  const ratio = () => { const r = mapEl.getBoundingClientRect(); return r.width / Math.max(r.height, 1); };
  const toWorld = (cx, cy) => {
    const r = svg.getBoundingClientRect(), s = Math.max(view.w / r.width, view.h / r.height);
    return { x: view.x - (r.width * s - view.w) / 2 + (cx - r.left) * s, y: view.y - (r.height * s - view.h) / 2 + (cy - r.top) * s, s };
  };
  const zoomAt = (cx, cy, f) => {
    const p = toWorld(cx, cy), nw = Math.min(full.w * 1.3, Math.max(200, view.w * f)), k = nw / view.w;
    view = { x: p.x - (p.x - view.x) * k, y: p.y - (p.y - view.y) * k, w: nw, h: view.h * k };
    setView();
  };
  const fit = () => {
    const ids = [...visibleIn(map, area).nodes];
    view = (area === 'alle' ? null : fitBox(ids.map((id) => N[id]), ratio(), 110)) || { ...full };
    setView();
  };
  const focusNode = (id) => { const n = N[id], w = 800, h = w / ratio(); view = { x: n.x - w / 2, y: n.y - h / 2, w, h }; setView(); };

  // Auswahl und Darstellung
  let sel = null, kl = null, history = [];
  function apply() {
    const vis = visibleIn(map, area);
    const on = new Set(), lit = new Set();
    if (sel?.type === 'node') { W.forEach((w) => { if (vis.wires.has(w.i) && w.pts.includes(sel.id)) { on.add(w.i); w.pts.forEach((p) => lit.add(p)); } }); lit.add(sel.id); }
    if (sel?.type === 'wire') { on.add(sel.i); W[sel.i].pts.forEach((p) => lit.add(p)); }
    if (sel?.type === 'search') { sel.wires.forEach((i) => { on.add(i); W[i].pts.forEach((p) => lit.add(p)); }); sel.nodes.forEach((id) => lit.add(id)); }
    const active = !!sel;
    W.forEach((w) => {
      const shown = vis.wires.has(w.i), klOk = !kl || w.kl === kl;
      w.el.classList.toggle('hide', !shown);
      w.el.classList.toggle('dim', active ? !(on.has(w.i) && klOk) : !klOk);
      w.el.classList.toggle('on', active && on.has(w.i));
    });
    map.nodes.forEach((n) => {
      n.el.classList.toggle('hide', !vis.nodes.has(n.id));
      let l = active ? lit.has(n.id) : true;
      if (!active && kl) l = W.some((w) => vis.wires.has(w.i) && w.kl === kl && w.pts.includes(n.id));
      n.el.classList.toggle('dim', !l);
      n.el.classList.toggle('sel', sel?.type === 'node' && sel.id === n.id);
    });
  }
  const wireItem = (w, from) => {
    const other = from ? N[w.pts[0] === from ? w.pts[w.pts.length - 1] : w.pts[0]] : null;
    const title = other ? (other.k === 'ground' ? `Masse ${other.code} · ${other.name}` : other.name) : w.b;
    return `<button type="button" class="sk-item" data-sk-wire="${w.i}">${swatch(w.c)}<span class="t">${esc(title)}</span>
      <span class="s">${esc(colorName(w.c))} · ${esc(w.mm)} mm² · ${esc(KL[w.kl] || '')}${w.note || w.unsure || w.unk ? ' · <b class="el-warn">prüfen</b>' : ''}</span></button>`;
  };
  const nodeItem = (id) => `<button type="button" class="sk-item" data-sk-node="${esc(id)}"><span class="sk-sw sk-dot" aria-hidden="true"></span><span class="t">${esc(N[id].name)}</span><span class="s">${esc(N[id].code)}</span></button>`;
  const back = () => (history.length ? '<button type="button" class="sk-back" data-sk-back>‹ Zurück</button>' : '');
  const areaLabel = () => areas.find((a) => a.id === area)?.label || '';

  function showStart() {
    const vis = visibleIn(map, area);
    const count = {};
    W.filter((w) => vis.wires.has(w.i)).forEach((w) => w.pts.forEach((p) => { if (!N[p].k) count[p] = (count[p] || 0) + 1; }));
    const top = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 5);
    panel.innerHTML = `<p class="hint">Tipp ein Bauteil oder Kabel an. Zwei Finger zum Zoomen, ein Finger zum Verschieben. ${esc(areaLabel())}: ${vis.wires.size} Kabel.</p>
      <div class="sk-list">${top.map(nodeItem).join('')}</div>`;
  }
  function showNode(id) {
    const n = N[id], vis = visibleIn(map, area);
    const all = W.filter((w) => w.pts.includes(id)), list = all.filter((w) => vis.wires.has(w.i));
    const type = n.k === 'plug' ? 'Stecker' : n.k === 'ground' ? 'Massepunkt' : n.k === 'fuse' ? 'Sicherung' : 'Bauteil';
    panel.innerHTML = `${back()}<div class="label">${type} · ${esc(n.code)}</div><h3>${esc(n.name)}</h3>${n.info ? `<p>${esc(n.info)}</p>` : ''}
      <div class="label">${list.length} Kabel${area !== 'alle' ? ` in „${esc(areaLabel())}“` : ''}</div><div class="sk-list">${list.map((w) => wireItem(w, id)).join('')}</div>
      ${all.length > list.length ? `<p class="hint">${all.length - list.length} weitere in anderen Bereichen. <button type="button" class="sk-back" data-sk-all>Alle zeigen</button></p>` : ''}`;
  }
  function showWire(i) {
    const w = W[i];
    panel.innerHTML = `${back()}<div class="label">Kabel · Plan ${esc(w.plan)} · ${esc(KL[w.kl] || '')}</div>
      <h3 class="sk-wt">${swatch(w.c)} ${esc(colorName(w.c))} · ${esc(w.mm)} mm²</h3>
      ${w.unsure ? '<p class="el-tag">unsicher gelesen</p>' : ''}${w.unk ? '<p class="el-tag">Ziel offen</p>' : ''}
      <p>${esc(w.what)}</p>
      <ol class="el-chain"><li>${esc(w.a)}</li>${w.pts.slice(1, -1).map((p) => `<li>${esc(N[p].code)} · ${esc(N[p].name)}</li>`).join('')}<li>${esc(w.b)}</li></ol>
      ${w.note ? `<p class="sk-note"><b>Prüfen:</b> ${esc(w.note)}</p>` : ''}
      <div class="sk-list">${[...new Set(w.pts)].map(nodeItem).join('')}</div>
      <p class="hint">Modelljahr 1991 – vor dem Arbeiten nachmessen.</p>`;
  }
  function select(s, push = true) {
    if (push && sel) history.push(sel);
    sel = s;
    if (!s) { history = []; showStart(); } else if (s.type === 'node') showNode(s.id); else if (s.type === 'wire') showWire(s.i);
    panel.scrollTop = 0;
    apply();
  }

  // Bedienung
  root.querySelector('#sk-close').onclick = closeStromkarte;
  root.querySelector('.sk-areas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sk-area]'); if (!b) return;
    area = b.dataset.skArea;
    root.querySelectorAll('[data-sk-area]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    root.querySelector('#sk-q').value = '';
    history = []; sel = null; fit(); showStart(); apply();
  });
  root.querySelector('.sk-filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sk-kl]'); if (!b) return;
    kl = kl === b.dataset.skKl ? null : b.dataset.skKl;
    root.querySelectorAll('[data-sk-kl]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.skKl === kl)));
    apply();
  });
  root.querySelector('#sk-q').addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (!q) { select(null, false); return; }
    const r = searchMap(map, q, area, colorName);
    history = []; sel = { type: 'search', ...r };
    panel.innerHTML = `<div class="label">Suche</div><h3>${r.nodes.length + r.wires.length ? `${r.nodes.length} Bauteile, ${r.wires.length} Kabel` : 'Nichts gefunden'}</h3>
      <div class="sk-list">${r.nodes.map(nodeItem).join('')}${r.wires.map((i) => wireItem(W[i])).join('')}</div>
      ${area !== 'alle' ? `<p class="hint">Gesucht wird nur in „${esc(areaLabel())}“. Für alles den Reiter „Alle“ wählen.</p>` : ''}`;
    apply();
  });
  panel.addEventListener('click', (e) => {
    const w = e.target.closest('[data-sk-wire]'); if (w) { select({ type: 'wire', i: +w.dataset.skWire }); return; }
    const n = e.target.closest('[data-sk-node]'); if (n) { select({ type: 'node', id: n.dataset.skNode }); focusNode(n.dataset.skNode); return; }
    if (e.target.closest('[data-sk-all]')) { area = 'alle'; root.querySelectorAll('[data-sk-area]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.skArea === 'alle'))); if (sel?.type === 'node') showNode(sel.id); apply(); return; }
    if (e.target.closest('[data-sk-back]')) select(history.pop() || null, false);
  });

  // Ziehen, Zoomen (Mausrad, zwei Finger), Antippen
  const ptrs = new Map();
  let moved = 0, pinch = null, down = null;
  mapEl.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015)); }, { passive: false });
  mapEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.sk-zoom')) return;
    mapEl.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0; down = e.target;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  mapEl.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch / d); pinch = d; moved += 10; return;
    }
    const s = toWorld(0, 0).s, dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    moved += Math.abs(dx) + Math.abs(dy);
    view.x -= dx * s; view.y -= dy * s; setView();
  });
  const end = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (moved < 8 && down && !ptrs.size) {
      const n = down.closest?.('[data-n]'), w = down.closest?.('[data-w]');
      if (n) select({ type: 'node', id: n.dataset.n });
      else if (w) select({ type: 'wire', i: +w.dataset.w });
      else if (sel) { root.querySelector('#sk-q').value = ''; select(null, false); }
    }
    if (!ptrs.size) down = null;
  };
  mapEl.addEventListener('pointerup', end);
  mapEl.addEventListener('pointercancel', end);
  const center = () => { const r = mapEl.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  root.querySelector('#sk-zin').onclick = () => zoomAt(...center(), 0.7);
  root.querySelector('#sk-zout').onclick = () => zoomAt(...center(), 1.4);
  root.querySelector('#sk-zfit').onclick = fit;

  fit();
  showStart();
  apply();
}

