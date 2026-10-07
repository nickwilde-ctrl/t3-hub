// Prüft, dass jede App-Datei im Offline-Speicher des Service Workers steht. Sonst fehlt sie im Funkloch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const list = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? list(path.join(dir, e.name)) : [path.join(dir, e.name)]));

test('alle App-Dateien stehen im Offline-Speicher (CORE in sw.js)', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const files = [...list('js'), ...list('css'), ...list('icons'), 'index.html', 'manifest.webmanifest'];
  const missing = files.filter((f) => !sw.includes(`'./${f.split(path.sep).join('/')}'`));
  assert.deepEqual(missing, []);
});
