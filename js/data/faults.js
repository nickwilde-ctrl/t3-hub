// Fehlersuche Elektrik: eigene Texte, allgemeines T3-Wissen. Sicherungsnummern laut Relaisplatte (Modelljahr 1991).
// q = Suchbegriff, mit dem die passenden Kabel aus den eigenen Plandaten gezeigt werden.

export const FAULTS = [
  { id: 'blinker', icon: 'blink', title: 'Blinker geht nicht oder blinkt zu schnell', short: 'Sicherung, Birne, Blinkrelais', steps: [
    { t: 'Blinkt es auf einer Seite doppelt so schnell?', d: 'Dann ist fast immer eine Birne auf dieser Seite durch. Vorn, hinten und seitlich nachsehen.' },
    { t: 'Geht der Warnblinker?', d: 'Warnblinker geht, normaler Blinker nicht: Das Problem liegt bei Klemme 15 (Zündungsplus). Sicherung S19 prüfen.', q: 'Klemme 15 Blinker' },
    { t: 'Sicherungen prüfen', d: 'S19 (10 A, Blinker) und S4 (15 A, Warnblinker) in der Relaisplatte.', q: 'S19' },
    { t: 'Blinkrelais tauschen', d: 'Sitzt auf Relaisplatz 12. Klickt es gar nicht, ist es oft das Relais selbst.', q: 'Blinkrelais' },
    { t: 'Masse an der Rückleuchte', d: 'Nur hinten tot? Massepunkte 63 (links) und 64 (rechts) am Lampenträger sauber machen.', q: 'Blinker hinten' },
  ] },
  { id: 'licht', icon: 'light', title: 'Licht geht auf einer Seite nicht', short: 'Abblend-, Fern-, Stand- oder Rücklicht', steps: [
    { t: 'Birne prüfen', d: 'Am einfachsten zuerst: Birne raus, Glühfaden ansehen.' },
    { t: 'Sicherung der Seite prüfen', d: 'Jede Seite hat eigene Sicherungen: Abblendlicht S21 / S22, Fernlicht S10 / S9, Stand- und Rücklicht S7 / S8.', q: 'Licht Sicherung' },
    { t: 'Strom am Stecker messen', d: 'Licht an, Multimeter auf 20 V: Rot an das Plus-Kabel, Schwarz an Masse. Um 12 V heißt: Strom kommt an.', q: 'Scheinwerfer' },
    { t: 'Masse prüfen', d: 'Kommt Strom an und die Birne ist gut, fehlt die Masse. Vorn Massepunkt 30, hinten Massepunkt 12.', q: 'Masse Scheinwerfer' },
  ] },
  { id: 'luefter', icon: 'fan', title: 'Kühlerlüfter springt nicht an', short: 'Thermoschalter, Sicherung S1, Relais', steps: [
    { t: 'Sicherung S1 (30 A) prüfen', d: 'Ohne sie läuft der Lüfter in keiner Stufe.', q: 'S1 Kühlerlüfter' },
    { t: 'Thermoschalter überbrücken', d: 'Stecker am Thermoschalter abziehen, die Kontakte für Plus (rot-weiß) und Stufe 1 (rot-schwarz) mit einem Stück Kabel verbinden. Läuft der Lüfter jetzt, ist der Thermoschalter defekt.', q: 'Thermoschalter' },
    { t: 'Nur Stufe 2 fehlt?', d: 'Dann das Relais auf Relaisplatz 5 prüfen.', q: 'J101' },
    { t: 'Masse am Lüfter', d: 'Braunes Kabel zum Massepunkt 30.', q: 'Kühlerlüfter V7' },
  ] },
  { id: 'anzeigen', icon: 'gauge', title: 'Tank- oder Temperaturanzeige spinnt', short: 'Geber, Masse, Spannungskonstanter', steps: [
    { t: 'Spinnen beide Anzeigen gleichzeitig?', d: 'Dann ist meist der Spannungskonstanter hinten im Tacho schuld, nicht die Geber.', q: 'J6' },
    { t: 'Nur Tank falsch', d: 'Massepunkt 29 am Tankgeber sauber machen, dann den Geber selbst prüfen.', q: 'Tankgeber' },
    { t: 'Nur Temperatur falsch', d: 'Kabel und Stecker am Temperaturgeber für die Anzeige prüfen.', q: 'Kühlmittel G2' },
    { t: 'Geber-Test', d: 'Kabel vom Geber abziehen und kurz an Masse halten: Die Anzeige muss auf Anschlag gehen. Tut sie das, ist der Geber defekt.' },
  ] },
  { id: 'anlasser', icon: 'start', title: 'Anlasser dreht nicht', short: 'Batterie, Masse, Startsignal', steps: [
    { t: 'Batteriespannung messen', d: 'Unter 12,2 V ist die Batterie zu schwach. Erst laden.' },
    { t: 'Massebänder prüfen', d: 'Masseband Batterie → Karosserie und Getriebe → Karosserie. Locker oder gammelig: Es klackt, aber nichts dreht.', q: 'Masseband' },
    { t: 'Startsignal messen', d: 'Am Anlasser Klemme 50 (rot-schwarz): Beim Starten müssen dort 12 V ankommen.', q: 'Klemme 50' },
    { t: 'Kommt Strom, dreht aber nichts', d: 'Dann ist meist der Anlasser oder sein Magnetschalter das Problem.' },
  ] },
  { id: 'lima', icon: 'batt', title: 'Batterielampe leuchtet während der Fahrt', short: 'Keilriemen, D+, Regler', steps: [
    { t: 'Keilriemen prüfen', d: 'Gerissen oder rutscht? Dann dreht die Lichtmaschine nicht. Achtung: Der Riemen treibt auch die Wasserpumpe an – sofort anhalten.' },
    { t: 'Ladespannung messen', d: 'Motor im Leerlauf, an der Batterie messen: 13,8 bis 14,4 V ist gut. Darunter lädt sie nicht.' },
    { t: 'D+ Kabel prüfen', d: 'Dünnes blaues Kabel an der Lichtmaschine. Abgerutscht oder gebrochen?', q: 'D+' },
    { t: 'Regler oder Kohlen', d: 'Alles in Ordnung, aber keine Ladung: Spannungsregler oder Schleifkohlen in der Lichtmaschine.' },
  ] },
  { id: 'pumpe', icon: 'fuel', title: 'Motor springt nicht an (Einspritzer)', short: 'Benzinpumpe, Relais, Zündung', steps: [
    { t: 'Hörst du die Benzinpumpe?', d: 'Beim Starten muss die Pumpe hinten summen. Bleibt es still, weiter mit dem Pumpenrelais.', q: 'Kraftstoffpumpe' },
    { t: 'Relais in der Relaisdose im Motorraum', d: 'Kraftstoffpumpenrelais und Stromversorgungsrelais. Ein Tausch gegen ein gleiches Relais ist der schnellste Test.', q: 'Relaisdose' },
    { t: 'Kommt ein Zündfunke?', d: 'Zündkerze raus, an Masse halten, starten lassen. Kein Funke: Zündspule und Hallgeber prüfen.', q: 'Zündspule' },
    { t: 'Masse des Steuergeräts', d: 'Massepunkte am Steuergerät und am Motorblock sauber und fest?', q: 'Masse Digifant' },
  ] },
  { id: 'hupe', icon: 'horn', title: 'Hupe geht nicht', short: 'Sicherung S16, Masse am Lenkgetriebe', steps: [
    { t: 'Sicherung S16 (15 A)', d: 'In der Relaisplatte.', q: 'S16' },
    { t: 'Masse am Lenkgetriebe', d: 'Die Hupe schaltet über Masse. Die Masseleitung am Lenkgetriebe ist eine typische Schwachstelle.', q: 'Hupenknopf' },
    { t: 'Hupe direkt testen', d: 'Hupe mit einem Kabel direkt an Plus und Masse anschließen. Bleibt sie still, ist sie defekt.' },
  ] },
  { id: 'bremslicht', icon: 'brake', title: 'Bremslicht geht nicht', short: 'Sicherung S2, Bremslichtschalter', steps: [
    { t: 'Sicherung S2 (15 A)', d: 'Das Bremslicht hat immer Strom, auch ohne Zündung.', q: 'S2' },
    { t: 'Bremslichtschalter', d: 'Zwei Schalter am Hauptbremszylinder. Stecker abziehen und die beiden Kontakte verbinden: Leuchtet es jetzt, ist der Schalter defekt.', q: 'Bremslichtschalter' },
    { t: 'Birnen und Masse hinten', d: 'Massepunkte 63 und 64 an den Lampenträgern.', q: 'Bremsleuchte' },
  ] },
  { id: 'wischer', icon: 'wiper', title: 'Scheibenwischer geht nicht oder bleibt stehen', short: 'Sicherung, Endabschaltung, Relais', steps: [
    { t: 'Sicherungen S11 (15 A) und S17 (10 A)', d: 'S17 ist nur für die Ruhestellung. Fehlt sie, bleiben die Wischer irgendwo stehen.', q: 'Scheibenwischer' },
    { t: 'Geht nur Intervall nicht?', d: 'Relais auf Relaisplatz 10 tauschen.', q: 'Intervall' },
    { t: 'Masse am Wischermotor', d: 'Braunes Kabel zum Massepunkt 30.', q: 'Masse Wischermotor' },
  ] },
];
