import Image from "next/image";
import Link from "next/link";
import FinderPreview from "@/components/finder/FinderPreview";
import { pageMetadata } from "@/lib/seo";
import "./finder.css";

const baseMetadata = pageMetadata("/ausschreibungen", "Ausschreibungsfinder für Gebäudereinigung – Vorschau", "Die kostenlose Finder-Vorschau: PLZ und Umkreis ausprobieren, Angebots- und Teilnahmefrist unterscheiden. Mit eindeutig fiktiven Beispielen; Live-Suche noch nicht verfügbar.");

export const metadata = { ...baseMetadata, robots: { index: false, follow: true } };

export default function FinderPage() {
  return <div className="finder-site">
    <header className="finder-header"><Link href="/" className="finder-brand" aria-label="MerKalku Startseite"><Image src="/logo.webp" alt="" width={32} height={32} /><span>MerKalku</span></Link><nav aria-label="Hauptnavigation"><Link href="/wissen">Wissen</Link><Link href="/">Zur Software <span aria-hidden="true">↗</span></Link></nav></header>
    <main className="finder-main">
      <div className="finder-hero"><p className="finder-eyebrow"><span className="finder-preview-dot" /> Ausschreibungsfinder · Vorschau</p><h1>Passende Aufträge<br /><span>beginnen in Ihrer Nähe.</span></h1><p className="finder-lead">Ein einfacher Einstieg in die Ausschreibungssuche für Gebäudereiniger. Mit PLZ, Umkreis und den Angaben, die für Ihren nächsten Schritt zählen.</p><div className="finder-hero-tags"><span>PLZ + Umkreis</span><span>Angebots- & Teilnahmefristen</span><span>Ohne Account ausprobieren</span></div></div>
      <div className="finder-preview-banner"><span aria-hidden="true">i</span><p><strong>Dies ist eine Vorschau mit frei erfundenen Beispielen.</strong> Aktuelle Ausschreibungen sind hier noch nicht abrufbar. Es gibt keine Ergebnis- oder Zuschlagsbekanntmachungen.</p></div>
      <FinderPreview />
      <section className="finder-explainer" aria-labelledby="finder-explainer-heading"><div><p className="finder-eyebrow">Worauf es bei der Suche ankommt</p><h2 id="finder-explainer-heading">Der Treffer ist erst<br />der Anfang.</h2><p>Eine passende Entfernung allein reicht nicht. Prüfen Sie immer, welche Leistung ausgeschrieben ist und welcher nächste Verfahrensschritt ansteht.</p></div><div className="finder-explainer-list"><article><span aria-hidden="true">01</span><div><h3>Leistungsort statt Firmensitz</h3><p>Entscheidend ist, wo gereinigt werden soll. Eine Entfernung vom PLZ-Mittelpunkt ist eine Näherung und sollte als solche erkennbar sein.</p></div></article><article><span aria-hidden="true">02</span><div><h3>Die richtige Frist</h3><p>Eine Teilnahmefrist ist keine Angebotsfrist. Kontrollieren Sie Fristart, Uhrzeit und gegebenenfalls das betreffende Los in den Originalunterlagen.</p></div></article><article><span aria-hidden="true">03</span><div><h3>Die aktuelle Originalquelle</h3><p>Unterlagen und Änderungen können entscheidend sein. Ein echter Treffer braucht eine nachvollziehbare Quelle und einen erkennbaren Prüfstand.</p></div></article></div></section>
      <aside className="finder-knowledge-cta"><div><p className="finder-eyebrow">Schon jetzt nutzbar</p><h2>Vor dem Angebot: einmal gründlich prüfen.</h2><p>Unsere ausfüllbare Checkliste hilft, Leistungen, offene Fragen und Kapazität zu ordnen.</p></div><Link href="/wissen/ausschreibung-gebaeudereinigung-pruefen">Zur kostenlosen Checkliste <span aria-hidden="true">→</span></Link></aside>
    </main>
    <footer className="finder-footer"><div><strong>MerKalku</strong><p>Arbeitshilfen für die Angebotsarbeit.</p></div><nav aria-label="Rechtliches"><Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link><Link href="/agb">AGB</Link></nav></footer>
  </div>;
}
