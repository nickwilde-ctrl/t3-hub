// „Über T3 Hub“: Datenschutz kurz erklärt, Haftungshinweis, Quellen und Lizenzen.
// Impressum und vollständige Datenschutzerklärung folgen, bevor die App öffentlich geteilt wird.

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
      <details><summary>Anleitungen – bitte lesen</summary>
        <p>Die Anleitungen sind eine Hilfe für erfahrene Schrauber, kein Ersatz für ein Reparaturhandbuch oder eine Werkstatt. Werte sind gekennzeichnet: „geprüft“ (mit einem Reparaturhandbuch abgeglichen), „laut …“ (aus der genannten Quelle) oder „ungeprüft“.</p>
        <p>Arbeiten an Bremsen, Lenkung und Fahrwerk sind sicherheitsrelevant. Wenn du unsicher bist, lass sie von einer Fachwerkstatt machen. Du arbeitest auf eigene Verantwortung; für Schäden durch fehlerhafte Angaben wird keine Haftung übernommen, soweit das gesetzlich zulässig ist.</p>
      </details>
      <details><summary>Quellen und Lizenzen</summary>
        <ul>
          <li><b>T3-Pedia</b> (t3-pedia.de): Fakten und Werte, Texte unter CC BY-SA 3.0. Die Anleitungen in T3 Hub sind eigene Texte.</li>
          <li><b>Reparaturhandbuch</b> „Jetzt helfe ich mir selbst“: zum Prüfen von Werten. Es wurden nur Zahlen übernommen, keine Texte oder Abbildungen.</li>
          <li><b>Foren</b> (TheSamba, Club 80-90, GoWesty, Van Café): Erfahrungswerte, jeweils gekennzeichnet.</li>
          <li><b>Kartendaten</b> © OpenStreetMap-Mitwirkende, ODbL.</li>
          <li><b>Leaflet</b> (Karte zum Zoomen), BSD-2-Lizenz.</li>
          <li><b>Schrift Barlow</b> von Jeremy Tribby, SIL Open Font License 1.1.</li>
        </ul>
        <p>T3 Hub ist ein privates Projekt und hat nichts mit der Volkswagen AG zu tun. „VW“ und „Volkswagen“ sind Marken der Volkswagen AG.</p>
      </details>
    </div></section>`;
}
