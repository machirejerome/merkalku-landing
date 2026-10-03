import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { FIRMA } from "@/lib/firma";
import ContentLink from "@/components/wissen/ContentLink";
import { PRICE_SHEET_CONTENT_DATE, PRICE_SHEET_PUBLISHED_DATE } from "@/lib/price-sheet-exercise";
import PriceSheetExercise from "@/components/wissen/PriceSheetExercise";
import "./preisblatt.css";

const id = "excel-preisblatt-pruefen";
const path = `/wissen/${id}`;
const title = "Excel-Preisblatt prüfen: 3 typische Fehler erkennen";
const headline = "Excel-Preisblatt prüfen: 3 typische Fehler";
const description = "Falsche Häufigkeit, fehlende Position in der Summe, offener Preis: Prüfen Sie Ihr Preisblatt mit einem kurzen Beispiel. Ohne Upload und ohne Formular.";
const base = pageMetadata(path, title, description);
const SOURCES = [
  { id: "excel_errors" as const, label: "Microsoft: Fehler in Formeln erkennen", url: "https://support.microsoft.com/en-us/excel/detect-formula-errors-in-excel" },
  { id: "excel_recalculation" as const, label: "Microsoft: Neuberechnung und Genauigkeit", url: "https://support.microsoft.com/en-us/excel/change-formula-recalculation-iteration-or-precision-in-excel" },
];
export const metadata: Metadata = { ...base, authors: [{ name: "MerKalku", url: `${SITE_URL}/impressum` }], openGraph: { ...base.openGraph, type: "article", publishedTime: PRICE_SHEET_PUBLISHED_DATE, modifiedTime: PRICE_SHEET_CONTENT_DATE } };
export default function PriceSheetArticle() {
  const graph = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", headline, description, mainEntityOfPage: `${SITE_URL}${path}`, author: { "@type": "Organization", name: "MerKalku", url: SITE_URL }, publisher: { "@type": "Organization", name: "MerKalku", url: SITE_URL }, inLanguage: "de-DE", datePublished: PRICE_SHEET_PUBLISHED_DATE, dateModified: PRICE_SHEET_CONTENT_DATE, citation: SOURCES.map(s => s.url) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "MerKalku", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Wissen", item: `${SITE_URL}/wissen` }, { "@type": "ListItem", position: 3, name: "Excel-Preisblatt prüfen", item: `${SITE_URL}${path}` }] },
  ] };
  return <main className="knowledge-article price-article">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />
    <div className="article-intro knowledge-screen-only">
      <nav className="knowledge-breadcrumb" aria-label="Brotkrumennavigation"><Link href="/">MerKalku</Link><span>/</span><Link href="/wissen">Wissen</Link><span>/</span><span>Excel-Preisblatt prüfen</span></nav>
      <p className="knowledge-eyebrow">Angebot prüfen · direkt am Beispiel</p>
      <h1>{headline}</h1>
      <p className="knowledge-lead">Ein kurzes Beispiel zeigt, wo Fehler im Angebot entstehen. Mit einem Klick sehen Sie die Auflösung – ohne etwas auszufüllen.</p>
      <div className="article-meta"><span>Von MerKalku</span><span>Stand: 3. Oktober 2026</span></div>
    </div>
    <div className="knowledge-print-only print-heading"><p>MerKalku Wissen · Stand: 03.10.2026</p><h1>Excel-Preisblatt prüfen</h1><p>Drei typische Fehler an einem erfundenen Beispiel.</p></div>
    <div className="article-body price-simple-body">
      <PriceSheetExercise />
      <section className="price-compact-note knowledge-screen-only"><h2>Was bedeutet das für Ihr Angebot?</h2><p>Eine funktionierende Formel bestätigt noch keinen richtigen Angebotspreis. Prüfen Sie <strong>Menge und Zeitraum gegen die Originalunterlagen</strong>, rechnen Sie wichtige Positionen separat nach und lassen Sie offene Preise sichtbar offen. Für die Geschäftsführung kommt eine weitere Frage dazu: Deckt der Preis Ihre tatsächlich kalkulierten Kosten?</p></section>
      <details className="price-detail knowledge-screen-only"><summary>Vor der Abgabe: die kurze Abschlusskontrolle</summary><div><ol>
        <li><strong>Richtige Datei:</strong> Aktuelle Originalversion und erlaubtes Abgabeformat verwenden.</li>
        <li><strong>Gleiche Grundlage:</strong> Leistung, Menge, Einheit und Zeitraum abgleichen.</li>
        <li><strong>Keine Lücken:</strong> Leere Preisfelder klären. Null nur bewusst und entsprechend den Vorgaben eintragen.</li>
        <li><strong>Vollständige Formeln:</strong> Summenbereiche, Zellbezüge und als Text gespeicherte Zahlen prüfen. Vorgegebene Formeln nicht stillschweigend ändern.</li>
        <li><strong>Eigene Gegenrechnung:</strong> Wesentliche Positionen aus Menge und Einzelpreis nachrechnen – auf gleicher Netto-/Brutto- und Zeitbasis.</li>
        <li><strong>Neu berechnen:</strong> Berechnungsmodus in der vorgesehenen Excel-Version prüfen; Makros und externe Inhalte nicht ungeprüft aktivieren.</li>
        <li><strong>Enddatei öffnen:</strong> Speichern, schließen und genau die Abgabedatei erneut kontrollieren. Intern klären, wer sie freigibt.</li>
      </ol><p>„Genauigkeit wie angezeigt“ ist keine pauschale Rundungsreparatur: Diese Excel-Einstellung kann gespeicherte Werte dauerhaft verändern. Die konkrete Abgabe im Vergabeportal bleibt ein eigener Prüfschritt.</p></div></details>
      <details className="price-detail knowledge-screen-only"><summary>Quellen und Einordnung</summary><div><p>Die Microsoft-Dokumentation erklärt Formelprüfung, Berechnungsmodus und Genauigkeit. Eine fehlende Excel-Warnung belegt keine fachlich richtige Kalkulation.</p><ul>{SOURCES.map(source => <li key={source.id}><ContentLink contentId={id} kind="source" sourceId={source.id} href={source.url}>{source.label} ↗</ContentLink></li>)}</ul><p>Beispiel und Prüfstruktur stammen von MerKalku. Es wird keine hochgeladene Datei geprüft; die Zahlen sind erfunden. Maßgeblich bleiben Ihre Verfahrensunterlagen und Ihre betriebliche Kalkulation. Quellen geprüft am 03.10.2026.</p></div></details>
      <p className="price-related knowledge-screen-only">Vorher prüfen: <Link href="/wissen/ausschreibung-gebaeudereinigung-pruefen">Passt die Ausschreibung zu Ihrem Betrieb?</Link><br/>Stundenbasis ermitteln: <Link href="/wissen/reinigungszeit-berechnen">Reinigungszeit berechnen</Link></p>
      <section className="article-product knowledge-screen-only"><h2>Von der Ausschreibung zur Kalkulation.</h2><p>Sehen Sie im Praxischeck, wie MerKalku Sie bei Ihrer Angebotsarbeit unterstützt.</p><ContentLink contentId={id} kind="product" href="/#termin" className="btn-primary knowledge-button">MerKalku kennenlernen <span aria-hidden="true">↗</span></ContentLink></section>
      <footer className="article-editorial"><p>Von {FIRMA.marke} / {FIRMA.name}, mit KI-Unterstützung erstellt. Redaktion und Korrekturen: <a href={`mailto:${FIRMA.email}`}>{FIRMA.email}</a>. Stand: 03.10.2026.</p></footer>
    </div>
  </main>;
}
