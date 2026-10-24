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

import { attachmentSummary, dataUrlBytes } from '../js/logic/attachments.js';

test('ältere Backups ohne Fotos/Rechnungen bleiben gültig', () => {
  const old = { format: 't3hub-backup', version: 1, exportedAt: '2026-10-01T00:00:00Z', vehicles: [{ id: 'v' }], fuels: [], services: [], log: [], tours: [] };
  const r = checkBackup(old);
  assert.equal(r.ok, true);
  assert.equal(r.counts.files, 0);
  const neu = buildBackup({ ...old, files: [{ id: 'f1', logId: 'l1' }] });
  assert.equal(neu.files.length, 1);
  assert.equal(checkBackup(neu).counts.files, 1);
});

test('Kurztext für Anhänge', () => {
  assert.equal(attachmentSummary([{ kind: 'photo' }, { kind: 'photo' }, { kind: 'receipt' }]), '2 Fotos · 1 Rechnung');
  assert.equal(attachmentSummary([]), '');
  assert.equal(dataUrlBytes('data:image/jpeg;base64,AAAA'), 3);
});
