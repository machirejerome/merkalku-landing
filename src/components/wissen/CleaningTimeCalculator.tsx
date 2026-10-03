"use client";

import { useRef, useState } from "react";
import { trackEvent } from "@/lib/tracking";
import {
  CLEANING_TIME_CONTENT_ID, CLEANING_TIME_REVISION, cleaningTimeExample, emptyCleaningTimeInput,
  evaluateCleaningTime, formatCleaningDuration, formatCleaningHours,
  type CleaningTimeError, type CleaningTimeInput, type CleaningTimeResult,
} from "@/lib/cleaning-time";
import styles from "@/app/wissen/reinigungszeit-berechnen/cleaning-time.module.css";

const eventContext = { content_id: CLEANING_TIME_CONTENT_ID, revision: CLEANING_TIME_REVISION };

export default function CleaningTimeCalculator() {
  const [input, setInput] = useState<CleaningTimeInput>(emptyCleaningTimeInput);
  const [result, setResult] = useState<CleaningTimeResult | null>(null);
  const [errors, setErrors] = useState<CleaningTimeError[]>([]);
  const [example, setExample] = useState<"none" | "loaded" | "edited">("none");
  const extraRef = useRef<HTMLDetailsElement>(null);

  function update(field: keyof CleaningTimeInput, value: string) {
    setInput({ ...input, [field]: value });
    setResult(null);
    setErrors([]);
    if (example !== "none") setExample("edited");
  }
  function errorFor(field: CleaningTimeError["field"]) { return errors.find((error) => error.field === field); }
  function loadExample() {
    const next = cleaningTimeExample();
    const evaluated = evaluateCleaningTime(next);
    setInput(next); setResult(evaluated.ok ? evaluated.value : null); setErrors([]); setExample("loaded");
    if (extraRef.current) extraRef.current.open = false;
    trackEvent("cleaning_time_example_loaded", eventContext);
  }

  return <section id="rechner" className={styles.calculator} aria-labelledby="cleaning-calculator-title">
    <div className={styles.screenOnly}>
      <p className="knowledge-eyebrow">Für eine Reinigung</p>
      <h2 id="cleaning-calculator-title">Wie viel Arbeitszeit ergibt sich?</h2>
      <form noValidate onSubmit={(event) => {
        event.preventDefault();
        const evaluated = evaluateCleaningTime(input);
        if (!evaluated.ok) {
          setErrors(evaluated.errors); setResult(null);
          if (evaluated.errors.some((error) => error.field === "extraMinutes") && extraRef.current) extraRef.current.open = true;
          document.getElementById(`cleaning-${evaluated.errors[0].field}`)?.focus();
          return;
        }
        setErrors([]); setResult(evaluated.value);
        trackEvent("cleaning_time_calculated", eventContext);
      }}>
        <div className={styles.fields}>
          <label htmlFor="cleaning-area"><span>Fläche (m²)</span><input id="cleaning-area" type="text" inputMode="decimal" autoComplete="off" maxLength={30} required value={input.area} placeholder="Fläche eingeben" onChange={(event) => update("area", event.target.value)} aria-invalid={errorFor("area") ? true : undefined} aria-describedby={errorFor("area") ? "cleaning-area-error" : undefined} />{errorFor("area") && <span id="cleaning-area-error" className={styles.error}>{errorFor("area")!.message}</span>}</label>
          <label htmlFor="cleaning-performance"><span>Eigener Leistungswert (m²/h)</span><input id="cleaning-performance" type="text" inputMode="decimal" autoComplete="off" maxLength={30} required value={input.performance} placeholder="Eigenen Wert eingeben" onChange={(event) => update("performance", event.target.value)} aria-invalid={errorFor("performance") ? true : undefined} aria-describedby={errorFor("performance") ? "cleaning-performance-error" : "cleaning-performance-help"} />{errorFor("performance") && <span id="cleaning-performance-error" className={styles.error}>{errorFor("performance")!.message}</span>}</label>
        </div>
        <p className={styles.help} id="cleaning-performance-help">Kein eigener Leistungswert vorhanden? <a href="#leistungswert">Hier steht, was der Wert bedeutet.</a> Wir geben keinen pauschalen Branchenwert vor.</p>
        <details className={styles.extra} ref={extraRef}><summary>Zusatzminuten berücksichtigen <span>(optional)</span></summary><div>
          <label htmlFor="cleaning-extraMinutes"><span>Zusätzliche Arbeitsminuten für diese Reinigung</span><input id="cleaning-extraMinutes" type="text" inputMode="decimal" autoComplete="off" maxLength={30} value={input.extraMinutes} placeholder="Leer = keine Zusatzzeit" onChange={(event) => update("extraMinutes", event.target.value)} aria-invalid={errorFor("extraMinutes") ? true : undefined} aria-describedby={errorFor("extraMinutes") ? "cleaning-extra-error" : "cleaning-extra-help"} />{errorFor("extraMinutes") && <span id="cleaning-extra-error" className={styles.error}>{errorFor("extraMinutes")!.message}</span>}</label>
          <p className={styles.help} id="cleaning-extra-help">Nur Zeit ergänzen, die noch nicht im Leistungswert steckt. Leer bedeutet: keine Zusatzzeit angesetzt.</p>
        </div></details>
        {errorFor("result") && <p className={styles.error} role="alert">{errorFor("result")!.message}</p>}
        <div className={styles.actions}><button type="submit" className="btn-primary knowledge-button">Reinigungszeit berechnen <span aria-hidden="true">→</span></button><button type="button" className={styles.textButton} onClick={loadExample}>Fiktives Beispiel laden</button></div>
      </form>
      <noscript><p>Für den Rechner benötigen Sie JavaScript. Die Formel und eine Beispielrechnung stehen darunter im Artikel.</p></noscript>
    </div>
    <div id="cleaning-result" className={styles.result} tabIndex={-1} aria-live="polite" aria-atomic="true">
      {result ? <>
        <p className={styles.resultLabel}>{example === "loaded" ? "Fiktives Beispiel · keine Branchenempfehlung" : example === "edited" ? "Bearbeitetes fiktives Beispiel" : "Ihre Rechnung"}</p>
        <h3>Arbeitszeit für eine Reinigung</h3><strong className={styles.total}>{formatCleaningDuration(result.totalHours)}</strong>
        <p className={styles.decimal}>{formatCleaningHours(result.totalHours)} Arbeitsstunden in Dezimalschreibweise</p>
        <dl className={styles.inputs}><div><dt>Fläche</dt><dd>{input.area} m²</dd></div><div><dt>Eigener Leistungswert</dt><dd>{input.performance} m²/h</dd></div><div><dt>Zusatzzeit</dt><dd>{result.extraMinutes === 0 ? "Nicht angesetzt: 0 min" : `${input.extraMinutes} min`}</dd></div></dl>
        <p className={styles.equation}>{input.area} ÷ {input.performance}{result.extraMinutes > 0 && ` + ${input.extraMinutes} ÷ 60`} = {formatCleaningHours(result.totalHours)} h</p>
        <p className={styles.help}>Nur die Anzeige ist gerundet. Das Ergebnis beschreibt Arbeitszeit, keinen fertigen Personalplan oder Angebotspreis.</p>
        <div className={`${styles.resultActions} ${styles.screenOnly}`}><button type="button" className={styles.textButton} onClick={() => { trackEvent("cleaning_time_print_clicked", eventContext); window.print(); }}>Ergebnis drucken / als PDF speichern</button><button type="button" className={styles.textButton} onClick={() => { setInput(emptyCleaningTimeInput()); setResult(null); setErrors([]); setExample("none"); if (extraRef.current) extraRef.current.open = false; }}>Leeren</button></div>
      </> : <><h3>Noch kein aktuelles Ergebnis</h3><p>Fläche und eigenen Leistungswert eingeben, dann berechnen. Nach einer Änderung bitte erneut berechnen.</p></>}
    </div>
    <p className={`${styles.privacy} ${styles.screenOnly}`}>Ohne Anmeldung. Ihre Eingaben werden von diesem Rechner nicht übertragen oder gespeichert. Beim Neuladen gehen sie verloren.</p>
  </section>;
}
