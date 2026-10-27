// Fotos und Rechnungen an einem Serviceheft-Eintrag: Auswahl, Vorschau, Ansicht.
import { esc } from '../format.js';
import { readPhoto } from '../photo.js';
import { toast } from './sheet.js';
import { attachmentSummary, MAX_PDF_BYTES } from '../logic/attachments.js';

/** Eingabe-Bereich im Formular. */
export function attachEditor() {
  return `<div class="field"><label>Fotos und Rechnungen</label>
    <div class="att-grid" id="att-grid"></div>
    <div class="part-actions">
      <label class="add att-add">+ Foto<input type="file" accept="image/*" multiple data-att-kind="photo"></label>
      <label class="add att-add">+ Rechnung<input type="file" accept="image/*,application/pdf" multiple data-att-kind="receipt"></label>
    </div>
    <p class="hint" style="margin:0">Fotos werden verkleinert gespeichert. Rechnungen gehen als Foto oder PDF (bis 8 MB).</p></div>`;
}

function thumb(f, i) {
  const isPdf = f.mime === 'application/pdf';
  return `<div class="att" data-att="${i}">
    <button type="button" class="att-view" data-att-view="${i}" aria-label="${esc(f.name || 'Anhang')} ansehen">
      ${isPdf ? `<span class="att-pdf">PDF<small>${esc((f.name || '').slice(0, 14))}</small></span>` : `<img src="${f.data}" alt="">`}
    </button>
    <span class="att-tag">${f.kind === 'receipt' ? 'Rechnung' : 'Foto'}</span>
    <button type="button" class="att-x" data-att-del="${i}" aria-label="Entfernen">×</button></div>`;
}

/**
 * Verdrahtet den Bereich. logId: bestehender Eintrag (lädt vorhandene Anhänge) oder null.
 * Rückgabe: { keep(), added() } – zum Speichern nach dem Eintrag.
 */
export function wireAttachments(form, logId, filesForLog) {
  const grid = form.querySelector('#att-grid');
  let items = []; // { id?, kind, name, mime, data, isNew }
  let ready = !logId; // erst speichern, wenn vorhandene Anhänge geladen sind – sonst würden sie gelöscht
  const render = () => { grid.innerHTML = items.map(thumb).join(''); grid.hidden = !items.length; };
  render();
  if (logId && filesForLog) filesForLog(logId).then((rows) => { rows.sort((a, b) => (a.kind === 'receipt') - (b.kind === 'receipt') || (a.createdAt || '').localeCompare(b.createdAt || '')); items = [...rows.map((r) => ({ ...r, isNew: false })), ...items]; ready = true; render(); });
  else ready = true;

  form.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-att-kind]');
    if (!input || !input.files?.length) return;
    const kind = input.dataset.attKind;
    for (const file of input.files) {
      try {
        if (file.type === 'application/pdf') {
          if (file.size > MAX_PDF_BYTES) { toast('Die PDF ist größer als 8 MB', 'err'); continue; }
          const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
          items.push({ kind, name: file.name, mime: 'application/pdf', data, isNew: true });
        } else {
          const data = await readPhoto(file, kind === 'receipt' ? 2200 : 1600, kind === 'receipt' ? 0.86 : 0.82);
          items.push({ kind, name: file.name || 'Foto', mime: 'image/jpeg', data, isNew: true });
        }
      } catch { toast('Eine Datei konnte nicht gelesen werden', 'err'); }
    }
    input.value = '';
    render();
  });
  grid.addEventListener('click', (e) => {
    const del = e.target.closest('[data-att-del]');
    if (del) { items.splice(+del.dataset.attDel, 1); render(); return; }
    const v = e.target.closest('[data-att-view]');
    if (v) openViewer(items[+v.dataset.attView]);
  });
  return {
    ready: () => ready,
    keep: () => items.filter((f) => !f.isNew).map(({ id, kind, name, mime }) => ({ id, kind, name, mime })),
    added: () => items.filter((f) => f.isNew).map(({ isNew, ...f }) => f),
  };
}

/** Großansicht: Foto im Vollbild, PDF im Systembetrachter. */
export function openViewer(f) {
  if (!f) return;
  if (f.mime === 'application/pdf') {
    const bin = atob(f.data.split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const el = document.createElement('div');
  el.className = 'att-viewer';
  el.innerHTML = `<img src="${f.data}" alt=""><button type="button" class="game-x" aria-label="Schließen">✕</button>`;
  el.onclick = () => el.remove();
  document.body.appendChild(el);
}

export { attachmentSummary };
