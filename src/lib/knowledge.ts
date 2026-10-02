import article from "../content/checkliste.json";
import { SITE_URL } from "./seo";

export const CHECKLIST_CONTENT_ID = "ausschreibung-gebaeudereinigung-pruefen";
export const CHECKLIST_REVISION = 1;
// Editorial revision of this content, never calculated from the build/deployment time.
export const KNOWLEDGE_CONTENT_DATE = "2026-10-02";
// First public release verified on this date; independent of later deployments.
export const CHECKLIST_PUBLISHED_DATE = "2026-10-02";
export const checklistArticle = article;
export const checklist = article.sections.find((section) => section.checklist)!.checklist!;

export function knowledgeJsonLd() {
  const url = SITE_URL + article.path;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article", "@id": `${url}#article`, url,
        headline: article.title, description: article.meta_description, inLanguage: "de-DE",
        author: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "MerKalku" },
        publisher: { "@id": `${SITE_URL}/#organization` },
        datePublished: CHECKLIST_PUBLISHED_DATE,
        dateModified: KNOWLEDGE_CONTENT_DATE,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        citation: article.further_reading.items.map((source) => source.url),
      },
      {
        "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
          { "@type": "ListItem", position: 1, name: "MerKalku", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Wissen", item: `${SITE_URL}/wissen` },
          { "@type": "ListItem", position: 3, name: "Ausschreibung prüfen", item: url },
        ],
      },
    ],
  };
}
