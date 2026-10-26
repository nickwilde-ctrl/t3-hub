// Beispielbus zum Ausprobieren: erfundene, aber realistische Daten relativ zum heutigen Tag.
// Reine Funktion ohne Speicher – IDs vergibt der Aufrufer.

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (today, n) => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - n); return iso(d); };

/** Liefert { vehicle, fuels, log, tours, serviceLast } für den Beispielbus. */
export function demoData(today = iso(new Date())) {
  const km = 142380;
  // Volltankungen: Strecke und Liter ergeben ca. 12,5–14,5 l/100 km
  const fills = [
    [150, 396, 52.1, 1.739], [128, 371, 50.4, 1.759], [104, 402, 55.8, 1.799], [83, 388, 51.2, 1.829],
    [60, 412, 57.9, 1.779], [38, 365, 47.6, 1.849], [19, 381, 50.9, 1.819], [4, 357, 49.3, 1.789],
  ];
  let k = km - fills.reduce((s, f) => s + f[1], 0);
  const fuels = fills.map(([ago, dist, liters, price]) => {
    k += dist;
    return { date: daysAgo(today, ago), km: k, liters, pricePerLiter: price, full: true, note: '' };
  });
  fuels.unshift({ date: daysAgo(today, 172), km: km - fills.reduce((s, f) => s + f[1], 0), liters: 44.0, pricePerLiter: 1.719, full: true, note: '' });
  const tourFrom = daysAgo(today, 41), tourTo = daysAgo(today, 36);
  const startKm = fuels[4].km - 120;
  return {
    vehicle: {
      name: 'Beispiel-Bulli',
      model: 'VW T3 · Baujahr 1986',
      year: 1986,
      plate: '',
      engine: 'Wasserboxer 2,1 l · MV',
      engineFamily: 'wbx21',
      engineCode: 'MV',
      photo: null,
      facts: [{ k: 'Farbe', v: 'Marsalarot' }, { k: 'Reifen', v: '185 R 14 C' }],
      mods: [{ name: 'Dachträger', kind: 'Anbau', status: 'frei', date: '', note: 'mit Alu-Kiste' }],
      demo: true,
    },
    fuels,
    log: [
      { date: daysAgo(today, 62), km: km - 2150, title: 'Ölwechsel + Ölfilter', category: 'Wartung', serviceKey: 'oil', cost: 58.4, note: 'Selbst gemacht',
        parts: [{ name: 'Motoröl 10W-40, VW 501 01', maker: '', oe: '', shop: '', sku: '', qty: 5, price: 8.9, url: '', note: '' },
          { name: 'Ölfilter', maker: 'Mahle', oe: '070115561', shop: '', sku: 'OC 47', qty: 1, price: 11.9, url: '', note: '' },
          { name: 'Dichtring Ölablassschraube', maker: '', oe: '', shop: '', sku: '', qty: 1, price: 2.0, url: '', note: '' }] },
      { date: daysAgo(today, 240), km: km - 6900, title: 'Wasserpumpe getauscht', category: 'Reparatur', cost: 189, note: 'Pumpe hat getropft' },
      { date: daysAgo(today, 410), km: km - 9800, title: 'Bremsflüssigkeit', category: 'Wartung', serviceKey: 'brakefluid', cost: 45, note: 'Werkstatt' },
      { date: daysAgo(today, 300), km: km - 8100, title: 'Hauptuntersuchung (HU)', category: 'Wartung', serviceKey: 'hu', cost: 139, note: 'Ohne Mängel' },
    ],
    tours: [{
      name: 'Herbst an der Ostsee', from: tourFrom, to: tourTo, startKm, endKm: startKm + 812, otherCost: 0, note: '',
      expenses: [
        { date: tourFrom, category: 'Camping / Stellplatz', amount: 24, note: 'Stellplatz am Deich' },
        { date: daysAgo(today, 39), category: 'Camping / Stellplatz', amount: 18, note: '' },
        { date: daysAgo(today, 38), category: 'Essen', amount: 36.5, note: 'Fischbrötchen für alle' },
      ],
      journal: [{ date: daysAgo(today, 39), place: 'Fehmarn', text: 'Wind, Sonne, Kaffee aus der Schiebetür. Der Bus lief wie ein Uhrwerk.' }],
      stops: [],
    }],
    serviceLast: {
      plugs: { km: km - 14000, date: daysAgo(today, 700) },
      ignition: { km: km - 14000, date: daysAgo(today, 700) },
      airfilter: { km: km - 21000, date: daysAgo(today, 900) },
      fuelfilter: { km: km - 21000, date: daysAgo(today, 900) },
      gearoil: { km: km - 30000, date: daysAgo(today, 1300) },
      coolant: { km: km - 9000, date: daysAgo(today, 690) }, // bald fällig
    },
  };
}
