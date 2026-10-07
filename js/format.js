// Deutsche Zahlen- und Datumsformate, HTML-Escaping.

export const de = (n, digits = 0) =>
  n == null || Number.isNaN(n) ? '–' : n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const eur = (n) => de(n, 0) + ' €';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const fmtDate = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';

export const fmtMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });

export const todayIso = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
