"use client";

import { useRef, useState } from "react";
import { trackEvent } from "@/lib/tracking";

type Item = { id: string; label: string; prompt: string };

export default function Checklist({ items, revision }: { items: Item[]; revision: number }) {
  const [checked, setChecked] = useState<string[]>([]);
  const editStarted = useRef(false);
  const context = { content_id: "ausschreibung-gebaeudereinigung-pruefen", revision };
  const openItems = items.filter((item) => !checked.includes(item.id));

  function toggle(id: string) {
    setChecked((previous) => previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]);
    if (!editStarted.current) {
      editStarted.current = true;
      // Fixed content context only; no individual checkbox or state is sent.
      trackEvent("checklist_edit_started", context);
    }
  }

  return <section className="compact-checklist" id="checkliste" aria-labelledby="checklist-heading">
    <div className="compact-checklist-toolbar knowledge-screen-only"><h2 id="checklist-heading">Die 5-Punkte-Checkliste</h2><button type="button" className="compact-checklist-print" onClick={() => { trackEvent("checklist_print_clicked", context); window.print(); }}>Übersicht drucken <span aria-hidden="true">↗</span></button></div>
    <div className="compact-checklist-progress knowledge-screen-only"><p role="status" aria-live="polite" aria-atomic="true"><strong>{checked.length} von {items.length}</strong> selbst abgehakt</p><span>Keine fachliche Freigabe</span></div>
    <ul className="compact-checklist-items knowledge-screen-only">
      {items.map((item, index) => <li key={item.id} className={checked.includes(item.id) ? "is-checked" : undefined}>
        <label htmlFor={`checklist-${item.id}`}><input id={`checklist-${item.id}`} type="checkbox" checked={checked.includes(item.id)} onChange={() => toggle(item.id)} aria-labelledby={`checklist-label-${item.id}`} aria-describedby={`checklist-help-${item.id}`} /><span><span className="compact-checklist-label" id={`checklist-label-${item.id}`}>{index + 1}. {item.label}</span><span className="compact-checklist-help" id={`checklist-help-${item.id}`}>{item.prompt}</span></span></label>
      </li>)}
    </ul>
    <div className="compact-checklist-foot knowledge-screen-only"><p>Nur in diesem Tab; beim Neuladen gehen die Haken verloren. Unklare Punkte bleiben offen.</p><button type="button" disabled={checked.length === 0} onClick={() => setChecked([])}>Haken entfernen</button></div>
    <noscript><p className="knowledge-screen-only">Zum Abhaken aktivieren Sie JavaScript. Die Übersicht lässt sich auch über Ihren Browser drucken.</p></noscript>
    <div className="knowledge-print-only compact-checklist-printout">
      <h2>Fünf Punkte im Überblick</h2><p>{checked.length} von {items.length} selbst abgehakt · keine fachliche Freigabe</p>
      <ol>{items.map((item) => <li key={item.id}><span>{item.label}</span><strong>{checked.includes(item.id) ? "Selbst abgehakt" : "Offen"}</strong></li>)}</ol>
      <h2>Offene Punkte</h2>
      {openItems.length ? <ul>{openItems.map((item) => <li key={item.id}><strong>{item.label}</strong><p>{item.prompt}</p></li>)}</ul> : <p>Keine offenen Haken. Das ist Ihre Selbsteinschätzung, keine fachliche oder rechtliche Bestätigung.</p>}
      <p className="compact-checklist-print-note">Originalunterlagen und tatsächliche Verfahrensfristen bleiben maßgeblich. Vor der Abgabe den aktuellen Stand erneut prüfen.</p>
    </div>
  </section>;
}
