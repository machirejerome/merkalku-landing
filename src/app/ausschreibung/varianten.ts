/* Headline je Anzeigengruppe: die Seite setzt den Anzeigentitel wörtlich fort (Message Match).
   Eine Ein-Satz-Subline je Variante, sonst nichts. Eigene Datei ohne "use client", damit die
   Server-Seite (page.tsx) die Werte lesen kann. */
export const VARIANTEN = {
  kalkulation: {
    headline: ["Ausschreibung kalkulieren:", "Vergabeunterlagen rein, Angebot raus."],
    sub: "Für Gebäudereiniger mit Ausschreibungen. Die KI liest die Vergabeunterlagen und füllt eure Kalkulation aus, du prüfst und gibst frei.",
  },
  lv: {
    headline: ["Vergabeunterlagen auswerten,", "ohne 80 Seiten zu lesen."],
    sub: "Für Gebäudereiniger mit Ausschreibungen. Die KI fasst die Vergabeunterlagen zusammen und füllt eure Kalkulation aus, du prüfst und gibst frei.",
  },
  software: {
    headline: ["Kalkulationssoftware für Gebäudereiniger:", "findet Ausschreibungen, liest Vergabeunterlagen."],
    sub: "Die KI findet Ausschreibungen, liest die Vergabeunterlagen und füllt eure Kalkulation aus, du prüfst und gibst frei.",
  },
} as const;
export type Variante = keyof typeof VARIANTEN;

export function varianteAus(roh: string): Variante {
  const k = roh.trim().toLowerCase();
  /* Standard = breitester Prompt-Cluster ("Ausschreibung kalkulieren") */
  return (Object.keys(VARIANTEN) as Variante[]).includes(k as Variante) ? (k as Variante) : "kalkulation";
}
