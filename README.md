# T3 Hub

Digitales Bordbuch für den VW T3: Tankbuch, Wartung, Touren und Kosten an einem Ort.
Entwickelt am Referenzfahrzeug **Peanut** (VW T3, Baujahr 1985, 2,1-l-Wasserboxer).

## So funktioniert die App

- **Web-App (PWA):** läuft im Browser und lässt sich auf dem iPhone über „Teilen → Zum Home-Bildschirm“ wie eine App installieren.
- **Daten bleiben auf dem Gerät:** Tankungen, Wartung und Fotos werden im Browser gespeichert (IndexedDB), nicht auf einem Server und nicht in diesem Repository.
- **Offline nutzbar:** nach dem ersten Öffnen auch ohne Netz.
- **Ohne Abhängigkeiten:** reines HTML, CSS und JavaScript. Kein Build-Schritt, GitHub Pages veröffentlicht die Dateien direkt.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Einstiegsseite |
| `css/app.css` | Gestaltung (Farben als Tokens, dunkles Cockpit-Design) |
| `js/app.js` | Navigation und Bildschirme |
| `js/db.js` | Speicherung (IndexedDB) |
| `js/store.js` | Daten des aktiven Fahrzeugs |
| `js/logic/` | Rechenlogik (Verbrauch, Wartungsintervalle) – ohne Browser testbar |
| `js/views/` | Bildschirm-Bausteine |
| `sw.js` | Service Worker für den Offline-Betrieb |
| `tests/` | Tests der Rechenlogik |

## Entwickeln

```sh
npm test          # Tests der Rechenlogik (Node 20+)
npm run serve     # lokal unter http://localhost:8080
```

Bei jeder Änderung an App-Dateien die `VERSION` in `sw.js` erhöhen, damit Geräte das Update laden.

## Stand

Version 0.2 – Grundgerüst. Plan und Entscheidungen liegen im Claude-Projekt „Vw T3 App“.
