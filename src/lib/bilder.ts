/* Produktbilder für die Ads-Landingpage. Leerer Pfad = die Stelle bleibt ohne Bild (kein Platzhalter,
   kein Stock). Sobald echte Screenshots unter /public liegen, hier eintragen. */
export const BILDER = {
  /** Station 1: Import-Übersicht. Vorhanden: Poster der Format-Animation. */
  import: "/hero-poster.webp",
  /** Schritt 2 + Anzeigenbild: Zusammenfassung der Vergabeunterlagen mit Checkliste und Quellen.
      Objektdaten durch Musterdaten ersetzt, 1400 px, WebP. */
  pruefansicht: "/pruefansicht.webp",
  /** Station 3: Kalkulationsansicht (Stunden, Lohnkosten, Zuschläge, Deckungsbeitrag) */
  kalkulation: "",
  /** Schritt 4: Angebot, anonymisiert */
  angebot: "",
} as const;
