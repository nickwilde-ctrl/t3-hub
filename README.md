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
| **Mehr** | Fahrzeugakte, geführte Diagnose, Backup, Feedback, Hinweise und Quellen |

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
| `js/data/diagnosen/` | Diagnosebäume als reine Daten (Prüfschritte, Antworten, Quellenstatus A/B/C/Q) |
| `js/logic/` | Rechenlogik ohne Browser (Verbrauch, Wartungsstatus, Kilometer, Backup, Navigation, Fahrzeugidentität …) |
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

### Geführte Diagnose

Mehr → „Diagnose: Motor dreht, springt nicht an“ führt Schritt für Schritt zur Ursache und gilt nur für VW T3, 2,1 l Wasserboxer, Kennbuchstabe MV, Digifant. Der Inhalt steht als Daten in `js/data/diagnosen/mv-no-start.js`, der Ablauf in `js/logic/diagnose.js` (ohne Oberfläche, mit Tests), die Darstellung in `js/views/diagnose.js`. Ein neuer Diagnosebaum braucht nur eine neue Datei im selben Format. Protokolle liegen in der Liste `diagnoses` (Backup und Wiederherstellen enthalten sie). Quellenstatus je Prüfung: A freigegeben, B vorläufig (noch nicht am VW-Original geprüft), C nie als Grenze, Q qualitativ. Die bisherige Fehlersuche „Motor springt nicht an (Einspritzer)“ unter Elektrik ist beim MV durch diese Diagnose ersetzt, bei anderen Motoren bleibt sie.

### Bekannte offene Punkte

- **Getriebeöl:** Der Hinweis bei „Getriebeöl“ (API GL4, SAE 75W-90) gilt nur für Schaltgetriebe. Das Getriebe steht seit 0.59 in der Fahrzeugakte (`gearbox`), der Hinweis richtet sich aber noch nicht danach. Das wird separat gelöst.
- **Diagnose MV:** Die B-Prüfungen (Z4, Z6, Z7, Z8, K1a, K3, E1, E1a, E2, E3, M1, M2 und ihre Endknoten) sind vorläufig und müssen gegen Reparaturleitfaden und Stromlaufplan Nr. 79 geprüft werden. Kraftstoffdruck und Zündspulenwiderstand sind Status C und werden nie bewertet. Die Hilfeseiten („Ich weiß nicht, wie das geht“) fehlen noch.
- **Syncro** ist kein Getriebe und kommt später gegebenenfalls als eigene Fahrzeugeigenschaft.
