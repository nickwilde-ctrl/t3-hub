import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceText, feedbackText } from '../js/logic/feedback.js';

test('Gerätetext', () => {
  assert.equal(deviceText('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)', true), 'iPhone · iOS 18.1 · als App');
  assert.equal(deviceText('Mozilla/5.0 (Linux; Android 14; Pixel 8)', false), 'Android 14 · im Browser');
  assert.equal(deviceText('', false), 'Gerät · im Browser');
});

test('Feedback-Nachricht', () => {
  const t = feedbackText({ kind: 'Fehler', text: ' Tankung lässt sich nicht speichern ', where: 'Tanken', version: '0.28', device: 'iPhone · als App' });
  assert.equal(t, 'T3 Hub – Fehler\nWo: Tanken\n\nTankung lässt sich nicht speichern\n\n(Version 0.28 · iPhone · als App)');
});
