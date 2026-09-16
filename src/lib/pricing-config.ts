/* Zentrale Stellschrauben des Preisrechners.
   Enthält keine Preise: hier stehen nur die Rechen-Annahmen der Ersparnis. */

export const PRICING = {
  /** Kalkulatorischer Stundensatz für die Ersparnis-Rechnung (konservativ) */
  stundensatzEur: 55,
  /** Bearbeitungszeit pro Ausschreibung MIT MerKalku, in Stunden (oberes Ende der 10–30 Min.) */
  merkalkuStundenProAusschreibung: 0.5,
  /** Ab so vielen Ausschreibungen/Monat wird der Lead in GHL als „Heiß" markiert */
  heissSchwelleAusschreibungen: 10,
  /** Ab dieser bisherigen Dauer je Ausschreibung rechnen wir mit 1 h MerKalku-Zeit statt 0,5 h
      (große LVs: "unter einer Stunde", wie beim Flughafen-LV des Referenzbetriebs) */
  grossesLvAbStunden: 4,
  /** Unter dieser Ersparnis (bei Standard-Stundensatz) gilt der Lead als KLEIN: Ergebnisseite
      argumentiert über liegen gelassene Ausschreibungen statt über die Stunden (GHL-Segment KLEIN) */
  kleinSchwelleEur: 1500,
} as const;

/* Spiegelt die Zeitformel der Seite: "unter einer Stunde statt Tage, meist 10 bis 30 Minuten" */
export function merkalkuStunden(bisherigeDauer: number): number {
  return bisherigeDauer >= PRICING.grossesLvAbStunden ? 1 : PRICING.merkalkuStundenProAusschreibung;
}

export const CALENDAR_URL =
  "https://api.leadconnectorhq.com/widget/booking/ulqrL3P8HU0BkQLF8jcR";

/* Geschäftliche WhatsApp-Nummer für den "WhatsApp öffnen"-Knopf auf der Ergebnisseite,
   international ohne "+" (z.B. "4917112345678"). Leer = Knopf wird nicht angezeigt. */
export const WHATSAPP_NUMMER = ""; // bewusst leer: keine WhatsApp-Nummer auf der Seite (Jérôme, 11.09.2026)

/* Antwort-Klassen des Rechners: Rechenwert (Mitte, konservativ gerundet) + Spanne für die
   ehrliche Darstellung "zwischen X und Y Stunden" auf der Ergebnisseite */
export const ANZAHL_KLASSEN = [
  { label: "1 bis 2 pro Monat", value: 2, min: 1, max: 2 },
  { label: "3 bis 5 pro Monat", value: 4, min: 3, max: 5 },
  { label: "6 bis 10 pro Monat", value: 8, min: 6, max: 10 },
  { label: "11 bis 20 pro Monat", value: 15, min: 11, max: 20 },
  { label: "mehr als 20", value: 25, min: 21, max: 30 },
] as const;

export const STUNDEN_KLASSEN = [
  { label: "unter 1 Stunde", value: 0.75, min: 0.5, max: 1 },
  { label: "1 bis 2 Stunden", value: 1.5, min: 1, max: 2 },
  { label: "2 bis 4 Stunden", value: 3, min: 2, max: 4 },
  { label: "4 bis 8 Stunden", value: 6, min: 4, max: 8 },
  { label: "mehr als 8 Stunden", value: 10, min: 8, max: 12 },
] as const;

/* Spanne der frei werdenden Stunden aus den Klassengrenzen (Untergrenze nie unter 0) */
export function berechneSpanne(anzahl: number, stunden: number) {
  const a = ANZAHL_KLASSEN.find((k) => k.value === anzahl);
  const s = STUNDEN_KLASSEN.find((k) => k.value === stunden);
  if (!a || !s) return null;
  return {
    min: Math.max(0, Math.round(a.min * (s.min - merkalkuStunden(s.min)))),
    max: Math.max(0, Math.round(a.max * (s.max - merkalkuStunden(s.max)))),
  };
}

export function berechneErsparnis(ausschreibungenProMonat: number, stundenProAusschreibung: number) {
  const istStunden = ausschreibungenProMonat * stundenProAusschreibung;
  const istKostenEur = Math.round(istStunden * PRICING.stundensatzEur);
  const gesparteStunden = Math.max(
    0,
    ausschreibungenProMonat * (stundenProAusschreibung - merkalkuStunden(stundenProAusschreibung))
  );
  const ersparnisEur = Math.round((gesparteStunden * PRICING.stundensatzEur) / 10) * 10;
  return { istStunden, istKostenEur, gesparteStunden, ersparnisEur };
}
