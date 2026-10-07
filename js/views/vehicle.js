// Fahrzeugakte: Anzeige im Reiter „Mehr“ und Bearbeiten-Formular.
import { esc } from '../format.js';
import { openSheet, toast } from './sheet.js';

/** Vorschläge für freie Felder, angelehnt an den Fahrzeugschein (Zulassungsbescheinigung Teil I). */
export const FACT_SUGGESTIONS = [
  'Erstzulassung', 'FIN', 'Farbe', 'Aufbau', 'Hubraum', 'Leistung', 'Kraftstoff',
  'Höchstgeschwindigkeit', 'Leergewicht', 'Zul. Gesamtgewicht', 'Anhängelast', 'Reifen', 'Maße (L × B × H)', 'Bemerkungen',
];

export function vehicleCard(v) {
  const base = [
    ['Name', v.name],
    ['Modell', v.model],
    ['Kennzeichen', v.plate],
    ['Motor', v.engine],
  ].filter(([, val]) => val);
  const rows = [...base, ...v.facts.filter((f) => f.k || f.v).map((f) => [f.k, f.v])];
  return `<section class="sec"><div class="sec-head"><h2>Fahrzeugakte</h2><button type="button" class="add" data-action="edit-vehicle">Bearbeiten</button></div>
    <div class="card"><dl class="facts">${rows.map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('')}</dl>
    ${v.facts.length ? '' : '<p class="hint" style="padding:0 14px 14px;margin:0">Tipp: Unter „Bearbeiten“ kannst du alle Daten aus dem Fahrzeugschein ergänzen.</p>'}</div></section>`;
}

function factRow(k = '', v = '', i = 0) {
  return `<div class="fact-row" data-fact>
    <input aria-label="Bezeichnung" name="fk" value="${esc(k)}" placeholder="z. B. ${esc(FACT_SUGGESTIONS[i % FACT_SUGGESTIONS.length])}" list="fact-suggestions">
    <input aria-label="Wert" name="fv" value="${esc(v)}" placeholder="Wert">
    <button type="button" class="icon-btn" data-remove-fact aria-label="Feld entfernen">×</button>
  </div>`;
}

export function editVehicleSheet(vehicle, save) {
  const v = vehicle;
  const facts = v.facts.length ? v.facts : FACT_SUGGESTIONS.slice(0, 6).map((k) => ({ k, v: '' }));
  openSheet({
    title: 'Fahrzeugakte bearbeiten',
    body: `
      <div class="field"><label for="v-name">Name</label><input id="v-name" name="name" value="${esc(v.name)}" placeholder="z. B. Peanut" autocomplete="off"></div>
      <div class="field"><label for="v-model">Modell und Baujahr</label><input id="v-model" name="model" value="${esc(v.model)}" placeholder="z. B. VW T3 · Baujahr 1985"></div>
      <div class="two">
        <div class="field"><label for="v-plate">Kennzeichen</label><input id="v-plate" name="plate" value="${esc(v.plate)}" placeholder="B AB 1234 H" autocapitalize="characters" autocomplete="off"></div>
        <div class="field"><label for="v-engine">Motor (kurz)</label><input id="v-engine" name="engine" value="${esc(v.engine)}" placeholder="2,1 l WBX · 70 kW"></div>
      </div>
      <p class="hint" style="margin:0">Kennzeichen mit Leerzeichen eingeben, so wie es auf dem Schild steht. Ein H für Oldtimer einfach ans Ende.</p>
      <div class="field"><label>Weitere Daten</label><div id="facts" class="facts-edit">${facts.map((f, i) => factRow(f.k, f.v, i)).join('')}</div>
        <button type="button" class="add" id="add-fact" style="justify-self:start">+ Feld hinzufügen</button></div>
      <datalist id="fact-suggestions">${FACT_SUGGESTIONS.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>`,
    onReady(form) {
      const list = form.querySelector('#facts');
      form.querySelector('#add-fact').onclick = () => {
        list.insertAdjacentHTML('beforeend', factRow('', '', list.children.length));
        list.lastElementChild.querySelector('input').focus();
      };
      list.addEventListener('click', (e) => {
        if (e.target.closest('[data-remove-fact]')) e.target.closest('[data-fact]').remove();
      });
    },
    async onSubmit(form) {
      const name = form.elements['name'].value.trim();
      if (!name) return 'Bitte gib deinem Fahrzeug einen Namen.';
      const facts = [...form.querySelectorAll('[data-fact]')]
        .map((row) => ({ k: row.querySelector('[name=fk]').value.trim(), v: row.querySelector('[name=fv]').value.trim() }))
        .filter((f) => f.k && f.v);
      await save({
        ...v,
        name,
        model: form.elements['model'].value.trim(),
        plate: form.elements['plate'].value.trim().toUpperCase().replace(/\s+/g, ' '),
        engine: form.elements['engine'].value.trim(),
        facts,
      });
      toast('Fahrzeugakte gespeichert');
    },
  });
}
