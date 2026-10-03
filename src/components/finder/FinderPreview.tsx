"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FINDER_RADII, parseFinderQuery } from "@/lib/finder/schema";

type FinderCard = { id: string; title: string; serviceLabel: string; locationLabel: string; distanceKm: number; deadlineKind: "tender" | "request"; deadlineAt: string; sourceUrl: string; sourceStatusCheckedAt: string };
type SearchResult = { postcode: string; radiusKm: number; items: FinderCard[]; nextCursor: string | null; pages: number };
const dateFormat = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const timestamp = (value: unknown): value is string => typeof value === "string" && /T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));

function validCard(value: unknown): value is FinderCard {
  if (!value || typeof value !== "object") return false;
  const card = value as FinderCard;
  return text(card.id, 64) && text(card.title, 240) && text(card.serviceLabel, 100) && text(card.locationLabel, 160)
    && Number.isFinite(card.distanceKm) && card.distanceKm >= 0 && card.distanceKm <= 100
    && ["tender", "request"].includes(card.deadlineKind) && timestamp(card.deadlineAt) && timestamp(card.sourceStatusCheckedAt)
    && typeof card.sourceUrl === "string" && /^https:\/\/ted\.europa\.eu\/(?:de|en)\/notice\/-\/detail\/\d{1,8}-\d{4}$/.test(card.sourceUrl);
}

function failureMessage(status: number, body: { message?: unknown }): string {
  if (status === 429) return "Ihr Suchkontingent ist vorübergehend ausgeschöpft. Pro Browser sind bis zu 8 Suchläufe mit 3 unterschiedlichen PLZ innerhalb von 24 Stunden möglich; bei schnellen Abrufen greifen zusätzliche Kurzzeitlimits. Bitte warten Sie bis zur Freigabe. Das ist keine Aussage über verfügbare Ausschreibungen.";
  if (status === 403) return "Die Sicherheitsprüfung konnte nicht bestätigt werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.";
  if (status === 400 && text(body.message, 300)) return body.message;
  return "Die Suche ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut. Es wurde kein verlässliches Suchergebnis geladen.";
}

export default function FinderPreview() {
  const [postcode, setPostcode] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function reset() { setResult(null); setMessage(""); }

  async function search(more = false) {
    if (request.current) return;
    const previous = more ? result : null;
    if (more && (!previous?.nextCursor || previous.pages >= 2 || previous.items.length >= 20)) return;
    const parsed = parseFinderQuery(previous ? { postcode: previous.postcode, radiusKm: previous.radiusKm, cursor: previous.nextCursor } : { postcode, radiusKm });
    if (!more) setResult(null);
    if (!parsed.ok) { setMessage(parsed.message); return; }
    setPending(true); setMessage("");
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/ausschreibungsfinder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.query), signal: controller.signal, cache: "no-store", credentials: "same-origin" });
      const body = await response.json();
      if (!response.ok) { setMessage(failureMessage(response.status, body ?? {})); return; }
      if (!body || body.mode !== "live" || !Array.isArray(body.items) || body.items.length > 10 || !body.items.every(validCard)
        || !(body.nextCursor === null || (typeof body.nextCursor === "string" && /^[A-Za-z0-9_-]{20,1536}$/.test(body.nextCursor)))) throw new Error("invalid_response");
      const items = [...(previous?.items ?? []), ...body.items] as FinderCard[];
      if (new Set(items.map((item) => item.id)).size !== items.length || items.length > 20) throw new Error("invalid_page");
      setResult({ postcode: parsed.query.postcode, radiusKm: parsed.query.radiusKm, items, nextCursor: previous ? null : body.nextCursor, pages: previous ? 2 : 1 });
    } catch { setMessage("Die Suche konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut. Dies ist kein Ergebnis mit null Treffern."); }
    finally { clearTimeout(timeout); request.current = null; setPending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search(); }

  return <section className="finder-workspace" aria-label="Ausschreibungen im Pilotbestand suchen" aria-busy={pending}>
    <form className="finder-search" onSubmit={submit}>
      <div className="finder-search-heading"><span className="finder-step" aria-hidden="true">01</span><div><h2>Ihr Suchgebiet</h2><p>PLZ eingeben, Umkreis wählen, echte Bekanntmachungen prüfen.</p></div></div>
      <div className="finder-controls">
        <div className="finder-input-group"><label htmlFor="finder-postcode">Postleitzahl</label><input id="finder-postcode" name="postcode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} placeholder="Ihre PLZ" required value={postcode} disabled={pending} aria-describedby="finder-search-note" onChange={(event) => { setPostcode(event.target.value); reset(); }} /></div>
        <div className="finder-input-group"><label htmlFor="finder-radius">Umkreis</label><select id="finder-radius" name="radius" value={radiusKm} disabled={pending} onChange={(event) => { setRadiusKm(Number(event.target.value)); reset(); }}>{FINDER_RADII.map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></div>
        <button type="submit" className="finder-primary" disabled={pending}>{pending ? "Suche läuft …" : "Ausschreibungen suchen"}<span aria-hidden="true">→</span></button>
      </div>
      <div className="finder-search-foot"><p id="finder-search-note">Kostenlos und ohne Anmeldung. Gesucht wird nur im kleinen, geprüften TED-Pilotbestand. Die Entfernung ist eine ungefähre Luftlinie zwischen PLZ-/Ortsreferenzpunkten.</p></div>
    </form>

    <div className={`finder-status${message ? " finder-status-warning" : ""}`} role="status" aria-live="polite" aria-atomic="true">{message || (pending ? "Der geprüfte Pilotbestand wird durchsucht." : result ? `${result.items.length} Treffer in dieser begrenzten Ergebnisansicht.` : "")}</div>

    {result ? <div className="finder-results" aria-label="Ergebnisse aus dem TED-Pilotbestand" data-nosnippet>
      <div className="finder-results-heading"><div><p className="finder-eyebrow">Geprüfter TED-Pilotbestand</p><h2>{result.items.length ? `${result.items.length} Treffer in Ihrer Auswahl` : "Kein passender Treffer im Pilot"}</h2></div><span className="finder-query-chip">{result.postcode} · {result.radiusKm} km</span></div>
      <p className="finder-results-note">{result.items.length ? "Diese begrenzte Auswahl enthält Wettbewerbsbekanntmachungen mit einer noch laufenden, an der Quelle geprüften Frist. Maßgeblich sind die aktuellen Originalunterlagen und mögliche Änderungen." : "Für Ihr Suchgebiet ist im kleinen Pilotbestand derzeit kein passender Treffer verfügbar. Das sagt nichts darüber aus, ob es auf anderen Vergabeportalen passende Ausschreibungen gibt."}</p>
      <div className="finder-card-grid">{result.items.map((item) => <article className="finder-result-card" key={item.id}>
        <div className="finder-card-top"><span className="finder-category">{item.serviceLabel}</span><span className="finder-live-badge">Quelle: TED</span></div>
        <p className="finder-card-type">Wettbewerbsbekanntmachung</p>
        <h3>{item.title}</h3>
        <p className="finder-location"><span aria-hidden="true">⌖</span> {item.locationLabel}</p>
        <dl className="finder-card-facts"><div><dt>{item.deadlineKind === "request" ? "Teilnahmefrist" : "Angebotsfrist"}</dt><dd><time dateTime={item.deadlineAt}>{dateFormat.format(new Date(item.deadlineAt))}</time><span className="finder-timezone">Deutsche Ortszeit</span></dd></div><div><dt>Luftlinie, ungefähr</dt><dd>ca. {new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(item.distanceKm)} km</dd></div></dl>
        {item.deadlineKind === "request" && <p className="finder-request-note">Dies ist die Frist für einen Teilnahmeantrag. Prüfen Sie den nächsten Verfahrensschritt in der Originalbekanntmachung.</p>}
        <div className="finder-card-source"><span>Quellenstand: <time dateTime={item.sourceStatusCheckedAt}>{dateFormat.format(new Date(item.sourceStatusCheckedAt))}</time> (deutsche Ortszeit)</span><span>Entfernung zu einem Ortsreferenzpunkt, nicht zum genauen Gebäude.</span></div>
        <a className="finder-source-link" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Originalbekanntmachung öffnen <span aria-hidden="true">↗</span></a>
      </article>)}</div>
      {result.nextCursor && result.pages < 2 && result.items.length < 20 ? <div className="finder-pagination"><button type="button" className="finder-primary" disabled={pending} onClick={() => void search(true)}>{pending ? "Wird geladen …" : "Weitere Treffer laden"}</button><p>Höchstens 20 Treffer pro Suche, ohne Gesamtliste.</p></div> : result.items.length > 0 && <p className="finder-results-end">Ende dieser begrenzten Ergebnisansicht. Sie bildet nicht den gesamten Ausschreibungsmarkt ab.</p>}
    </div> : <div className="finder-empty" aria-hidden={pending ? "true" : undefined}><div className="finder-empty-mark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><circle cx="28" cy="27" r="15" stroke="currentColor" strokeWidth="2"/><path d="m39 38 13 13M22 27h12m-6-6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div><div><h2>Ein Suchgebiet. Die Angaben für den nächsten Schritt.</h2><p>Treffer zeigen Leistungsort, Fristart, Quellenstand und den Link zur Originalbekanntmachung. Der Pilot umfasst eine kleine Auswahl echter TED-Verfahren.</p></div></div>}
  </section>;
}
