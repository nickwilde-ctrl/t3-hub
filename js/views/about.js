// „Über T3 Hub“: Datenschutz kurz erklärt, Datenschutzerklärung, Impressum, Haftungshinweis, Quellen und Lizenzen.
// Die Angaben zum Anbieter stehen nur hier oben. Diese Datei und die Live-Seite sind öffentlich.

export const ANBIETER = {
  name: 'Niklaas Max Wilde',
  strasse: 'Hannoversche Straße 1',
  ort: '10115 Berlin',
  mail: 'nick.wilde@ymail.com',
};

export function aboutCard() {
  return `<section class="sec"><div class="sec-head"><h2>Über T3 Hub</h2></div>
    <div class="card about">
      <details><summary>Deine Daten</summary>
        <p>Alles, was du einträgst – Tankungen, Serviceheft, Fotos, Touren –, wird <b>nur auf diesem Gerät</b> gespeichert. Es gibt kein Konto und keinen Server, der deine Daten sammelt. Auch wir sehen sie nicht.</p>
        <p>Die App stellt nur in diesen Fällen eine Verbindung ins Internet her:</p>
        <ul>
          <li><b>Laden der App</b> von GitHub Pages (GitHub Inc.). Dabei sieht GitHub wie jede Webseite deine IP-Adresse.</li>
          <li><b>Karten</b> bei Touren und Stellplätzen: Kartenbilder kommen von OpenStreetMap.</li>
          <li><b>Ortssuche und Ortsnamen</b> bei Stellplätzen: Die Suche bzw. die Koordinaten gehen an OpenStreetMap (Nominatim).</li>
        </ul>
        <p>Den Standort fragt die App nur, wenn du „Hier stehen wir“ antippst. Es gibt keine Werbung, kein Tracking und keine Analyse-Werkzeuge. Schriften liegen in der App selbst.</p>
        <p>Weil die Daten nur hier liegen: Mach regelmäßig ein Backup (unter „Daten“). Wenn du die App löschst oder den Browser-Speicher leerst, sind sie sonst weg.</p>
      </details>
      <details id="impressum"><summary>Impressum</summary>
        <p><b>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</b></p>
        <p>${ANBIETER.name}<br>${ANBIETER.strasse}<br>${ANBIETER.ort}</p>
        <p><b>Kontakt:</b> <a href="mailto:${ANBIETER.mail}">${ANBIETER.mail}</a></p>
        <p>T3 Hub ist ein privates, nicht kommerzielles Projekt.</p>
      </details>
      <details id="datenschutz"><summary>Datenschutzerklärung</summary>
        <p><b>Verantwortlich</b> ist ${ANBIETER.name}, ${ANBIETER.strasse}, ${ANBIETER.ort}, <a href="mailto:${ANBIETER.mail}">${ANBIETER.mail}</a>.</p>
        <p><b>Deine Eingaben.</b> Fahrzeugdaten, Tankungen, Serviceheft, Fotos, Rechnungen und Touren speichert die App ausschließlich im Speicher deines Geräts (Browser-Datenbank). Sie werden nicht an uns oder an einen Server übertragen. Wir haben keinen Zugriff darauf und können sie nicht wiederherstellen. Löschen kannst du sie jederzeit selbst, zum Beispiel über die App-Einstellungen deines Geräts oder indem du die App entfernst.</p>
        <p><b>Laden der App.</b> Die App wird über GitHub Pages ausgeliefert (GitHub Inc., USA). Dabei verarbeitet GitHub technisch notwendige Daten wie deine IP-Adresse. Weitere Informationen stehen in der Datenschutzerklärung von GitHub.</p>
        <p><b>Karten und Ortssuche.</b> Zeigst du bei Touren Karten oder Stellplätze an, werden Kartenbilder von OpenStreetMap geladen (OpenStreetMap Foundation, Großbritannien). Dabei wird deine IP-Adresse übertragen. Bei der Ortssuche und beim Benennen eines Stellplatzes gehen der eingegebene Suchbegriff oder die Koordinaten an den Dienst Nominatim von OpenStreetMap. Öffnest du einen Stellplatz in Apple Karten, gilt dafür die Datenschutzerklärung von Apple. Diese Verbindungen entstehen nur, wenn du die jeweilige Funktion benutzt.</p>
        <p><b>Standort.</b> Die App fragt deinen Standort nur, wenn du „Hier stehen wir“ antippst. Er wird auf deinem Gerät verarbeitet und nur für die Ortssuche (siehe oben) weitergegeben.</p>
        <p><b>Was es nicht gibt.</b> Keine Konten, keine Cookies zu Werbe- oder Analysezwecken, kein Tracking und keine Werbung. Die Schriften liegen in der App selbst, es werden keine Schriften von Drittanbietern nachgeladen.</p>
        <p><b>Deine Rechte.</b> Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner personenbezogenen Daten sowie auf Widerspruch. Da die App deine Eingaben nicht an uns übermittelt, können wir nur Anfragen zu Daten beantworten, die wir selbst haben, etwa deine Nachrichten an die oben genannte E-Mail-Adresse. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der Berliner Beauftragten für Datenschutz und Informationsfreiheit.</p>
      </details>
      <details><summary>Anleitungen – bitte lesen</summary>
        <p>Die Anleitungen sind eine Hilfe für erfahrene Schrauber, kein Ersatz für ein Reparaturhandbuch oder eine Werkstatt. Werte sind gekennzeichnet: „geprüft“ (mit einem Reparaturhandbuch abgeglichen), „laut …“ (aus der genannten Quelle) oder „ungeprüft“.</p>
        <p>Arbeiten an Bremsen, Lenkung und Fahrwerk sind sicherheitsrelevant. Wenn du unsicher bist, lass sie von einer Fachwerkstatt machen. Du arbeitest auf eigene Verantwortung; für Schäden durch fehlerhafte Angaben wird keine Haftung übernommen, soweit das gesetzlich zulässig ist.</p>
      </details>
      <details><summary>Quellen und Lizenzen</summary>
        <ul>
          <li><b>T3-Pedia</b> (t3-pedia.de): Fakten und Werte, Texte unter CC BY-SA 3.0. Die Anleitungen in T3 Hub sind eigene Texte.</li>
          <li><b>Reparaturhandbücher</b> „So wird’s gemacht“ (Etzold, Delius Klasing) und „Jetzt helfe ich mir selbst“ (Korp, Motorbuch Verlag): zum Prüfen von Werten. Es wurden nur Zahlen übernommen, keine Texte oder Abbildungen.</li>
          <li><b>Foren</b> (TheSamba, Club 80-90, GoWesty, Van Café): Erfahrungswerte, jeweils gekennzeichnet.</li>
          <li><b>Kartendaten</b> © OpenStreetMap-Mitwirkende, ODbL.</li>
          <li><b>Leaflet</b> (Karte zum Zoomen), BSD-2-Lizenz.</li>
          <li><b>Schrift Barlow</b> von Jeremy Tribby, SIL Open Font License 1.1.</li>
        </ul>
        <p>T3 Hub ist ein privates Projekt und hat nichts mit der Volkswagen AG zu tun. „VW“ und „Volkswagen“ sind Marken der Volkswagen AG.</p>
      </details>
    </div></section>`;
}
