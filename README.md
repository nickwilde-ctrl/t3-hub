# T3 Hub

Digitales Bordbuch für den VW T3: Serviceheft, Tankbuch, Touren und Kosten an einem Ort.
Entwickelt am Referenzfahrzeug **Peanut** (VW T3, Baujahr 1985, 2,1-l-Wasserboxer).

## So funktioniert die App

- **Web-App (PWA):** läuft im Browser und lässt sich auf dem iPhone über „Teilen → Zum Home-Bildschirm“ wie eine App installieren.
- **Daten bleiben auf dem Gerät:** Fahrzeug, Tankungen, Serviceheft und Fotos werden im Browser gespeichert (IndexedDB), nicht auf einem Server und nicht in diesem Repository. Kein Konto, kein Tracking.
- **Backup:** unter Mehr → Daten lässt sich alles als Datei sichern und wiederherstellen. Dort können auch Tankungen aus der App „Road Trip“ übernommen werden.
- **Offline nutzbar:** nach dem ersten Öffnen auch ohne Netz.
- **Ohne Abhängigkeiten:** reines HTML, CSS und JavaScript (ES-Module). Kein Build-Schritt, GitHub Pages veröffentlicht die Dateien direkt.

## Bereiche der App

| Reiter | Inhalt |
|---|---|
| **Home** | Cockpit mit Tachostand, Verbrauch und Wartungsampel; was als Nächstes fällig ist; letzte Tankung |
| **Serviceheft** | *Fällig* (dringendster Punkt, die nächsten, Service eintragen), *Einträge* (nach Jahr, mit Kosten, Fotos und Rechnungen), *Anleitungen* (Reparaturleitfäden mit geprüften Werten, auch Schritt für Schritt für die Werkstatt) |
| **Tanken** | Tankbuch nach der Volltank-Methode, Auswertung, Plausibilitätshinweise |
| **Touren** | Reisen mit Stellplätzen, Karte, Kosten und Tagebuch |
| **Mehr** | Fahrzeugakte, Backup, Feedback, Hinweise und Quellen |

Wartungsintervalle zeigen ihre Herkunft (Wartungsplan, Empfehlung, gesetzlich oder eigener Wert).
Wer eigene Schaltplan-Daten besitzt, kann sie auf dem Gerät laden und bekommt Kabelsuche und Fehlersuche unter Mehr. Solche Daten gehören nie in dieses Repository.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html`, `manifest.webmanifest` | Einstiegsseite und PWA-Angaben |
| `sw.js` | Service Worker für den Offline-Betrieb (Liste der Dateien in `CORE`) |
| `css/` | Gestaltung: Grundwerte (Farben, Schriftgrößen, Ecken) stehen oben in `app.css` |
| `js/app.js` | Navigation und Klick-Verarbeitung |
| `js/nav.js` | Zurück-Taste für Formulare und Vollbild-Fenster |
| `js/db.js`, `js/store.js` | Speicherung (IndexedDB) und Daten des aktiven Fahrzeugs |
| `js/logic/` | Rechenlogik ohne Browser (Verbrauch, Wartungsstatus, Kilometer, Backup, Navigation …) |
| `js/data/` | Anleitungen, Sollwerte je Motor-Kennbuchstabe, Motorfamilien, Fehlersuche |
| `js/views/` | Bildschirm-Bausteine |
| `fonts/`, `vendor/leaflet/` | Schriften und Kartenbibliothek, lokal eingebunden (beim Start keine externen Verbindungen) |
| `tests/` | Tests der Rechenlogik |

## Entwickeln

```sh
npm test          # Tests der Rechenlogik (Node 20+)
npm run serve     # lokal unter http://localhost:8080
```

Regeln:

- Rechenlogik gehört nach `js/logic/` (ohne DOM) und bekommt einen Test in `tests/`.
- Bei jeder Änderung an App-Dateien die Version erhöhen: `VERSION` in `sw.js`, `APP_VERSION` in `js/app.js` und `version` in `package.json`. Neue Dateien in `CORE` (`sw.js`) aufnehmen, sonst fehlen sie offline. `tests/offline.test.js` prüft das.
- Persönliche Daten (Tankungen, Fotos, Fahrzeugschein, Kennzeichen, Schaltpläne) nie ins Repository, es ist öffentlich. Bilder außerhalb von `icons/` ignoriert `.gitignore`.
- Jeder Datensatz hat eine `vehicleId`, damit später mehrere Fahrzeuge möglich sind.
- Farben und Design bleiben: dunkles Cockpit mit Bernstein-Akzent.

## Stand

Die aktuelle Version steht unten auf der Seite „Mehr“.
Live: https://nickwilde-ctrl.github.io/t3-hub/ · Plan und Entscheidungen liegen im Claude-Projekt „Vw T3 App“.
