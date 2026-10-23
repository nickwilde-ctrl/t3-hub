// Minispiel „Schlaglochslalom“: Vollbild, Zeichnen auf Canvas, Steuerung mit dem Finger.
import { createGame, step, reasonText, TANK } from '../logic/game.js';
import { de } from '../format.js';

const HS_KEY = 't3hub-game-best';
const best = { get() { try { return +localStorage.getItem(HS_KEY) || 0; } catch { return 0; } }, set(v) { try { localStorage.setItem(HS_KEY, String(v)); } catch { /* egal */ } } };

let raf = 0;

export function closeGame() {
  cancelAnimationFrame(raf);
  document.getElementById('game-root')?.remove();
  document.body.style.overflow = '';
}

export function gameCard() {
  return `<section class="sec"><div class="card game-card"><div><h3>Pause machen?</h3><p class="hint" style="margin:4px 0 0">Schlaglochslalom: Weich mit dem T3 Schlaglöchern, Pylonen und Schafen aus – und behalte den Tank im Blick.</p></div>
    <button type="button" class="btn" data-action="open-game">Spielen</button></div></section>`;
}

export function openGame(seed) {
  closeGame();
  const root = document.createElement('div');
  root.id = 'game-root';
  root.className = 'game-full';
  root.innerHTML = `<canvas id="game-cv" aria-label="Spielfeld"></canvas>
    <div class="game-hud" id="game-hud"></div>
    <button type="button" class="game-x" id="game-x" aria-label="Spiel schließen">✕</button>
    <div class="game-panel" id="game-panel"></div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  const cv = root.querySelector('#game-cv');
  const ctx = cv.getContext('2d');
  const hud = root.querySelector('#game-hud');
  const panel = root.querySelector('#game-panel');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  let W = 0, H = 0, g = null, running = false, last = 0, finger = null, flash = 0;

  const size = () => {
    W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  g = createGame(W, H, seed);

  const showPanel = (html) => { panel.innerHTML = html; panel.hidden = false; };
  const start = () => { g = createGame(W, H, seed); panel.hidden = true; running = true; last = performance.now(); loop(last); };
  const startPanel = () => showPanel(`<div class="gp-title">Schlagloch&shy;slalom</div>
    <p>Finger auf den Bildschirm und nach links oder rechts ziehen.<br>Weich Schlaglöchern, Pylonen und Schafen aus. Sammel Benzinkanister ein – der T3 säuft.</p>
    ${best.get() ? `<p class="gp-best">Rekord: ${de(best.get(), 1)} km</p>` : ''}
    <button type="button" class="btn gp-go" id="gp-go">Losfahren</button>`);
  const overPanel = () => {
    const rec = g.km > best.get();
    if (rec) best.set(Math.round(g.km * 10) / 10);
    showPanel(`<div class="gp-title">${g.reason === 'leer' ? 'Liegengeblieben' : 'Aua!'}</div>
      <p>${reasonText(g.reason)}</p>
      <p class="gp-score">${de(g.km, 1)} km</p>
      <p class="gp-best">${rec ? 'Neuer Rekord!' : `Rekord: ${de(best.get(), 1)} km`}</p>
      <button type="button" class="btn gp-go" id="gp-go">Nochmal</button>`);
  };

  // ---------- Zeichnen ----------
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  function drawRoad() {
    const { left, right } = g.road;
    ctx.fillStyle = '#23251f'; ctx.fillRect(0, 0, W, H);                 // Bankett
    ctx.fillStyle = '#2c2f27';
    for (let y = -80 + (g.scroll % 80); y < H; y += 40) { ctx.fillRect(0, y, left - 4, 18); ctx.fillRect(right + 4, y + 20, W - right, 18); }
    ctx.fillStyle = '#34352f'; ctx.fillRect(left, 0, right - left, H);   // Asphalt
    ctx.fillStyle = '#d8d0bc'; ctx.fillRect(left + 4, 0, 3, H); ctx.fillRect(right - 7, 0, 3, H); // Randlinien
    ctx.fillStyle = '#f0a43a';                                            // Mittellinie
    const mid = (left + right) / 2 - 2;
    for (let y = -80 + g.scroll; y < H; y += 80) ctx.fillRect(mid, y, 4, 40);
  }
  function drawCar(c) {
    const { x, y, w, h } = c;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(x + 3, y + 5, w, h, 7); ctx.fill();            // Schatten
    ctx.fillStyle = '#e9c24b'; rr(x, y, w, h, 7); ctx.fill();                              // Karosserie gelb
    ctx.fillStyle = '#f4e3b0'; rr(x + 4, y + 14, w - 8, h - 22, 4); ctx.fill();            // Dach
    ctx.fillStyle = '#1b1c19'; rr(x + 4, y + 4, w - 8, 9, 3); ctx.fill();                  // Frontscheibe
    ctx.fillStyle = '#1b1c19'; rr(x + 6, y + h - 7, w - 12, 4, 2); ctx.fill();             // Heckscheibe
    ctx.fillStyle = '#c9a43a'; ctx.fillRect(x + 6, y + 22, w - 12, 2); ctx.fillRect(x + 6, y + 34, w - 12, 2); // Dachsicken
    ctx.fillStyle = '#fff6d8'; ctx.fillRect(x + 3, y + 1, 6, 3); ctx.fillRect(x + w - 9, y + 1, 6, 3); // Scheinwerfer
    ctx.fillStyle = '#1b1c19'; ctx.fillRect(x - 3, y + 11, 3, 5); ctx.fillRect(x + w, y + 11, 3, 5);   // Spiegel
    ctx.restore();
  }
  function drawThing(t) {
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    if (t.kind === 'loch') {
      ctx.fillStyle = '#4a4a42'; ctx.beginPath(); ctx.ellipse(cx, cy, t.w / 2, t.h / 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#141412'; ctx.beginPath(); ctx.ellipse(cx, cy + 1, t.w / 2 - 4, t.h / 2 - 4, 0, 0, 7); ctx.fill();
    } else if (t.kind === 'pylone') {
      ctx.fillStyle = '#1b1c19'; ctx.fillRect(t.x, t.y + 3, t.w, t.w);
      ctx.fillStyle = '#ee7d2b'; ctx.beginPath(); ctx.arc(cx, t.y + 3 + t.w / 2, t.w / 2 - 2, 0, 7); ctx.fill();
      ctx.strokeStyle = '#f6efdc'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, t.y + 3 + t.w / 2, t.w / 4, 0, 7); ctx.stroke();
    } else if (t.kind === 'schaf') {
      ctx.fillStyle = '#f2eee2';
      for (const [dx, dy] of [[-8, -4], [0, -6], [8, -4], [-9, 4], [0, 5], [9, 4]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 7, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#26241f'; ctx.beginPath(); ctx.ellipse(cx, t.y - 2, 5, 6, 0, 0, 7); ctx.fill();
    } else if (t.kind === 'kanister') {
      ctx.fillStyle = '#c8392b'; rr(t.x, t.y + 4, t.w, t.h - 4, 3); ctx.fill();
      ctx.fillStyle = '#8f2318'; ctx.fillRect(t.x + 4, t.y, t.w - 10, 6);
      ctx.fillStyle = '#f6efdc'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('+', cx, cy + 6);
    }
  }
  function draw() {
    drawRoad();
    for (const t of g.things) drawThing(t);
    drawCar(g.car);
    if (flash > 0) { ctx.fillStyle = `rgba(240,164,58,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.04); }
    const pct = g.fuel / TANK;
    hud.innerHTML = `<span><b>${de(g.km, 1)}</b> km</span><span><b>${Math.round(g.speed)}</b> km/h</span>
      <span class="tank ${pct < 0.2 ? 'low' : ''}">Tank <i><em style="width:${Math.round(pct * 100)}%"></em></i></span>`;
  }

  function loop(now) {
    if (!running) return;
    const dt = (now - last) / 1000; last = now;
    const ev = step(g, dt, finger);
    if (ev.includes('tank')) flash = 0.25;
    draw();
    if (g.over) { running = false; setTimeout(overPanel, 350); return; }
    raf = requestAnimationFrame(loop);
  }

  // ---------- Steuerung ----------
  const aim = (clientX) => { finger = clientX - root.getBoundingClientRect().left - g.car.w / 2; };
  cv.addEventListener('pointerdown', (e) => { aim(e.clientX); try { cv.setPointerCapture(e.pointerId); } catch { /* egal */ } });
  cv.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') aim(e.clientX); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') finger = g.car.x - 40;
    if (e.key === 'ArrowRight') finger = g.car.x + 40;
  });
  root.tabIndex = -1; root.focus();
  panel.addEventListener('click', (e) => { if (e.target.closest('#gp-go')) start(); });
  root.querySelector('#game-x').onclick = closeGame;
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) { running = false; showPanel(`<div class="gp-title">Pause</div><button type="button" class="btn gp-go" id="gp-resume">Weiterfahren</button>`); panel.querySelector('#gp-resume').onclick = () => { panel.hidden = true; running = true; last = performance.now(); loop(last); }; } }, { once: false });

  draw();
  startPanel();
  return { state: () => g, draw };
}
