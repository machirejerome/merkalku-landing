import type { Metadata } from "next";
import Link from "next/link";
import CleaningTimeCalculator from "@/components/wissen/CleaningTimeCalculator";
import ContentLink from "@/components/wissen/ContentLink";
import { CLEANING_TIME_CONTENT_DATE, CLEANING_TIME_CONTENT_ID } from "@/lib/cleaning-time";
import { FIRMA } from "@/lib/firma";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import styles from "./cleaning-time.module.css";

const path = "/wissen/reinigungszeit-berechnen";
const title = "Reinigungszeit berechnen: einfacher Rechner für Gebäudereinigung";
const description = "Reinigungszeit aus Fläche und eigenem Leistungswert berechnen. Zwei Eingaben, ein klares Ergebnis für eine Reinigung – optional mit Zusatzminuten.";
const sourceUrl = "https://www.gggr.de/dienstleistungen/wissen/index.php";
const baseMetadata = pageMetadata(path, title, description);
export const metadata: Metadata = {
  ...baseMetadata,
  authors: [{ name: "MerKalku", url: `${SITE_URL}/impressum` }],
  robots: { index: false, follow: true },
  openGraph: { ...baseMetadata.openGraph, type: "article", modifiedTime: CLEANING_TIME_CONTENT_DATE },
};
const structuredData = {
  "@context": "https://schema.org", "@graph": [
    {
      "@type": "Article", "@id": `${SITE_URL}${path}#article`, url: `${SITE_URL}${path}`,
      headline: "Reinigungszeit berechnen", description, inLanguage: "de-DE", version: "2",
      author: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "MerKalku" },
      publisher: { "@id": `${SITE_URL}/#organization` }, dateModified: CLEANING_TIME_CONTENT_DATE,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` }, citation: [sourceUrl],
    },
    {
      "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "MerKalku", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Wissen", item: `${SITE_URL}/wissen` },
        { "@type": "ListItem", position: 3, name: "Reinigungszeit berechnen", item: `${SITE_URL}${path}` },
      ],
    },
  ],
};

export default function CleaningTimePage() {
  return <main className={`knowledge-article ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <header className={`${styles.intro} ${styles.screenOnly}`}>
      <nav className="knowledge-breadcrumb" aria-label="Brotkrumennavigation"><Link href="/">MerKalku</Link><span aria-hidden="true">/</span><Link href="/wissen">Wissen</Link><span aria-hidden="true">/</span><span>Reinigungszeit</span></nav>
      <p className="knowledge-eyebrow">Kalkulation · kostenloser Rechner</p>
      <h1>Reinigungszeit berechnen</h1>
      <p className={styles.lead}>Wie viele Arbeitsstunden brauchen Sie für eine Reinigung? Tragen Sie die Fläche und Ihren eigenen Leistungswert ein. Der Rechner zeigt Ihnen die Zeit.</p>
      <div className="article-meta"><span>Von MerKalku</span><span>Stand: <time dateTime={CLEANING_TIME_CONTENT_DATE}>03.10.2026</time></span><span>Vorschau · noch nicht veröffentlicht</span></div>
    </header>
    <div className={styles.printOnly}><p>MerKalku Wissen · Rechenhilfe, Revision 2 · Vorschau</p><h1>Reinigungszeit für eine Reinigung</h1><p>Inhaltsstand: 03.10.2026</p></div>
    <CleaningTimeCalculator />
    <div className={`${styles.copy} ${styles.screenOnly}`}>
      <section id="formel"><h2>Wie wird die Reinigungszeit berechnet?</h2>
        <p>Die Rechnung lautet: <strong>Fläche geteilt durch Leistungswert ergibt Arbeitsstunden.</strong> Die Fläche geben Sie in Quadratmetern ein, den Leistungswert in Quadratmetern je Arbeitsstunde. Beide Angaben müssen sich auf dieselben Arbeiten beziehen.</p>
        <p className={styles.formula}>Reinigungszeit (h) = Fläche (m²) ÷ Leistungswert (m²/h)</p>
        <p><strong>Fiktives Beispiel:</strong> 600 m² ÷ 300 m²/h = 2 Arbeitsstunden für eine Reinigung. Die 300 m²/h sind frei gewählte Lehrwerte, kein empfohlener Branchenwert. Mit „Fiktives Beispiel laden“ können Sie genau diese Rechnung ausprobieren; Ihre bisherigen Eingaben werden dabei ersetzt.</p>
        <p>Der Rechner zeigt Stunden und Minuten sowie die Dezimalschreibweise. So entsprechen 2,25 Stunden genau 2 Stunden 15 Minuten. Nur die Anzeige wird gerundet, nicht die Rechnung.</p>
      </section>
      <section id="leistungswert"><h2>Was ist mein eigener Leistungswert?</h2>
        <p>Der Leistungswert beschreibt, wie viele Quadratmeter bei den betrachteten Arbeiten je Arbeitsstunde gereinigt werden. Er muss zu Ihrem Objekt, Verfahren und Leistungsumfang passen. Ein Wert für eine andere Tätigkeit lässt sich nicht allein wegen einer ähnlichen Fläche übernehmen.</p>
        <p>Wenn Ihnen ein eigener Wert fehlt, lassen Sie das Feld zunächst leer. Als eigene Arbeitsempfehlung können Sie eine dokumentierte Beobachtung nutzen: bearbeitete Fläche geteilt durch die dafür eingesetzten Arbeitsstunden aller beteiligten Personen. Halten Sie fest, welche Arbeiten und Nebenzeiten darin enthalten waren. Eine einzelne Beobachtung ist noch kein allgemeiner Maßstab.</p>
        <p>Der Rechner ermittelt keinen passenden Leistungswert aus der Fläche. Er macht lediglich sichtbar, welche Arbeitszeit aus Ihrer eingegebenen Annahme folgt.</p>
      </section>
      <section id="zusatzzeit"><h2>Wann gehören Zusatzminuten dazu?</h2>
        <p>Falls für diese Reinigung zusätzliche Arbeit anfällt, die <strong>noch nicht im Leistungswert steckt</strong>, öffnen Sie im Rechner „Zusatzminuten berücksichtigen“. Geben Sie dort die zusätzlichen Arbeitsminuten ein. Ein leeres Feld bedeutet, dass keine Zusatzzeit angesetzt wird.</p>
        <p>Im fiktiven Beispiel ergeben 2 Stunden plus 15 zusätzliche Minuten insgesamt 2 Stunden 15 Minuten. Bereits enthaltene Rüst- oder Nebenzeiten dürfen Sie nicht nochmals addieren. Bei mehreren beteiligten Personen zählen deren Arbeitsminuten zusammen.</p>
      </section>
      <section id="grenzen"><h2>Was sagt das Ergebnis – und was noch nicht?</h2>
        <p>Das Ergebnis gilt für <strong>eine Reinigung der eingegebenen Fläche</strong>. Es ist keine Wochen- oder Monatsplanung. Bei unterschiedlichen Arbeiten oder Leistungswerten rechnen Sie die Teile separat; eine gemischte Gesamtfläche mit einem unpassenden Wert kann irreführen.</p>
        <p>Arbeitsstunden sind außerdem nicht automatisch die Dauer einer Schicht. Ob mehrere Personen gleichzeitig arbeiten können und ob das Zugangsfenster passt, prüfen Sie gesondert. Der Rechner bestimmt weder Mitarbeiterzahl noch Kosten, Marge oder Angebotspreis.</p>
        <p>Für den nächsten Schritt hilft die <Link href="/wissen/ausschreibung-gebaeudereinigung-pruefen">Checkliste zur Prüfung einer Reinigungsausschreibung</Link>. Ihren Angebotsablauf können Sie im <ContentLink contentId={CLEANING_TIME_CONTENT_ID} kind="product" href="/#termin">MerKalku-Praxischeck</ContentLink> besprechen.</p>
      </section>
      <section className={styles.source} id="quellen"><h2>Quelle und Redaktion</h2>
        <p>Die <ContentLink contentId={CLEANING_TIME_CONTENT_ID} kind="source" sourceId="ral_wissen" href={sourceUrl}>Wissensübersicht der RAL GGGR ↗</ContentLink> führt Fachinformationen zu Leistungszahlen und Vergabehandbücher auf. Sie ist ein weiterführender Hinweis, keine Bestätigung unserer Beispielwerte. Formel, Rechenbeispiel und Arbeitsempfehlungen sind eigene Darstellungen von MerKalku; eine RAL-Freigabe wird nicht behauptet.</p>
        <p>Mit KI-Unterstützung erstellt. Quelle geprüft am <time dateTime={CLEANING_TIME_CONTENT_DATE}>03.10.2026</time>. Herausgeber: {FIRMA.marke} / {FIRMA.name}. Korrekturhinweise: <a href={`mailto:${FIRMA.email}`}>{FIRMA.email}</a>.</p>
      </section>
    </div>
    <footer className={styles.printOnly}><p>Eigene Rechenhilfe; die Eingaben sind keine geprüften Leistungswerte. Artikel und Quellen: {SITE_URL}{path}</p></footer>
  </main>;
}
