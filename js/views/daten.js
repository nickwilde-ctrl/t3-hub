// Backup sichern und wiederherstellen, Road-Trip-Import, Backup-Erinnerung.
import { de, esc, fmtDate } from '../format.js';
import { buildBackup, checkBackup, daysSince, backupFileName } from '../logic/backup.js';
import { fromRoadTrip } from '../logic/roadtrip.js';
import { openSheet, toast } from './sheet.js';

export const REMIND_DAYS = 30;

const lastText = (iso) => {
  const d = daysSince(iso);
  if (d == null) return 'Noch kein Backup erstellt.';
  if (d === 0) return 'Letztes Backup: heute.';
  if (d === 1) return 'Letztes Backup: gestern.';
  return `Letztes Backup: vor ${d} Tagen (${fmtDate(iso.slice(0, 10))}).`;
};

export function dataCard(state) {
  return `<section class="sec"><div class="sec-head"><h2>Daten</h2></div>
    <div class="card list">
      <button type="button" class="row row-btn" data-action="backup"><div class="t">Backup erstellen</div><div class="s">${lastText(state.lastBackup)} Die Datei am besten in iCloud Drive sichern.</div><div class="r"><span class="chip">Sichern</span></div></button>
      <label class="row row-btn file-row"><div class="t">Backup wiederherstellen</div><div class="s">Ersetzt alle Daten auf diesem Gerät durch die Backup-Datei.</div><div class="r"><span class="chip">Datei</span></div><input type="file" id="restore-in" accept=".json,application/json"></label>
      <label class="row row-btn file-row"><div class="t">Aus Road Trip übernehmen</div><div class="s">CSV-Export der App Road Trip einlesen. Doppelte Tankungen werden übersprungen.</div><div class="r"><span class="chip">CSV</span></div><input type="file" id="roadtrip-in" accept=".csv,text/csv,text/plain"></label>
    </div>
    <p class="hint">Deine Daten liegen nur auf diesem Gerät. Ohne Backup sind sie weg, wenn das iPhone verloren geht oder Safari die Website-Daten löscht.</p></section>`;
}

/** Erinnerungskarte für die Startseite, wenn es Daten gibt und das letzte Backup zu lange her ist. */
export function backupReminder(state) {
  const hasData = state.fuels.length || state.log.length || state.tours.length;
  const d = daysSince(state.lastBackup);
  if (!hasData || (d != null && d < REMIND_DAYS)) return '';
  return `<section class="sec"><div class="card reminder"><div><div class="t">${d == null ? 'Noch kein Backup' : `Letztes Backup vor ${d} Tagen`}</div>
    <div class="s">Sichere deine Daten als Datei, zum Beispiel in iCloud Drive.</div></div>
    <button type="button" class="btn" data-action="backup">Sichern</button></div></section>`;
}

/** Backup-Datei erzeugen und über „Teilen“ (iPhone) oder als Download weitergeben. */
export async function createBackup(exportAll, markBackup, vehicleName) {
  const data = buildBackup(await exportAll());
  const name = backupFileName(vehicleName);
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      await markBackup();
      toast('Backup erstellt');
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') { toast('Backup abgebrochen'); return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  await markBackup();
  toast('Backup heruntergeladen');
}

export async function restoreFromFile(file, restoreAll) {
  let obj;
  try { obj = JSON.parse(await file.text()); } catch { toast('Die Datei konnte nicht gelesen werden'); return; }
  const check = checkBackup(obj);
  if (!check.ok) { toast(check.error); return; }
  const c = check.counts;
  const v = obj.vehicles[0];
  openSheet({
    title: 'Backup wiederherstellen?',
    submitLabel: 'Ersetzen',
    body: `<p style="margin:0">Backup von <b>${esc(v.name)}</b> vom ${fmtDate(obj.exportedAt.slice(0, 10))}:</p>
      <p class="hint" style="margin:0">${de(c.fuels)} Tankungen · ${de(c.log)} Serviceheft-Einträge · ${de(c.tours)} Touren · ${de(c.services)} Wartungspunkte</p>
      <p style="margin:0;color:var(--bad)">Alle Daten, die jetzt auf diesem Gerät sind, werden dabei ersetzt.</p>`,
    async onSubmit() {
      await restoreAll(obj);
      toast('Backup wiederhergestellt');
    },
  });
}

export async function roadTripFromFile(file, importRoadTrip) {
  let parsed;
  try { parsed = fromRoadTrip(await file.text()); } catch (err) { toast(err.message || 'Die Datei konnte nicht gelesen werden'); return; }
  const tourList = parsed.tours.map((t) => `<label class="check"><input type="checkbox" name="tour" value="${esc(t.ref)}" checked><span>${esc(t.name)}<br><span class="faint">${fmtDate(t.from)} – ${fmtDate(t.to)} · ${de(t.endKm - t.startKm)} km</span></span></label>`).join('');
  openSheet({
    title: 'Aus Road Trip übernehmen',
    submitLabel: 'Übernehmen',
    body: `<p style="margin:0">Gefunden${parsed.vehicleName ? ` für <b>${esc(parsed.vehicleName)}</b>` : ''}: ${de(parsed.fuels.length)} Tankungen, ${de(parsed.log.length)} Wartungen, ${de(parsed.tours.length)} Touren.</p>
      ${parsed.skipped.length ? `<p class="hint" style="margin:0">Unvollständig und deshalb nicht übernommen: ${esc(parsed.skipped.join(', '))}. Touren brauchen einen End-Kilometerstand.</p>` : ''}
      ${tourList ? `<div class="field"><label>Welche Touren übernehmen?</label><div class="tour-pick">${tourList}</div></div>
      <p class="hint" style="margin:0">Tipp: Zeiträume wie „Sommer 2026“ sind keine echten Reisen. Die kannst du hier abwählen.</p>` : ''}`,
    async onSubmit(form) {
      const refs = [...form.querySelectorAll('input[name=tour]:checked')].map((x) => x.value);
      const r = await importRoadTrip(parsed, refs);
      toast(`${r.fuels} Tankungen übernommen${r.duplicates ? `, ${r.duplicates} schon vorhanden` : ''}`);
    },
  });
}
