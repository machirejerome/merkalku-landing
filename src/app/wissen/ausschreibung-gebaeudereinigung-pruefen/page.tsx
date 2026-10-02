import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata, SITE_URL } from "@/lib/seo";
import { checklistArticle as article, checklist, knowledgeJsonLd, KNOWLEDGE_CONTENT_DATE, CHECKLIST_PUBLISHED_DATE } from "@/lib/knowledge";
import { FIRMA } from "@/lib/firma";
import Checklist from "@/components/wissen/Checklist";
import ContentLink from "@/components/wissen/ContentLink";

const title = "Ausschreibung Gebäudereinigung prüfen: Checkliste";
const baseMetadata = pageMetadata(article.path, title, article.meta_description);
export const metadata: Metadata = {
  ...baseMetadata, authors: [{ name: "MerKalku", url: `${SITE_URL}/impressum` }],
  openGraph: { ...baseMetadata.openGraph, type: "article", publishedTime: CHECKLIST_PUBLISHED_DATE, modifiedTime: KNOWLEDGE_CONTENT_DATE },
};

export default function ChecklistArticlePage() {
  return <main className="knowledge-article">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(knowledgeJsonLd()).replace(/</g, "\\u003c") }} />
    <div className="knowledge-screen-only article-intro">
      <nav className="knowledge-breadcrumb" aria-label="Brotkrumennavigation"><Link href="/">MerKalku</Link><span aria-hidden="true">/</span><Link href="/wissen">Wissen</Link><span aria-hidden="true">/</span><span>Ausschreibung prüfen</span></nav>
      <p className="knowledge-eyebrow">Ausschreibungen · Arbeitshilfe 01</p>
      <h1>{article.title}</h1>
      <p className="knowledge-lead">{article.lead}</p>
      <div className="article-meta"><span>Von MerKalku</span><span>Inhalts- und Quellenstand: <time dateTime={article.source_checked_date}>2. Oktober 2026</time></span></div>
      <a href="#checkliste" className="btn-primary knowledge-button">Direkt zur ausfüllbaren Checkliste <span aria-hidden="true">↓</span></a>
    </div>
    <div className="knowledge-print-only print-heading"><p>MerKalku Wissen · Stand: 02.10.2026</p><h1>Ausschreibung Gebäudereinigung prüfen</h1><p>Eigene organisatorische Arbeitshilfe. Anforderungen und Fristen anhand der konkreten Originalunterlagen prüfen.</p></div>
    <div className="article-grid">
      <aside className="article-toc knowledge-screen-only"><nav aria-label="In diesem Artikel"><p>In diesem Artikel</p>{article.sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.heading.replace(/^\d\. /, "")}</a>)}<a href="#quellen">Quellen & Kontakt</a></nav></aside>
      <div className="article-body">
        <section className="article-answer knowledge-screen-only"><h2>Worauf kommt es zuerst an?</h2><p>{article.short_answer}</p><p className="article-small">{article.intro_note}</p></section>
        {article.sections.map((section) => <section id={section.id} key={section.id} className={`prose-section ${section.checklist ? "checklist-section" : "knowledge-screen-only"}`}>
          <div className="knowledge-screen-only"><h2>{section.heading}</h2>{section.paragraphs.map((text) => <p key={text}>{text}</p>)}</div>
          {section.source_note && <aside className="article-source-note knowledge-screen-only"><p>{section.source_note.text}</p><ContentLink kind="source" sourceId="ted_fields" href={article.further_reading.items.find((source) => source.source_id === "ted_fields")!.url}>Quelle: TED-Feldverzeichnis ↗</ContentLink></aside>}
          {section.takeaway && <p className="article-takeaway">{section.takeaway}</p>}
          {section.example && <div className="fictional-example"><p className="fictional-label">Fiktives Beispiel · keine echten Vergabeunterlagen</p><p>{section.example.label}</p><div className="knowledge-table-scroll"><table><thead><tr>{section.example.columns.map((col) => <th key={col}>{col}</th>)}</tr></thead><tbody>{section.example.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th scope="row" key={cell}>{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div><p>{section.example.interpretation}</p></div>}
          {section.checklist && <>
            <div className="example-rows"><p className="fictional-label">Fiktive Übung · alle Angaben sind erfunden</p><h3>{checklist.filled_examples_heading}</h3><p>Diese zwei Zeilen zeigen die Arbeitsweise. Sie sind getrennt von Ihrer leeren Vorlage und werden dort nicht vorbelegt.</p>
              {checklist.filled_examples.map((example) => <div className="example-row" key={example.id}><h4>{example.checkpoint}</h4><dl><div><dt>Fiktive Fundstelle</dt><dd>{example.original_reference}</dd></div><div><dt>Befund</dt><dd>{example.finding}</dd></div><div><dt>Status / zuständig</dt><dd><strong>{example.status}</strong> · {example.owner}</dd></div><div><dt>Nächster Schritt</dt><dd>{example.next_step}</dd></div><div><dt>Interner Termin</dt><dd>{example.internal_due_date}</dd></div><div><dt>Wann ist die Frage geklärt?</dt><dd>{example.resolution_rule}</dd></div></dl></div>)}
            </div>
            <Checklist items={checklist.items} statuses={checklist.status_options} />
          </>}
          {section.decisions && <div className="article-decisions">{section.decisions.map((decision) => <div key={decision.label}><h3>{decision.label}</h3><p>{decision.description}</p></div>)}</div>}
          {section.closing && <p>{section.closing}</p>}
        </section>)}
        <section id="quellen" className="article-sources knowledge-screen-only"><h2>{article.further_reading.heading}</h2><p>{article.further_reading.intro}</p>{article.further_reading.items.map((source) => <div key={source.source_id}><h3><ContentLink kind="source" sourceId={source.source_id as "ted_fields" | "ral_vergabe"} href={source.url}>{source.label} ↗</ContentLink></h3><p>{source.text}</p></div>)}</section>
        <section className="article-product knowledge-screen-only"><p className="knowledge-eyebrow">Von der Prüfung zur Kalkulation</p><h2>{article.cta.heading}</h2><p>{article.cta.body}</p><ContentLink kind="product" href={article.cta.href} className="btn-primary knowledge-button">{article.cta.label} <span aria-hidden="true">↗</span></ContentLink></section>
        <footer className="article-editorial"><h2>Redaktion & Korrekturen</h2><p>Herausgeber: {FIRMA.marke} / {FIRMA.name}. Redaktioneller Kontakt: {FIRMA.geschaeftsfuehrer}, <a href={`mailto:${FIRMA.email}`}>{FIRMA.email}</a>.</p><p>Eigener Arbeitsleitfaden von MerKalku, mit KI-Unterstützung erstellt. Quellenstand: <time dateTime={article.source_checked_date}>02.10.2026</time>. Hinweise oder Korrekturen nehmen wir über den redaktionellen Kontakt entgegen.</p><p className="knowledge-print-only">Artikel und Quellen: {SITE_URL}{article.path}</p></footer>
      </div>
    </div>
  </main>;
}
