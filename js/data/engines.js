// Motor-Bauarten des T3 für die Einrichtung. Bewusst nach Familien, nicht nach jedem Kennbuchstaben:
// Wartungspunkte und Anleitungen unterscheiden sich vor allem zwischen diesen Gruppen.

export const ENGINE_FAMILIES = [
  { id: 'wbx21', label: 'Wasserboxer 2,1 l', fuel: 'Benzin', codes: ['MV', 'SS', 'SR', 'DJ'], hint: 'ab 1985' },
  { id: 'wbx19', label: 'Wasserboxer 1,9 l', fuel: 'Benzin', codes: ['DF', 'DG', 'DH', 'GW', 'EY', 'SP'], hint: 'ab 1982' },
  { id: 'luft', label: 'Luftgekühlter Boxer 1,6 / 2,0 l', fuel: 'Benzin', codes: ['CT', 'CU', 'CV', 'CZ'], hint: 'frühe T3 bis 1983' },
  { id: 'diesel', label: 'Diesel / Turbodiesel 1,6 / 1,7 l', fuel: 'Diesel', codes: ['CS', 'KY', 'JX'], hint: 'Saug- und Turbodiesel' },
];

export const familyById = (id) => ENGINE_FAMILIES.find((f) => f.id === id) || null;

/** Familie aus einem Motorkennbuchstaben ableiten (z. B. „mv“ → wbx21). */
export function familyForCode(code = '') {
  const c = String(code).trim().toUpperCase();
  return ENGINE_FAMILIES.find((f) => f.codes.includes(c))?.id || null;
}

/** Kurztext für die Fahrzeugakte, z. B. „Wasserboxer 2,1 l · MV“. */
export function engineText(familyId, code = '') {
  const f = familyById(familyId);
  const c = String(code).trim().toUpperCase();
  return [f ? f.label : '', c].filter(Boolean).join(' · ');
}
