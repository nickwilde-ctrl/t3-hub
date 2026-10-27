// Eigene Anleitung schreiben oder ändern (auch: eigene Fassung einer mitgelieferten Anleitung).
import { esc } from '../format.js';
import { openSheet, closeSheet, toast } from './sheet.js';
import { GUIDE_GROUPS } from '../data/guides.js';
import { copyGuide, lines, checkGuide, levelText } from '../logic/guides.js';

function valueRow(v = {}) {
  return `<div class="part-edit ge-val" data-val data-src="${esc(v.src || '')}" data-orig="${esc(v.v || '')}" data-codes="${esc((v.codes || []).join(','))}">
    <div class="part-grid">
      <label class="pf"><span>Bezeichnung</span><input name="v-k" value="${esc(v.k || '')}" placeholder="z. B. Ölablassschraube" autocomplete="off"></label>
      <label class="pf"><span>Wert</span><input name="v-v" value="${esc(v.v || '')}" placeholder="z. B. 25 Nm" autocomplete="off"></label>
    </div>
    <div class="ge-row"><label class="ge-check"><input type="checkbox" name="v-check" ${v.check ? 'checked' : ''}> Mit Handbuch geprüft</label>
      <button type="button" class="danger-link" data-remove>Entfernen</button></div>
  </div>`;
}

function stepRow(s = {}) {
  return `<li class="part-edit ge-step" data-step-row>
    <label class="pf full"><span class="ge-num">Schritt</span><input name="s-t" value="${esc(s.t || '')}" placeholder="Kurz: was ist zu tun?" autocomplete="off"></label>
    <label class="pf full"><span>Beschreibung</span><textarea name="s-d" rows="3" placeholder="Wie genau? Worauf achten?">${esc(s.d || '')}</textarea></label>
    <div class="ge-row"><span class="ge-move">
      <button type="button" class="add" data-up aria-label="Schritt nach oben">↑</button>
      <button type="button" class="add" data-down aria-label="Schritt nach unten">↓</button></span>
      <button type="button" class="danger-link" data-remove>Entfernen</button></div>
  </li>`;
}

const area = (id, label, items, ph) => `<div class="field"><label for="${id}">${label}</label>
  <textarea id="${id}" name="${id}" rows="${Math.max(2, Math.min(6, (items || []).length + 1))}" placeholder="${ph}">${esc((items || []).join('\n'))}</textarea></div>`;

/**
 * guide: eigene Anleitung (ändern), mitgelieferte (→ eigene Fassung) oder null (neu).
 * ops: { services, save(row) → gespeicherte Zeile, remove(id), onSaved(row), onRemoved() }
 */
export function guideSheet(guide, { services = [], save, remove, onSaved, onRemoved }) {
  const isOwn = !!guide?.own;
  const fromBuiltIn = guide && !isOwn;
  const g = fromBuiltIn ? copyGuide(guide) : guide ? structuredClone(guide) : { group: 'Motor', level: 1, minutes: 30, steps: [{}, {}, {}] };
  const choices = services.filter((s) => s.key);
  openSheet({
    title: isOwn ? 'Anleitung ändern' : fromBuiltIn ? 'Eigene Fassung' : 'Eigene Anleitung',
    sticky: true,
    body: `
      ${fromBuiltIn ? '<p class="hint" style="margin:0">Du bearbeitest eine Kopie, die nur dir gehört. Die mitgelieferte Anleitung bleibt im Hintergrund erhalten und ist wieder da, wenn du deine Fassung löschst.</p>' : ''}
      ${!guide ? '<p class="hint" style="margin:0">Schreib die Anleitung so, wie du sie in der Werkstatt lesen willst: kurze Schritte, je eine Sache. Bleibt nur auf diesem Gerät und ist im Backup enthalten.</p>' : ''}
      <div class="field"><label for="ge-title">Titel</label><input id="ge-title" name="title" value="${esc(g.title || '')}" placeholder="z. B. Keilriemen spannen"></div>
      <div class="two">
        <div class="field"><label for="ge-group">Baugruppe</label><select id="ge-group" name="group">${GUIDE_GROUPS.map((x) => `<option ${x === g.group ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label for="ge-level">Schwierigkeit</label><select id="ge-level" name="level">${[1, 2, 3].map((l) => `<option value="${l}" ${l === g.level ? 'selected' : ''}>${levelText(l)}</option>`).join('')}</select></div>
      </div>
      <div class="two">
        <div class="field"><label for="ge-min">Dauer (Minuten)</label><input id="ge-min" name="minutes" inputmode="numeric" value="${g.minutes ?? ''}"></div>
        <div class="field"><label for="ge-svc">Wartungspunkt</label><select id="ge-svc" name="serviceKey"><option value="">keiner</option>${choices.map((s) => `<option value="${esc(s.key)}" ${s.key === g.serviceKey ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Wichtige Werte</label>
        <div id="ge-vals">${(g.values || []).map(valueRow).join('')}</div>
        <div class="part-actions"><button type="button" class="add" id="ge-add-val">+ Wert</button></div>
        <p class="hint" style="margin:0">Drehmomente, Füllmengen, Abstände. Häkchen erst setzen, wenn du den Wert im Handbuch nachgeschlagen hast.</p></div>
      <div class="field"><label>Schritte</label>
        <ol id="ge-steps" class="ge-steps">${(g.steps || []).map(stepRow).join('')}</ol>
        <div class="part-actions"><button type="button" class="add" id="ge-add-step">+ Schritt</button></div></div>
      ${area('ge-warn', 'Achtung (eine Zeile pro Punkt)', g.warnings, 'z. B. Motor kalt werden lassen')}
      ${area('ge-tools', 'Werkzeug (eine Zeile pro Teil)', g.tools, 'z. B. Nuss 13 mm')}
      ${area('ge-mat', 'Material (eine Zeile pro Teil)', g.material, 'z. B. Keilriemen 9,5 × 875')}
      <div class="field"><label for="ge-hint">Tipp (optional)</label><input id="ge-hint" name="hint" value="${esc(g.hint || '')}"></div>
      <div class="field"><label for="ge-src">Quelle / Notiz (optional)</label><input id="ge-src" name="source" value="${esc(isOwn || fromBuiltIn ? g.source || '' : '')}" placeholder="z. B. Jetzt helfe ich mir selbst, S. 112"></div>
      ${isOwn ? `<button type="button" class="danger-link" id="ge-del">${g.basedOn ? 'Eigene Fassung löschen (Original kommt zurück)' : 'Anleitung löschen'}</button>` : ''}`,
    onReady(form) {
      const vals = form.querySelector('#ge-vals');
      const steps = form.querySelector('#ge-steps');
      const renumber = () => steps.querySelectorAll('.ge-num').forEach((n, i) => (n.textContent = `Schritt ${i + 1}`));
      renumber();
      form.querySelector('#ge-add-val').onclick = () => { vals.insertAdjacentHTML('beforeend', valueRow()); vals.lastElementChild.querySelector('input').focus(); };
      form.querySelector('#ge-add-step').onclick = () => { steps.insertAdjacentHTML('beforeend', stepRow()); renumber(); steps.lastElementChild.querySelector('input').focus(); };
      form.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-remove]');
        if (rm) {
          const row = rm.closest('[data-val],[data-step-row]');
          if (row.matches('[data-step-row]') && steps.children.length === 1) { toast('Mindestens ein Schritt bleibt', 'info'); return; }
          row.remove(); renumber(); return;
        }
        const up = e.target.closest('[data-up]'), down = e.target.closest('[data-down]');
        if (up || down) {
          const li = (up || down).closest('li');
          if (up && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
          if (down && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
          renumber();
          (up || down).focus();
        }
      });
      const del = form.querySelector('#ge-del');
      if (del) del.onclick = async () => {
        if (del.dataset.armed) { await remove(guide.id); closeSheet(); toast('Anleitung gelöscht'); onRemoved?.(); return; }
        del.dataset.armed = '1';
        del.textContent = 'Wirklich löschen? Nochmal tippen';
      };
    },
    async onSubmit(form) {
      const el = form.elements;
      const values = [...form.querySelectorAll('[data-val]')].map((r) => {
        const k = r.querySelector('[name=v-k]').value.trim(), v = r.querySelector('[name=v-v]').value.trim();
        const out = { k, v, check: r.querySelector('[name=v-check]').checked };
        // Quelle nur behalten, solange der Wert unverändert ist
        if (r.dataset.src && v === r.dataset.orig) out.src = r.dataset.src;
        if (r.dataset.codes) out.codes = r.dataset.codes.split(',');
        return out;
      }).filter((x) => x.k || x.v);
      if (values.some((x) => !x.k || !x.v)) return 'Bei einem Wert fehlt die Bezeichnung oder die Zahl.';
      const stepList = [...form.querySelectorAll('[data-step-row]')].map((r) => ({ t: r.querySelector('[name=s-t]').value.trim(), d: r.querySelector('[name=s-d]').value.trim() }))
        .filter((s) => s.t || s.d);
      const now = new Date().toISOString();
      const row = {
        ...(isOwn ? guide : {}),
        own: undefined,
        basedOn: g.basedOn || undefined,
        title: el.title.value.trim(),
        group: el.group.value,
        level: +el.level.value,
        minutes: Math.round(Number(el.minutes.value.replace(',', '.'))),
        serviceKey: el.serviceKey.value || null,
        engine: 'Eigene Anleitung',
        values,
        steps: stepList,
        warnings: lines(el['ge-warn'].value),
        tools: lines(el['ge-tools'].value),
        material: lines(el['ge-mat'].value),
        hint: el.hint.value.trim(),
        source: el.source.value.trim(),
        createdAt: (isOwn && guide.createdAt) || now,
        updatedAt: now,
      };
      delete row.own;
      if (!row.basedOn) delete row.basedOn;
      const err = checkGuide(row);
      if (err) return err;
      const saved = await save(row);
      toast(isOwn ? 'Anleitung geändert' : 'Anleitung gespeichert');
      setTimeout(() => onSaved?.(saved), 0);
    },
  });
}
