/* Schlanke Mess-Schicht für den Rechner-Funnel. Schreibt in window.dataLayer (Google Tag
   Manager / GA4-fähig) und feuert ein DOM-Event, an das sich ein Anzeigen-Pixel hängen kann,
   ohne dass der Rechner-Code angefasst werden muss. Ohne eingebundenen Tag passiert nichts
   Sichtbares; es werden keine Cookies gesetzt. */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

import { leseAttribution, leseSitzungsId } from "@/lib/attribution";

export type Quelle = "preisrechner" | "lp-ausschreibung";

export function trackEvent(name: string, params: Record<string, string | number | undefined> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...params });
    window.gtag?.("event", name, params);
    window.dispatchEvent(new CustomEvent(`mk:${name}`, { detail: params }));
    /* Funnel-Zähler ohne Cookie und ohne personenbezogene Daten: landet als Log-Zeile auf dem Server */
    const body = JSON.stringify({
      e: name,
      ...params,
      sid: leseSitzungsId(),
      utm: name === "lp_ausschreibung_view" || name === "rechner_stand" ? leseAttribution() : undefined,
      p: window.location.pathname,
      v: new URLSearchParams(window.location.search).get("v") || undefined,
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/funnel-event", new Blob([body], { type: "application/json" }));
    else fetch("/api/funnel-event", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {}
}

/* Stand der Rechner-Antworten (keine Kontaktdaten), damit auch abgebrochene Durchläufe zählen */
export function trackStand(quelle: Quelle, stand: { schritt: number; anzahl?: number | null; stunden?: number | null; liegen?: string | null; wer?: string | null; tool?: string | null }) {
  trackEvent("rechner_stand", {
    quelle,
    schritt: stand.schritt,
    anzahl: stand.anzahl ?? undefined,
    stunden: stand.stunden ?? undefined,
    liegen: stand.liegen ?? undefined,
    wer: stand.wer ?? undefined,
    tool: stand.tool ?? undefined,
  });
}

export function trackLead(quelle: Quelle, ersparnisEur?: number) {
  trackEvent("generate_lead", { lead_source: quelle, value: ersparnisEur, currency: "EUR" });
}
