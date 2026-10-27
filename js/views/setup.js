// Erster Start: Begrüßung und Einrichtung in drei kurzen Schritten.
import { esc, todayIso } from '../format.js';
import { ENGINE_FAMILIES, familyForCode, engineText } from '../data/engines.js';
import { parseNumber } from '../logic/fuel.js';
import { readPhoto } from '../photo.js';
import { toast } from './sheet.js';
import { isStandalone, isIos } from './install.js';

let data = null; // Eingaben über die Schritte hinweg
let step = 0;    // 0 = Begrüßung, 1–3 = Schritte, 4 = fertig

const dots = () => `<div class="su-dots" aria-label="Schritt ${step} von 3">${[1, 2, 3].map((i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;

function welcome() {
  return `<div class="su-hero">
      <div class="eyebrow">Willkommen bei</div>
      <h1 class="su-title">T3 Hub</h1>
      <p class="su-lead">Das digitale Bordbuch für deinen VW T3.</p>
    </div>
    <ul class="su-feat">
      <li><b>Wartung im Blick</b><span>Ölwechsel, Zündkerzen, Bremsflüssigkeit … die App sagt dir, was fällig ist.</span></li>
      <li><b>Tankbuch und Verbrauch</b><span>Jede Tankung in Sekunden, mit Verbrauch und Kosten.</span></li>
      <li><b>Touren und Serviceheft</b><span>Reisen, Stellplätze, Reparaturen, Rechnungen und Anleitungen an einem Ort.</span></li>
    </ul>
    <p class="hint su-note">Alle Daten bleiben auf diesem Gerät. Kein Konto, keine Anmeldung.</p>
    ${isIos() && !isStandalone() ? `<div class="su-box su-ios"><b>Erst auf den Home-Bildschirm!</b>
      <span>Auf dem iPhone hat die App vom Home-Bildschirm einen eigenen Speicher – was du hier in Safari einträgst, ist dort nicht zu sehen. Deshalb zuerst: unten auf <b>Teilen</b> (Quadrat mit Pfeil) → <b>Zum Home-Bildschirm</b> → <b>Hinzufügen</b>. Dann T3 Hub vom Home-Bildschirm öffnen und dort einrichten.</span></div>` : ''}
    <div class="su-actions">
      <button type="button" class="btn su-next" data-su="start">Bus einrichten</button>
      <button type="button" class="btn ghost" data-su="demo">Erst mal ausprobieren</button>
      <label class="btn ghost su-restore">Backup wiederherstellen<input type="file" id="restore-in" hidden></label>
    </div>`;
}

function step1() {
  return `${dots()}<h2 class="su-h">Wie heißt dein Bus?</h2>
    <p class="su-text">Viele T3 haben einen Spitznamen. Sonst geht auch einfach „Mein T3“.</p>
    <div class="field"><label for="su-name">Name</label><input id="su-name" value="${esc(data.name)}" placeholder="z. B. Peanut" autocomplete="off" enterkeyhint="next"></div>
    <div class="field"><label>Foto (optional)</label>
      <div class="su-photo">${data.photo ? `<img src="${data.photo}" alt="">` : '<span>Noch kein Foto</span>'}</div>
      <label class="add su-photo-btn">${data.photo ? 'Anderes Foto' : '+ Foto wählen'}<input type="file" id="su-photo" accept="image/*" hidden></label></div>
    <div class="field"><label>Wie gut kennst du den T3?</label>
      <div class="su-opts" role="radiogroup" aria-label="Erfahrung">
        <label class="su-opt"><input type="radio" name="su-exp" value="neu" ${data.experience !== 'erfahren' ? 'checked' : ''}><span><b>Mein erster T3 – ich lerne noch</b><small>Die App erklärt mehr und zeigt dir, womit du anfängst.</small></span></label>
        <label class="su-opt"><input type="radio" name="su-exp" value="erfahren" ${data.experience === 'erfahren' ? 'checked' : ''}><span><b>Ich kenne mich aus</b><small>Kurze Hinweise, du trägst direkt ein.</small></span></label></div></div>`;
}

function step2() {
  const fam = (f) => `<label class="su-opt"><input type="radio" name="su-fam" value="${f.id}" ${data.family === f.id ? 'checked' : ''}>
    <span><b>${esc(f.label)}</b><small>${esc(f.fuel)} · ${esc(f.hint)} · ${f.codes.join(', ')}</small></span></label>`;
  return `${dots()}<h2 class="su-h">Welcher Motor?</h2>
    <p class="su-text">Davon hängen die Wartungspunkte ab – ein Diesel braucht zum Beispiel keine Zündkerzen.</p>
    <div class="field"><label for="su-year">Baujahr (optional)</label><input id="su-year" inputmode="numeric" value="${data.year ?? ''}" placeholder="z. B. 1985"></div>
    <div class="su-opts" role="radiogroup" aria-label="Motor">${ENGINE_FAMILIES.map(fam).join('')}
      <label class="su-opt"><input type="radio" name="su-fam" value="" ${!data.family ? 'checked' : ''}><span><b>Weiß ich nicht</b><small>Kein Problem – du kannst es später in der Fahrzeugakte ergänzen.</small></span></label></div>
    <div class="field"><label for="su-code">Motorkennbuchstaben (optional)</label><input id="su-code" value="${esc(data.code)}" placeholder="z. B. MV" autocapitalize="characters" autocomplete="off" maxlength="3">
      <p class="hint" style="margin:0">Stehen am Motorgehäuse eingeschlagen, oft auch im Serviceheft oder auf dem Datenaufkleber.</p></div>`;
}

function step3() {
  return `${dots()}<h2 class="su-h">Wo steht der Tacho?</h2>
    <p class="su-text">Mit dem Kilometerstand kann die App ausrechnen, wann die nächste Wartung fällig ist.</p>
    <div class="field"><label for="su-km">Kilometerstand heute</label><input id="su-km" inputmode="numeric" value="${data.km ?? ''}" placeholder="z. B. 128500"></div>
    <div class="su-box"><b>Letzter Ölwechsel</b> <span class="faint">(optional – falls du es weißt)</span>
      <div class="two"><div class="field"><label for="su-oil-km">bei km</label><input id="su-oil-km" inputmode="numeric" value="${data.oilKm ?? ''}"></div>
      <div class="field"><label for="su-oil-date">am</label><input id="su-oil-date" type="date" value="${esc(data.oilDate || '')}" max="${todayIso()}"></div></div></div>
    <p class="hint" style="margin:0">Weitere Wartungen trägst du später im Reiter „Wartung“ ein.</p>`;
}

function done() {
  return `<div class="su-hero"><div class="eyebrow">Fertig</div><h1 class="su-title">${esc(data.name)} ist an Bord</h1></div>
    <ul class="su-feat">
      ${isStandalone() || isIos() ? '' : '<li><b>Als App installieren</b><span>Im Browser-Menü „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen. Dann startet T3 Hub wie eine normale App und funktioniert auch offline.</span></li>'}
      <li><b>Ab und zu ein Backup</b><span>Deine Daten liegen nur auf diesem Gerät. Unter „Mehr“ sicherst du sie mit einem Tipp – die App erinnert dich daran.</span></li>
      ${data.experience === 'erfahren'
        ? '<li><b>Erster Schritt</b><span>Unter Wartung eintragen, was du weißt – nach einem Service auch alles auf einmal. Die Intervalle kannst du anpassen.</span></li>'
        : '<li><b>Erster Schritt</b><span>Auf der Startseite zeigt dir „So fängst du an“, was du als Erstes einträgst. Das dauert nur ein paar Minuten.</span></li>'}
      <li><b>Tanken</b><span>Beim nächsten Tanken gleich die Tankung eintragen. Ab der zweiten Volltankung siehst du deinen Verbrauch.</span></li>
    </ul>
    <div class="su-actions"><button type="button" class="btn su-next" data-su="close">Los geht's</button></div>`;
}

const SCREENS = [welcome, step1, step2, step3, done];

function draw(root) {
  root.querySelector('.su-body').innerHTML = SCREENS[step]();
  root.querySelector('.su-bar').innerHTML = step >= 1 && step <= 3
    ? `<button type="button" class="btn ghost" data-su="back">Zurück</button><button type="button" class="btn" data-su="next">${step === 3 ? 'Fertig' : 'Weiter'}</button>`
    : '';
  root.querySelector('.su-bar').hidden = !(step >= 1 && step <= 3);
  root.scrollTop = 0;
  root.querySelector('.su-body').scrollTop = 0;
}

/** Liest die Felder des aktuellen Schritts. Gibt einen Fehlertext zurück oder ''. */
function read(root) {
  const v = (id) => root.querySelector('#' + id)?.value.trim() ?? '';
  if (step === 1) {
    data.name = v('su-name');
    if (!data.name) return 'Bitte gib deinem Bus einen Namen.';
    data.experience = root.querySelector('[name=su-exp]:checked')?.value || 'neu';
  }
  if (step === 2) {
    const y = v('su-year');
    data.year = y ? parseInt(y, 10) : null;
    if (y && !(data.year >= 1979 && data.year <= 1992)) return 'Der T3 wurde von 1979 bis 1992 gebaut (Syncro und Südafrika auch länger). Bitte das Baujahr prüfen oder leer lassen.';
    data.code = v('su-code').toUpperCase();
    data.family = root.querySelector('[name=su-fam]:checked')?.value || '';
    // Kennbuchstabe passt zu einer Bauart? Dann die Bauart danach richten, wenn keine gewählt ist.
    if (data.code && !data.family) data.family = familyForCode(data.code) || '';
  }
  if (step === 3) {
    const km = v('su-km'), ok = v('su-oil-km');
    data.km = km ? Math.round(parseNumber(km, 'km')) : null;
    if (km && !(data.km >= 0)) return 'Der Kilometerstand ist keine gültige Zahl.';
    data.oilKm = ok ? Math.round(parseNumber(ok, 'km')) : null;
    if (ok && !(data.oilKm >= 0)) return 'Der Kilometerstand beim Ölwechsel ist keine gültige Zahl.';
    if (data.oilKm != null && data.km != null && data.oilKm > data.km) return 'Der Ölwechsel kann nicht bei mehr Kilometern gewesen sein als heute auf dem Tacho stehen.';
    data.oilDate = v('su-oil-date') || null;
  }
  return '';
}

/**
 * Zeigt die Einrichtung (nur wenn noch kein Fahrzeug existiert).
 * create(setup) legt das Fahrzeug an; danach wird die normale App gezeichnet.
 */
export function showSetup(create, demo) {
  if (document.getElementById('setup-root')) return;
  data = { name: '', experience: 'neu', photo: null, year: null, family: '', code: '', km: null, oilKm: null, oilDate: null };
  step = 0;
  const root = document.createElement('div');
  root.id = 'setup-root';
  root.className = 'setup';
  root.innerHTML = '<div class="su-body"></div><div class="su-bar" hidden></div>';
  document.body.appendChild(root);
  document.body.classList.add('in-setup');
  draw(root);

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-su]');
    if (!b) return;
    const a = b.dataset.su;
    if (a === 'start') { step = 1; draw(root); root.querySelector('#su-name')?.focus(); return; }
    if (a === 'back') { read(root); step = Math.max(0, step - 1); draw(root); return; }
    if (a === 'next') {
      const err = read(root);
      if (err) { toast(err, 'err'); return; }
      if (step < 3) { step += 1; draw(root); return; }
      b.disabled = true;
      try {
        await create({ ...data, family: data.family || null, engine: engineText(data.family, data.code) });
        step = 4; draw(root);
      } catch (err2) { b.disabled = false; toast('Speichern hat nicht geklappt', 'err'); console.error(err2); }
      return;
    }
    if (a === 'close') closeSetup();
    if (a === 'demo') { b.disabled = true; try { await demo(); closeSetup(); } catch (err3) { b.disabled = false; toast('Das hat nicht geklappt', 'err'); console.error(err3); } }
  });
  // Kennbuchstabe eingetippt → passende Bauart gleich auswählen
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'su-code') return;
    const fam = familyForCode(e.target.value);
    if (fam) root.querySelector(`[name=su-fam][value="${fam}"]`).checked = true;
  });
  root.addEventListener('change', async (e) => {
    if (e.target.id !== 'su-photo' || !e.target.files?.[0]) return;
    data.name = root.querySelector('#su-name')?.value.trim() ?? data.name;
    try { data.photo = await readPhoto(e.target.files[0]); draw(root); } catch { toast('Das Foto konnte nicht gelesen werden', 'err'); }
  });
}

export function closeSetup() {
  document.getElementById('setup-root')?.remove();
  document.body.classList.remove('in-setup');
}

/** Steht die Einrichtung noch auf der Begrüßung? (Dann darf ein wiederhergestelltes Backup sie schließen.) */
export const setupAtWelcome = () => !!document.getElementById('setup-root') && step === 0;
