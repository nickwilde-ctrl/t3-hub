// „Feedback geben“: Tester schreiben kurz, was auffällt, und teilen es z. B. per WhatsApp.
import { esc } from '../format.js';
import { openSheet, toast } from './sheet.js';
import { FEEDBACK_KINDS, deviceText, feedbackText } from '../logic/feedback.js';
import { isStandalone } from './install.js';

const AREAS = ['Home', 'Serviceheft', 'Anleitungen', 'Tanken', 'Touren', 'Mehr', 'Einrichtung', 'Sonstiges'];

export function feedbackCard() {
  return `<section class="sec"><div class="card soon-card"><span class="label">Testphase</span><h3>Feedback geben</h3>
    <p>Etwas klappt nicht, ist unklar oder du hast eine Idee? Schreib es kurz auf und schick es per WhatsApp, Mail oder SMS an die Person, die dir T3 Hub empfohlen hat.</p>
    <button type="button" class="btn" data-action="feedback" style="justify-self:start">Feedback schreiben</button></div></section>`;
}

export function feedbackSheet(version) {
  let kind = FEEDBACK_KINDS[0];
  openSheet({
    title: 'Feedback',
    submitLabel: 'Teilen …',
    body: `
      <div class="field"><label>Worum geht's?</label><div class="chips" id="fb-kinds">${FEEDBACK_KINDS.map((k) => `<button type="button" class="chip-btn" data-kind="${esc(k)}" aria-pressed="${k === kind}">${esc(k)}</button>`).join('')}</div></div>
      <div class="field"><label for="fb-where">Wo in der App?</label><select id="fb-where" name="where"><option value="">–</option>${AREAS.map((a) => `<option>${a}</option>`).join('')}</select></div>
      <div class="field"><label for="fb-text">Was ist passiert bzw. was wünschst du dir?</label><textarea id="fb-text" name="text" rows="5" placeholder="z. B. Beim Speichern einer Tankung kommt eine Fehlermeldung …"></textarea></div>
      <p class="hint" style="margin:0">Mitgeschickt werden nur die App-Version und die Geräteart (z. B. „iPhone · als App“). Keine Daten aus deinem Bordbuch.</p>`,
    onReady(form) {
      form.querySelector('#fb-kinds').addEventListener('click', (e) => {
        const b = e.target.closest('[data-kind]');
        if (!b) return;
        kind = b.dataset.kind;
        form.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      });
    },
    async onSubmit(form) {
      const text = form.elements.text.value.trim();
      if (!text) return 'Bitte kurz beschreiben, worum es geht.';
      const msg = feedbackText({ kind, text, where: form.elements.where.value, version, device: deviceText(navigator.userAgent, isStandalone()) });
      try {
        if (navigator.share) { await navigator.share({ text: msg }); toast('Danke für dein Feedback!'); return; }
      } catch (err) {
        if (err && err.name === 'AbortError') return 'Teilen abgebrochen – du kannst es nochmal versuchen.';
      }
      try { await navigator.clipboard.writeText(msg); toast('Text kopiert – jetzt z. B. in WhatsApp einfügen'); } catch { return 'Teilen geht auf diesem Gerät nicht. Bitte den Text abschreiben.'; }
    },
  });
}
