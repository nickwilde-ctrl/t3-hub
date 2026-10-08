// Einblendfenster von unten (für Formulare) und kurze Rückmeldungen.
import { esc } from '../format.js';

let toastTimer;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 1800);
}

export function closeSheet() {
  document.getElementById('sheet-root')?.remove();
  document.body.style.overflow = '';
}

/**
 * Öffnet ein Formular. onSubmit(form, { confirmed }) gibt zurück:
 * - nichts/undefined → speichern hat geklappt, Fenster schließt
 * - einen Text → Fehler, Fenster bleibt offen
 * - { warnings: [Text, …] } → Hinweise anzeigen; erst ein zweites Tippen auf „Trotzdem speichern“
 *   ruft onSubmit mit confirmed = true auf. Jede Änderung im Formular setzt das zurück.
 */
export function openSheet({ title, body, submitLabel = 'Speichern', onSubmit, onReady }) {
  closeSheet();
  const root = document.createElement('div');
  root.id = 'sheet-root';
  root.innerHTML = `<div class="scrim" id="scrim"><form class="sheet" id="sheet" novalidate>
      <h3>${esc(title)}</h3>${body}
      <div class="err" id="sheet-err" role="alert"></div>
      <div class="actions"><button type="button" class="btn ghost" id="sheet-cancel">Abbrechen</button><button class="btn" type="submit">${esc(submitLabel)}</button></div>
    </form></div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  const form = root.querySelector('#sheet');
  const errEl = root.querySelector('#sheet-err');
  const submitBtn = form.querySelector('button[type=submit]');
  let confirmed = false;
  const resetConfirm = () => {
    if (!confirmed) return;
    confirmed = false;
    submitBtn.textContent = submitLabel;
    errEl.innerHTML = '';
    errEl.className = 'err';
  };
  form.addEventListener('input', resetConfirm);
  form.addEventListener('click', (e) => { if (e.target.closest('[aria-pressed]')) resetConfirm(); });
  root.querySelector('#sheet-cancel').onclick = closeSheet;
  root.querySelector('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') closeSheet(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await onSubmit(form, { confirmed });
    if (res && Array.isArray(res.warnings) && res.warnings.length) {
      confirmed = true;
      errEl.className = 'err warn';
      errEl.innerHTML = `<b>Bitte kurz prüfen:</b><ul>${res.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>Passt alles? Dann nochmal tippen.`;
      submitBtn.textContent = 'Trotzdem speichern';
      errEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (res) { errEl.className = 'err'; errEl.textContent = res; return; }
    closeSheet();
  });
  if (onReady) onReady(form);
  return form;
}
