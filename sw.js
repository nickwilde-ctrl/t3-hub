// Service Worker: macht die App offline nutzbar.
// Eigene Dateien: erst aus dem Netz (damit Updates sofort ankommen), bei Funkloch aus dem Speicher.
// Schriften von Google: einmal laden, dann aus dem Speicher.
// Bei jeder Änderung an den App-Dateien VERSION erhöhen.
const VERSION = 'v0.4.0';
const CACHE = 't3hub-' + VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/format.js',
  './js/logic/fuel.js',
  './js/logic/services.js',
  './js/views/cockpit.js',
  './js/views/home.js',
  './js/views/sheet.js',
  './js/views/vehicle.js',
  './js/views/charts.js',
  './js/views/tanken.js',
  './js/photo.js',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'no-cache' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('t3hub-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isFont) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }
  if (url.origin !== location.origin) return;
  // cache: 'no-cache' fragt GitHub jedes Mal, ob es eine neuere Datei gibt (sonst hält das iPhone sie bis zu 10 Min.)
  e.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
  );
});
