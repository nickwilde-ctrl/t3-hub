// Chronik: Tankungen, Serviceheft-Einträge und Touren in einer gemeinsamen Zeitleiste.
// Reine Funktion ohne DOM. Es wird nichts gespeichert – die Chronik liest nur vorhandene Daten.

/** Alle Ereignisse, neueste zuerst. Bei gleichem Datum zählt der höhere Kilometerstand als neuer. */
export function timeline({ fuels = [], log = [], tours = [] }) {
  const items = [
    ...fuels.map((f) => ({ type: 'fuel', id: f.id, date: f.date, km: f.km ?? null, liters: f.liters, full: !!f.full, amount: f.liters * f.pricePerLiter })),
    ...log.map((l) => ({ type: 'log', id: l.id, date: l.date, km: l.km ?? null, title: l.title, category: l.category || 'Wartung', amount: l.cost || null })),
    ...tours.map((t) => ({ type: 'tour', id: t.id, date: t.from, km: t.startKm ?? null, title: t.name, to: t.to || null, amount: null })),
  ].filter((x) => x.date);
  return items.sort((a, b) => b.date.localeCompare(a.date) || (b.km ?? -1) - (a.km ?? -1));
}

/** Nach Jahr gruppiert: [{ year, items }], neuestes Jahr zuerst. */
export function timelineByYear(items) {
  const years = [];
  for (const x of items) {
    const year = x.date.slice(0, 4);
    if (!years.length || years[years.length - 1].year !== year) years.push({ year, items: [] });
    years[years.length - 1].items.push(x);
  }
  return years;
}

/** Für die Startseite: das jeweils neueste Ereignis je Bereich (Tanken, Serviceheft, Tour), neueste zuerst. */
export function latestPerType(items) {
  const seen = new Set();
  return items.filter((x) => !seen.has(x.type) && seen.add(x.type));
}
