import { canMeasure, readConsent } from "./consent";
import { safePagePath, sendAnalyticsEvent } from "./analytics";
import { leseSitzungsId } from "./attribution";

export type Quelle = "preisrechner" | "lp-ausschreibung";

const EVENTS = new Set([
  "lp_ausschreibung_view", "rechner_schritt", "rechner_stand", "generate_lead", "cta_zum_rechner",
  "kalender_geoeffnet", "kalender_link", "whatsapp_geoeffnet", "video_gestartet", "tel_klick",
  "rechner_sichtbar", "gate_mail", "gate_daten",
  "demo_cta_click", "calculator_open",
]);
const VALUES: Record<string, readonly string[]> = {
  quelle: ["preisrechner", "lp-ausschreibung"],
  lead_source: ["preisrechner", "lp-ausschreibung"],
  herkunft: ["hero", "referenz", "abschluss", "sticky"],
  variante: ["kalkulation", "lv", "software"],
};

/** No free text, contacts, calculator answers, savings, URLs or advertising IDs. */
export function sanitizeEvent(name: string, params: Record<string, unknown>): Record<string, string | number> | null {
  if (!EVENTS.has(name)) return null;
  const clean: Record<string, string | number> = {};
  for (const [key, allowed] of Object.entries(VALUES)) {
    if (typeof params[key] === "string" && allowed.includes(params[key])) clean[key] = params[key];
  }
  if (typeof params.schritt === "number" && Number.isInteger(params.schritt) && params.schritt >= 0 && params.schritt <= 10) clean.schritt = params.schritt;
  return clean;
}

export function trackEvent(name: string, params: Record<string, string | number | undefined> = {}) {
  if (!canMeasure("analytics") && !canMeasure("marketing")) return;
  const clean = sanitizeEvent(name, params);
  const path = safePagePath(window.location.pathname);
  if (!clean || !path) return;
  try {
    if (canMeasure("analytics")) {
      sendAnalyticsEvent(name, clean);
      // Optional first-party funnel follows the same consent and data minimisation.
      const body = JSON.stringify({ e: name, ...clean, sid: leseSitzungsId(), p: path, optionalConsent: readConsent() });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/funnel-event", new Blob([body], { type: "application/json" }));
      else fetch("/api/funnel-event", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
    // Pixel listeners are optional marketing; the actual form submission is separate.
    if (canMeasure("marketing")) window.dispatchEvent(new CustomEvent(`mk:${name}`, { detail: clean }));
  } catch { /* Measurement must never block a lead or calculator interaction. */ }
}

/* Only progress, never the individual calculator answers. */
export function trackStand(quelle: Quelle, stand: { schritt: number; anzahl?: number | null; stunden?: number | null; liegen?: string | null; wer?: string | null; tool?: string | null }) {
  trackEvent("rechner_stand", { quelle, schritt: stand.schritt });
}

export function trackLead(quelle: Quelle, ...legacySavings: number[]) {
  void legacySavings; // Backwards-compatible call; calculated savings are not lead revenue.
  trackEvent("generate_lead", { lead_source: quelle });
}
