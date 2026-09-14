/* Firmendaten für Footer, Gate und Gründer-Block. Quelle: Impressum (src/app/impressum/page.tsx).
   Hier zentral, damit Landingpage, Rechner und Impressum dieselben Angaben tragen. */
export const FIRMA = {
  name: "IntelligenzWerk UG (haftungsbeschränkt)",
  marke: "MerKalku",
  strasse: "Schmalzgasse 4",
  plzOrt: "75228 Ispringen",
  region: "Ispringen bei Pforzheim, Baden-Württemberg",
  geschaeftsfuehrer: "Jérôme Machire",
  email: "info@merkalku.de",
  /* Telefonnummer für Footer/Kontakt, leer = wird nicht angezeigt */
  telefon: "", // bewusst leer: keine Telefonnummer auf der Seite (Jérôme, 11.09.2026)
  registergericht: "Amtsgericht Mannheim",
  hrb: "HRB 759441",
  gegruendet: "Juni 2026",
  /* Pfad zum echten Gründerfoto unter /public, leer = kein Bild (kein Stockfoto als Ersatz) */
  foto: "/jerome.webp",
} as const;
