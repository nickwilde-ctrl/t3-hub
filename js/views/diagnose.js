// Geführte Diagnose: Vollbild-Ablauf mit immer genau einer Prüfung. Der Ablauf selbst steckt in js/logic/diagnose.js,
// der fachliche Inhalt in js/data/diagnosen/. Hier ist nur die Darstellung.
import { esc, fmtDate } from '../format.js';
import { toast } from './sheet.js';
import { newId } from '../db.js';
import {
  NOT_POSSIBLE_REASONS, appliesTo, startSession, answerNode, markNotPossible, goBack, abandon, suggestAnswer,
  parseValue, checksDone, summary, summaryText, identityText,
} from '../logic/diagnose.js';

const KIND = {
  result: ['Ergebnis', 'Eingegrenzt – kein Teil ist damit bewiesen defekt.'],
  open: ['Diagnose offen', ''],
  stop: ['Stopp', ''],
  info: ['Hinweis', ''],
  done: ['Geschafft', ''],
  redirect: ['Anderer Weg nötig', ''],
};

const list = (items, cls = 'g-list') => `<ul class="${cls}">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

/** Kurzer Hinweis im Cockpit der Mehr-Seite. */
export function diagnoseCard(tree, identity, sessions) {
  const ok = appliesTo(tree, identity).ok;
  const running = sessions.some((s) => s.status === 'running');
  return `<section class="sec"><button type="button" class="card link-card" data-action="open-diagnose"><span><b>Diagnose: ${esc(tree.title)}</b><br><span class="faint">${ok ? (running ? 'Eine Diagnose läuft – hier weitermachen' : 'Schritt für Schritt zur Ursache') : 'Für dein Fahrzeug noch nicht verfügbar'}</span></span><span aria-hidden="true">›</span></button></section>`;
}

/** Karte auf der Startseite, solange eine Diagnose läuft. */
export function diagnoseRunningCard(tree, sessions) {
  const s = sessions.find((x) => x.status === 'running' && x.caseId === tree.id);
  if (!s) return '';
  return `<section class="sec"><button type="button" class="card link-card" data-action="open-diagnose" data-resume="1"><span><b>Diagnose läuft</b><br><span class="faint">${esc(tree.title)} · seit ${esc(fmtDate(s.date))} · hier weitermachen</span></span><span aria-hidden="true">›</span></button></section>`;
}

/** Das Protokoll als Seitenabschnitt. */
function protocolHtml(sm) {
  const sec = (head, body) => (body ? `<div class="g-box dx-sum"><h3>${head}</h3>${body}</div>` : '');
  const tone = { ok: '✓ ', issue: '! ', neutral: '' };
  return `<div class="dx-proto">
    <p class="g-meta">${esc(fmtDate(sm.date))} · ${esc(identityText(sm.identity))}</p>
    ${sm.result ? sec('Ergebnis', `<p><b>${esc(sm.result.title)}</b></p><p>${esc(sm.result.text)}</p>${sm.result.notThis.length ? list(sm.result.notThis.map((t) => 'Nicht tun: ' + t)) : ''}`) : sec('Stand', `<p>${sm.status === 'abandoned' ? 'Diese Diagnose wurde nicht beendet.' : 'Diese Diagnose läuft noch.'}</p>`)}
    ${sec('Geprüft', sm.checked.length ? list(sm.checked.map((c) => tone[c.tone] + c.text)) : '')}
    ${sec('Maßnahmen', sm.actions.length ? list(sm.actions.map((c) => c.text)) : '')}
    ${sec('Messwerte', sm.measurements.length ? list(sm.measurements.map((m) => `${m.label}: ${m.value}${m.source === 'C' ? ' (nur gespeichert, nicht bewertet)' : ''}`)) : '')}
    ${sec('Noch offen', sm.open.length || sm.next.length ? list([...sm.open.map((o) => `${o.text}${o.reason ? ' (' + o.reason + ')' : ''}`), ...sm.next]) : '')}
    ${sec('Wahrscheinlich, aber nicht bewiesen', sm.likely.length ? list(sm.likely) : '')}
    ${sec('Noch nicht nachgewiesen', sm.notProven.length ? list(sm.notProven) : '')}
    ${sec('Hinweise', sm.notes.length || sm.provisionalNote ? list([...sm.notes, ...(sm.provisionalNote ? [sm.provisionalNote] : [])]) : '')}
  </div>`;
}

let root = null;

/**
 * Öffnet die Diagnose.
 * ctx: { tree, identity, sessions(): Liste der Protokolle, save(session), today(), openGuide(id), openLog(prefill), onClose() }
 * resume: true springt direkt in die laufende Diagnose.
 */
export function openDiagnose(ctx, { resume = false } = {}) {
  closeDiagnose();
  const { tree, identity } = ctx;
  const fit = appliesTo(tree, identity);
  const mine = () => ctx.sessions().filter((s) => s.caseId === tree.id).sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  let session = null;
  let view = 'start'; // start | node | reason | protocol
  let viewing = null; // Protokoll einer früheren Diagnose
  let reasonUnclear = false;

  root = document.createElement('div');
  root.id = 'dx-root';
  root.className = 'guide-full';
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';

  const persist = async (next) => { session = (await ctx.save(next)) || next; };
  const body = (html, { back = false } = {}) => {
    root.innerHTML = `<div class="map-bar guide-bar"><button type="button" class="btn ghost" id="dx-close">Schließen</button>${back ? '<button type="button" class="btn ghost" id="dx-back">‹ Zurück</button>' : ''}</div>
      <div class="guide-body" id="dx-body">${html}</div>`;
    root.querySelector('#dx-close').onclick = closeDiagnose;
    root.querySelector('#dx-body').scrollTop = 0;
  };

  const start = () => {
    const running = mine().find((s) => s.status === 'running');
    const past = mine().filter((s) => s.status !== 'running');
    let main;
    if (!fit.ok) {
      main = `<div class="g-box"><h3>Noch nicht verfügbar</h3>
        <p>Dieser Diagnoseablauf gilt nur für ${esc(tree.scopeText)}. Er darf nicht auf andere Motoren übertragen werden, weil dort andere Werte und Prüfungen gelten.</p>
        <p>${fit.why === 'nocode' ? 'Für dein Fahrzeug ist kein Motorkennbuchstabe eingetragen. Trag ihn in der Fahrzeugakte ein (Mehr → Fahrzeugakte → Bearbeiten), dann prüft die App, ob der Ablauf passt.' : 'Für den eingetragenen Motor ist dieser Ablauf noch nicht verfügbar.'}</p>
        <p class="hint">Eingetragen: ${esc(identityText({ model: identity.model, year: identity.year, family: identity.family?.label || '', code: identity.code, fuel: identity.fuel, gearbox: identity.gearboxLabel }) || 'noch nichts')}</p></div>`;
    } else {
      main = `<p class="dx-intro">${esc(tree.intro)}</p>
        <div class="g-box g-danger"><h3>Sicherheit zuerst</h3>${list(['Arbeite nur, wenn du dir den Handgriff zutraust. Bei Unsicherheit: Werkstatt.', 'Kraftstoff ist hochentzündlich, die Zündanlage führt Hochspannung. Jede Prüfung nennt ihre eigenen Hinweise.', 'Unter dem Fahrzeug nie nur mit dem Wagenheber arbeiten.'])}</div>
        <div class="g-box"><h3>So arbeitet die Diagnose</h3><p>${esc(tree.rule)} Wenn eine Prüfung nicht möglich ist, bleibt sie offen und wird im Protokoll gezeigt.</p></div>
        <div class="dx-actions">
          ${running ? '<button type="button" class="btn" id="dx-resume">Diagnose fortsetzen</button><button type="button" class="btn ghost" id="dx-new">Neu beginnen</button>' : '<button type="button" class="btn" id="dx-new">Diagnose starten</button>'}
        </div>`;
    }
    const pastHtml = past.length ? `<div class="g-box"><h3>Frühere Protokolle</h3><div class="list">${past.map((s) => `<button type="button" class="row row-btn" data-dx-open="${esc(s.id)}"><div class="t">${esc(fmtDate(s.date))}</div><div class="s">${esc(s.result ? tree.nodes[s.result]?.title || '' : s.status === 'abandoned' ? 'nicht beendet' : '')}</div></button>`).join('')}</div></div>` : '';
    body(`<div class="eyebrow">Diagnose</div><h2 class="g-title">${esc(tree.title)}</h2>${main}${pastHtml}`);
    const nw = root.querySelector('#dx-new');
    if (nw) nw.onclick = async () => {
      if (running) {
        if (!nw.dataset.armed) { nw.dataset.armed = '1'; nw.textContent = 'Wirklich neu beginnen? Die alte Diagnose bleibt als Protokoll.'; return; }
        await persist(abandon(running));
      }
      await persist(startSession(tree, identity, { id: newId(), vehicleId: ctx.vehicleId, today: ctx.today() }));
      show();
    };
    const rs = root.querySelector('#dx-resume');
    if (rs) rs.onclick = () => { session = running; show(); };
    root.querySelectorAll('[data-dx-open]').forEach((b) => { b.onclick = () => { viewing = mine().find((s) => s.id === b.dataset.dxOpen); view = 'protocol'; show(); }; });
  };

  const goBackOne = async () => { await persist(goBack(tree, session)); reasonUnclear = false; show(); };

  const showProtocol = (s, back) => {
    const sm = summary(tree, s);
    body(`<div class="eyebrow">Protokoll</div><h2 class="g-title">${esc(tree.title)}</h2>${protocolHtml(sm)}
      <div class="dx-actions"><button type="button" class="btn" id="dx-share">Protokoll teilen oder kopieren</button></div>`, { back });
    root.querySelector('#dx-share').onclick = () => share(summaryText(sm, fmtDate));
    if (back) root.querySelector('#dx-back').onclick = () => { viewing = null; view = 'start'; show(); };
  };

  const share = async (text) => {
    try {
      if (navigator.share) { await navigator.share({ title: 'T3 Hub – Diagnoseprotokoll', text }); return; }
      await navigator.clipboard.writeText(text);
      toast('Protokoll kopiert');
    } catch (e) { if (e?.name !== 'AbortError') toast('Das Protokoll ließ sich nicht teilen. Bitte nochmal versuchen.', 'err'); }
  };

  const nodeScreen = () => {
    const node = tree.nodes[session.current];
    const area = tree.areas[node.area] || {};
    const safety = [...(area.safety || []), ...(node.safety || [])];
    const values = (id) => session.history.filter((e) => e.node === id && e.values).pop()?.values || {};
    const inputs = (node.inputs || []).map((inp) => {
      const cmp = inp.compare ? values(inp.compare.node)[inp.compare.input] : undefined;
      return `<div class="field"><label for="dx-in-${inp.id}">${esc(inp.label)}${inp.unit ? ' (' + esc(inp.unit) + ')' : ''}</label>
        <input id="dx-in-${inp.id}" data-dx-in="${inp.id}" data-kind="${inp.kind}" ${inp.kind === 'number' ? 'inputmode="decimal"' : ''} autocomplete="off" placeholder="optional">
        ${cmp !== undefined ? `<p class="hint" style="margin:0">${esc(inp.compare.label)}: ${String(cmp).replace('.', ',')} ${esc(inp.unit || '')}</p>` : ''}</div>`;
    }).join('');
    const guideBtns = node.guide ? `<div class="dx-actions"><button type="button" class="btn ghost" data-dx-guide="${esc(node.guide)}">Passende Anleitung öffnen</button><button type="button" class="btn ghost" data-dx-log="${esc(node.logTitle || node.short)}">Ins Serviceheft eintragen</button></div>` : '';
    const answers = node.answers.map((a) => `<button type="button" class="btn dx-ans" data-dx-ans="${a.id}">${esc(a.label)}</button>${a.meaning ? `<p class="dx-mean">${esc(a.meaning)}</p>` : ''}`).join('');
    body(`
      <div class="eyebrow">${esc(area.label || '')}${node.kind === 'action' ? ' · Maßnahme' : ` · ${checksDone(tree, session)} Prüfungen bisher`}</div>
      <h2 class="g-title">${esc(node.title)}</h2>
      ${node.level === 'advanced' ? '<div class="g-box g-danger"><h3>Fortgeschrittene Prüfung</h3><p>Wenn du unsicher bist, lass diese Prüfung in einer Werkstatt machen.</p></div>' : ''}
      ${['B', 'C'].includes(node.source) ? '<p class="hint dx-prov">Vorläufig: Dieses Verfahren oder dieser Wert ist noch nicht am VW-Originalleitfaden bestätigt.</p>' : ''}
      ${node.where ? `<div class="dx-block"><h3>Wo?</h3><p>${esc(node.where)}</p></div>` : ''}
      <div class="dx-block"><h3>Du brauchst</h3>${node.tools?.length ? list(node.tools) : '<p>Nichts Besonderes.</p>'}</div>
      ${safety.length ? `<div class="g-box g-danger"><h3>Sicherheit</h3>${list(safety)}</div>` : ''}
      <div class="dx-block"><h3>So geht's</h3><ol class="dx-steps">${node.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol></div>
      ${node.target ? `<div class="dx-block"><h3>Sollwert</h3><p>${esc(node.target)}</p></div>` : ''}
      ${guideBtns}
      ${inputs ? `<div class="dx-block"><h3>Messwerte (freiwillig)</h3>${inputs}<p class="hint" id="dx-suggest" style="margin:0"></p></div>` : ''}
      <div class="dx-block"><h3>Was ist dabei herausgekommen?</h3>${answers}<p class="err" id="dx-err" role="alert"></p>
        <button type="button" class="btn ghost dx-ans" id="dx-np">Prüfung nicht möglich</button></div>
      <details class="g-box"><summary><h3>Ich weiß nicht, wie das geht</h3></summary><p>${node.help ? esc(node.help) + ' Eine ausführliche Hilfeseite folgt in einer späteren Version.' : 'Dazu gibt es noch keine Hilfe.'} Wenn du dir den Handgriff nicht zutraust, wähle „Prüfung nicht möglich“.</p></details>
      <details class="g-box dx-tech"><summary><h3>Technische Angaben</h3></summary><p>Knoten ${esc(node.id)} · Quellenstatus ${esc(node.source)}${node.source === 'A' ? ' (für die Entscheidungsgrenze freigegeben)' : node.source === 'B' ? ' (dokumentiert, noch nicht am Original geprüft)' : node.source === 'C' ? ' (nie als Entscheidungsgrenze verwenden)' : ' (qualitative Prüfung)'}</p></details>`,
      { back: session.history.length > 0 });
    const read = () => {
      const out = {};
      let bad = '';
      root.querySelectorAll('[data-dx-in]').forEach((el) => {
        const t = el.value.trim();
        if (!t) return;
        if (el.dataset.kind === 'number') { const n = parseValue(t); if (n === null) bad = 'Bitte nur Zahlen eintragen, zum Beispiel 12,5.'; else out[el.dataset.dxIn] = n; } else out[el.dataset.dxIn] = t;
      });
      return { out, bad };
    };
    const sug = root.querySelector('#dx-suggest');
    root.querySelectorAll('[data-dx-in]').forEach((el) => el.addEventListener('input', () => {
      const a = suggestAnswer(node, read().out);
      if (sug) sug.textContent = a ? `Dein Wert passt zu: „${node.answers.find((x) => x.id === a).label}“. Tippe diese Antwort, wenn du dich sicher bist.` : '';
    }));
    root.querySelectorAll('[data-dx-ans]').forEach((b) => { b.onclick = async () => {
      const { out, bad } = read();
      if (bad) { root.querySelector('#dx-err').textContent = bad; return; }
      await persist(answerNode(tree, session, b.dataset.dxAns, out));
      show();
    }; });
    root.querySelector('#dx-np').onclick = () => { view = 'reason'; reasonUnclear = false; show(); };
    root.querySelector('[data-dx-guide]')?.addEventListener('click', (e) => ctx.openGuide(e.currentTarget.dataset.dxGuide));
    root.querySelector('[data-dx-log]')?.addEventListener('click', (e) => ctx.openLog({ title: e.currentTarget.dataset.dxLog, category: 'Wartung' }));
    const back = root.querySelector('#dx-back');
    if (back) back.onclick = goBackOne;
  };

  const reasonScreen = () => {
    const node = tree.nodes[session.current];
    body(`<div class="eyebrow">${esc(tree.areas[node.area]?.label || '')}</div><h2 class="g-title">Prüfung nicht möglich</h2>
      <p>${esc(node.title)} bleibt dann offen. Sie wird im Protokoll als offen aufgeführt und nicht als bestanden oder durchgefallen gewertet.</p>
      ${reasonUnclear ? `<div class="g-box"><h3>Noch einmal versuchen?</h3><p>${node.help ? esc(node.help) + ' Eine ausführliche Hilfeseite folgt in einer späteren Version.' : 'Lies die Schritte noch einmal in Ruhe durch.'}</p></div>
        <div class="dx-actions"><button type="button" class="btn" id="dx-retry">Prüfung wiederholen</button><button type="button" class="btn ghost" id="dx-open">Offen lassen und weiter</button></div>`
        : `<div class="dx-block"><h3>Was ist der Grund?</h3>${NOT_POSSIBLE_REASONS.map((r) => `<button type="button" class="btn ghost dx-ans" data-dx-reason="${r.id}">${esc(r.label)}</button>`).join('')}</div>
        <div class="dx-actions"><button type="button" class="btn ghost" id="dx-retry">Doch versuchen</button></div>`}`);
    const retry = root.querySelector('#dx-retry');
    if (retry) retry.onclick = () => { view = 'node'; reasonUnclear = false; show(); };
    const leave = async (reason) => { await persist(markNotPossible(tree, session, reason)); view = 'node'; reasonUnclear = false; show(); };
    root.querySelector('#dx-open')?.addEventListener('click', () => leave('unclear'));
    root.querySelectorAll('[data-dx-reason]').forEach((b) => { b.onclick = () => { if (b.dataset.dxReason === 'unclear') { reasonUnclear = true; show(); } else leave(b.dataset.dxReason); }; });
  };

  const endScreen = () => {
    const node = tree.nodes[session.current];
    const sm = summary(tree, session);
    const [label, note] = KIND[node.kind] || ['Ergebnis', ''];
    body(`<div class="eyebrow">${esc(label)}${node.provisional ? ' · vorläufig' : ''}</div><h2 class="g-title">${esc(node.title)}</h2>
      <p>${esc(node.text)}</p>${note ? `<p class="hint">${esc(note)}</p>` : ''}
      ${node.notThis?.length ? `<div class="g-box g-danger"><h3>Nicht auf Verdacht tauschen</h3>${list(node.notThis)}</div>` : ''}
      ${node.next?.length ? `<div class="g-box"><h3>Nächster Schritt</h3>${list(node.next)}</div>` : ''}
      ${node.likely?.length ? '<p class="hint">Wahrscheinlich heißt: Die Prüfungen deuten darauf hin. Bewiesen ist es erst, wenn das Bauteil selbst geprüft oder getauscht und der Fehler weg ist.</p>' : ''}
      <h3 class="dx-h">Protokoll</h3>${protocolHtml(sm)}
      <div class="dx-actions"><button type="button" class="btn" id="dx-share">Protokoll teilen oder kopieren</button><button type="button" class="btn ghost" id="dx-fin">Fertig</button></div>`,
      { back: session.history.length > 0 });
    root.querySelector('#dx-share').onclick = () => share(summaryText(sm, fmtDate));
    root.querySelector('#dx-fin').onclick = closeDiagnose;
    root.querySelector('#dx-back').onclick = goBackOne;
  };

  function show() {
    if (view === 'protocol' && viewing) { showProtocol(viewing, true); return; }
    if (!session) { start(); return; }
    if (session.status === 'finished') { endScreen(); return; }
    if (view === 'reason') { reasonScreen(); return; }
    nodeScreen();
  }

  root.ctx = ctx;
  const running = mine().find((s) => s.status === 'running');
  if (resume && fit.ok && running) { session = running; view = 'node'; }
  show();
}

export function closeDiagnose() {
  if (!root) return;
  const cb = root.ctx?.onClose;
  root.remove();
  root = null;
  document.body.style.overflow = '';
  if (cb) cb();
}
