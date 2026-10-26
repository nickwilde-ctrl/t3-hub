// Rückmeldung von Testern: Text mit Version und Gerät zusammenbauen (ohne persönliche Daten).

export const FEEDBACK_KINDS = ['Fehler', 'Idee', 'Unklar', 'Lob'];

/** Kurze Gerätebeschreibung aus dem User-Agent, z. B. „iPhone · iOS 18.1 · als App“. */
export function deviceText(ua = '', standalone = false) {
  let dev = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Gerät';
  const ios = ua.match(/OS (\d+)[_.](\d+)/);
  const and = ua.match(/Android (\d+(?:\.\d+)?)/);
  if ((dev === 'iPhone' || dev === 'iPad') && ios) dev += ` · iOS ${ios[1]}.${ios[2]}`;
  if (dev === 'Android' && and) dev += ` ${and[1]}`;
  return `${dev} · ${standalone ? 'als App' : 'im Browser'}`;
}

/** Nachricht zum Teilen. */
export function feedbackText({ kind, text, where, version, device }) {
  return [`T3 Hub – ${kind}`, where ? `Wo: ${where}` : '', '', text.trim(), '', `(Version ${version} · ${device})`].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0)).join('\n').trim();
}
