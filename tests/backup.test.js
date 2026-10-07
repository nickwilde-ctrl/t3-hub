import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, checkBackup, daysSince, backupFileName } from '../js/logic/backup.js';

const data = { vehicles: [{ id: 'v1', name: 'Testbus' }], fuels: [{ id: 'f1' }], services: [], log: [], tours: [] };

test('Backup bauen und prüfen', () => {
  const b = buildBackup(data, new Date('2026-10-07T12:00:00Z'));
  const r = checkBackup(JSON.parse(JSON.stringify(b)));
  assert.equal(r.ok, true);
  assert.equal(r.counts.fuels, 1);
});

test('falsche Dateien werden erkannt', () => {
  assert.equal(checkBackup({ foo: 1 }).ok, false);
  assert.match(checkBackup({ ...buildBackup(data), version: 99 }).error, /neueren Version/);
  assert.match(checkBackup({ ...buildBackup(data), fuels: [{}] }).error, /beschädigt/);
  assert.match(checkBackup({ ...buildBackup(data), vehicles: [] }).error, /kein Fahrzeug/);
});

test('Tage seit Backup und Dateiname', () => {
  assert.equal(daysSince(null), null);
  assert.equal(daysSince('2026-09-07T12:00:00Z', new Date('2026-10-07T12:00:00Z')), 30);
  assert.equal(backupFileName('Peanut', new Date('2026-10-07T12:00:00Z')), 'T3-Hub-Backup_Peanut_2026-10-07.json');
});
