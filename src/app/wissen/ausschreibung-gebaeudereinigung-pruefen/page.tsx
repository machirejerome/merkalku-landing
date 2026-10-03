import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { checklistArticle as article, checklist, knowledgeJsonLd, KNOWLEDGE_CONTENT_DATE, CHECKLIST_PUBLISHED_DATE, CHECKLIST_REVISION } from "@/lib/knowledge";
import Checklist from "@/components/wissen/Checklist";
import ContentLink from "@/components/wissen/ContentLink";
import "./checklist.css";

const baseMetadata = pageMetadata(article.path, "Ausschreibung Gebäudereinigung prüfen: Checkliste", article.meta_description);
export const metadata: Metadata = {
  ...baseMetadata, authors: [{ name: "MerKalku", url: `${SITE_URL}/impressum` }],
  openGraph: { ...baseMetadata.openGraph, type: "article", publishedTime: CHECKLIST_PUBLISHED_DATE, modifiedTime: KNOWLEDGE_CONTENT_DATE },
};
const dateLabel = (value: string) => new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));

export default function ChecklistArticlePage() {
  return <main className="knowledge-article compact-checklist-article">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(knowledgeJsonLd()).replace(/</g, "\\u003c") }} />
    <header className="compact-checklist-intro knowledge-screen-only">
      <nav className="knowledge-breadcrumb" aria-label="Brotkrumennavigation"><Link href="/wissen">Wissen</Link><span aria-hidden="true">/</span><span>Ausschreibung prüfen</span></nav>
      <p className="knowledge-eyebrow">Ausschreibungen · kurze Arbeitshilfe</p>
      <h1>{article.title}</h1><p className="compact-checklist-lead">{article.lead}</p>
      <p className="compact-checklist-meta">Von MerKalku · Aktualisiert am <time dateTime={KNOWLEDGE_CONTENT_DATE}>{dateLabel(KNOWLEDGE_CONTENT_DATE)}</time></p>
    </header>
    <header className="knowledge-print-only compact-checklist-print-heading"><p>MerKalku Wissen · Stand: {dateLabel(KNOWLEDGE_CONTENT_DATE)}</p><h1>Ausschreibung prüfen: 5 Punkte</h1></header>
    <Checklist items={checklist.items} revision={CHECKLIST_REVISION} />
    <div className="compact-checklist-after knowledge-screen-only">
      <p className="compact-checklist-next"><strong>Etwas bleibt offen?</strong> {article.short_answer}</p>
      <details className="compact-checklist-detail"><summary>{article.example.heading}<span aria-hidden="true">+</span></summary><div><p className="compact-checklist-fiction">{article.example.label}</p>{article.example.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></details>
      <details id="quellen" className="compact-checklist-detail"><summary>{article.further_reading.heading}<span aria-hidden="true">+</span></summary><div><p>{article.further_reading.intro}</p>{article.further_reading.items.map((source) => <section key={source.source_id}><h2><ContentLink kind="source" sourceId={source.source_id as "ted_fields" | "ral_vergabe"} href={source.url}>{source.label} ↗</ContentLink></h2><p>{source.text}</p></section>)}<p className="compact-checklist-source-date">Quellen geprüft: <time dateTime={article.source_checked_date}>{dateLabel(article.source_checked_date)}</time>. {article.intro_note}</p></div></details>
      <nav className="compact-checklist-related" aria-label="Weitere Arbeitshilfen"><span>Danach weiter:</span><Link href="/wissen/reinigungszeit-berechnen">Reinigungszeit berechnen →</Link><Link href="/wissen/excel-preisblatt-pruefen">Excel-Preisblatt prüfen →</Link></nav>
      <aside className="compact-checklist-product"><p>{article.cta.body}</p><ContentLink kind="product" href={article.cta.href}>{article.cta.label} →</ContentLink></aside>
    </div>
    <footer className="compact-checklist-editorial"><p className="knowledge-screen-only">Eigene Arbeitshilfe von MerKalku, mit KI-Unterstützung erstellt. <Link href="/impressum">Kontakt für Korrekturen</Link>.</p><p className="knowledge-print-only">Artikel und Quellen: {SITE_URL}{article.path}</p></footer>
  </main>;
}
