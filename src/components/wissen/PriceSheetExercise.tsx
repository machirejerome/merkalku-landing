"use client";

import { useState } from "react";
import { priceSheetExample, euro } from "@/lib/price-sheet-exercise";
import { trackEvent } from "@/lib/tracking";

export default function PriceSheetExercise() {
  const [revealed, setRevealed] = useState(false);
  const example = priceSheetExample(revealed ? 1 : 0);
  function toggle() {
    setRevealed(!revealed);
    trackEvent("price_sheet_example_changed", { content_id: "excel-preisblatt-pruefen", revision: 2 });
  }
  return <section id="uebung" className="price-exercise" aria-label="Preisblatt-Beispiel">
    <p className="fictional-label">Fiktives Beispiel · zwölf Monate · alle Preise netto</p>
    <h2>Diese Summe sieht richtig aus. Ist sie es?</h2>
    <p>Die Vorgabe: Büro und Treppenhaus werden zwölf Monate gereinigt, die Fenster nur <strong>zweimal</strong>. Für die Sonderleistung fehlt noch ein Preis.</p>
    <div className="knowledge-table-scroll"><table><caption>Erfundene Zahlen zum Nachvollziehen – keine Preisempfehlung</caption><thead><tr><th scope="col">Position</th><th scope="col">Menge</th><th scope="col">Einzelpreis</th><th scope="col">Zeilensumme</th></tr></thead><tbody>{example.rows.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.quantity} {row.unit}</td><td>{row.priceCents === null ? <strong>Offen</strong> : euro(row.priceCents)}</td><td>{row.totalCents === null ? "Noch offen" : euro(row.totalCents)}</td></tr>)}</tbody></table></div>
    <div className="price-result" aria-live="polite"><span>{revealed ? "Bekannte Teilsumme – noch kein fertiger Angebotspreis" : "Angezeigte Summe im fehlerhaften Beispiel"}</span><strong>{euro(example.sumCents)}</strong>{revealed && <p>Der Preis der Sonderleistung fehlt weiterhin. Leer bedeutet nicht 0 €.</p>}</div>
    <button type="button" className="btn-primary knowledge-button knowledge-screen-only" aria-expanded={revealed} aria-controls="price-solution" onClick={toggle}>{revealed ? "Fehlerhaftes Beispiel nochmal ansehen" : "Die 3 Fehler aufdecken"}<span aria-hidden="true">{revealed ? "↺" : "↓"}</span></button>
    {revealed && <div id="price-solution" className="price-solution"><ol>
      <li><strong>Falsche Häufigkeit.</strong> Glas wurde mit zwölf statt zwei Terminen gerechnet. Richtig sind 900 € statt 5.400 €.</li>
      <li><strong>Eine Zeile fehlt in der Summe.</strong> Das Treppenhaus muss mit 600 € enthalten sein.</li>
      <li><strong>Ein offener Preis bleibt offen.</strong> Die Sonderleistung darf nicht unbemerkt als null behandelt werden.</li>
    </ol><p><strong>Gegenrechnung:</strong> (800 € + 50 €) × 12 + 450 € × 2 = 11.100 € netto. Dazu kommt der noch zu klärende Preis der Sonderleistung.</p><p className="article-small">Die drei Fragen für Ihr eigenes Preisblatt: Stimmt die Häufigkeit? Sind alle Positionen enthalten? Ist jeder geforderte Preis geklärt?</p></div>}
    <div className="knowledge-print-only"><p>Auflösung: Glas nur zweimal = 900 €. Treppenhaus = 600 € in die Summe aufnehmen. Sonderleistung bleibt offen. Bekannte Teilsumme: 11.100 € netto, noch kein vollständiger Angebotspreis.</p></div>
  </section>;
}
