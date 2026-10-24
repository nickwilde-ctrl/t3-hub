// Fotos und Rechnungen: kleine reine Hilfsfunktionen (testbar).

export const MAX_PDF_BYTES = 8 * 1024 * 1024;

/** Kurztext für die Serviceheft-Liste, z. B. „2 Fotos · 1 Rechnung“. */
export function attachmentSummary(list = []) {
  const photos = list.filter((a) => a.kind !== 'receipt').length;
  const receipts = list.filter((a) => a.kind === 'receipt').length;
  const parts = [];
  if (photos) parts.push(photos === 1 ? '1 Foto' : `${photos} Fotos`);
  if (receipts) parts.push(receipts === 1 ? '1 Rechnung' : `${receipts} Rechnungen`);
  return parts.join(' · ');
}

/** Ungefähre Größe eines data:-Links in Bytes (für Speicher-Hinweise). */
export const dataUrlBytes = (url = '') => Math.round(((url.split(',')[1] || '').length * 3) / 4);
