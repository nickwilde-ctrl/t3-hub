import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, fromRoadTrip, matchTours, isoDate } from '../js/logic/roadtrip.js';
import { withConsumption } from '../js/logic/fuel.js';

// Ausgedachte Beispieldaten im Format des Road-Trip-Exports (keine echten Daten)
const SAMPLE = `ROAD TRIP CSV ";,"
Version;Language
2000;de


Kraftstoff
Tachostand (km);Tagestachostand;Datum;Getankt Betrag;Getankt Einheiten;Preis pro Einheit;Total Preis;Vollgetankt;l/100 km;Notiz;Oktan;Ort;Zahlung;Verkehrsbedingungen;Initialisieren;Kategorien;Flags
;;"2025-1-5 10:00";50;L;1,800;90;;;;"98";"Musterstadt";;;Reset;;9
400;400;"2025-1-20 9:30";48;L;1,750;84;;12;;;;;;;;0
700;300;"2025-2-1 18:00";10;L;1,700;17;Partial;13;;;;;;;;0
900;200;"2025-2-3 8:15";55;L;1,720;94,6;;13;"Autobahn";;;;"Autobahn 100km/h";;;0


Wartung
Beschreibung;Datum;Tachostand (km);Kosten;Notiz;Ort;Typ
Ölwechsel;"2025-1-15 9:00";350;59,90;;;Service


Touren
Name;Start Datum;Start Tachostand (km);Ende Datum;Ende Tachostand;Notiz;Distanz;ID
"Winterreise";"2025-1-30";650;"2025-2-4";950;;300;3
"Offen";"2025-3-1";;;;;;4


Automobil
Name;Tachostand;Verbrauch;Notiz;Tankinhalt
"Testbus";"km";"l/100 km";"Kfz-Kennzeichen:
VIN:
Notiz:
";60


`;

test('CSV mit Zeilenumbrüchen in Anführungszeichen', () => {
  const rows = parseCsv('a;"b\nc";d\n1;2;3');
  assert.deepEqual(rows, [['a', 'b\nc', 'd'], ['1', '2', '3']]);
});

test('Datum normalisieren', () => {
  assert.equal(isoDate('2025-1-5 10:00'), '2025-01-05');
});

test('Road-Trip-Export einlesen', () => {
  const r = fromRoadTrip(SAMPLE);
  assert.equal(r.vehicleName, 'Testbus');
  assert.equal(r.fuels.length, 4);
  assert.equal(r.fuels[0].km, 0);
  assert.equal(r.fuels[2].full, false);
  assert.equal(r.fuels[3].note, 'Autobahn, Autobahn 100km/h');
  assert.equal(r.tours.length, 1); // „Offen“ hat kein Ende
  assert.equal(r.log[0].cost, 59.9);
  const cons = withConsumption(r.fuels).map((f) => f.cons && f.cons.toFixed(2));
  assert.deepEqual(cons, [null, '12.00', null, '13.00']);
  const idx = matchTours(r.fuels, r.tours);
  assert.deepEqual(idx, [-1, -1, 0, 0]);
});

test('kein Road-Trip-Export → verständlicher Fehler', () => {
  assert.throws(() => fromRoadTrip('Datum;Liter\n1;2'), /Road-Trip-Export/);
});
