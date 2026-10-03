"use client";

import { useRef, useState } from "react";
import { trackEvent } from "@/lib/tracking";
import {
  CLEANING_TIME_CONTENT_ID, CLEANING_TIME_REVISION, changeCleaningPeriod, cleaningTimeExample,
  emptyCleaningGroup, emptyCleaningTimeInput, evaluateCleaningTime, formatCleaningDuration, formatCleaningHours,
  type CleaningGroup, type CleaningTimeError, type CleaningTimeInput, type CleaningTimeResult,
} from "@/lib/cleaning-time";
import styles from "@/app/wissen/reinigungszeit-berechnen/cleaning-time.module.css";

const context = { content_id: CLEANING_TIME_CONTENT_ID, revision: CLEANING_TIME_REVISION };
const decisionQuestions = [
  "Sind alle Raumgruppen mit passendem Leistungsumfang und Einheit erfasst?",
  "Welche Leistungsannahme ist belegt, welche muss noch geklärt werden?",
  "Sind Einsätze und zusätzliche Arbeiten vollständig und genau einmal enthalten?",
  "Ist der Tagesbedarf mit Zeitfenster und tatsächlicher Verfügbarkeit abgeglichen?",
  "Welche Annahme verwenden wir, und wer klärt die offenen Punkte?",
];

export default function CleaningTimeCalculator() {
  const [input, setInput] = useState<CleaningTimeInput>(emptyCleaningTimeInput);
  const [result, setResult] = useState<CleaningTimeResult | null>(null);
  const [errors, setErrors] = useState<CleaningTimeError[]>([]);
  const [example, setExample] = useState<"none" | "loaded" | "edited">("none");
  const [confirmation, setConfirmation] = useState<"example" | "reset" | null>(null);
  const [dirty, setDirty] = useState(false);
  const [periodNotice, setPeriodNotice] = useState(false);
  const [decision, setDecision] = useState({ version: "", next: "", owner: "" });
  const groupId = useRef(2);
  const resultRef = useRef<HTMLDivElement>(null);

  function update(next: CleaningTimeInput) {
    setInput(next);
    setResult(null);
    setErrors([]);
    setDirty(true);
    if (example !== "none") setExample("edited");
  }

  function updateGroup(id: string, key: keyof CleaningGroup, value: string) {
    update({ ...input, groups: input.groups.map((group) => group.id === id ? { ...group, [key]: value } : group) });
  }

  function applyAction(action: "example" | "reset") {
    const next = action === "example" ? cleaningTimeExample() : emptyCleaningTimeInput();
    setInput(next);
    setErrors([]);
    setPeriodNotice(false);
    setDecision({ version: "", next: "", owner: "" });
    setConfirmation(null);
    setDirty(action === "example");
    setExample(action === "example" ? "loaded" : "none");
    const evaluation = action === "example" ? evaluateCleaningTime(next) : null;
    setResult(evaluation?.ok ? evaluation.value : null);
    if (action === "example") trackEvent("cleaning_time_example_loaded", context);
  }

  function errorFor(id: string) { return errors.find((error) => error.field === id); }

  function numberField(id: string, label: string, value: string, onChange: (value: string) => void, integer = false) {
    const error = errorFor(id);
    return <label className={styles.field} htmlFor={id} key={id}>
      <span>{label}</span>
      <input id={id} type="text" inputMode={integer ? "numeric" : "decimal"} autoComplete="off" maxLength={30}
        value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined} required />
      {error && <span id={`${id}-error`} className={styles.fieldError}>{error.message}</span>}
    </label>;
  }

  const exampleLabel = example === "loaded" ? "Fiktives Mischobjekt · keine Branchenwerte" : example === "edited" ? "Bearbeitetes fiktives Beispiel · keine Branchenwerte" : "Ihre selbst eingegebenen Annahmen";

  return <div className={styles.calculator} id="rechner">
    <div className={styles.screenOnly}>
      <div className={styles.toolbar}>
        <div><p className="knowledge-eyebrow">Lokal rechnen · ohne Anmeldung</p><h2>Ihre Reinigungszeit berechnen</h2></div>
        <button className={styles.secondaryButton} type="button" onClick={() => dirty ? setConfirmation("example") : applyAction("example")}>Fiktives Beispiel laden</button>
      </div>
      <p className={styles.note}>Ihre Zahlen und Notizen bleiben im geöffneten Tab und werden von diesem Rechner nicht an einen Server gesendet. Beim Neuladen oder Verlassen der Seite gehen sie verloren. Drucken Sie die Übersicht, wenn Sie den Stand behalten möchten.</p>
      {confirmation && <div className={styles.confirmation} role="group" aria-label="Eingaben ersetzen bestätigen">
        <p>{confirmation === "example" ? "Das fiktive Beispiel ersetzt alle aktuellen Eingaben und Notizen." : "Alle Zahlen, Notizen und Ergebnisse dieses Rechners löschen?"}</p>
        <button type="button" className={styles.secondaryButton} onClick={() => applyAction(confirmation)}>{confirmation === "example" ? "Ja, Beispiel laden" : "Ja, alles löschen"}</button>
        <button type="button" className={styles.textButton} onClick={() => setConfirmation(null)}>Eingaben behalten</button>
      </div>}
      <noscript><p>Für den interaktiven Rechner wird JavaScript benötigt. Formel und fiktive Beispielrechnung stehen weiter unten vollständig im Artikel.</p></noscript>
      <form noValidate onSubmit={(event) => {
        event.preventDefault();
        const evaluated = evaluateCleaningTime(input);
        if (!evaluated.ok) {
          setErrors(evaluated.errors); setResult(null);
          document.getElementById(evaluated.errors[0].field)?.focus();
          return;
        }
        setErrors([]); setResult(evaluated.value);
        trackEvent("cleaning_time_calculated", context);
        if (input.compare) trackEvent("cleaning_time_scenario_compared", context);
        requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
      }}>
        <fieldset className={styles.block}>
          <legend><span>01</span> Zeitraum festlegen</legend>
          <div className={styles.twoColumns}>
            <label className={styles.field} htmlFor="cleaning-period"><span>Zeitraum *</span>
              <select id="cleaning-period" value={input.period} required aria-invalid={errorFor("cleaning-period") ? true : undefined}
                aria-describedby={errorFor("cleaning-period") ? "cleaning-period-error" : "cleaning-period-help"}
                onChange={(event) => { update(changeCleaningPeriod(input, event.target.value as CleaningTimeInput["period"])); setPeriodNotice(input.period !== ""); }}>
                <option value="">Bitte wählen</option><option>Woche</option><option>Monat</option><option>Jahr</option><option>Eigener Zeitraum</option>
              </select>
              {errorFor("cleaning-period") && <span id="cleaning-period-error" className={styles.fieldError}>{errorFor("cleaning-period")!.message}</span>}
            </label>
            <label className={styles.field} htmlFor="cleaning-period-description"><span>Zeitraum benennen {input.period === "Eigener Zeitraum" ? "*" : "(optional)"}</span>
              <input id="cleaning-period-description" autoComplete="off" maxLength={160} placeholder="Zum Beispiel: 12.–16. Oktober, Mo–Fr" value={input.periodDescription}
                required={input.period === "Eigener Zeitraum"} aria-invalid={errorFor("cleaning-period-description") ? true : undefined}
                aria-describedby={errorFor("cleaning-period-description") ? "cleaning-period-description-error" : undefined}
                onChange={(event) => update({ ...input, periodDescription: event.target.value })} />
              {errorFor("cleaning-period-description") && <span id="cleaning-period-description-error" className={styles.fieldError}>{errorFor("cleaning-period-description")!.message}</span>}
            </label>
          </div>
          <p className={styles.hint} id="cleaning-period-help">Einsätze zählen Sie für genau diesen Zeitraum. Es gibt keine automatische Umrechnung von Wochen auf Monate oder Jahre.</p>
          {periodNotice && <p className={styles.notice} role="status">Zeitraum geändert: Bitte die Einsatzzahlen je Gruppe und gegebenenfalls die Objektbesuche neu eingeben.</p>}
        </fieldset>

        <fieldset className={styles.block} id="cleaning-groups" tabIndex={-1}>
          <legend><span>02</span> Raumgruppen rechnen</legend>
          <p className={styles.hint}>Beginnen Sie mit einer Gruppe. Gleiche Fläche, gleicher Leistungsumfang und gleicher Takt gehören in dieselbe Zeile. Alle Zahlenfelder sind erforderlich; die Bezeichnung ist optional. Dezimalkomma verwenden, ohne Tausendertrennzeichen.</p>
          <label className={styles.checkbox}><input type="checkbox" checked={input.compare} onChange={(event) => update({ ...input, compare: event.target.checked })} /><span>Zweites Szenario mit eigenen alternativen Leistungswerten vergleichen</span></label>
          {input.compare && <p className={styles.hint}>Flächen, Einsatzzahlen und gemeinsame Zusatzzeit bleiben gleich. Sie ändern nur den Leistungswert je Gruppe; es wird kein Auf- oder Abschlag vorgegeben.</p>}
          {input.groups.map((group, index) => <fieldset className={styles.group} key={group.id}>
            <legend>Raumgruppe {index + 1}</legend>
            <div className={styles.groupHeading}>
              <label className={styles.field} htmlFor={`${group.id}-name`}><span>Bezeichnung (optional)</span><input id={`${group.id}-name`} autoComplete="off" maxLength={80} value={group.name} placeholder="Zum Beispiel Büro" onChange={(event) => updateGroup(group.id, "name", event.target.value)} /></label>
              {input.groups.length > 1 && <button type="button" className={styles.textButton} aria-label={`Raumgruppe ${index + 1} entfernen`} onClick={() => update({ ...input, groups: input.groups.filter((item) => item.id !== group.id) })}>Entfernen</button>}
            </div>
            <div className={styles.numericFields}>
              {numberField(`${group.id}-area`, "Fläche je Einsatz (m²)", group.area, (value) => updateGroup(group.id, "area", value))}
              {numberField(`${group.id}-performance`, "Eigener Leistungswert (m²/h)", group.performance, (value) => updateGroup(group.id, "performance", value))}
              {numberField(`${group.id}-visits`, "Einsätze im Zeitraum", group.visits, (value) => updateGroup(group.id, "visits", value), true)}
              {input.compare && numberField(`${group.id}-alternative`, "Alternative (m²/h)", group.alternative, (value) => updateGroup(group.id, "alternative", value))}
            </div>
            <details className={styles.assumptions}><summary>Leistungsumfang und Herkunft festhalten <span>(optional)</span></summary><div>
              <label className={styles.field}><span>Welche Arbeiten stecken in diesem Leistungswert?</span><textarea rows={2} maxLength={1200} autoComplete="off" value={group.scope} placeholder="Leistungen, Verfahren, enthaltene Nebenzeiten; gegebenenfalls einzelne Einsatztage" onChange={(event) => updateGroup(group.id, "scope", event.target.value)} /></label>
              <label className={styles.field}><span>Woher stammen Basis und Alternative?</span><textarea rows={2} maxLength={1200} autoComplete="off" value={group.source} placeholder="Eigene Beobachtung, Kalkulationsstand oder noch ungeprüfte Annahme" onChange={(event) => updateGroup(group.id, "source", event.target.value)} /></label>
              <label className={styles.field}><span>Was bleibt offen?</span><textarea rows={2} maxLength={1200} autoComplete="off" value={group.open} placeholder="Welche Annahme muss vor Ihrer internen Entscheidung geklärt werden?" onChange={(event) => updateGroup(group.id, "open", event.target.value)} /></label>
            </div></details>
          </fieldset>)}
          <button type="button" className={styles.secondaryButton} onClick={() => update({ ...input, groups: [...input.groups, emptyCleaningGroup(`group-${groupId.current++}`)] })}>+ Raumgruppe ergänzen</button>
        </fieldset>

        <fieldset className={styles.block}>
          <legend><span>03</span> Gemeinsame Zusatzzeit</legend>
          <label className={styles.checkbox}><input type="checkbox" checked={input.extraEnabled} onChange={(event) => update({ ...input, extraEnabled: event.target.checked })} /><span>Zusätzliche Arbeitszeit je Objektbesuch separat ansetzen</span></label>
          <p className={styles.hint}>Nur Arbeiten erfassen, die in keinem Leistungswert bereits enthalten sind. Dieser Block wird einmal für das Objekt gerechnet, nicht erneut je Raumgruppe. Arbeitsminuten aller beteiligten Personen zählen, nicht nur verstrichene Minuten.</p>
          {input.extraEnabled ? <>
            <div className={styles.twoColumns}>
              {numberField("cleaning-extra-minutes", "Zusätzliche Arbeitsminuten je Objektbesuch", input.extraMinutes, (value) => update({ ...input, extraMinutes: value }))}
              {numberField("cleaning-extra-visits", "Objektbesuche im selben Zeitraum", input.extraVisits, (value) => update({ ...input, extraVisits: value }), true)}
            </div>
            <label className={styles.field}><span>Zusatzarbeiten und Abgrenzung (optional)</span><textarea rows={2} maxLength={1200} autoComplete="off" value={input.extraDescription} placeholder="Was wird hier genau einmal gerechnet und ist nicht schon enthalten?" onChange={(event) => update({ ...input, extraDescription: event.target.value })} /></label>
          </> : <p className={styles.hint}>Keine zusätzliche Zeit angesetzt. Das bedeutet nicht, dass im Objekt keine weiteren Arbeiten anfallen.</p>}
        </fieldset>

        {errors.length > 0 && <div className={styles.errorSummary} role="alert"><strong>Bitte die markierten Eingaben prüfen.</strong><ul>{errors.map((error) => <li key={error.field}><a href={`#${error.field}`}>{error.message}</a></li>)}</ul></div>}
        <div className={styles.actions}><button type="submit" className="btn-primary knowledge-button">Arbeitsstunden berechnen <span aria-hidden="true">→</span></button><button type="button" className={styles.textButton} onClick={() => dirty ? setConfirmation("reset") : applyAction("reset")}>Alles zurücksetzen</button></div>
      </form>
    </div>

    <div className={styles.result} ref={resultRef} tabIndex={-1} aria-label="Rechenergebnis" aria-live="polite">
      <p className={styles.resultEyebrow}>{exampleLabel}</p>
      {result ? <>
        <h3>Arbeitsstunden · {result.period}</h3>
        <div className={styles.resultCards}>
          <div><span>Basis</span><strong>{formatCleaningHours(result.totalHours)} h</strong><small>{formatCleaningDuration(result.totalHours)}</small></div>
          {result.alternativeTotalHours !== null && <><div><span>Alternative</span><strong>{formatCleaningHours(result.alternativeTotalHours)} h</strong><small>{formatCleaningDuration(result.alternativeTotalHours)}</small></div><div><span>Alternative − Basis</span><strong>{result.differenceHours! > 0 ? "+" : ""}{formatCleaningHours(result.differenceHours!)} h</strong><small>{formatCleaningDuration(result.differenceHours!)}</small></div></>}
        </div>
        <div className={styles.resultTableScroll}><table className={styles.resultTable}><caption>Rechenweg mit Ihren aktuellen Zahlen</caption><thead><tr><th scope="col">Gruppe / Zeitblock</th><th scope="col">Basis</th>{input.compare && <th scope="col">Alternative</th>}</tr></thead><tbody>
          {result.groups.map((group) => <tr key={group.id}><th scope="row">{group.name}</th><td>{group.area.toLocaleString("de-DE", { maximumFractionDigits: 10 })} m² ÷ {group.performance.toLocaleString("de-DE", { maximumFractionDigits: 10 })} m²/h × {group.visits}<br /><strong>{formatCleaningHours(group.hours)} h</strong></td>{input.compare && <td>{group.area.toLocaleString("de-DE", { maximumFractionDigits: 10 })} m² ÷ {group.alternative!.toLocaleString("de-DE", { maximumFractionDigits: 10 })} m²/h × {group.visits}<br /><strong>{formatCleaningHours(group.alternativeHours!)} h</strong></td>}</tr>)}
          <tr><th scope="row">Gemeinsame Zusatzzeit</th><td>{input.extraEnabled ? <>{input.extraMinutes} min ÷ 60 × {input.extraVisits} Besuche<br /><strong>{formatCleaningHours(result.extraHours)} h</strong></> : "Nicht angesetzt: 0 h"}</td>{input.compare && <td>Unverändert<br /><strong>{formatCleaningHours(result.extraHours)} h</strong></td>}</tr>
          <tr><th scope="row">Gesamt im Zeitraum</th><td><strong>{formatCleaningHours(result.totalHours)} h</strong></td>{input.compare && <td><strong>{formatCleaningHours(result.alternativeTotalHours!)} h</strong></td>}</tr>
        </tbody></table></div>
        <p className={styles.hint}>Nur die Anzeige wird gerundet; Zwischenergebnisse werden ungerundet addiert. Arbeitsstunden sind weder Schichtdauer noch Mitarbeiterzahl. Die Alternative ist eine eigene Annahme, kein statistisches Unsicherheitsintervall. Das Ergebnis enthält keine Kosten oder Angebotspreise.</p>
      </> : <><h3>Noch kein aktuelles Ergebnis</h3><p>Pflichtangaben eingeben und „Arbeitsstunden berechnen“ wählen. Nach Änderungen muss neu gerechnet werden; ein früheres Ergebnis wird nicht weiter als aktuell angezeigt.</p></>}
    </div>

    <div className={`${styles.decision} ${styles.screenOnly}`}>
      <details><summary>Für die interne Entscheidung festhalten <span>(optional)</span></summary><div className={styles.decisionFields}>
        <p>Eigene Arbeitsempfehlung: Rechenstand und offene Annahmen zusammen beurteilen. Diese Notizen sind kein bereits erteiltes Testat.</p>
        <ul>{decisionQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
        <label className={styles.field}><span>Unterlage / Version / Rechenstand</span><input autoComplete="off" maxLength={300} value={decision.version} onChange={(event) => { setDirty(true); setDecision({ ...decision, version: event.target.value }); }} /></label>
        <label className={styles.field}><span>Offene Punkte und nächste Klärung</span><textarea rows={3} maxLength={1800} autoComplete="off" value={decision.next} onChange={(event) => { setDirty(true); setDecision({ ...decision, next: event.target.value }); }} /></label>
        <label className={styles.field}><span>Zuständig / Entscheidung / interner Termin</span><textarea rows={2} maxLength={900} autoComplete="off" value={decision.owner} onChange={(event) => { setDirty(true); setDecision({ ...decision, owner: event.target.value }); }} /></label>
      </div></details>
      <div className={styles.printActions}><button type="button" className={styles.secondaryButton} disabled={!result} onClick={() => { trackEvent("cleaning_time_print_clicked", context); window.print(); }}>Rechenstand drucken / als PDF speichern</button><p className={styles.hint}>{result ? "Öffnet den Browserdialog. Eine gespeicherte PDF wird dadurch noch nicht bestätigt." : "Erst berechnen, um die aktuelle Übersicht mit allen Annahmen zu drucken."}</p></div>
    </div>

    <div className={styles.printOnly}>
      <h3>Ihre Eingaben und Annahmen</h3>
      <p>Zeitraum: {input.period || "offen"}{input.periodDescription && ` · ${input.periodDescription}`}</p>
      {input.groups.map((group, index) => <section className={styles.printGroup} key={group.id}>
        <h4>{group.name || `Raumgruppe ${index + 1}`}</h4>
        <p>Fläche: {group.area || "offen"} m² · Basis: {group.performance || "offen"} m²/h · Einsätze: {group.visits || "offen"}{input.compare && ` · Alternative: ${group.alternative || "offen"} m²/h`}</p>
        <p><strong>Leistungsumfang: </strong>{group.scope || "Nicht dokumentiert"}</p><p><strong>Herkunft: </strong>{group.source || "Nicht dokumentiert"}</p><p><strong>Offen: </strong>{group.open || "Keine Notiz; keine Bestätigung, dass alles geklärt ist"}</p>
      </section>)}
      <p><strong>Gemeinsame Zusatzzeit: </strong>{input.extraEnabled ? `${input.extraMinutes || "offen"} Arbeitsminuten × ${input.extraVisits || "offen"} Objektbesuche` : "Nicht angesetzt"}</p>
      {input.extraEnabled && <p><strong>Abgrenzung: </strong>{input.extraDescription || "Nicht dokumentiert"}</p>}
      <section className={styles.printDecision}><h3>Blatt für die interne Entscheidung</h3><ul>{decisionQuestions.map((question) => <li key={question}>☐ {question}</li>)}</ul><p><strong>Unterlage / Stand: </strong>{decision.version || "____________________________"}</p><p><strong>Offene Punkte / nächste Klärung: </strong>{decision.next || "____________________________"}</p><p><strong>Zuständig / Entscheidung / Termin: </strong>{decision.owner || "____________________________"}</p><p>Eigene Arbeitshilfe, keine automatische Fachprüfung oder Freigabe.</p></section>
    </div>
  </div>;
}
