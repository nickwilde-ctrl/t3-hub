// Einstieg „So fängst du an“ auf der Startseite, je nach Erfahrung ausführlich oder kurz.
// Dazu „Alles auf einmal eintragen“, z. B. nach einem Komplettservice.
import { esc, de, todayIso } from '../format.js';
import { parseNumber } from '../logic/fuel.js';
import { experienceOf, startSteps, unknownServices } from '../logic/start.js';
import { openSheet, toast } from './sheet.js';
import { NOT_IN_SERVICE } from '../logic/services.js';

const TEXT = {
  km: ['Kilometerstand eintragen', 'Tippe oben im Cockpit auf den Tachostand.', { action: 'set-km', label: 'Eintragen' }],
  hu: ['Letzte HU eintragen', 'Das Datum steht auf dem letzten Prüfbericht. Weißt du nur, wann die nächste fällig ist (Plakette hinten am Kennzeichen, Fahrzeugschein), zieh einfach zwei Jahre ab.', { service: 'hu', label: 'Eintragen' }],
  oil: ['Letzten Ölwechsel eintragen', 'Oft klebt ein Zettel im Motorraum oder an der Tür. Sonst steht es auf der letzten Werkstattrechnung oder im Serviceheft.', { service: 'oil', label: 'Eintragen' }],
  rest: ['Der Rest ist unbekannt? Ganz normal.', 'Bei einem gebrauchten T3 weiß das kaum jemand. Lass beim nächsten Werkstattbesuch einen Komplettservice machen (Inspektion mit allen Flüssigkeiten und Filtern) und trag danach alles auf einmal ein.', { action: 'bulk-done', label: 'Alles auf einmal eintragen' }],
};

/** Karte für die Startseite. services = Wartungspunkte mit letztem Stand. */
export function startCard(vehicle, services, km) {
  const exp = experienceOf(vehicle);
  const steps = startSteps(services, km);
  const open = unknownServices(services, km).length;
  const foot = `<div class="st-foot"><button type="button" class="add" data-action="start-level">${exp === 'neu' ? 'Ich kenne mich aus – kurz anzeigen' : 'Ausführlich anzeigen'}</button>
    <button type="button" class="add" data-action="start-hide">Ausblenden</button></div>`;
  if (exp === 'erfahren') {
    return `<section class="sec"><div class="card st-card"><div class="label">Einrichten</div>
      <h3>Trag ein, was du weißt</h3>
      <p>${open ? `${open} Wartungspunkte haben noch kein Datum.` : 'Alle Wartungspunkte haben ein Datum.'} Einzeln unter Wartung antippen oder alles auf einmal eintragen.${km > 0 ? '' : ' Den Tachostand setzt du oben im Cockpit.'}</p>
      <p class="hint">Die Intervalle sind Startwerte und unter Wartung änderbar. Alte Tankungen aus Road Trip holst du unter Mehr → Daten.</p>
      <div class="st-btns">${open ? '<button type="button" class="btn" data-action="bulk-done">Alles auf einmal eintragen</button>' : ''}<button type="button" class="btn ghost" data-tab="wartung">Zur Wartung</button></div>
      ${foot}</div></section>`;
  }
  const done = steps.filter((s) => s.done).length;
  return `<section class="sec"><div class="card st-card"><div class="label">So fängst du an · ${done} von ${steps.length} erledigt</div>
    <h3>Willkommen an Bord!</h3>
    <p>T3 Hub rechnet aus, wann Ölwechsel, HU und Co. fällig sind. Dafür muss die App einmal wissen, wann sie zuletzt gemacht wurden. „Offen“ heißt nur: noch nicht eingetragen. Kein Grund zur Sorge.</p>
    <ol class="st-steps">${steps.map((s, i) => {
      const [title, text, btn] = TEXT[s.id];
      const attr = btn.action ? `data-action="${btn.action}"` : `data-start-service="${btn.service}"`;
      return `<li class="${s.done ? 'done' : ''}"><span class="st-n" aria-hidden="true">${s.done ? '✓' : i + 1}</span><div><b>${esc(title)}</b>${s.done ? '' : `<p>${esc(text)}</p><button type="button" class="add" ${attr}>${esc(btn.label)}</button>`}</div></li>`;
    }).join('')}
      <li><span class="st-n" aria-hidden="true">${steps.length + 1}</span><div><b>Deinen Bus kennenlernen</b><p>Die Anleitung „Frühjahrscheck“ zeigt Schritt für Schritt, was du selbst nachsehen kannst – mit Taschenlampe und Auffahrrampen, ohne zu schrauben.</p><button type="button" class="add" data-open-guide="fruehjahrscheck">Anleitung öffnen</button></div></li>
    </ol>
    ${foot}</div></section>`;
}

/**
 * Mehrere Wartungspunkte auf einmal als erledigt eintragen.
 * raw = gespeicherte Wartungspunkte, shown = mit letztem Stand (für „offen“).
 */
export function bulkDoneSheet({ raw, shown, km, saveMany, saveLog }) {
  // HU und das Erneuern der Kraftstoffschläuche gehören nicht zu einem Service: nie vorab anhaken.
  const all = new Set(unknownServices(shown, km).map((s) => s.key));
  const unknown = new Set([...all].filter((k) => !NOT_IN_SERVICE.includes(k)));
  const note = (s) => (unknown.has(s.key) ? '' : NOT_IN_SERVICE.includes(s.key) && all.has(s.key) ? ' <span class="faint">(gehört nicht zum Service)</span>' : ' <span class="faint">(schon eingetragen)</span>');
  const rows = shown.map((s) => `<label class="check"><input type="checkbox" name="svc" value="${esc(s.id)}" ${unknown.has(s.key) ? 'checked' : ''}><span>${esc(s.name)}${note(s)}</span></label>`).join('');
  openSheet({
    title: 'Alles auf einmal eintragen',
    submitLabel: 'Eintragen',
    sticky: true,
    body: `<p class="hint" style="margin:0">Zum Beispiel nach einem Komplettservice: Haken an alles, was gemacht wurde. Nicht Gemachtes bleibt offen.</p>
      <div class="two"><div class="field"><label for="b-date">Datum</label><input id="b-date" name="date" type="date" value="${todayIso()}" max="${todayIso()}"></div>
      <div class="field"><label for="b-km">Kilometerstand</label><input id="b-km" name="km" inputmode="numeric" value="${km || ''}"></div></div>
      <div class="field"><label>Was wurde gemacht?</label><div class="tour-pick st-pick">${rows}</div></div>
      <label class="check"><input type="checkbox" name="log" checked><span>Als „Komplettservice“ ins Serviceheft eintragen</span></label>
      <div class="two"><div class="field"><label for="b-cost">Kosten in € (optional)</label><input id="b-cost" name="cost" inputmode="decimal"></div>
      <div class="field"><label for="b-note">Werkstatt / Notiz</label><input id="b-note" name="note" autocomplete="off"></div></div>`,
    async onSubmit(form) {
      const el = form.elements;
      const ids = [...form.querySelectorAll('input[name=svc]:checked')].map((x) => x.value);
      if (!ids.length) return 'Bitte mindestens einen Punkt ankreuzen.';
      const date = el.date.value;
      if (!date) return 'Bitte ein Datum eintragen.';
      const kmVal = el.km.value.trim() ? Math.round(parseNumber(el.km.value, 'km')) : null;
      if (kmVal != null && !(kmVal >= 0)) return 'Der Kilometerstand ist keine gültige Zahl.';
      const cost = el.cost.value.trim() ? parseNumber(el.cost.value) : null;
      if (cost != null && !(cost >= 0)) return 'Die Kosten sind keine gültige Zahl.';
      const chosen = raw.filter((s) => ids.includes(s.id));
      await saveMany('services', chosen.map((s) => ({ ...s, lastDate: date, lastKm: kmVal })));
      if (el.log.checked) {
        await saveLog({ date, km: kmVal, title: 'Komplettservice', category: 'Wartung', cost,
          note: [el.note.value.trim(), `Erledigt: ${chosen.map((s) => s.name).join(', ')}`].filter(Boolean).join(' · '), parts: [] });
      }
      toast(`${de(chosen.length)} Punkte eingetragen`);
    },
  });
}
