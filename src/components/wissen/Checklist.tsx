"use client";

import { useRef, useState } from "react";
import { trackEvent } from "@/lib/tracking";

type Item = { id: string; label: string; prompt: string };
type Row = { reference: string; finding: string; status: string; owner: string; next: string; due: string };
const emptyRow = (): Row => ({ reference: "", finding: "", status: "offen", owner: "", next: "", due: "" });
const eventContext = { content_id: "ausschreibung-gebaeudereinigung-pruefen", revision: 1 };

export default function Checklist({ items, statuses }: { items: Item[]; statuses: string[] }) {
  const [rows, setRows] = useState<Row[]>(() => items.map(emptyRow));
  const [resetOpen, setResetOpen] = useState(false);
  const editStarted = useRef(false);

  function update(index: number, field: keyof Row, value: string) {
    setRows((previous) => previous.map((row, i) => i === index ? { ...row, [field]: value } : row));
    if (!editStarted.current) {
      editStarted.current = true;
      trackEvent("checklist_edit_started", eventContext);
    }
  }

  return <div className="knowledge-worksheet" id="checkliste">
    <div className="knowledge-screen-only worksheet-toolbar">
      <div><p className="knowledge-eyebrow">Ihre eigene Vorlage</p><h3>12 Prüfpunkte. Platz für Ihre offenen Fragen.</h3></div>
      <button type="button" className="btn-primary knowledge-button" onClick={() => {
        trackEvent("checklist_print_clicked", eventContext);
        window.print();
      }}>Druckansicht öffnen <span aria-hidden="true">↗</span></button>
    </div>
    <p className="knowledge-screen-only worksheet-note">Ohne Account. Ihre Einträge bleiben im geöffneten Tab und werden von dieser Checkliste nicht an einen Server gesendet. Beim Neuladen gehen sie verloren. Die Druckansicht enthält Ihre Vorlage und die zwei fiktiven Beispielzeilen; dort können Sie auch „Als PDF speichern“ wählen.</p>
    <noscript><p>Zum Ausfüllen im Browser aktivieren Sie JavaScript. Die leere Druckvorlage können Sie auch über die Druckfunktion Ihres Browsers nutzen.</p></noscript>
    <div className="knowledge-screen-only worksheet-rows">
      {items.map((item, index) => <details key={item.id} className="worksheet-row" open={index === 0 ? true : undefined}>
        <summary><span className="worksheet-number">{String(index + 1).padStart(2, "0")}</span><span>{item.label}</span><span className="worksheet-status">{rows[index].status}</span><span aria-hidden="true" className="worksheet-plus">+</span></summary>
        <div className="worksheet-fields">
          <p className="worksheet-prompt">{item.prompt}</p>
          <label>Original / Fundstelle<textarea rows={2} autoComplete="off" value={rows[index].reference} onChange={(event) => update(index, "reference", event.target.value)} placeholder="Datei, Stand, Seite oder Abschnitt" /></label>
          <label>Befund<textarea rows={2} autoComplete="off" value={rows[index].finding} onChange={(event) => update(index, "finding", event.target.value)} placeholder="Was ist belegt, was bleibt unklar?" /></label>
          <label>Status<select value={rows[index].status} onChange={(event) => update(index, "status", event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Zuständig<input autoComplete="off" value={rows[index].owner} onChange={(event) => update(index, "owner", event.target.value)} placeholder="Person oder Rolle" /></label>
          <label>Nächster Schritt<textarea rows={2} autoComplete="off" value={rows[index].next} onChange={(event) => update(index, "next", event.target.value)} placeholder="Welche Klärung oder Prüfung folgt?" /></label>
          <label>Interner Termin<input autoComplete="off" value={rows[index].due} onChange={(event) => update(index, "due", event.target.value)} placeholder="Eigener Arbeitstermin, keine Verfahrensfrist" /></label>
        </div>
      </details>)}
    </div>
    <div className="knowledge-print-only">
      <h3>Eigene Prüfliste – Ihre Einträge</h3>
      <p>Verfahren / Los: ____________________________________ &nbsp; Bearbeitungsstand: __________________</p>
      <table className="worksheet-print-table"><thead><tr><th>Prüfpunkt</th><th>Original / Fundstelle</th><th>Befund</th><th>Status</th><th>Zuständig</th><th>Nächster Schritt / interner Termin</th></tr></thead><tbody>
        {items.map((item, index) => <tr key={item.id}><th scope="row">{item.label}</th><td>{rows[index].reference || "—"}</td><td>{rows[index].finding || "—"}</td><td>{rows[index].status}</td><td>{rows[index].owner || "—"}</td><td>{rows[index].next || "—"}{rows[index].due && <><br /><strong>Intern: </strong>{rows[index].due}</>}</td></tr>)}
      </tbody></table>
      <p className="print-footnote">„Offen“ ist keine Bestätigung. Originalunterlagen und tatsächliche Verfahrensfristen zusätzlich prüfen.</p>
    </div>
    <div className="knowledge-screen-only worksheet-reset">
      {resetOpen ? <div role="group" aria-label="Eingaben löschen bestätigen"><p>Alle selbst eingetragenen Angaben in dieser Vorlage löschen?</p><button type="button" onClick={() => { setRows(items.map(emptyRow)); setResetOpen(false); }}>Ja, Eingaben löschen</button><button type="button" onClick={() => setResetOpen(false)}>Behalten</button></div> : <button type="button" onClick={() => setResetOpen(true)}>Eingaben zurücksetzen</button>}
    </div>
  </div>;
}
