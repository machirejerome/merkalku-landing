import type { Metadata } from "next";
import Link from "next/link";
import CleaningTimeCalculator from "@/components/wissen/CleaningTimeCalculator";
import ContentLink from "@/components/wissen/ContentLink";
import { CLEANING_TIME_CONTENT_DATE, CLEANING_TIME_CONTENT_ID } from "@/lib/cleaning-time";
import { FIRMA } from "@/lib/firma";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import styles from "./cleaning-time.module.css";

const path = "/wissen/reinigungszeit-berechnen";
const title = "Reinigungszeit berechnen: Rechner für Gebäudereinigung";
const heading = "Reinigungszeit berechnen: Raumgruppen, Einsätze und Annahmen prüfen";
const description = "Berechnen Sie Arbeitsstunden je Raumgruppe und Zeitraum. Mit eigenen Leistungswerten, separater Zusatzzeit, zwei Szenarien und druckbarer Annahmenübersicht.";
const sourceUrl = "https://www.gggr.de/dienstleistungen/wissen/index.php";
const baseMetadata = pageMetadata(path, title, description);

export const metadata: Metadata = {
  ...baseMetadata,
  authors: [{ name: "MerKalku", url: `${SITE_URL}/impressum` }],
  robots: { index: false, follow: true },
  openGraph: { ...baseMetadata.openGraph, type: "article", modifiedTime: CLEANING_TIME_CONTENT_DATE },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article", "@id": `${SITE_URL}${path}#article`, url: `${SITE_URL}${path}`,
      headline: heading, description, inLanguage: "de-DE",
      author: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "MerKalku" },
      publisher: { "@id": `${SITE_URL}/#organization` },
      dateModified: CLEANING_TIME_CONTENT_DATE,
      mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${path}` },
      citation: [sourceUrl],
    },
    {
      "@type": "BreadcrumbList", "@id": `${SITE_URL}${path}#breadcrumb`, itemListElement: [
        { "@type": "ListItem", position: 1, name: "MerKalku", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Wissen", item: `${SITE_URL}/wissen` },
        { "@type": "ListItem", position: 3, name: "Reinigungszeit berechnen", item: `${SITE_URL}${path}` },
      ],
    },
  ],
};

const sections = [
  ["rechner", "Zum Rechner"], ["formel", "Formel und Einheiten"], ["leistungswert", "Eigene Leistungswerte"],
  ["einsatzplan", "Einsätze und Zusatzzeiten"], ["beispiel", "Fiktives Mischobjekt"],
  ["personal", "Arbeitszeit und Besetzung"], ["entscheidung", "Interne Entscheidung"], ["quellen", "Quellen und Redaktion"],
];

export default function CleaningTimePage() {
  return <main className={`knowledge-article ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <div className="article-intro knowledge-screen-only">
      <nav className="knowledge-breadcrumb" aria-label="Brotkrumennavigation"><Link href="/">MerKalku</Link><span aria-hidden="true">/</span><Link href="/wissen">Wissen</Link><span aria-hidden="true">/</span><span>Reinigungszeit berechnen</span></nav>
      <p className="knowledge-eyebrow">Kalkulation · Arbeitshilfe 02 · Entwurf zur Vorschau</p>
      <h1>{heading}</h1>
      <p className="knowledge-lead">Eine nachvollziehbare Stundensumme beginnt bei den Annahmen. Rechnen Sie mit Ihren eigenen Flächen, Leistungswerten und Einsätzen – und sehen Sie, was eine andere Leistungsannahme verändert.</p>
      <div className="article-meta"><span>Von MerKalku</span><span>Inhalts- und Quellenstand: <time dateTime={CLEANING_TIME_CONTENT_DATE}>3. Oktober 2026</time></span><span>Noch nicht veröffentlicht</span></div>
      <a href="#rechner" className="btn-primary knowledge-button">Direkt zum kostenlosen Rechner <span aria-hidden="true">↓</span></a>
    </div>
    <div className="knowledge-print-only print-heading"><p>MerKalku Wissen · Inhaltsstand 03.10.2026 · Vorschau</p><h1>Reinigungszeit – Rechenstand und Annahmen</h1><p>Eigene Arbeitshilfe. Die Zahlen beruhen auf den eingegebenen Annahmen und bestätigen weder die praktische Durchführbarkeit noch eine interne Freigabe.</p></div>
    <div className="article-grid">
      <aside className="article-toc knowledge-screen-only"><nav aria-label="In diesem Artikel"><p>In diesem Artikel</p>{sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav></aside>
      <div className="article-body">
        <section className="article-answer knowledge-screen-only"><h2>Wie berechne ich Reinigungsstunden?</h2><p>Teilen Sie die Fläche einer Raumgruppe durch den eigenen Leistungswert in m² je Arbeitsstunde und multiplizieren Sie mit den Einsätzen im gewählten Zeitraum. Addieren Sie die Gruppen und separat erfasste Zusatzzeiten. Das Ergebnis gilt für diesen Leistungsumfang und Zeitraum; es ist noch kein Personalplan oder Angebotspreis.</p><p className="article-small">Starten Sie mit einer Gruppe. Weitere Gruppen und eine alternative Leistungsannahme ergänzen Sie bei Bedarf. Alle Zahlen beginnen leer; nur „Fiktives Beispiel laden“ setzt ausdrücklich erfundene Werte ein.</p></section>

        <CleaningTimeCalculator />

        <section id="formel" className="prose-section knowledge-screen-only"><h2>1. Was genau steckt in der Formel?</h2><p>Die folgende Rechnung ist eine eigene Einheitenrechnung. Sie wird nicht aus einer RAL-Leistungswerttabelle übernommen und gibt keinen empfohlenen Leistungswert vor.</p>
          <div className={styles.formula}>Arbeitsstunden = Summe aller Gruppen (Fläche ÷ Leistungswert × Einsätze) + gemeinsame Zusatzminuten ÷ 60 × Objektbesuche</div>
          <dl className={styles.definitionList}>
            <div><dt>Fläche</dt><dd>m², die bei einem Einsatz der beschriebenen Gruppe tatsächlich bearbeitet werden.</dd></div>
            <div><dt>Leistungswert</dt><dd>m² je Arbeitsstunde für genau diesen Leistungsumfang. Basis und Alternative stammen von Ihnen.</dd></div>
            <div><dt>Einsätze</dt><dd>Zahl der Ausführungen dieser Gruppe im ausdrücklich gewählten Zeitraum.</dd></div>
            <div><dt>Zusatzzeit</dt><dd>Zusätzliche Arbeitsminuten je Objektbesuch, die noch in keinem Leistungswert enthalten sind.</dd></div>
          </dl>
          <p>Unterschiedliche Flächenleistungen und Takte gehören in getrennte Gruppen. Eine monatliche Sonderleistung braucht eine eigene Betrachtung, wenn sie nicht zum gewählten Wochenumfang gehört. Wird eine Leistung in Minuten je Raum oder je Stück vorgegeben, lässt sie sich hier nicht unverändert als m²/h eintragen.</p>
          <p className="article-takeaway">21,25 Arbeitsstunden bedeuten 21 Stunden 15 Minuten. Dezimalstunden sind keine Uhrzeitangabe.</p>
        </section>

        <section id="leistungswert" className="prose-section knowledge-screen-only"><h2>2. Woher kommt ein eigener belastbarer Leistungswert?</h2><p>Ein eingetippter Wert ist zunächst eine Annahme. Halten Sie bei jeder Gruppe fest, welche Tätigkeiten, Verfahren und Nebenarbeiten er umfasst und worauf er beruht. Der Rechner bietet dafür lokale Notizfelder; eine fehlende Grundlage ersetzt er nicht durch eine Schätzung.</p>
          <p><strong>Unsere Arbeitsempfehlung für eine eigene Beobachtung:</strong> Dokumentieren Sie eine bekannte bearbeitete Fläche und die zugehörigen Arbeitsstunden aller beteiligten Personen. Fläche geteilt durch diese Personenstunden ergibt den beobachteten Leistungswert. Notieren Sie Unterbrechungen und enthaltene Zusatzarbeiten, damit Sie vergleichbare Umfänge gegenüberstellen. Eine einzelne Beobachtung ist noch kein allgemeiner Branchenwert.</p>
          <p>Wenn eine Annahme offen bleibt, stellen Sie ihr einen zweiten selbst gewählten Leistungswert gegenüber. Der Vergleich beantwortet: Wie viele zusätzliche oder weniger Arbeitsstunden hängen an dieser Annahme? Er liefert keine Wahrscheinlichkeit und kein statistisch gesichertes Unsicherheitsband.</p>
          <p className="article-takeaway">Im untenstehenden Beispiel sind die alternativen Leistungswerte 20 % kleiner. Die Flächenzeiten werden dadurch 25 % größer. Die unveränderte Zusatzzeit wird nicht ebenfalls erhöht.</p>
        </section>

        <section id="einsatzplan" className="prose-section knowledge-screen-only"><h2>3. Wie vermeide ich falsche Häufigkeiten und doppelte Zusatzzeit?</h2><p>Die Einsatzzahl gehört zur Leistung und zum Zeitraum. In derselben Woche können Büro- und Sanitärräume fünf Einsätze haben, Verkehrsflächen aber nur drei. Zählen Sie die tatsächlichen Ausführungen aus den für Ihr Objekt geltenden Vorgaben, einschließlich ausdrücklich ausgenommener Tage. Eine Wochenzahl wird nicht automatisch zu einer Monats- oder Jahreszahl.</p>
          <p>Trennen Sie dann die Auslöser zusätzlicher Arbeit: Ein gemeinsamer Objektblock fällt möglicherweise je Objektbesuch an und wird daher einmal angesetzt. Er gehört nicht nochmals in jede Raumgruppe. Prüfen Sie vorher, ob diese Arbeit bereits im Leistungswert steckt.</p>
          <p>Der Rechner bildet einen gemeinsamen Zusatzblock je Objektbesuch ab. Zusätzliche Tätigkeiten mit anderen Häufigkeiten oder abweichendem Leistungsumfang müssen Sie gesondert prüfen; erzwingen Sie dafür keine unpassende Einsatzzahl. Bei mehreren Beteiligten zählen deren Arbeitsminuten zusammen – zehn Minuten verstrichene Zeit sind nicht automatisch zehn Arbeitsminuten.</p>
          <p>Ändern Sie im Rechner den Zeitraum, werden alle Einsatzzahlen geleert. Fläche und Leistungswert bleiben erhalten, damit Sie den Umfang gezielt für den neuen Zeitraum neu festlegen können.</p>
        </section>

        <section id="beispiel" className="prose-section knowledge-screen-only"><h2>4. Fiktives Mischobjekt: Welche Annahme verändert die Woche?</h2>
          <div className="fictional-example"><p className="fictional-label">Fiktive Lehrwoche · alle Werte erfunden · keine Branchenempfehlung</p><p>Das Objekt wird von Montag bis Freitag fünfmal besucht. Die folgende Tabelle beschreibt drei getrennte Gruppen; der gemeinsame Zusatzblock ist in keinem Leistungswert enthalten.</p>
            <div className="knowledge-table-scroll"><table><caption>Selbst gewählte Beispielwerte für genau diese Woche</caption><thead><tr><th scope="col">Gruppe</th><th scope="col">Fläche je Einsatz</th><th scope="col">Einsätze</th><th scope="col">Basis / Alternative</th><th scope="col">Flächenzeit Basis / Alternative</th></tr></thead><tbody>
              <tr><th scope="row">Büro</th><td>600 m²</td><td>5 · Mo–Fr</td><td>300 / 240 m²/h</td><td>10 / 12,5 h</td></tr>
              <tr><th scope="row">Sanitär</th><td>100 m²</td><td>5 · Mo–Fr</td><td>100 / 80 m²/h</td><td>5 / 6,25 h</td></tr>
              <tr><th scope="row">Verkehrsflächen</th><td>300 m²</td><td>3 · Mo, Mi, Fr</td><td>600 / 480 m²/h</td><td>1,5 / 1,875 h</td></tr>
            </tbody></table></div>
            <p><strong>Zusatzblock:</strong> 20 Arbeitsminuten je Objektbesuch × 5 Besuche = 100 Arbeitsminuten, also 1 Stunde 40 Minuten. Dieser Block wird in beiden Szenarien genau einmal addiert.</p>
            <div className={styles.exampleResult}><div><span>Basis: 16,5 h Flächenzeit + Zusatzblock</span><strong>18 h 10 min</strong><span>Exakt 109/6 Arbeitsstunden</span></div><div><span>Alternative: 20,625 h Flächenzeit + Zusatzblock</span><strong>22 h 17 min 30 s</strong><span>Exakt 535/24 Arbeitsstunden</span></div></div>
            <p><strong>Die Differenz beträgt 4 Stunden 7 Minuten 30 Sekunden.</strong> Sie stammt hier allein aus den anders eingegebenen Leistungswerten. Sekunden machen die Rechnung überprüfbar; sie behaupten keine entsprechend genaue Planung des echten Objekts.</p>
            <p>Die Zahlen wurden über eine gruppenweise Wochenrechnung und eine separate Tagesrechnung gegengeprüft. Eine Erprobung dieser Leistungswerte im Betrieb ist damit nicht verbunden.</p>
          </div>
        </section>

        <section id="personal" className="prose-section knowledge-screen-only"><h2>5. Sind Arbeitsstunden gleich Schichtdauer oder Personalbedarf?</h2><p>Nein. Die Wochensumme beschreibt aufsummierte Personenzeit. Für eine Besetzung müssen Sie zusätzlich sehen, an welchen Tagen diese Arbeit anfällt und welches Zugangsfenster verfügbar ist.</p>
          <div className="knowledge-table-scroll"><table><caption>Tagesverteilung der fiktiven Lehrwoche, einschließlich Zusatzblock</caption><thead><tr><th scope="col">Tage</th><th scope="col">Basis pro Tag</th><th scope="col">Alternative pro Tag</th></tr></thead><tbody><tr><th scope="row">Mo, Mi, Fr</th><td>3 h 50 min</td><td>4 h 42 min 30 s</td></tr><tr><th scope="row">Di, Do</th><td>3 h 20 min</td><td>4 h 5 min</td></tr></tbody></table></div>
          <p>Angenommen, das Objekt wäre im Beispiel nur von 17 bis 20 Uhr zugänglich. Eine einzelne Person könnte in diesem Fenster höchstens drei Arbeitsstunden leisten; der angesetzte Tagesbedarf liegt schon in der Basis darüber. Diese Lücke bleibt auch dann bestehen, wenn die Wochensumme plausibel wirkt.</p>
          <p>Zwei vollständig verfügbare Personen hätten rechnerisch zusammen höchstens sechs Arbeitsstunden in diesem Fenster. Ob die Tätigkeiten parallel ausgeführt werden können, die Aufgabenfolge passt und weitere nötige Zeiten abgedeckt sind, wäre separat zu prüfen. Der Rechner leitet deshalb keine Mitarbeiterzahl oder fertige Schicht aus der Stundensumme ab.</p>
        </section>

        <section id="entscheidung" className="prose-section knowledge-screen-only"><h2>6. Was braucht die interne Entscheidung?</h2><p>Für Kalkulation und Geschäftsführung ist die wichtigste Frage nicht nur „Wie viele Stunden?“, sondern „Welche Annahme können wir für diesen Stand verwenden?“. Unsere Arbeitsempfehlung: Nehmen Sie Rechenweg und offene Punkte gemeinsam in die Abstimmung.</p>
          <ul className={styles.articleList}><li><strong>Umfang:</strong> Sind alle Gruppen, Einheiten und Einsätze abgedeckt?</li><li><strong>Herkunft:</strong> Welche Leistungswerte sind begründet, welche noch ungeprüft?</li><li><strong>Zusatzzeiten:</strong> Was ist enthalten, was wurde separat und genau einmal angesetzt?</li><li><strong>Durchführung:</strong> Passt der Tagesbedarf zur tatsächlichen Verfügbarkeit und zum Objektfenster?</li><li><strong>Entscheidung:</strong> Wer klärt welche offene Annahme, und welcher Stand wird weiterverwendet?</li></ul>
          <p>Im Rechner können Sie dazu Unterlagenstand, nächste Klärung und Zuständigkeit notieren. Die Druckübersicht enthält Eingaben, Ergebnis, Annahmen und diese Entscheidungshilfe. Ein angekreuzter Punkt oder ein errechneter Wert erteilt keine automatische Freigabe.</p>
          <p>Der Rechner bewertet keine Löhne, Kostensätze oder Marge. Aus Arbeitsstunden allein folgt kein Angebotspreis. Prüfen Sie außerdem den Leistungsumfang an den Originalunterlagen; dabei hilft unsere <Link href="/wissen/ausschreibung-gebaeudereinigung-pruefen" className={styles.articleLink}>Checkliste für Reinigungsausschreibungen</Link>.</p>
        </section>

        <section id="quellen" className="article-sources knowledge-screen-only"><h2>Quelle und Einordnung</h2><div><h3><ContentLink contentId={CLEANING_TIME_CONTENT_ID} kind="source" sourceId="ral_wissen" href={sourceUrl}>RAL GGGR: Wissen und Arbeitshilfen ↗</ContentLink></h3><p>Die RAL GGGR führt auf ihrer Wissensübersicht Fachinformationen zu Leistungszahlen und Vergabehandbücher auf. Die Seite dient hier als weiterführender Fachhinweis. Unsere Formel, Beispielzahlen, Szenarien und Arbeitsempfehlungen sind eigene Darstellungen; die RAL hat sie nicht geprüft oder freigegeben. Wir übernehmen keine Leistungswerttabellen.</p><p>Primärseite geprüft am <time dateTime={CLEANING_TIME_CONTENT_DATE}>03.10.2026</time>. Der Abrufzeitpunkt ist keine Aktualitätsbestätigung für sämtliche dort verlinkten Dokumente.</p></div></section>
        <section className="article-product knowledge-screen-only"><p className="knowledge-eyebrow">Nächster Schritt</p><h2>Die Annahmen stehen. Wie sieht Ihr Angebotsablauf aus?</h2><p>Besprechen Sie im MerKalku-Praxischeck Ihren Weg von der Ausschreibung zur Kalkulation. Nehmen Sie die offenen Fragen aus Ihrer Stundenrechnung mit.</p><ContentLink contentId={CLEANING_TIME_CONTENT_ID} kind="product" href="/#termin" className="btn-primary knowledge-button">Zum MerKalku-Praxischeck <span aria-hidden="true">↗</span></ContentLink></section>
        <footer className="article-editorial"><h2>Redaktion & Korrekturen</h2><p>Herausgeber: {FIRMA.marke} / {FIRMA.name}. Redaktioneller Kontakt: {FIRMA.geschaeftsfuehrer}, <a href={`mailto:${FIRMA.email}`}>{FIRMA.email}</a>.</p><p>Eigene Arbeitshilfe von MerKalku, mit KI-Unterstützung erstellt. Inhalts- und Quellenstand: <time dateTime={CLEANING_TIME_CONTENT_DATE}>03.10.2026</time>. Korrekturhinweise nehmen wir über den redaktionellen Kontakt entgegen.</p><p className="knowledge-print-only">Artikel und Quellen: {SITE_URL}{path}</p></footer>
      </div>
    </div>
  </main>;
}
