// Einblendfenster von unten (für Formulare) und kurze Rückmeldungen.
import { esc } from '../format.js';

let toastTimer;
let toastCount = 0;
/**
 * Kurze Rückmeldung unten. kind: 'ok' (Standard, mit Haken), 'info' (ohne Haken), 'err' (rot).
 * Längere Texte bleiben länger stehen.
 */
export function toast(msg, kind = 'ok') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  toastCount += 1;
  el.className = 'toast toast-' + kind;
  el.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), Math.min(6000, 2600 + msg.length * 40));
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
export function openSheet({ title, body, submitLabel = 'Speichern', onSubmit, onReady, sticky = false }) {
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
  // sticky: lange Formulare schließen nicht beim Tippen daneben (sonst ist alles Geschriebene weg)
  if (!sticky) root.querySelector('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') closeSheet(); });
  // Doppeltipp: während des Speicherns zählt kein weiterer Tipp, und ein Hinweis
  // lässt sich nicht im selben Atemzug mit „Trotzdem speichern“ wegtippen.
  let busy = false;
  let warnedAt = 0;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    if (confirmed && Date.now() - warnedAt < 700) return;
    busy = true;
    submitBtn.disabled = true;
    // Dauert es länger (z. B. viele Fotos), sieht man, dass etwas passiert.
    const label = submitBtn.textContent;
    const slow = setTimeout(() => { submitBtn.textContent = 'Bitte warten …'; }, 400);
    const toastsBefore = toastCount;
    let res;
    try {
      res = await onSubmit(form, { confirmed });
    } catch (err) {
      console.error(err);
      res = 'Das hat nicht geklappt. Bitte nochmal versuchen.';
    } finally {
      clearTimeout(slow);
      submitBtn.textContent = label;
      busy = false;
      submitBtn.disabled = false;
    }
    if (res && Array.isArray(res.warnings) && res.warnings.length) {
      confirmed = true;
      warnedAt = Date.now();
      errEl.className = 'err warn';
      errEl.innerHTML = `<b>Bitte kurz prüfen:</b><ul>${res.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>Passt alles? Dann nochmal tippen.`;
      submitBtn.textContent = 'Trotzdem speichern';
      errEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (res) { errEl.className = 'err'; errEl.textContent = res; return; }
    closeSheet();
    // Jedes Speichern meldet sich – falls das Formular nicht schon selbst etwas gesagt hat.
    if (toastCount === toastsBefore && (submitLabel === 'Speichern' || submitLabel === 'Eintragen')) toast('Gespeichert');
  });
  if (onReady) onReady(form);
  return form;
}
