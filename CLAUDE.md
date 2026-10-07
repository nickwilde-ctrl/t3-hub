# Hinweise für Claude

- Nutzer: Max, kein Entwickler. Erklärungen auf Deutsch, einfach und ohne Fachjargon. Oberfläche komplett auf Deutsch.
- Keine Abhängigkeiten, kein Build-Schritt: reines HTML/CSS/JS mit ES-Modulen. npm ist in der Entwicklungsumgebung nicht erreichbar.
- Rechenlogik gehört nach `js/logic/` (ohne DOM) und bekommt Tests in `tests/` (`node --test`).
- Persönliche Daten (Tankungen, Fotos, Fahrzeugschein, Kennzeichen) nie ins Repository schreiben – das Repository ist öffentlich.
- Bei Änderungen an App-Dateien `VERSION` in `sw.js` erhöhen und neue Dateien in `CORE` aufnehmen.
- Datenmodell: jeder Datensatz hat `vehicleId`, damit später mehrere Fahrzeuge möglich sind.
- Farben/Design aus Prototyp v0.1 beibehalten (dunkles Cockpit, Bernstein-Akzent). Der Nutzer will die Farben so lassen.
- Umfang Version 1 und Phasenplan stehen im Claude-Projekt-Dokument `plan-und-entscheidungen.md`.
