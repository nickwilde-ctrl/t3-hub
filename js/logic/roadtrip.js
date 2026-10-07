// Liest den CSV-Export der iPhone-App „Road Trip“ (Abschnitte Kraftstoff, Wartung, Touren …, Trennzeichen ;).

/** Zerlegt CSV-Text in Zeilen und Felder. Felder in Anführungszeichen dürfen ; und Zeilenumbrüche enthalten. */
export function parseCsv(text, sep = ';') {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const SECTIONS = ['Kraftstoff', 'Wartung', 'Touren', 'Automobil', 'Reifen', 'VALUATIONS', 'Fuel', 'Maintenance', 'Trips'];

/** Gibt { Abschnittsname: [ {Spalte: Wert} ] } zurück. */
export function sections(text) {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const out = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && SECTIONS.includes(r[0].trim())) {
      const name = r[0].trim();
      const header = rows[i + 1] || [];
      const data = [];
      let j = i + 2;
      for (; j < rows.length; j++) {
        const d = rows[j];
        if (d.length === 1 && d[0].trim() === '') break;
        data.push(Object.fromEntries(header.map((h, k) => [h.trim(), (d[k] ?? '').trim()])));
      }
      out[name] = data;
      i = j;
    }
  }
  return out;
}

const num = (s) => (s && s.trim() ? Number(s.replace(/\./g, '').replace(',', '.')) : NaN);
const dec = (s) => (s && s.trim() ? Number(s.replace(',', '.')) : NaN);
/** „2025-10-14 16:22“ → „2025-10-14“ */
export function isoDate(s) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec((s || '').trim());
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}

/**
 * Wandelt einen Road-Trip-Export in T3-Hub-Datensätze (ohne id/vehicleId).
 * @returns {{ vehicleName, fuels, tours, log, skipped }}
 */
export function fromRoadTrip(text) {
  const s = sections(text);
  if (!s.Kraftstoff && !s.Fuel) throw new Error('Das sieht nicht nach einem Road-Trip-Export aus (Abschnitt „Kraftstoff“ fehlt).');
  const skipped = [];
  const fuels = [];
  for (const r of s.Kraftstoff || []) {
    const date = isoDate(r['Datum']);
    let km = num(r['Tachostand (km)']);
    const liters = dec(r['Getankt Betrag']);
    let price = dec(r['Preis pro Einheit']);
    const total = dec(r['Total Preis']);
    if (!(price > 0) && liters > 0 && total > 0) price = Math.round((total / liters) * 1000) / 1000;
    if (Number.isNaN(km) && fuels.length === 0) km = 0; // erste Tankung ohne Kilometerstand = Start bei 0
    if (!date || Number.isNaN(km) || !(liters > 0) || !(price > 0)) { skipped.push(r['Datum'] || '?'); continue; }
    const note = [r['Notiz'], r['Ort'], r['Verkehrsbedingungen']].filter(Boolean).join(', ');
    fuels.push({ date, km, liters, pricePerLiter: price, full: (r['Vollgetankt'] || '').toLowerCase() !== 'partial', tourId: null, note });
  }
  const tours = [];
  for (const r of s.Touren || []) {
    const from = isoDate(r['Start Datum']);
    const endKm = num(r['Ende Tachostand']);
    if (!from || Number.isNaN(endKm)) { skipped.push('Tour ' + (r['Name'] || '?')); continue; }
    const startKm = Number.isNaN(num(r['Start Tachostand (km)'])) ? 0 : num(r['Start Tachostand (km)']);
    tours.push({ ref: r['ID'] || r['Name'], name: r['Name'] || 'Tour', from, to: isoDate(r['Ende Datum']), startKm, endKm, otherCost: 0, note: r['Notiz'] || '' });
  }
  const log = [];
  for (const r of s.Wartung || []) {
    const date = isoDate(r['Datum']);
    if (!date) continue;
    const km = num(r['Tachostand (km)']);
    log.push({ date, km: Number.isNaN(km) ? null : km, title: r['Beschreibung'] || 'Service (aus Road Trip)', category: 'Wartung', cost: dec(r['Kosten']) || 0, note: r['Notiz'] || '' });
  }
  const vehicleName = (s.Automobil && s.Automobil[0] && s.Automobil[0]['Name']) || '';
  return { vehicleName, fuels, tours, log, skipped };
}

/** Ordnet jede Tankung der kürzesten passenden Tour zu (Datum und km im Bereich). Gibt Tour-Index je Tankung zurück. */
export function matchTours(fuels, tours) {
  return fuels.map((f) => {
    let best = -1;
    tours.forEach((t, i) => {
      const ok = f.date >= t.from && (!t.to || f.date <= t.to) && f.km >= t.startKm && f.km <= t.endKm;
      if (ok && (best < 0 || t.endKm - t.startKm < tours[best].endKm - tours[best].startKm)) best = i;
    });
    return best;
  });
}

/** Dubletten erkennen: gleiche Tankung (Datum, km, Liter) schon vorhanden? */
export const fuelKey = (f) => `${f.date}|${f.km}|${Math.round(f.liters * 100)}`;
