"use client";

import { useState } from "react";
import { PRICE_SHEET_CHECKS, priceSheetExample, euro, type ExerciseStage } from "@/lib/price-sheet-exercise";
import { trackEvent } from "@/lib/tracking";

const STAGES = ["Fehler entdecken", "Menge & Summe berichtigt", "Offene Position bepreist", "Änderung gegenprüfen"];
const DESCRIPTIONS = [
  "Drei absichtliche Fehler: Glas wird zwölfmal statt zweimal angesetzt; die Summe endet zu früh; die Sonderleistung ist leer. 15.000 € sehen vollständig aus, sind es aber nicht.",
  "Glas steht jetzt auf zwei Terminen und das Treppenhaus ist enthalten. 11.100 € sind nur die bekannte Teilsumme: Der Preis der Sonderleistung bleibt offen.",
  "Nur in dieser erfundenen Übung wird die Sonderleistung bewusst mit 250 € angesetzt. Die vollständige Beispielsumme beträgt damit 11.350 € netto für zwölf Monate.",
  "Der erfundene Glaspreis steigt von 450 € auf 500 € je Termin. Bei zwei Terminen muss die Summe um 100 € auf 11.450 € steigen. Würden noch 11.350 € angezeigt, wäre die Änderung nicht im Ergebnis angekommen.",
];
type CheckState = { status: string; evidence: string; action: string };
export default function PriceSheetExercise() {
  const [stage, setStage] = useState<ExerciseStage>(0);
  const [file, setFile] = useState("");
  const [original, setOriginal] = useState("");
  const [application, setApplication] = useState("");
  const [decision, setDecision] = useState("");
  const [checks, setChecks] = useState<CheckState[]>(() => PRICE_SHEET_CHECKS.map(() => ({ status: "Offen", evidence: "", action: "" })));
  const example = priceSheetExample(stage);
  const evidenced = checks.filter(c => c.status === "Belegt").length;
  function update(index: number, field: keyof CheckState, value: string) {
    setChecks(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  function changeStage(next: ExerciseStage) {
    setStage(next);
    trackEvent("price_sheet_example_changed", { content_id: "excel-preisblatt-pruefen", revision: 1 });
  }
  return <>
    <section id="uebung" className="price-exercise">
      <p className="fictional-label">Fiktives Preisblatt · alle Zahlen sind erfunden</p>
      <h2>Eine plausible Summe. Drei übersehene Fehler.</h2>
      <p>Gehen Sie die vier Zustände durch. Alle Positionen beziehen sich auf denselben Zeitraum von zwölf Monaten und sind netto. Dies ist eine HTML-Übung, keine Prüfung einer hochgeladenen Excel-Datei.</p>
      <div className="price-stages knowledge-screen-only" aria-label="Zustand des Beispielpreisblatts">{STAGES.map((name, i) => <button key={name} type="button" aria-pressed={stage === i} onClick={() => changeStage(i as ExerciseStage)}><span>{i + 1}</span>{name}</button>)}</div>
      <div className="knowledge-table-scroll"><table><caption>Beispielpreisblatt · Zustand {stage + 1}: {STAGES[stage]}</caption><thead><tr><th scope="col">Leistung</th><th scope="col">Menge / Einheit</th><th scope="col">Einzelpreis netto</th><th scope="col">Zeilensumme</th><th scope="col">In angezeigter Summe?</th></tr></thead><tbody>{example.rows.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.quantity} {row.unit}</td><td>{row.priceCents === null ? <strong>Offen</strong> : euro(row.priceCents)}</td><td>{row.totalCents === null ? "Nicht bepreist" : euro(row.totalCents)}</td><td>{row.included ? "Ja" : "Nein – Bereich endet vorher"}</td></tr>)}</tbody></table></div>
      <div className="price-result" aria-live="polite" aria-atomic="true"><div><span>{stage === 0 ? "Fehlerhafte angezeigte Summe" : !example.complete ? "Bekannte Teilsumme · unvollständig" : "Summe des vollständig bepreisten Beispiels"}</span><strong>{euro(example.sumCents)}</strong><small>netto / zwölf Monate</small></div><p>{DESCRIPTIONS[stage]}</p></div>
      {stage >= 2 && <p><strong>Unabhängiger zweiter Rechenweg:</strong> (800 € + 50 €) × 12 Monate + {stage === 3 ? "500" : "450"} € × 2 Termine + 250 € = <strong>{euro(example.controlCents!)}</strong> netto. Hier werden zuerst die monatlichen Leistungen zusammengefasst.</p>}
      <p className="article-small">Die Übung verändert eigene Beispieldaten. In einem vorgegebenen Preisblatt dokumentieren Sie Unklarheiten und klären die erlaubte Korrektur, bevor Sie geschützte oder vorgegebene Formeln verändern.</p>
    </section>
    <section id="pruefprotokoll" className="price-protocol">
      <p className="knowledge-eyebrow">Ihr Arbeitsblatt · bleibt in diesem Tab</p>
      <h2>Sieben Prüfungen mit einer nachprüfbaren Fundstelle.</h2>
      <p>Kein Upload, keine automatische Dateiprüfung. Notieren Sie die Fundstelle im eigenen Preisblatt und die noch erforderliche Handlung. Eingaben werden weder übertragen noch dauerhaft gespeichert; beim Neuladen gehen sie verloren. Speichern Sie bei Bedarf einen Ausdruck über Ihren Browser.</p>
      <div className="price-protocol-meta">
        <label>Original / Versionsstand<input autoComplete="off" value={original} onChange={e => setOriginal(e.target.value)} placeholder="z. B. Preisblatt V3 vom …" maxLength={200} /></label>
        <label>Exakter Name der Abgabedatei<input autoComplete="off" value={file} onChange={e => setFile(e.target.value)} placeholder="z. B. Angebot_final.xlsx" maxLength={200} /></label>
        <label>Excel-Version / Plattform<input autoComplete="off" value={application} onChange={e => setApplication(e.target.value)} placeholder="z. B. Excel … / Windows" maxLength={200} /></label>
      </div>
      <label>Interne Freigabe: zuständig / Entscheidung / Termin (optional)<textarea rows={2} maxLength={800} value={decision} onChange={e => setDecision(e.target.value)} placeholder="Wer entscheidet über die Abgabe, wann und unter welchen Voraussetzungen?" /></label>
      <p className="price-progress">{evidenced} von 7 Prüfungen als belegt markiert. Das ist keine automatische Freigabe zur Abgabe.</p>
      <div className="price-checks">{PRICE_SHEET_CHECKS.map((name, i) => <fieldset key={name}><legend><span>{i + 1}</span> {name}</legend><label>Status<select value={checks[i].status} onChange={e => update(i, "status", e.target.value)}><option>Offen</option><option>Belegt</option><option>Nicht zutreffend – begründen</option></select></label><label>Fundstelle / Ergebnis / Begründung<textarea rows={2} maxLength={600} value={checks[i].evidence} onChange={e => update(i, "evidence", e.target.value)} placeholder="z. B. Blatt 1, D24: Summe enthält Zeile 23 nicht …" /></label><label>Nächste Handlung<textarea rows={2} maxLength={400} value={checks[i].action} onChange={e => update(i, "action", e.target.value)} placeholder="Was muss vor der internen Freigabe noch geklärt werden?" /></label></fieldset>)}</div>
      <div className="knowledge-print-only price-print-protocol"><p><strong>Original:</strong> {original || "Nicht eingetragen"}<br/><strong>Abgabedatei:</strong> {file || "Nicht eingetragen"}<br/><strong>Version / Plattform:</strong> {application || "Nicht eingetragen"}<br/><strong>Interne Freigabe:</strong> {decision || "Nicht eingetragen"}</p>{checks.map((c,i) => <div key={i}><h3>{i+1}. {PRICE_SHEET_CHECKS[i]} · {c.status}</h3><p><strong>Beleg:</strong> {c.evidence || "Nicht eingetragen"}</p><p><strong>Nächste Handlung:</strong> {c.action || "Nicht eingetragen"}</p></div>)}</div>
      <button type="button" className="btn-primary knowledge-button knowledge-screen-only" onClick={() => { trackEvent("price_sheet_print_clicked", { content_id: "excel-preisblatt-pruefen", revision: 1 }); window.print(); }}>Beispiel & Prüfprotokoll drucken <span aria-hidden="true">↗</span></button>
    </section>
  </>;
}
