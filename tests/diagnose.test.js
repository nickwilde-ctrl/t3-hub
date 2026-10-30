import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MV_NO_START as T } from '../js/data/diagnosen/mv-no-start.js';
import {
  appliesTo, startSession, answerNode, markNotPossible, goBack, currentNode, summary, summaryText, suggestAnswer, validateTree, toVerify,
  flagsOf, NOT_POSSIBLE, abandon,
} from '../js/logic/diagnose.js';
import { vehicleIdentity } from '../js/logic/vehicle.js';
import { buildBackup, checkBackup } from '../js/logic/backup.js';
import { FAULTS } from '../js/data/faults.js';
import { elektrikView } from '../js/views/elektrik.js';

const MV = vehicleIdentity({ engineCode: 'MV', year: 1985, gearbox: 'manual' });
const fresh = () => startSession(T, MV, { id: 's1', vehicleId: 'v1', today: '2026-10-30', now: '2026-10-30T10:00:00Z' });

/** Pfad als Liste: 'Z1:keiner', 'Z4:np' (nicht möglich), 'Z5:ok' mit Werten als [Text, {…}]. */
function run(path, s = fresh()) {
  for (const step of path) {
    const [token, values] = [].concat(step);
    const [node, answer] = token.split(':');
    assert.equal(s.current, node, `erwartet ${node}, aber der Baum steht bei ${s.current}`);
    s = answer === 'np' ? markNotPossible(T, s, 'tool') : answerNode(T, s, answer, values || {});
  }
  return s;
}
const GRUND = ['G1:normal', 'G2:genug', ['G3:notiert', { v: 12.6 }], 'G4:ok'];

test('Der Baum ist in sich stimmig', () => {
  assert.deepEqual(validateTree(T), []);
  assert.equal(T.start, 'G1');
});

test('MV wird erkannt, andere Motoren bekommen den Baum nicht', () => {
  assert.equal(appliesTo(T, vehicleIdentity({ engineCode: 'MV' })).ok, true, 'Familie wird aus dem Kennbuchstaben abgeleitet');
  assert.equal(appliesTo(T, vehicleIdentity({ engineFamily: 'wbx21', engineCode: 'mv' })).ok, true);
  for (const code of ['DJ', 'SR', 'SS']) assert.equal(appliesTo(T, vehicleIdentity({ engineCode: code })).ok, false, code);
  assert.equal(appliesTo(T, vehicleIdentity({ engineFamily: 'diesel', engineCode: 'CS' })).ok, false);
  assert.equal(appliesTo(T, vehicleIdentity({ engineFamily: 'diesel', engineCode: 'MV' })).ok, false, 'Widerspruch: gespeicherte Bauart gewinnt');
  assert.equal(appliesTo(T, vehicleIdentity({ engineFamily: 'wbx21' })).why, 'nocode', 'ohne Kennbuchstaben nicht eindeutig');
  assert.equal(appliesTo(T, vehicleIdentity({})).ok, false);
  assert.equal(appliesTo(T, vehicleIdentity({ engineCode: 'XX' })).ok, false);
});

test('Quellenstatus: nur Z5 ist A, Kraftstoffdruck und Spulenwiderstand sind nie Entscheidungsgrenze', () => {
  const aNodes = Object.values(T.nodes).filter((n) => n.source === 'A').map((n) => n.id);
  assert.deepEqual(aNodes, ['Z5', 'END_Z5_LOW']);
  assert.equal(T.nodes.K3.inputs[0].source, 'C');
  assert.equal(T.nodes.K3.source, 'B');
  const withSuggest = Object.values(T.nodes).filter((n) => n.suggest).map((n) => n.id);
  assert.deepEqual(withSuggest, ['Z5'], 'nur ein freigegebener Wert darf eine Antwort vorschlagen');
  assert.equal(suggestAnswer(T.nodes.Z5, { v: 11.8 }), 'ok');
  assert.equal(suggestAnswer(T.nodes.Z5, { v: '9,9' }), 'low');
  assert.equal(suggestAnswer(T.nodes.Z5, { v: 'abc' }), null);
  assert.equal(suggestAnswer(T.nodes.K3, { p: 0.1 }), null);
  // der Druckwert wird gespeichert, aber nicht bewertet
  const hohe = run([...GRUND, 'Z1:funke', 'K1:laeuft', 'K2:trocken', ['K3:druck', { p: 0.2 }]]);
  assert.equal(hohe.current, 'E1');
  assert.deepEqual(hohe.history.at(-1).values, { p: 0.2 });
  assert.match(summaryText(summary(T, hohe)), /Kraftstoffdruck: 0,2 bar/);
  assert.match(summary(T, hohe).measurements.at(-1).source, /C/);
});

test('S1 – kein Zündfunke: die Spule kommt erst nach fünf Nachweisen', () => {
  const s = run([...GRUND, 'Z1:keiner', 'Z2:keiner', ['Z4:ok', { v: 12.5 }], ['Z5:ok', { v: 11.8 }], 'Z6:led', 'Z7:led', 'Z8:keiner']);
  assert.equal(s.status, 'finished');
  assert.equal(s.result, 'END_Z8_COIL');
  // jeder frühere negative Befund endet an seiner Stelle und nie bei der Spule
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:funke', 'Z3a:nicht']).result, 'END_M3');
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:fehlt']).result, 'END_Z4');
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:faellt']).result, 'END_Z4_START');
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:ok', ['Z5:low', { v: 7 }]]).result, 'END_Z5_LOW');
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:ok', 'Z5:ok', 'Z6:led', 'Z7:kein']).result, 'END_Z7');
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:ok', 'Z5:ok', 'Z6:kein', 'Z6c:dreht', 'F_Z6_PLUG:kein']).result, 'END_Z6_HALL');
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:ok', 'Z5:ok', 'Z6:led', 'Z7:led', 'Z8:kabel', 'F_Z8_CABLE:erneuert']).current, 'Z1', 'Mittelkabel war es: erneuern, dann Funke neu prüfen');
});

test('Hallgeber wird nur genannt, wenn Versorgung und drehender Verteiler belegt sind', () => {
  // Z5 nicht möglich → Z6 mit Vorbehalt → kein Signal → keine Aussage über den Hallgeber
  const s = run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:ok', 'Z5:np', 'Z6:kein', 'Z6c:dreht', 'F_Z6_PLUG:kein']);
  assert.equal(s.result, 'END_Z6_OPEN');
  assert.deepEqual(summary(T, s).likely, []);
  assert.match(summary(T, s).open.map((o) => o.text).join(), /Hallgeber-Versorgung/);
  // Verteilerfinger dreht nicht → Verteilerantrieb statt Hallgeber
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:keiner', 'Z4:ok', 'Z5:ok', 'Z6:kein', 'Z6c:nicht']).result, 'END_M3');
  // war der Finger schon bei Z3a geprüft, entfällt die Rückfrage
  assert.equal(run([...GRUND, 'Z1:keiner', 'Z2:funke', 'Z3a:dreht', 'Z3b:ok', 'Z3c:ok', 'Z3d:ok']).result, 'END_Z3_NOTHING');
});

test('S2 – Funke da, Kraftstoff fehlt: Pumpe nie ohne Spannungsnachweis', () => {
  assert.equal(run([...GRUND, 'Z1:funke', 'K1:still', ['K1a:keine', { v: 0 }]]).result, 'END_K1A_RELAY');
  assert.equal(run([...GRUND, 'Z1:funke', 'K1:still', 'K1a:da']).result, 'END_K1A_PUMP');
  assert.equal(run([...GRUND, 'Z1:funke', 'K1:laeuft', 'K2:trocken', 'K3:kein']).result, 'END_K3_LOW');
  assert.equal(run([...GRUND, 'Z1:funke', 'K1:np', 'K2:trocken', 'K3:kein']).result, 'END_K3_LOW_PUMP', 'Pumpenlauf nicht bestätigt: keine Aussage über „trotz laufender Pumpe“');
  assert.deepEqual(summary(T, run([...GRUND, 'Z1:funke', 'K1:still', 'K1a:keine'])).likely, [], 'ohne Spannung kein Pumpen-Verdacht');
});

test('S3 – Zündung und Kraftstoff da: nichts wird erfunden', () => {
  assert.equal(run([...GRUND, 'Z1:funke', 'K1:laeuft', 'K2:nass', 'K4:kraftstoff']).result, 'END_K4');
  const s = run([...GRUND, 'Z1:funke', 'K1:laeuft', 'K2:nass', 'K4:trocken', ['M1:ok', { z1: 11, z2: 11.5, z3: 10.8, z4: 11.2 }]]);
  assert.equal(s.result, 'END_ALL_CLEAR');
  const sm = summary(T, s);
  assert.equal(sm.likely.length, 0);
  assert.equal(sm.notProven.length, T.suspects.length, 'nichts davon ist nachgewiesen');
  assert.match(sm.result.text, /keine Ursache eingegrenzt/);
  // nach Arbeiten am Fahrzeug bleibt es bei einem Verdacht
  const w = run(['G1:normal', 'G2:genug', 'G3:nicht', ['G4:arbeiten', { arbeit: 'Verteiler' }], 'Z1:funke', 'K1:laeuft', 'K2:nass', 'K4:trocken', 'M1:ok']);
  assert.equal(w.result, 'END_M2');
  assert.ok(flagsOf(T, w).has('recentWork'));
  assert.match(summaryText(summary(T, w)), /Zuletzt gearbeitet an: Verteiler/);
});

test('S4 – Prüfung nicht möglich: offene Knoten bleiben offen', () => {
  const s = run([...GRUND, 'Z1:np', 'K1:laeuft', 'K2:trocken', 'K3:np', 'E1:led', 'E2:ok']);
  assert.equal(s.result, 'END_E2_PRESSOPEN', 'Kerzen trocken, Druck offen: erst Druck prüfen lassen');
  const sm = summary(T, s);
  assert.deepEqual(sm.open.map((o) => o.node), ['Z1', 'K3']);
  assert.equal(sm.open[0].reason, 'Werkzeug fehlt');
  assert.ok(!sm.checked.some((c) => /Zündfunke/.test(c.text)), 'Z1 gilt weder als bestanden noch als durchgefallen');
  assert.deepEqual(sm.likely, []);
  const text = summaryText(sm);
  assert.match(text, /Noch offen[\s\S]*Zündfunke an einer Kerze/);
  // wurde Z1 offen gelassen, zieht E1 keinen Schluss über die Zündung
  assert.ok(!/Zündspule|Hallgeber/.test(sm.result.text));
  // ein offener Knoten gilt später als erledigt, wenn er doch nachgeholt wird
  const nach = run([...GRUND, 'Z1:np', 'K1:laeuft', 'K2:trocken', 'K3:np', 'E1:led', 'E2:eins', 'E3:ok', 'M1:ok']);
  assert.equal(nach.status, 'finished');
});

test('S5 – Referenzfall: Batterie 12,6 V, Klemme 15 12,5 V, Hallgeber 11,8 V', () => {
  const s = run([...GRUND, 'Z1:keiner', 'Z2:keiner', ['Z4:ok', { v: 12.5 }], ['Z5:ok', { v: 11.8 }]]);
  assert.equal(s.status, 'running');
  assert.equal(s.current, 'Z6', 'als Nächstes das Hallgeber-Signal');
  assert.ok(s.history.some((e) => e.node === 'Z2'), 'Z2 wurde vorher gefragt');
  const sm = summary(T, s);
  const text = summaryText(sm, (d) => d);
  assert.match(text, /Batterie \(Ruhe\): 12,6 V/);
  assert.match(text, /Zündspule Klemme 15: 12,5 V/);
  assert.match(text, /Hallgeber-Versorgung: 11,8 V/);
  assert.match(text, /Kein Zündfunke festgestellt/);
  assert.match(text, /Als Nächstes: Hallgeber-Signal/);
  assert.match(text, /Hallgeber defekt/);
  assert.match(text, /Zündspule defekt/);
  assert.match(text, /Steuergerät defekt/);
  assert.ok(!/Ergebnis:/.test(text), 'noch kein Ergebnis');
  assert.equal(sm.status, 'running');
  // weiter: Hallgeber liefert Signal → Zündspulen-Ansteuerung
  assert.equal(run([['Z6:led']], s).current, 'Z7');
});

test('Zurück ändert den Baum konsistent', () => {
  let s = run(['G1:normal', 'G2:genug', 'G3:nicht', 'G4:arbeiten', 'Z1:keiner', 'Z2:keiner']);
  assert.equal(s.current, 'Z4');
  assert.ok(flagsOf(T, s).has('recentWork'));
  s = goBack(T, s);
  assert.equal(s.current, 'Z2');
  assert.equal(s.history.length, 5);
  s = run([['Z2:funke']], s);
  assert.equal(s.current, 'Z3a', 'anderer Zweig nach anderer Antwort');
  assert.ok(!s.history.some((e) => e.node === 'Z4'));
  // bis hinter den Merker zurück: der Merker verschwindet
  while (s.history.length > 3) s = goBack(T, s);
  assert.equal(s.current, 'G4');
  assert.ok(!flagsOf(T, s).has('recentWork'));
  // von einem Ende zurück
  const end = run([...GRUND, 'Z1:funke', 'K1:still', 'K1a:keine']);
  assert.equal(end.status, 'finished');
  const back = goBack(T, end);
  assert.equal(back.status, 'running');
  assert.equal(back.current, 'K1a');
  assert.equal(back.result, null);
  assert.equal(goBack(T, fresh()).current, 'G1', 'am Anfang bleibt alles beim Alten');
});

test('Neustart während einer laufenden Diagnose: Sitzung übersteht das Speichern', () => {
  const mid = run([...GRUND, 'Z1:keiner', 'Z2:keiner', ['Z4:ok', { v: 12.5 }]]);
  const reloaded = JSON.parse(JSON.stringify(mid));
  assert.deepEqual(reloaded, mid);
  assert.equal(currentNode(T, reloaded).id, 'Z5');
  const done = run([['Z5:ok', { v: 11.8 }], 'Z6:led', 'Z7:led', 'Z8:keiner'], reloaded);
  assert.equal(done.result, 'END_Z8_COIL');
  assert.equal(done.identity.code, 'MV');
  assert.equal(done.identity.family, 'Wasserboxer 2,1 l');
  assert.equal(done.date, '2026-10-30');
  assert.equal(abandon(mid).status, 'abandoned');
  assert.equal(abandon(done).status, 'finished', 'ein beendetes Protokoll bleibt beendet');
});

test('Eingaben: Maßnahmen zählen nicht als Prüfungen, falsche Antworten werden abgelehnt', () => {
  const s = run(['G1:normal', 'G2:leer', 'F_G2:nicht']);
  assert.equal(s.current, 'G3');
  assert.ok(flagsOf(T, s).has('tankWasEmpty'));
  assert.equal(run(['G1:normal', 'G2:leer', 'F_G2:laeuft']).result, 'END_G2_RUNS');
  assert.equal(run(['G1:schwach']).result, 'END_G1_STARTER');
  assert.equal(run(['G1:unsicher']).current, 'G2');
  assert.ok(flagsOf(T, run(['G1:unsicher'])).has('startRpmUnclear'));
  assert.equal(run([...GRUND.slice(0, 3), 'G4:leck']).result, 'END_G4_LEAK');
  assert.throws(() => answerNode(T, fresh(), 'gibtsnicht'));
  assert.throws(() => answerNode(T, run(['G1:schwach']), 'normal'), 'am Ende gibt es nichts mehr zu beantworten');
});

test('Reparatur-Verknüpfung nur dort, wo es einen passenden Guide gibt', async () => {
  const { GUIDES } = await import('../js/data/guides.js');
  const withGuide = Object.values(T.nodes).filter((n) => n.guide);
  assert.deepEqual(withGuide.map((n) => n.id), ['F_Z3_KERZE']);
  for (const n of withGuide) assert.ok(GUIDES.some((g) => g.id === n.guide), `Guide ${n.guide} existiert`);
  const s = run([...GRUND, 'Z1:keiner', 'Z2:funke', 'Z3a:dreht', 'Z3b:ok', 'Z3c:ok', 'Z3d:schaden']);
  assert.equal(s.current, 'F_Z3_KERZE');
  assert.equal(summary(T, run([['F_Z3_KERZE:erneuert']], s)).actions[0].text, 'Beschädigte Zündkerze erneuert');
});

test('Alle denkbaren Wege: kein Bauteil als wahrscheinlich ohne seine Voraussetzungen, nie ein Teiletausch aus einem einzelnen Befund', () => {
  // Zufällige, aber reproduzierbare Läufe durch den Baum: jede Antwort und „nicht möglich“ kommen vor.
  let seed = 12345;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ends = new Set();
  const ok = (s, cond) => (cond.any ? cond.any.some((c) => ok(s, c)) : (() => { const e = [...s.history].reverse().find((h) => h.node === cond.node); return !!e && [].concat(cond.is).includes(e.answer); })());
  let paths = 0;
  for (let run = 0; run < 20000; run++) {
    let s = fresh();
    for (let step = 0; step < 80 && s.status !== 'finished'; step++) {
      const node = currentNode(T, s);
      const r = rnd();
      s = r < 0.15 ? markNotPossible(T, s, 'tool') : answerNode(T, s, node.answers[Math.floor(rnd() * node.answers.length)].id, {});
    }
    if (s.status !== 'finished') continue;
    paths += 1;
    ends.add(s.result);
    for (const c of T.nodes[s.result].requires || []) assert.ok(ok(s, c), `${s.result} ohne ${JSON.stringify(c)}`);
    // „nicht möglich“ wird nie als bestanden gezählt
    for (const e of s.history.filter((h) => h.answer === NOT_POSSIBLE)) assert.ok(!summary(T, s).checked.some((c) => c.node === e.node) || s.history.some((h) => h.node === e.node && h.answer !== NOT_POSSIBLE));
  }
  // jeder Endknoten im Baum wird auch erreicht (kein toter Text)
  const all = Object.values(T.nodes).filter((n) => n.end).map((n) => n.id);
  assert.deepEqual(all.filter((id) => !ends.has(id)), []);
});

test('Prüfstand: B- und C-Knoten sind benannt', () => {
  const v = toVerify(T);
  assert.ok(v.some((x) => x.id === 'K3' && x.source === 'B'));
  assert.ok(v.every((x) => ['B', 'C'].includes(x.source)));
  assert.ok(!v.some((x) => x.id === 'Z5'));
});

test('Alte Daten und Backups bleiben gültig', () => {
  const alt = { format: 't3hub-backup', version: 1, exportedAt: '2026-10-01T00:00:00Z', vehicles: [{ id: 'v' }], fuels: [], services: [], log: [], tours: [] };
  assert.equal(checkBackup(alt).ok, true);
  assert.equal(checkBackup(alt).counts.diagnoses, 0);
  const neu = buildBackup({ ...alt, diagnoses: [{ id: 'd1', vehicleId: 'v', status: 'finished' }] });
  assert.equal(neu.diagnoses.length, 1);
  assert.equal(checkBackup(JSON.parse(JSON.stringify(neu))).counts.diagnoses, 1);
  assert.equal(buildBackup(alt).diagnoses.length, 0);
  assert.match(checkBackup({ ...neu, diagnoses: [{}] }).error, /beschädigt/);
});

test('Andere Fehlerfälle in der Elektrik funktionieren weiter', () => {
  const ids = FAULTS.map((f) => f.id);
  for (const id of ['blinker', 'licht', 'luefter', 'anzeigen', 'anlasser', 'lima', 'hupe', 'bremslicht', 'wischer']) assert.ok(ids.includes(id), id);
  const wiring = { wires: [], title: 't' };
  const andere = elektrikView(wiring, { diagnose: false });
  assert.match(andere, /data-el-fault="pumpe"/, 'bei anderen Motoren bleibt die bisherige Fehlersuche');
  assert.doesNotMatch(andere, /open-diagnose/);
  const mv = elektrikView(wiring, { diagnose: true });
  assert.doesNotMatch(mv, /data-el-fault="pumpe"/, 'beim MV gibt es keine zweite, widersprüchliche Diagnose');
  assert.match(mv, /data-action="open-diagnose"/);
  for (const id of ['blinker', 'anlasser', 'wischer']) assert.match(mv, new RegExp(`data-el-fault="${id}"`));
});
