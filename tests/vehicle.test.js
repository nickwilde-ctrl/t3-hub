import test from 'node:test';
import assert from 'node:assert/strict';
import { vehicleIdentity, engineFamilyOf, modelText, yearFromModelText, parseYear } from '../js/logic/vehicle.js';
import { ENGINE_FAMILIES, GEARBOXES } from '../js/data/engines.js';
import { servicesFor } from '../js/logic/services.js';
import { checkBackup, BACKUP_FORMAT, BACKUP_VERSION } from '../js/logic/backup.js';
import { demoData } from '../js/logic/demo.js';

test('Fahrzeugidentität: Modell, Baujahr, Motor, Kennbuchstabe, Kraftstoff, Getriebe', () => {
  const id = vehicleIdentity({ year: 1985, engineFamily: 'wbx21', engineCode: 'mv', gearbox: 'manual' });
  assert.deepEqual(id, { model: 'VW T3', year: 1985, familyId: 'wbx21', family: ENGINE_FAMILIES[0], code: 'MV', fuel: 'Benzin', gearbox: 'manual', gearboxLabel: 'Schaltgetriebe' });
});

test('Motorfamilie: aus dem Kennbuchstaben, wenn keine gespeichert ist', () => {
  assert.equal(vehicleIdentity({ engineCode: 'MV' }).familyId, 'wbx21');
  assert.equal(vehicleIdentity({ engineFamily: null, engineCode: ' mv ' }).family.label, 'Wasserboxer 2,1 l');
  // eine gespeicherte Bauart hat Vorrang
  assert.equal(engineFamilyOf({ engineFamily: 'diesel', engineCode: 'MV' }), 'diesel');
});

test('Unbekannter oder fehlender Motor: keine erfundene Familie', () => {
  for (const v of [{ engineCode: 'XX' }, { engineCode: '' }, {}, { engineFamily: 'gibtsnicht' }]) {
    const id = vehicleIdentity(v);
    assert.equal(id.familyId, null);
    assert.equal(id.family, null);
    assert.equal(id.fuel, '');
  }
  assert.equal(engineFamilyOf({ engineCode: 'XX' }), null);
});

test('Alle vier Motorfamilien: Familie und Kraftstoff, auch über jeden Kennbuchstaben', () => {
  assert.equal(ENGINE_FAMILIES.length, 4);
  for (const f of ENGINE_FAMILIES) {
    assert.equal(vehicleIdentity({ engineFamily: f.id }).fuel, f.fuel);
    for (const code of f.codes) {
      const id = vehicleIdentity({ engineCode: code });
      assert.equal(id.familyId, f.id, code);
      assert.equal(id.fuel, f.fuel);
    }
  }
  assert.equal(vehicleIdentity({ engineFamily: 'diesel' }).fuel, 'Diesel');
});

test('Getriebe: fehlend, leer oder unbekannt heißt „nicht eingetragen“', () => {
  assert.equal(GEARBOXES.map((g) => g.id).join(), 'manual,auto');
  for (const gearbox of [undefined, null, '', 'syncro', 'quatsch']) {
    const id = vehicleIdentity({ engineFamily: 'wbx21', gearbox });
    assert.equal(id.gearbox, null);
    assert.equal(id.gearboxLabel, '');
  }
  assert.equal(vehicleIdentity({ gearbox: 'auto' }).gearboxLabel, 'Automatik');
});

test('Altes Fahrzeug ohne neue Felder funktioniert', () => {
  const old = { id: 'a', name: 'Peanut', model: 'VW T3 · Baujahr 1985', engine: 'Wasserboxer 2,1 l · MV', engineFamily: 'wbx21', engineCode: 'MV', facts: [{ k: 'Kraftstoff', v: 'Super' }] };
  const id = vehicleIdentity(old);
  assert.equal(id.year, null, 'das Baujahr wird nicht heimlich aus dem Text übernommen');
  assert.equal(id.familyId, 'wbx21');
  assert.equal(id.gearbox, null);
  // ohne Bauart, nur Text
  assert.equal(vehicleIdentity({ model: 'VW T3', engine: 'irgendwas' }).familyId, null);
});

test('Baujahr: Vorschlag aus altem Text, Eingabe prüfen', () => {
  assert.equal(yearFromModelText('VW T3 · Baujahr 1985'), 1985);
  assert.equal(yearFromModelText('VW T3 Joker 1989'), 1989);
  assert.equal(yearFromModelText('VW T3'), null);
  assert.equal(yearFromModelText('VW T3 · 2005'), null, 'außerhalb der T3-Bauzeit');
  assert.equal(yearFromModelText('Kennzeichen 19851'), null);
  assert.equal(yearFromModelText(undefined), null);
  assert.deepEqual(parseYear(''), { year: null });
  assert.deepEqual(parseYear(' 1985 '), { year: 1985 });
  for (const bad of ['1978', '1993', '85', 'abc', '19.85']) assert.ok(parseYear(bad).error, bad);
  assert.equal(modelText(1985), 'VW T3 · Baujahr 1985');
  assert.equal(modelText(null), 'VW T3');
});

test('Wartungsfilter folgen der aufgelösten Motorfamilie', () => {
  const keys = (v) => servicesFor(engineFamilyOf(v)).map((s) => s.key);
  assert.ok(keys({ engineCode: 'MV' }).includes('coolant'));
  assert.ok(keys({ engineCode: 'CS' }).includes('timingbelt'), 'Diesel über den Kennbuchstaben');
  assert.ok(!keys({ engineCode: 'CS' }).includes('plugs'));
  assert.ok(!keys({ engineCode: 'CT' }).includes('coolant'), 'luftgekühlt ohne Kühlmittel');
  assert.deepEqual(keys({ engineCode: 'XX' }), servicesFor(null).map((s) => s.key), 'unbekannt = alle Standardpunkte');
});

test('Backups: alte ohne neue Felder bleiben gültig, neue mit Getriebe auch', () => {
  const backup = (vehicle) => ({ format: BACKUP_FORMAT, version: BACKUP_VERSION, vehicles: [vehicle], fuels: [], services: [], log: [], tours: [], files: [], guides: [], wiring: [] });
  const sample = backup({ id: 'v', name: 'x' });
  assert.ok(checkBackup(sample).ok);
  assert.ok(checkBackup(backup({ id: 'v', name: 'x', year: 1985, gearbox: 'auto', engineFamily: 'wbx21' })).ok);
});

test('Beispielbus hat eine vollständige Identität', () => {
  const id = vehicleIdentity(demoData('2026-10-27').vehicle);
  assert.equal(id.familyId, 'wbx21');
  assert.equal(id.gearbox, 'manual');
  assert.equal(id.year, 1986);
});
