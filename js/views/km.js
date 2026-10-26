// Kilometerstand eintragen: Fenster aus dem Cockpit.
import { de, todayIso } from '../format.js';
import { checkKm } from '../logic/km.js';
import { toast, openSheet } from './sheet.js';

export function kmSheet(current, setKmNow) {
  openSheet({
    title: 'Kilometerstand eintragen',
    body: `<div class="field"><label for="km-now">Tacho heute</label>
        <input id="km-now" name="km" inputmode="numeric" autocomplete="off" placeholder="z. B. ${de(Math.max(current, 0) + 350)}"></div>
      <p class="hint" style="margin:0">Bisher bekannt: ${current ? `${de(current)} km` : 'noch kein Stand'}. Ohne Tankung eintragen, damit die Fälligkeiten stimmen, zum Beispiel vor einer Reise oder einem Service.</p>`,
    async onSubmit(form, { confirmed }) {
      const r = checkKm(form.km.value, current);
      if (r.error) return r.error;
      if (r.warnings && !confirmed) return { warnings: r.warnings };
      await setKmNow(r.km, todayIso());
      toast(`${de(r.km)} km eingetragen`);
    },
    onReady(form) { setTimeout(() => form.km.focus(), 50); },
  });
}
