/* Produktbilder für die Ads-Landingpage. Leerer Pfad = die Stelle bleibt ohne Bild (kein Platzhalter,
   kein Stock). Sobald echte Screenshots unter /public liegen, hier eintragen. */
export const BILDER = {
  /** Station 1: Import-Übersicht. Vorhanden: Poster der Format-Animation. */
  import: "/hero-poster.webp",
  /** Schritt 2: Zusammenfassung der Vergabeunterlagen mit dem Knopf "Kalkulation fortsetzen".
      Das ist der Entscheidungs-Moment. Ortsnennungen durch Musterdaten ersetzt, 1400 px, WebP. */
  zusammenfassung: "/zusammenfassung.webp",
  /** Abgabecheckliste mit Quellenangabe je Pflichtpunkt. Aktuell nicht eingebunden,
      passt inhaltlich zu Schritt 4 (Freigeben) und taugt als Anzeigenbild. */
  checkliste: "/checkliste.webp",
  /** Station 3: Kalkulationsansicht (Stunden, Lohnkosten, Zuschläge, Deckungsbeitrag) */
  kalkulation: "",
  /** Schritt 4: Angebot, anonymisiert */
  angebot: "",
} as const;
