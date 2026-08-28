/* Zentrale Stellschrauben des Preisrechners.
   Preis selbst wird NICHT auf der Seite angezeigt — er geht per GHL-Automation
   (E-Mail/WhatsApp) raus. Hier stehen nur die Rechen-Annahmen der Ersparnis. */

export const PRICING = {
  /** Kalkulatorischer Stundensatz für die Ersparnis-Rechnung (konservativ) */
  stundensatzEur: 55,
  /** Bearbeitungszeit pro Ausschreibung MIT MerKalku, in Stunden (oberes Ende der 10–30 Min.) */
  merkalkuStundenProAusschreibung: 0.5,
  /** Ab so vielen Ausschreibungen/Monat wird der Lead in GHL als „Heiß" markiert */
  heissSchwelleAusschreibungen: 10,
} as const;

export const CALENDAR_URL =
  "https://api.leadconnectorhq.com/widget/booking/ulqrL3P8HU0BkQLF8jcR";

export function berechneErsparnis(ausschreibungenProMonat: number, stundenProAusschreibung: number) {
  const istStunden = ausschreibungenProMonat * stundenProAusschreibung;
  const istKostenEur = Math.round(istStunden * PRICING.stundensatzEur);
  const gesparteStunden = Math.max(
    0,
    ausschreibungenProMonat * (stundenProAusschreibung - PRICING.merkalkuStundenProAusschreibung)
  );
  const ersparnisEur = Math.round((gesparteStunden * PRICING.stundensatzEur) / 10) * 10;
  return { istStunden, istKostenEur, gesparteStunden, ersparnisEur };
}
