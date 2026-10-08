// Stellplätze einer Tour: Karte, Liste und Formular („Hier stehen wir heute“).
// Karte: OpenStreetMap-Kacheln (nur bei Netz sichtbar), Punkte und Route als SVG darüber.
import { esc, fmtDate, todayIso } from '../format.js';
import { fitView, tilesFor, toScreen, sortStops } from '../logic/geo.js';
import { openSheet, closeSheet, toast } from './sheet.js';

const W = 360, H = 240;
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const appleMaps = (s) => `https://maps.apple.com/?ll=${s.lat},${s.lon}&q=${encodeURIComponent(s.name || 'Stellplatz')}`;

export function stopsMap(stops) {
  const list = sortStops(stops);
  if (!list.length) return '';
  const view = fitView(list, W, H);
  const pct = (v, total) => ((v / total) * 100).toFixed(3) + '%';
  const tiles = tilesFor(view, W, H).map((t) =>
    `<img class="tile" alt="" loading="lazy" onerror="this.style.visibility='hidden'" referrerpolicy="strict-origin-when-cross-origin" src="https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png" style="left:${pct(t.left, W)};top:${pct(t.top, H)};width:${pct(256, W)};height:${pct(256, H)}">`).join('');
  const pts = list.map((s) => ({ s, ...toScreen(s, view, W, H) }));
  const line = pts.length > 1 ? `<polyline points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="#1c1d1b" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/><polyline points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="#f0a43a" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  const pins = pts.map((p, i) => `<g data-edit-stop="${p.s.id}" class="pin"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="11" fill="#f0a43a" stroke="#1c1d1b" stroke-width="2.5"/><text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#1c1d1b" font-family="Barlow,system-ui,sans-serif">${i + 1}</text></g>`).join('');
  return `<div class="map" role="img" aria-label="Karte mit ${list.length} Stellplätzen">
    <div class="tiles">${tiles}</div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${line}${pins}</svg>
    <div class="map-attr">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende</div>
  </div>`;
}

export function stopsSection(tour) {
  const list = sortStops(tour.stops);
  const running = !tour.endKm;
  return `<section class="sec"><div class="sec-head"><h2>Stellplätze</h2><button type="button" class="add" data-action="add-stop">${running ? 'Hier stehen wir' : '+ Stellplatz'}</button></div>
    ${list.length ? `<div class="card map-card">${stopsMap(list)}</div>
      <div class="card list">${list.map((s, i) => `<div class="row stop-row"><button type="button" class="stop-main" data-edit-stop="${s.id}"><span class="stop-no">${i + 1}</span><span><span class="t">${esc(s.name || 'Stellplatz')}</span><br><span class="s">${fmtDate(s.date)}${s.note ? ' · ' + esc(s.note) : ''}</span></span></button><a class="add" href="${appleMaps(s)}" target="_blank" rel="noopener">Karte</a></div>`).join('')}</div>`
      : `<div class="card soon-card"><p>${running ? 'Tipp abends auf „Hier stehen wir“. Die App merkt sich den Platz, und am Ende siehst du alle Übernachtungen auf einer Karte.' : 'Noch keine Stellplätze. Über „+ Stellplatz“ kannst du sie auch nachträglich per Ortssuche eintragen.'}</p></div>`}
  </section>`;
}

/** Kurzer Ortsname aus der Antwort von OpenStreetMap (Nominatim). */
function placeName(r) {
  const a = r.address || {};
  const town = a.village || a.town || a.city || a.municipality || a.hamlet || a.county || '';
  const spot = r.name && r.name !== town ? r.name : (a.tourism || a.leisure || '');
  return [spot, town].filter(Boolean).join(', ') || (r.display_name || '').split(',').slice(0, 2).join(',');
}

async function reverseName(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&accept-language=de`);
    if (!res.ok) return '';
    return placeName(await res.json());
  } catch { return ''; }
}

async function searchPlaces(q) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=de&q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Suche fehlgeschlagen');
  return (await res.json()).map((r) => ({ lat: +r.lat, lon: +r.lon, name: placeName(r), full: r.display_name }));
}

/** Stellplatz anlegen (mit GPS oder Ortssuche), ändern oder löschen. */
export function stopSheet(tour, stop, saveTour) {
  const edit = !!stop;
  const s = stop || { date: todayIso() > (tour.to || '9') ? (tour.to || tour.from) : todayIso(), name: '', note: '', lat: null, lon: null };
  let pos = s.lat != null ? { lat: s.lat, lon: s.lon, accuracy: s.accuracy } : null;
  const useGps = !edit && !tour.endKm;
  openSheet({
    title: edit ? 'Stellplatz bearbeiten' : useGps ? 'Hier stehen wir heute' : 'Stellplatz eintragen',
    body: `
      <div class="pos-box" id="st-pos">${pos ? `Standort gespeichert (${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)})` : 'Noch kein Standort'}</div>
      <div class="two"><button type="button" class="btn ghost" id="st-gps">Aktuellen Standort</button><button type="button" class="btn ghost" id="st-find">Ort suchen</button></div>
      <div class="field" id="st-search" hidden><label for="st-q">Ort, Campingplatz oder Adresse</label>
        <div class="search-row"><input id="st-q" placeholder="z. B. Camping Skagen" enterkeyhint="search"><button type="button" class="add" id="st-go">Suchen</button></div>
        <div id="st-results" class="results"></div></div>
      <div class="two"><div class="field"><label for="st-name">Name</label><input id="st-name" name="name" value="${esc(s.name || '')}" placeholder="z. B. Stellplatz am Hafen"></div>
      <div class="field"><label for="st-date">Datum</label><input id="st-date" name="date" type="date" value="${esc(s.date)}"></div></div>
      <div class="field"><label for="st-note">Notiz</label><input id="st-note" name="note" value="${esc(s.note || '')}" placeholder="Preis, Strom, Duschen, ruhig …"></div>
      ${edit ? '' : '<label class="check"><input type="checkbox" name="journal"><span>Auch als Eintrag ins Reisetagebuch</span></label>'}
      ${edit ? `<a class="add" style="justify-self:start" href="${appleMaps(s)}" target="_blank" rel="noopener">In Apple Karten öffnen</a><button type="button" class="danger-link" id="st-del">Stellplatz löschen</button>` : ''}`,
    onReady(form) {
      const box = form.querySelector('#st-pos');
      const setPos = (p, label) => { pos = p; box.textContent = label; box.classList.add('ok-box'); };
      const nameEl = form.elements.name;
      const gps = async () => {
        if (!navigator.geolocation) { box.textContent = 'Dieses Gerät kann den Standort nicht ermitteln. Nutze „Ort suchen“.'; return; }
        box.textContent = 'Standort wird ermittelt …';
        navigator.geolocation.getCurrentPosition(async (r) => {
          const p = { lat: r.coords.latitude, lon: r.coords.longitude, accuracy: Math.round(r.coords.accuracy) };
          setPos(p, `Standort gefunden (auf ca. ${p.accuracy} m genau)`);
          if (!nameEl.value.trim()) { const n = await reverseName(p.lat, p.lon); if (n && !nameEl.value.trim()) nameEl.value = n; }
        }, (err) => {
          box.textContent = err.code === 1
            ? 'Kein Zugriff auf den Standort. Erlaube ihn in den iPhone-Einstellungen unter Datenschutz → Ortungsdienste, oder nutze „Ort suchen“.'
            : 'Standort konnte nicht ermittelt werden. Versuch es draußen nochmal oder nutze „Ort suchen“.';
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
      };
      form.querySelector('#st-gps').onclick = gps;
      const searchBox = form.querySelector('#st-search');
      form.querySelector('#st-find').onclick = () => { searchBox.hidden = false; form.querySelector('#st-q').focus(); };
      const results = form.querySelector('#st-results');
      const run = async () => {
        const q = form.querySelector('#st-q').value.trim();
        if (!q) return;
        results.innerHTML = '<p class="hint">Suche läuft …</p>';
        try {
          const found = await searchPlaces(q);
          results.innerHTML = found.length
            ? found.map((r, i) => `<button type="button" class="result" data-i="${i}"><b>${esc(r.name)}</b><br><span class="faint">${esc(r.full)}</span></button>`).join('')
            : '<p class="hint">Nichts gefunden. Versuch es mit Ort und Land, z. B. „Skagen Dänemark“.</p>';
          results.onclick = (e) => {
            const b = e.target.closest('.result'); if (!b) return;
            const r = found[+b.dataset.i];
            setPos({ lat: r.lat, lon: r.lon }, `Ort gewählt: ${r.name}`);
            if (!nameEl.value.trim()) nameEl.value = r.name;
            results.innerHTML = '';
            searchBox.hidden = true;
          };
        } catch { results.innerHTML = '<p class="hint">Die Suche braucht eine Internetverbindung.</p>'; }
      };
      form.querySelector('#st-go').onclick = run;
      form.querySelector('#st-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
      const del = form.querySelector('#st-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) { await saveTour({ ...tour, stops: (tour.stops || []).filter((x) => x.id !== stop.id) }); closeSheet(); toast('Stellplatz gelöscht'); return; }
        del.dataset.armed = '1'; del.textContent = 'Wirklich löschen? Nochmal tippen';
      };
      if (useGps) gps();
    },
    async onSubmit(form) {
      if (!pos) return 'Bitte zuerst den Standort ermitteln oder einen Ort suchen.';
      const el = form.elements;
      const row = { id: edit ? stop.id : newId(), createdAt: edit ? stop.createdAt : new Date().toISOString(), date: el.date.value || todayIso(), name: el.name.value.trim(), note: el.note.value.trim(), lat: pos.lat, lon: pos.lon, accuracy: pos.accuracy ?? null };
      const next = { ...tour, stops: (tour.stops || []).filter((x) => x.id !== row.id).concat(row) };
      if (!edit && el.journal && el.journal.checked) next.journal = (tour.journal || []).concat({ id: newId(), date: row.date, place: row.name, text: row.note });
      await saveTour(next);
      toast(edit ? 'Stellplatz geändert' : 'Stellplatz gespeichert');
    },
  });
}
