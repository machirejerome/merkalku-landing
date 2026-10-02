import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { KNOWLEDGE_CONTENT_DATE, checklistArticle } from "@/lib/knowledge";

export default function sitemap(): MetadataRoute.Sitemap {
  // Add lastModified only when a content revision date is available, not the build date.
  return [
    { url: `${SITE_URL}/wissen`, lastModified: KNOWLEDGE_CONTENT_DATE, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}${checklistArticle.path}`, lastModified: KNOWLEDGE_CONTENT_DATE, changeFrequency: "monthly", priority: 0.7 },
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/preisrechner`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/impressum`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/datenschutz`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/agb`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
