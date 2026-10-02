import { pageMetadata, SITE_URL } from "@/lib/seo";
import { checklistArticle as article } from "@/lib/knowledge";

export const metadata = pageMetadata("/wissen", "Wissen für die Gebäudereinigung", "Praktische Arbeitshilfen für die Angebotsarbeit: Ausschreibungen prüfen, offene Punkte dokumentieren und die Kalkulation vorbereiten. Ohne Account.");

export default function KnowledgePage() {
  const breadcrumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "MerKalku", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Wissen", item: `${SITE_URL}/wissen` },
  ] };
  return <main className="knowledge-hub">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
    <p className="knowledge-eyebrow">MerKalku Wissen</p>
    <h1>Gute Angebote beginnen<br className="hub-break" /> mit klaren Grundlagen.</h1>
    <p className="knowledge-lead">Praktische Arbeitshilfen für Gebäudereiniger. Zum Nachlesen, Ausfüllen und Mitnehmen – ohne Account.</p>
    <a className="knowledge-article-card" href={article.path}>
      <div className="knowledge-card-mark" aria-hidden="true"><span>01</span><svg viewBox="0 0 100 110" fill="none"><rect x="20" y="9" width="64" height="90" rx="7" stroke="currentColor" strokeWidth="2"/><path d="m32 36 4 4 8-9m7 5h20M32 55h9v9h-9m19-5h20M32 78h9v9h-9m19-5h20" stroke="currentColor" strokeWidth="2"/></svg></div>
      <div><p className="knowledge-eyebrow">Ausschreibungen · Checkliste</p><h2>Ausschreibung prüfen,<br />bevor Sie kalkulieren.</h2><p>Leistungen, Fristen und Kapazität ordnen. Mit zwei fiktiven Beispielzeilen und einer ausfüllbaren Vorlage für Ihren eigenen Auftrag.</p><span className="knowledge-card-link">Zur Checkliste <span aria-hidden="true">→</span></span></div>
    </a>
    <p className="knowledge-hub-note">Eigene organisatorische Arbeitshilfen mit benannten Quellen. Maßgeblich für Ihr Angebot bleiben die konkreten Verfahrensunterlagen.</p>
  </main>;
}
