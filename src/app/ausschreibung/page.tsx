import type { Metadata } from "next";
import Landing from "./landing";
import { varianteAus, type Variante } from "./varianten";

/* Ads-Landingpage "Ausschreibung": Ziel bezahlter Anzeigen (ChatGPT Ads, später ggf. Google/Microsoft).
   Nicht im Suchindex (Meta-Robots hier + X-Robots-Tag in next.config.ts), nicht in der Sitemap. */

export const metadata: Metadata = {
  title: "Ausschreibung kalkulieren: Vergabeunterlagen rein, Angebot raus",
  description:
    "Für Gebäudereinigungsbetriebe, die Ausschreibungen bearbeiten: MerKalku findet passende Ausschreibungen, fasst die Vergabeunterlagen zusammen und füllt die Kalkulation mit euren Leistungswerten aus. Du prüfst und gibst frei. Ersparnis in 60 Sekunden berechnen.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  alternates: { canonical: undefined },
  openGraph: {
    title: "Ausschreibung kalkulieren mit MerKalku",
    description: "Vergabeunterlagen rein, Angebot raus. Unter einer Stunde statt Tage. Ersparnis berechnen.",
    url: "https://merkalku.de/ausschreibung",
  },
};

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

function ersterWert(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] || "" : v || "";
}

export default async function AusschreibungPage({ searchParams }: Props) {
  const sp = await searchParams;
  /* Headline-Variante je Anzeigengruppe: ?v=lv | kalkulation | software (Fallback: utm_content) */
  const variante: Variante = varianteAus(ersterWert(sp.v) || ersterWert(sp.utm_content));
  return <Landing variante={variante} />;
}
