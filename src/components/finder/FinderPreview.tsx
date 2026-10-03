"use client";

import { useState, type FormEvent } from "react";
import type { ExampleCard } from "@/lib/finder/examples";
import { FINDER_RADII, parseFinderQuery } from "@/lib/finder/schema";

type ExampleResult = { postcode: string; radiusKm: number; items: ExampleCard[] };

export default function FinderPreview() {
  const [postcode, setPostcode] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [result, setResult] = useState<ExampleResult | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function reset() { setResult(null); setMessage(""); }

  async function search(mode: "example" | "live") {
    const parsed = parseFinderQuery({ postcode, radiusKm });
    setResult(null);
    if (!parsed.ok) { setMessage(parsed.message); return; }
    setPending(true); setMessage("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`/api/ausschreibungsfinder${mode === "example" ? "/beispiel" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.query), signal: controller.signal, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) { setMessage(typeof body.message === "string" ? body.message : "Die Suche ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut."); return; }
      if (mode !== "example" || body.mode !== "example" || !Array.isArray(body.items)) { setMessage("Die Live-Suche ist noch nicht freigeschaltet. Bitte nutzen Sie die fiktiven Beispiele."); return; }
      setResult({ postcode: parsed.query.postcode, radiusKm: parsed.query.radiusKm, items: body.items });
    } catch { setMessage("Die Vorschau konnte nicht geladen werden. Bitte versuchen Sie es erneut."); }
    finally { clearTimeout(timeout); setPending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search("example"); }

  return <section className="finder-workspace" aria-label="Ausschreibungsfinder ausprobieren">
    <form className="finder-search" onSubmit={submit}>
      <div className="finder-search-heading"><span className="finder-step" aria-hidden="true">01</span><div><h2>Ihr Suchgebiet</h2><p>PLZ eingeben, Umkreis wählen, Beispiel ansehen.</p></div></div>
      <div className="finder-controls">
        <div className="finder-input-group"><label htmlFor="finder-postcode">Postleitzahl</label><input id="finder-postcode" name="postcode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} placeholder="z. B. 76275" required value={postcode} disabled={pending} aria-describedby="finder-example-note" onChange={(e) => { setPostcode(e.target.value); reset(); }} /></div>
        <div className="finder-input-group"><label htmlFor="finder-radius">Umkreis</label><select id="finder-radius" name="radius" value={radiusKm} disabled={pending} onChange={(e) => { setRadiusKm(Number(e.target.value)); reset(); }}>{FINDER_RADII.map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></div>
        <button type="submit" className="finder-primary" disabled={pending}>{pending ? "Wird geladen …" : "Beispiel ansehen"}<span aria-hidden="true">→</span></button>
      </div>
      <div className="finder-search-foot"><p id="finder-example-note">Im Beispiel wird die PLZ nur auf ihr Format geprüft. Standorte und Entfernungen sind erfunden.</p><button type="button" className="finder-text-button" disabled={pending} onClick={() => void search("live")}>Live-Verfügbarkeit prüfen</button></div>
    </form>

    <div className="finder-status" role="status" aria-live="polite" aria-atomic="true">{message || (result ? `${result.items.length} fiktive Beispiele geladen. Keine echten Ausschreibungen.` : pending ? "Die Beispielansicht wird geladen." : "")}</div>

    {result ? <div className="finder-results" aria-label="Fiktive Beispielergebnisse" data-nosnippet>
      <div className="finder-results-heading"><div><p className="finder-eyebrow">So könnte Ihre Ergebnisliste aussehen</p><h2>{result.items.length} fiktive Beispiele</h2></div><span className="finder-query-chip">Eingabe {result.postcode} · {result.radiusKm} km</span></div>
      <p className="finder-results-note"><strong>Keine aktuellen Ausschreibungen.</strong> Alle Fälle, Fristen und Entfernungen sind frei erfunden. Sie werden nicht Ihrer eingegebenen PLZ zugeordnet. Die Beispielansicht enthält keine Originalquellen.</p>
      <div className="finder-card-grid">{result.items.map((item) => <article className="finder-result-card" key={item.id}>
        <div className="finder-card-top"><span className="finder-category">{item.serviceLabel}</span><span className="finder-example-badge">Fiktives Beispiel</span></div>
        <p className="finder-card-type">Wettbewerbsbekanntmachung · Beispiel</p>
        <h3>{item.title}</h3>
        <p className="finder-location"><span aria-hidden="true">⌖</span> {item.locationLabel}</p>
        <dl className="finder-card-facts"><div><dt>{item.deadlineKind === "request" ? "Teilnahmefrist" : "Angebotsfrist"}</dt><dd>{item.deadlineLabel}</dd></div><div><dt>Fiktive Entfernung</dt><dd>ca. {item.distanceKm} km</dd></div></dl>
        {item.deadlineKind === "request" && <p className="finder-request-note">Hier wäre zunächst die Teilnahme zu beantragen. Das ist keine Angebotsfrist.</p>}
        <div className="finder-card-source"><span>Quelle: {item.sourceLabel}</span><span>Quellenstand: {item.sourceStatusLabel}</span></div>
        <details className="finder-card-detail"><summary>Beispiel einordnen <span aria-hidden="true">+</span></summary><p>{item.scopeLabel}. Ein echter Treffer würde zum aktuellen Originalverfahren führen. Für dieses erfundene Beispiel gibt es keine Vergabeunterlagen und keine Möglichkeit, ein Angebot abzugeben.</p></details>
      </article>)}</div>
      <p className="finder-results-end">Ende der Beispielansicht. Es wurde keine Live-Datenbank durchsucht.</p>
    </div> : <div className="finder-empty" aria-hidden={pending ? "true" : undefined}><div className="finder-empty-mark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><circle cx="28" cy="27" r="15" stroke="currentColor" strokeWidth="2"/><path d="m39 38 13 13M22 27h12m-6-6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><div><h2>Erst ausprobieren. Dann gezielt suchen.</h2><p>Die Vorschau zeigt Ihnen, wie Umkreis, Fristart und Quellenstand zusammenkommen. Die Live-Suche ist noch nicht freigeschaltet.</p></div></div>}
  </section>;
}
