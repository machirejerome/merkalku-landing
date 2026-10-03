import Image from "next/image";
import Link from "next/link";
import FinderPreview from "@/components/finder/FinderPreview";
import { pageMetadata } from "@/lib/seo";
import "./finder.css";

const baseMetadata = pageMetadata("/ausschreibungen", "Ausschreibungsfinder für Gebäudereinigung – Pilot", "Kostenloser Ausschreibungsfinder: einen kleinen, quellengeprüften TED-Pilotbestand nach PLZ und Umkreis durchsuchen. Mit Fristart, Quellenstand und Originalbekanntmachung.");

export const metadata = { ...baseMetadata, robots: { index: false, follow: true } };

export default function FinderPage() {
  return <div className="finder-site">
    <header className="finder-header"><Link href="/" className="finder-brand" aria-label="MerKalku Startseite"><Image src="/logo.webp" alt="" width={32} height={32} /><span>MerKalku</span></Link><nav aria-label="Hauptnavigation"><Link href="/wissen">Wissen</Link><Link href="/">Zur Software <span aria-hidden="true">↗</span></Link></nav></header>
    <main className="finder-main">
      <div className="finder-hero"><p className="finder-eyebrow"><span className="finder-preview-dot" /> Ausschreibungsfinder · Pilot</p><h1>Reinigungs&shy;ausschreibungen<br /><span>in Ihrer Nähe prüfen.</span></h1><p className="finder-lead">Ein einfacher Einstieg für Gebäudereiniger. Suchen Sie im geprüften Pilotbestand nach PLZ und Umkreis und öffnen Sie die passende Originalbekanntmachung.</p><div className="finder-hero-tags"><span>PLZ + Umkreis</span><span>Frist und Originalquelle</span><span>Kostenlos ohne Anmeldung</span></div></div>
      <div className="finder-preview-banner"><span aria-hidden="true">i</span><p><strong>Echte Ausschreibungen, kleiner Pilotbestand.</strong> Die Suche enthält eine begrenzte Auswahl quellengeprüfter TED-Wettbewerbe. Sie ist keine vollständige Deutschland-Suche. Ergebnis- und Zuschlagsbekanntmachungen werden nicht als Treffer gezeigt.</p></div>
      <FinderPreview />
      <section className="finder-explainer" aria-labelledby="finder-explainer-heading"><div><p className="finder-eyebrow">Worauf es bei der Suche ankommt</p><h2 id="finder-explainer-heading">Der Treffer ist erst<br />der Anfang.</h2><p>Eine passende Entfernung allein reicht nicht. Prüfen Sie immer, welche Leistung ausgeschrieben ist und welcher nächste Verfahrensschritt ansteht.</p></div><div className="finder-explainer-list"><article><span aria-hidden="true">01</span><div><h3>Der angegebene Leistungsort</h3><p>Die Ortsangabe stammt aus dem jeweiligen Los. Die Entfernung ist eine ungefähre Luftlinie zwischen PLZ-/Ortsreferenzpunkten, keine Strecke zum exakten Gebäude.</p></div></article><article><span aria-hidden="true">02</span><div><h3>Die richtige Frist</h3><p>Eine Teilnahmefrist ist keine Angebotsfrist. Kontrollieren Sie Fristart, Uhrzeit und das betreffende Los in den Originalunterlagen.</p></div></article><article><span aria-hidden="true">03</span><div><h3>Die aktuelle Originalquelle</h3><p>Jeder Treffer nennt den Zeitpunkt der Quellenprüfung. Änderungen nach diesem Zeitpunkt sind möglich. Prüfen Sie vor Ihrem nächsten Schritt die Originalbekanntmachung und Vergabeunterlagen.</p></div></article></div></section>
      <div className="finder-data-note"><p>Bekanntmachungsdaten: <a href="https://ted.europa.eu/" target="_blank" rel="noopener noreferrer">TED · Amt für Veröffentlichungen der Europäischen Union</a>. Für diese Suche ausgewählt und aufbereitet.</p><p>PLZ- und Ortsreferenzdaten: <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Für die PLZ-Suche zu Referenzpunkten zusammengefasst.</p></div>
      <details className="finder-protection-note"><summary>Warum ist die Suche begrenzt?</summary><p>Zum Schutz vor Massenabrufen sind die Anzahl der Suchläufe und neu angezeigten Treffer begrenzt. Erforderliche Browser-Kennzeichen bleiben bis zu 30 Tage gespeichert; zusätzlich werden aus IP-Adressen abgeleitete Prüfwerte verwendet. Ein erreichtes Limit ist keine Aussage über verfügbare Ausschreibungen. Mehr dazu im <Link href="/datenschutz">Datenschutz</Link>.</p></details>
      <aside className="finder-knowledge-cta"><div><p className="finder-eyebrow">Nach dem ersten Treffer</p><h2>Vor dem Angebot: fünf Punkte prüfen.</h2><p>Unsere kurze Checkliste hilft, Leistungen, offene Fragen und Kapazität zu ordnen.</p></div><Link href="/wissen/ausschreibung-gebaeudereinigung-pruefen">Zur kostenlosen Checkliste <span aria-hidden="true">→</span></Link></aside>
    </main>
    <footer className="finder-footer"><div><strong>MerKalku</strong><p>Arbeitshilfen für die Angebotsarbeit.</p></div><nav aria-label="Rechtliches"><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link><Link href="/agb">AGB</Link></nav></footer>
  </div>;
}
