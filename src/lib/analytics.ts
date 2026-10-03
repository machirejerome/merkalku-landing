import { canMeasure } from "./consent";

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined; }
}

const PAGE_TITLES: Record<string, string> = {
  "/": "MerKalku", "/preisrechner": "MerKalku Preisrechner", "/ausschreibung": "MerKalku Ausschreibung",
  "/impressum": "MerKalku Impressum", "/datenschutz": "MerKalku Datenschutz", "/agb": "MerKalku AGB",
  "/wissen": "MerKalku Wissen",
  "/wissen/reinigungszeit-berechnen": "MerKalku Wissen: Reinigungszeit berechnen",
  "/wissen/excel-preisblatt-pruefen": "MerKalku Wissen: Excel-Preisblatt prüfen",
  "/wissen/ausschreibung-gebaeudereinigung-pruefen": "MerKalku Wissen: Ausschreibung prüfen",
};
let initializedId: string | null = null;
let lastPageLocation: string | null = null;
let currentPageReferrer = "";

export function safePagePath(pathname: string): string | null {
  const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  return Object.hasOwn(PAGE_TITLES, path) ? path : null;
}

function measurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

function safeReferrer(raw: string): string {
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    return url.origin === window.location.origin ? url.origin + (safePagePath(url.pathname) || "/") : url.origin + "/";
  } catch { return ""; }
}

function pageContext() {
  const path = safePagePath(window.location.pathname);
  const location = path ? window.location.origin + path : null;
  return path ? { page_location: location!, page_title: PAGE_TITLES[path], page_referrer: location === lastPageLocation ? currentPageReferrer : lastPageLocation || safeReferrer(document.referrer) } : null;
}

/**
 * Sole GA bootstrap. The operator enables Analytics cookies by default on measurement
 * hosts. This technical setting is not saved as an explicit visitor ConsentRecord.
 * Saved rejection and withdrawal still stop collection via canMeasure and a reload.
 * https://developers.google.com/tag-platform/security/concepts/consent-mode
 */
export function ensureAnalytics(): boolean {
  const id = measurementId();
  if (!id || !canMeasure("analytics") || !pageContext()) return false;
  if (initializedId) return initializedId === id;
  window[`ga-disable-${id}`] = false;
  window.dataLayer = window.dataLayer || [];
  // Keep Google's documented gtag queue format (Arguments rather than a dataLayer object).
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function () { window.dataLayer!.push(arguments); };
  window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, ...(process.env.NEXT_PUBLIC_GA_DEBUG_MODE === "true" ? { debug_mode: true } : {}), ...pageContext() });
  initializedId = id;
  const script = document.createElement("script");
  script.id = "mk-google-analytics";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
  return true;
}

export function stopAnalytics() {
  const id = initializedId || measurementId();
  if (typeof window === "undefined" || !id) return;
  window[`ga-disable-${id}`] = true;
  if (window.dataLayer) window.dataLayer.length = 0;
  document.getElementById("mk-google-analytics")?.remove();
}

export function trackPageView() {
  if (!canMeasure("analytics")) return;
  const context = pageContext();
  // Saving preferences on the same page must not send another page view.
  if (!context || !ensureAnalytics() || context.page_location === lastPageLocation) return;
  window.gtag?.("set", context);
  window.gtag?.("event", "page_view", context);
  lastPageLocation = context.page_location;
  currentPageReferrer = context.page_referrer;
}

export function sendAnalyticsEvent(name: string, params: Record<string, string | number>) {
  if (!canMeasure("analytics") || !ensureAnalytics()) return;
  trackPageView();
  const context = pageContext();
  if (context) window.gtag?.("event", name, { ...params, ...context });
}
