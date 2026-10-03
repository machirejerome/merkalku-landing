import Link from "next/link";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { checklistArticle as article } from "@/lib/knowledge";

export const metadata = pageMetadata("/wissen", "Wissen für die Gebäudereinigung", "Praktische Arbeitshilfen für die Angebotsarbeit: Ausschreibungen prüfen, Reinigungszeit berechnen und Excel-Preisblätter kontrollieren. Ohne Account.");

export default function KnowledgePage() {
  const breadcrumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "MerKalku", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Wissen", item: `${SITE_URL}/wissen` },
  ] };
  return <main className="knowledge-hub">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
    <p className="knowledge-eyebrow">MerKalku Wissen</p>
    <h1>Gute Angebote beginnen<br className="hub-break" /> mit klaren Grundlagen.</h1>
    <p className="knowledge-lead">Praktische Arbeitshilfen für Gebäudereiniger. Schnell etwas prüfen, verstehen oder ausrechnen – ohne Account.</p>
    <a className="knowledge-article-card" href={article.path}>
      <div className="knowledge-card-mark" aria-hidden="true"><span>01</span><svg viewBox="0 0 100 110" fill="none"><rect x="20" y="9" width="64" height="90" rx="7" stroke="currentColor" strokeWidth="2"/><path d="m32 36 4 4 8-9m7 5h20M32 55h9v9h-9m19-5h20M32 78h9v9h-9m19-5h20" stroke="currentColor" strokeWidth="2"/></svg></div>
      <div><p className="knowledge-eyebrow">Ausschreibungen · Checkliste</p><h2>Ausschreibung prüfen,<br />bevor Sie kalkulieren.</h2><p>Fünf kurze Prüfpunkte für Leistungen, Fristen und Kapazität. Direkt abhaken, ohne ein Formular auszufüllen.</p><span className="knowledge-card-link">Zur Checkliste <span aria-hidden="true">→</span></span></div>
    </a>
    <Link className="knowledge-article-card" href="/wissen/reinigungszeit-berechnen">
      <div className="knowledge-card-mark" aria-hidden="true"><span>02</span><svg viewBox="0 0 100 110" fill="none"><circle cx="50" cy="55" r="34" stroke="currentColor" strokeWidth="2"/><path d="M50 33v24l16 9M42 12h16" stroke="currentColor" strokeWidth="3"/></svg></div>
      <div><p className="knowledge-eyebrow">Zeitkalkulation · Rechner</p><h2>Wie viel Arbeitszeit<br/>steckt im Auftrag?</h2><p>Fläche und eigenen Leistungswert eingeben. Sofort sehen, wie viel Arbeitszeit eine Reinigung benötigt.</p><span className="knowledge-card-link">Zum Reinigungszeit-Rechner →</span></div>
    </Link>
    <Link className="knowledge-article-card" href="/wissen/excel-preisblatt-pruefen">
      <div className="knowledge-card-mark" aria-hidden="true"><span>03</span><svg viewBox="0 0 100 110" fill="none"><rect x="15" y="21" width="70" height="68" rx="5" stroke="currentColor" strokeWidth="2"/><path d="M15 43h70M15 65h70M38 21v68M61 21v68" stroke="currentColor" strokeWidth="2"/></svg></div>
      <div><p className="knowledge-eyebrow">Angebotsprüfung · Übung</p><h2>Stimmt die Rechnung –<br/>und auch das Preisblatt?</h2><p>Drei typische Fehler an einem kurzen Beispiel erkennen: falsche Häufigkeit, fehlende Position in der Summe und offener Preis.</p><span className="knowledge-card-link">Preisblatt prüfen →</span></div>
    </Link>
    <Link className="knowledge-article-card" href="/ausschreibungen">
      <div className="knowledge-card-mark" aria-hidden="true"><span>04</span><svg viewBox="0 0 100 110" fill="none"><circle cx="43" cy="45" r="25" stroke="currentColor" strokeWidth="2"/><path d="m62 64 22 22M32 45h22M43 34v22" stroke="currentColor" strokeWidth="2"/></svg></div>
      <div><p className="knowledge-eyebrow">Ausschreibungssuche · Pilot</p><h2>Welche Ausschreibung<br/>liegt in Ihrer Nähe?</h2><p>Einen kleinen, geprüften TED-Bestand nach PLZ und Umkreis durchsuchen. Mit aktueller Frist und Link zur Originalbekanntmachung.</p><span className="knowledge-card-link">Zum Ausschreibungsfinder →</span></div>
    </Link>
    <p className="knowledge-hub-note">Eigene organisatorische Arbeitshilfen mit benannten Quellen. Maßgeblich für Ihr Angebot bleiben die konkreten Verfahrensunterlagen.</p>
  </main>;
}
