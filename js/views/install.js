// Hinweis zum Installieren auf dem Home-Bildschirm (iPhone/iPad) – wichtig wegen getrennter Datenspeicher.

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function installCard() {
  if (isStandalone()) {
    return `<section class="sec"><div class="card soon-card"><span class="label">Als App installiert</span>
      <p>T3 Hub läuft vom Home-Bildschirm. Hier sind deine Daten am besten aufgehoben und die App funktioniert auch ohne Netz.</p></div></section>`;
  }
  const steps = isIos()
    ? `<ol class="steps"><li>Unten in Safari auf <b>Teilen</b> tippen (Quadrat mit Pfeil).</li><li><b>Zum Home-Bildschirm</b> wählen, eventuell erst nach unten scrollen.</li><li>Auf <b>Hinzufügen</b> tippen.</li><li>T3 Hub vom Home-Bildschirm öffnen und dort unter <b>Mehr → Backup wiederherstellen</b> deine Backup-Datei laden.</li></ol>`
    : '<p>Im Browser-Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.</p>';
  return `<section class="sec"><div class="card soon-card install"><span class="label">Empfohlen</span><h3>Als App auf den Home-Bildschirm</h3>
    ${steps}
    <p class="hint" style="margin:0">Wichtig: Auf dem iPhone hat die App vom Home-Bildschirm einen eigenen Datenspeicher, getrennt von Safari. Deshalb dort einmal das Backup laden. Safari löscht Website-Daten außerdem, wenn eine Seite länger nicht geöffnet wurde. Die installierte App ist davon nicht betroffen.</p></div></section>`;
}
