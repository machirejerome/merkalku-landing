import type { Metadata } from "next";

export const SITE_URL = "https://www.merkalku.de";

const socialImage = {
  url: "/og-image.png",
  width: 1024,
  height: 278,
  alt: "MerKalku – Mehr Aufträge. Weniger Büro.",
};

/** Child routes replace nested Next metadata objects rather than merging them. */
export function pageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: "MerKalku",
      url: new URL(path, SITE_URL).toString(),
      title: `${title} | MerKalku`,
      description,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | MerKalku`,
      description,
      images: [socialImage.url],
    },
  };
}
