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
 * Öffnet ein Formular. onSubmit(form) gibt entweder einen Fehlertext zurück (dann bleibt das Fenster offen)
 * oder nichts/undefined (dann schließt es). Darf async sein.
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
  root.querySelector('#sheet-cancel').onclick = closeSheet;
  root.querySelector('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') closeSheet(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = await onSubmit(form);
    if (err) root.querySelector('#sheet-err').textContent = err;
    else closeSheet();
  });
  if (onReady) onReady(form);
  return form;
}
