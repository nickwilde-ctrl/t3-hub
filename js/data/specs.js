// Sollwerte je Motorkennbuchstabe („Datenblatt“). Nur Zahlen aus Reparaturhandbüchern bzw. T3-Pedia, eigene Darstellung.
// Quellen: „Jetzt helfe ich mir selbst“ (Korp), Technische Daten S. 266/267 = JH · „So wird’s gemacht“ (Etzold) = SWG · T3-Pedia = TP.

const WBX_COMMON = [
  ['Ölmenge', '4,5 l mit Filter, 4,0 l ohne', 'SWG, JH'],
  ['Öldruck (80 °C Öl, 2000/min)', 'mindestens 2,0 bar', 'JH'],
  ['Ölverbrauch', 'höchstens 1,5 l je 1000 km', 'JH'],
  ['Kühlmittel', '17,5 l (−25 °C: 7,0 l Konzentrat + 10,5 l Wasser)', 'SWG'],
  ['Thermostat', 'öffnet ca. 85 °C, ganz offen ca. 105 °C, Hub mind. 8 mm', 'JH'],
  ['Kühlerlüfter', 'Stufe 1 ein 93–98 °C / aus 88–93 °C · Stufe 2 ein 100–105 °C / aus 95–100 °C (Stufe 2 nicht beim 44-kW-Motor)', 'JH'],
  ['Zündkerzen', '25 Nm', 'SWG'],
];

const DIESEL_COMMON = [
  ['Ölmenge', 'neuer Peilstab (ab 2/84): 4,5 l mit Filter, 4,0 l ohne · alter: 4,0 / 3,5 l', 'JH'],
  ['Ölverbrauch', 'höchstens 1,5 l je 1000 km', 'JH'],
  ['Kompression', '34 bar · mindestens 28 bar · Unterschied zwischen Zylindern höchstens 5 bar', 'JH'],
  ['Ventilspiel (warm)', 'Einlass 0,20–0,30 mm · Auslass 0,40–0,50 mm', 'JH'],
  ['Förderbeginn', '0,83–0,97 mm Hub, einstellen auf 0,90 ±0,02 mm', 'JH'],
  ['Leerlauf', '820 ±50 U/min', 'JH'],
  ['Thermostat', 'öffnet ca. 85 °C, ganz offen ca. 105 °C, Hub mind. 7 mm', 'JH'],
  ['Kühlerlüfter', 'Stufe 1 ein 93–98 °C / aus 88–93 °C · Stufe 2 ein 100–105 °C / aus 95–100 °C', 'JH'],
  ['Cetanzahl', 'mindestens 45', 'JH'],
];

const PETROL_COMPRESSION = ['Kompression', '10–13 bar · mindestens 8 bar · Unterschied höchstens 3 bar', 'JH'];
const INJECTION_PRESSURE = ['Kraftstoffdruck', 'ca. 2,0 bar (Unterdruckschlauch am Regler drauf), ca. 2,5 bar (abgezogen)', 'JH'];

export const SPECS = {
  DF: { title: '1,9 l Vergaser', power: '44 kW / 60 PS', rows: [
    ['Leerlauf', '750 ±50 U/min ohne Leerlaufstabilisierung, 800 ±50 mit', 'JH'],
    ['Zündzeitpunkt', '5° ±1° NACH OT bei 750 ±50 U/min', 'SWG'],
    PETROL_COMPRESSION,
    ['Kraftstoff', 'ROZ 91 (Normal)', 'JH'],
    ['Vergaser', 'Solex 34 PICT-5 · CO 1,5 ±0,5 %', 'JH'],
  ] },
  DG: { title: '1,9 l Registervergaser', power: '57 kW / 78 PS', rows: [
    ['Leerlauf', 'Vergaser 2E3: 900 ±50 U/min · 2E4: 850–950 U/min', 'JH'],
    ['Zündzeitpunkt', '5° ±1° vor OT bei 900 ±50 U/min', 'SWG'],
    PETROL_COMPRESSION,
    ['Kraftstoff', 'ROZ 91 (Normal)', 'JH'],
    ['Vergaser', 'Pierburg 2E3 oder 2E4 · CO 1,5 ±0,5 %', 'JH'],
  ] },
  SP: { title: '1,9 l Registervergaser (Schweiz)', power: '54 kW / 73 PS', rows: [
    ['Leerlauf', 'Vergaser 2E3: 900 ±50 U/min · 2E4: 850–950 U/min', 'JH'],
    ['Zündzeitpunkt', '5° vor OT', 'TP'],
    PETROL_COMPRESSION,
    ['Kraftstoff', 'ROZ 91 (Normal)', 'JH'],
  ] },
  EY: { title: '1,9 l Vergaser (schwacher Sprit)', power: '41 kW / 56 PS', rows: [
    ['Zündzeitpunkt', '5° ±1° vor OT bei 850 ±50 U/min', 'SWG'],
    ['Kraftstoff', 'ROZ 83', 'TP'],
  ] },
  GW: { title: '1,9 l Einspritzer (Digijet)', power: '66 kW / 90 PS', rows: [
    ['Leerlauf', '880 ±50 U/min', 'SWG'],
    ['Zündzeitpunkt', '10° ±1° vor OT bei 880 ±50 U/min (bleifrei ROZ 95: 5°)', 'SWG'],
    PETROL_COMPRESSION,
    ['Kraftstoff', 'ROZ 98 (Super Plus)', 'JH'],
    INJECTION_PRESSURE,
  ] },
  DH: { title: '1,9 l Einspritzer mit Kat (USA/Kanada)', power: '61 kW / 83 PS', rows: [
    PETROL_COMPRESSION,
    INJECTION_PRESSURE,
  ] },
  MV: { title: '2,1 l Einspritzer mit Kat (Digifant)', power: '70 kW / 95 PS', rows: [
    ['Leerlauf', '880 ±50 U/min', 'SWG'],
    ['Zündzeitpunkt', '5° ±1° vor OT bei 2250 ±250 U/min', 'SWG'],
    PETROL_COMPRESSION,
    ['Kraftstoff', 'ROZ 91 (Normal)', 'JH'],
    INJECTION_PRESSURE,
  ] },
  SS: { title: '2,1 l Einspritzer mit Kat (Digifant)', power: '68 kW / 92 PS', rows: [
    ['Leerlauf', '880 ±50 U/min', 'SWG'],
    ['Zündzeitpunkt', '5° ±1° vor OT bei 2250 ±250 U/min', 'SWG'],
    PETROL_COMPRESSION,
    ['Kraftstoff', 'ROZ 91 (Normal)', 'JH'],
    INJECTION_PRESSURE,
  ] },
  SR: { title: '2,1 l Einspritzer mit Kat (Schweiz)', power: '64 kW / 87 PS', rows: [
    ['Zündzeitpunkt', '5° vor OT', 'TP'],
    PETROL_COMPRESSION,
    ['Kraftstoff', 'ROZ 91 (Normal)', 'JH'],
    INJECTION_PRESSURE,
  ] },
  DJ: { title: '2,1 l Einspritzer (Digijet)', power: '82 kW / 112 PS', rows: [
    ['Leerlauf', '800 ±50 U/min', 'SWG'],
    ['Zündzeitpunkt', '10° ±1° vor OT bei 800 ±50 U/min (bleifrei ROZ 95: 5°)', 'SWG'],
    ['Kompression', '11–14 bar · mindestens 8 bar · Unterschied höchstens 3 bar', 'JH'],
    ['Kraftstoff', 'ROZ 98 (Super Plus)', 'JH'],
    INJECTION_PRESSURE,
  ] },
  CS: { title: '1,6 l Diesel', power: '37 kW / 50 PS', rows: [
    ['Öldruck (80 °C Öl, 2000/min)', 'mindestens 2,0 bar', 'JH'],
    ['Höchstdrehzahl', '4800 ±50 U/min', 'JH'],
    ['Abspritzdruck Düsen', 'neu 130–138 bar · Verschleißgrenze 120 bar', 'JH'],
  ] },
  KY: { title: '1,7 l Diesel', power: '42 kW / 57 PS', rows: [
    ['Öldruck (80 °C Öl, 2000/min)', 'mindestens 1,1 bar', 'JH'],
    ['Höchstdrehzahl', '4800 ±50 U/min', 'JH'],
    ['Abspritzdruck Düsen', 'neu 130–138 bar · Verschleißgrenze 120 bar', 'JH'],
  ] },
  JX: { title: '1,6 l Turbodiesel', power: '51 kW / 70 PS', rows: [
    ['Öldruck (80 °C Öl, 2000/min)', 'mindestens 1,1 bar', 'JH'],
    ['Höchstdrehzahl', '5100 ±50 U/min', 'JH'],
    ['Abspritzdruck Düsen', 'neu 155–163 bar · Verschleißgrenze 140 bar', 'JH'],
  ] },
};

export const SOURCE_NAMES = {
  JH: '„Jetzt helfe ich mir selbst“',
  SWG: '„So wird’s gemacht“',
  TP: 'T3-Pedia',
};

/** Datenblatt für Kennbuchstabe und Bauart. Gibt { title, power, rows } oder null. */
export function specsFor(code = '', family = '') {
  const c = String(code).trim().toUpperCase();
  const s = SPECS[c];
  const common = family === 'diesel' || ['CS', 'KY', 'JX'].includes(c) ? DIESEL_COMMON
    : family?.startsWith('wbx') || (s && !['CS', 'KY', 'JX'].includes(c)) ? WBX_COMMON : null;
  if (!s && !common) return null;
  return { code: s ? c : '', title: s?.title || '', power: s?.power || '', rows: [...(s?.rows || []), ...(common || [])] };
}
