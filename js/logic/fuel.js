// Verbrauchs- und Tankstatistik. Reine Funktionen ohne Browser-Abhängigkeit, damit sie testbar sind.
//
// Regel: Verbrauch wird nur zwischen zwei Volltankungen berechnet. Alle Liter, die nach einer
// Volltankung getankt werden (Teiltankungen eingeschlossen), zählen zur nächsten Volltankung.
// Die allererste Volltankung ist nur Startwert und hat keinen Verbrauch.

/** Sortiert Tankungen nach Kilometerstand (bei Gleichstand nach Datum). */
export function sortFuels(fuels) {
  return [...fuels].sort((a, b) => a.km - b.km || a.date.localeCompare(b.date));
}

/**
 * Berechnet für jede Volltankung den Verbrauch des Abschnitts seit der vorherigen Volltankung.
 * Gibt neue Objekte zurück: { ...fuel, cons, segLiters, segKm } (cons = null, wenn nicht berechenbar).
 */
export function withConsumption(fuels) {
  const out = [];
  let lastFull = null;
  let acc = 0;
  for (const f of sortFuels(fuels)) {
    const row = { ...f, cons: null, segLiters: null, segKm: null };
    if (!lastFull) {
      if (f.full) { lastFull = f; acc = 0; }
      out.push(row);
      continue;
    }
    acc += f.liters;
    if (f.full) {
      const dist = f.km - lastFull.km;
      if (dist > 0) {
        row.cons = (acc / dist) * 100;
        row.segLiters = acc;
        row.segKm = dist;
      }
      lastFull = f;
      acc = 0;
    }
    out.push(row);
  }
  return out;
}

/** Gesamtauswertung über alle Tankungen eines Fahrzeugs. */
export function fuelStats(fuels) {
  const rows = withConsumption(fuels);
  const series = rows.filter((r) => r.cons != null);
  const sumL = series.reduce((a, r) => a + r.segLiters, 0);
  const sumKm = series.reduce((a, r) => a + r.segKm, 0);
  const totalLiters = rows.reduce((a, r) => a + r.liters, 0);
  const totalCost = rows.reduce((a, r) => a + cost(r), 0);
  const km = rows.length ? rows[rows.length - 1].km - rows[0].km : 0;
  // Kosten je 100 km: alles nach der ersten Tankung (die erste füllt nur den Tank für den Start)
  const costAfterFirst = rows.slice(1).reduce((a, r) => a + cost(r), 0);
  const pick = (list, fn, better) => list.reduce((best, r) => (!best || better(fn(r), fn(best)) ? r : best), null);
  return {
    rows,
    series,
    count: rows.length,
    km,
    totalLiters,
    totalCost,
    avgConsumption: sumKm > 0 ? (sumL / sumKm) * 100 : null,
    lastConsumption: series.length ? series[series.length - 1].cons : null,
    avgPrice: totalLiters > 0 ? totalCost / totalLiters : null,
    costPer100: km > 0 ? (costAfterFirst / km) * 100 : null,
    best: pick(series, (r) => r.cons, (a, b) => a < b),
    worst: pick(series, (r) => r.cons, (a, b) => a > b),
    cheapest: pick(rows, (r) => r.pricePerLiter, (a, b) => a < b),
    priciest: pick(rows, (r) => r.pricePerLiter, (a, b) => a > b),
    since: rows.length ? rows[0].date : null,
  };
}

/** Verbrauch je Monat: jede Volltankung zählt mit ihrem Abschnitt zu dem Monat, in dem sie war. */
export function consumptionByMonth(fuels) {
  const map = new Map();
  for (const r of withConsumption(fuels)) {
    if (r.cons == null) continue;
    const key = r.date.slice(0, 7);
    const m = map.get(key) || { liters: 0, km: 0 };
    m.liters += r.segLiters;
    m.km += r.segKm;
    map.set(key, m);
  }
  return [...map.keys()].sort().map((key) => {
    const m = map.get(key);
    return { month: key, consumption: (m.liters / m.km) * 100, km: m.km };
  });
}

export function cost(f) {
  return f.liters * f.pricePerLiter;
}
