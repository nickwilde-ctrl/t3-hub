// Mitgelieferte Reparaturleitfäden. Eigene Texte (nicht aus Büchern übernommen).
// Werte mit check: false sind ungeprüft und müssen gegen ein Reparaturhandbuch geprüft werden.
// serviceKey verknüpft eine Anleitung mit einem Wartungspunkt (siehe js/logic/services.js).

export const GUIDE_GROUPS = ['Motor', 'Zündung', 'Kühlung', 'Kraftstoff', 'Getriebe', 'Bremsen', 'Fahrwerk', 'Elektrik', 'Karosserie'];

export const GUIDES = [
  {
    id: 'oelwechsel',
    title: 'Ölwechsel mit Ölfilter',
    group: 'Motor',
    engine: '2,1 l Wasserboxer (MV)',
    level: 1,
    minutes: 45,
    serviceKey: 'oil',
    tools: [
      'Passende Nuss oder Ringschlüssel für die Ölablassschraube',
      'Ölfilterschlüssel (Band- oder Kappenschlüssel)',
      'Auffangwanne, mindestens 6 Liter',
      'Trichter, Lappen, Handschuhe',
      'Drehmomentschlüssel',
      'Bei Bedarf Auffahrrampen oder Unterstellböcke',
    ],
    material: [
      'Motoröl, ca. 4,5 l (Viskosität und Freigabe laut Handbuch, z. B. 15W-40 oder 10W-40)',
      'Ölfilter',
      'Neuer Dichtring für die Ölablassschraube',
    ],
    values: [
      { k: 'Ölmenge mit Filterwechsel', v: 'ca. 4,5 l – maßgeblich ist der Peilstab', check: false },
      { k: 'Ölablassschraube', v: '25 Nm', check: false, src: 'T3-Pedia (VW-Leitfaden)' },
      { k: 'Ölfilter', v: 'von Hand: anlegen, dann ca. ¾ Umdrehung weiter', check: false },
    ],
    warnings: [
      'Öl warm ablassen, nicht heiß – Verbrühungsgefahr.',
      'Nie unter dem Bus arbeiten, wenn er nur auf dem Wagenheber steht.',
      'Altöl gehört nicht in den Ausguss. Händler, die Motoröl verkaufen, nehmen Altöl zurück – Kassenbon aufheben.',
    ],
    steps: [
      { t: 'Motor warmfahren', d: 'Ein paar Kilometer fahren. Warmes Öl fließt besser ab und nimmt mehr Schmutz mit.' },
      { t: 'Bus sicher abstellen', d: 'Eben abstellen, Handbremse ziehen, Gang einlegen. Wenn du mehr Platz brauchst: Auffahrrampen oder Unterstellböcke.' },
      { t: 'Öleinfülldeckel öffnen', d: 'So kann Luft nachströmen und das Öl läuft schneller ab.' },
      { t: 'Öl ablassen', d: 'Auffangwanne unter die Ablassschraube stellen. Schraube lösen, die letzten Gänge von Hand – das Öl schießt seitlich heraus.' },
      { t: 'Ablaufen lassen', d: 'Etwa 10–15 Minuten. In der Zeit den alten Dichtring von der Schraube nehmen und die Schraube säubern.' },
      { t: 'Ölfilter abschrauben', d: 'Mit dem Filterschlüssel lösen, Restöl auffangen. Dichtfläche am Motor sauber wischen und prüfen, dass der alte Gummiring nicht am Motor kleben geblieben ist.' },
      { t: 'Neuen Ölfilter einsetzen', d: 'Gummiring dünn mit frischem Öl einreiben. Von Hand anschrauben, bis er anliegt, dann etwa ¾ Umdrehung weiter. Ohne Werkzeug.' },
      { t: 'Ablassschraube einsetzen', d: 'Mit neuem Dichtring eindrehen und mit 25 Nm festziehen. Nicht „nach Gefühl“ – das Gewinde im Motor ist empfindlich.' },
      { t: 'Frisches Öl einfüllen', d: 'Zuerst etwa 4 Liter einfüllen, kurz warten, Peilstab prüfen. Dann in kleinen Schritten bis knapp unter Max auffüllen.' },
      { t: 'Probelauf', d: 'Motor starten. Die Öldruck-Kontrolllampe muss nach wenigen Sekunden ausgehen. Etwa 1 Minute laufen lassen und Filter und Ablassschraube auf Dichtheit prüfen.' },
      { t: 'Ölstand nachmessen', d: 'Motor aus, 5 Minuten warten, Peilstab prüfen und bei Bedarf nachfüllen.' },
      { t: 'Aufräumen', d: 'Altöl und alten Filter zurückgeben (Händler oder Wertstoffhof). Teile und Öl gleich im Serviceheft eintragen.' },
    ],
    hint: 'Beim Wasserboxer sitzt unten am Motor ein Ölsieb. Viele T3-Schrauber reinigen es bei jedem zweiten oder dritten Ölwechsel mit. Ablauf und Werte dafür stehen im Handbuch.',
    source: 'Eigene Zusammenstellung (T3 Hub). Werte teils aus T3-Pedia (t3-pedia.de, CC BY-SA 3.0), noch nicht gegen das Reparaturhandbuch geprüft.',
    verified: false,
  },
  {
    id: 'zuendkerzen',
    title: 'Zündkerzen wechseln',
    group: 'Zündung',
    engine: '2,1 l Wasserboxer (MV)',
    level: 1,
    minutes: 40,
    serviceKey: 'plugs',
    tools: [
      'Zündkerzennuss in passender Größe, mit Gummieinsatz',
      'Verlängerung und Ratsche',
      'Drehmomentschlüssel',
      'Fühlerlehre für den Elektrodenabstand',
      'Pinsel oder Druckluft',
      'Kurzes Stück Schlauch (zum Eindrehen von Hand)',
    ],
    material: ['4 Zündkerzen – für MV/SS/SR: Bosch W7CCO, Beru 14-7CU oder Champion N288 (DJ hat andere Kerzen)'],
    values: [
      { k: 'Kerzentyp (MV)', v: 'Bosch W7CCO / Beru 14-7CU / Champion N288', check: false, src: 'T3-Pedia' },
      { k: 'Elektrodenabstand', v: '0,6–0,8 mm (gilt die Angabe auf der Packung; sonst das untere Maß)', check: false, src: 'T3-Pedia' },
      { k: 'Anzugsmoment', v: '20 Nm – ohne Drehmomentschlüssel: neue Kerze nach Anlage +90°, gebrauchte +30°', check: false, src: 'T3-Pedia (VW-Leitfaden)' },
    ],
    warnings: [
      'Nur bei kaltem Motor wechseln. Die Zylinderköpfe sind aus Aluminium, das Gewinde leidet bei warmem Motor.',
      'Zündung aus. Immer nur eine Kerze nach der anderen, damit die Zündkabel nicht vertauscht werden.',
    ],
    steps: [
      { t: 'Motor abkühlen lassen', d: 'Mindestens ein paar Stunden nach der letzten Fahrt. Zündung aus, Schlüssel abziehen.' },
      { t: 'Kerzen finden', d: 'Je zwei Kerzen sitzen links und rechts an den Zylinderköpfen. Die Lage zeigt dein Handbuch.' },
      { t: 'Erste Kerze: Stecker abziehen', d: 'Am Stecker ziehen, nicht am Kabel. Gerade abziehen, nicht verdrehen.' },
      { t: 'Umgebung säubern', d: 'Mit Pinsel oder Druckluft, damit beim Herausdrehen kein Schmutz in den Zylinder fällt.' },
      { t: 'Alte Kerze herausdrehen', d: 'Kerzenbild ansehen: rehbraun = gut, schwarz verrußt = Gemisch zu fett, sehr hell/weiß = zu mager. Auffälligkeiten im Serviceheft notieren.' },
      { t: 'Elektrodenabstand prüfen', d: 'Bei der neuen Kerze mit der Fühlerlehre messen und mit dem Sollwert oben (0,6–0,8 mm) vergleichen.' },
      { t: 'Neue Kerze von Hand eindrehen', d: 'Mit dem Schlauchstück oder der Nuss ohne Ratsche eindrehen. So merkst du sofort, wenn sie schief ansetzt – im Alu-Gewinde besonders wichtig.' },
      { t: 'Festziehen', d: 'Mit dem Drehmomentschlüssel auf 20 Nm (siehe Werte oben).' },
      { t: 'Stecker aufsetzen', d: 'Fest aufdrücken, bis er spürbar einrastet. Dann die nächste Kerze – Schritte 3 bis 9 wiederholen.' },
      { t: 'Probelauf', d: 'Motor starten. Er muss sauber und rund laufen. Ruckelt er, sitzt meist ein Stecker nicht richtig.' },
    ],
    hint: '',
    source: 'Eigene Zusammenstellung (T3 Hub). Werte teils aus T3-Pedia (t3-pedia.de, CC BY-SA 3.0), noch nicht gegen das Reparaturhandbuch geprüft.',
    verified: false,
  },
];
