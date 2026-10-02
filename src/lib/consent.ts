/** Optional services fail closed. Validation is also usable by API routes. */
export const CONSENT_VERSION = 1 as const;
export const CONSENT_STORAGE_KEY = "mk:optional-consent";
export const CONSENT_CHANGED_EVENT = "mk:consent-changed";
export const CONSENT_OPEN_EVENT = "mk:consent-open";
export const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export type ConsentCategory = "analytics" | "marketing";
export type ConsentRecord = { version: typeof CONSENT_VERSION; analytics: boolean; marketing: boolean; updatedAt: number; expiresAt: number };
let storageFailure = false;
const BLOCKED_KEY = "mk:optional-consent-blocked";
const BLOCKED_COOKIE = "mk_optional_blocked";
const BLOCKED_QUERY = "mk_optional_blocked";

function hasEmergencyBlock(): boolean {
  if (storageFailure) return true;
  if (new URLSearchParams(window.location.search).get(BLOCKED_QUERY) === "1") { storageFailure = true; return true; }
  try { if (document.cookie.split(";").some((part) => part.trim() === `${BLOCKED_COOKIE}=1`)) return true; } catch { return true; }
  try { return window.sessionStorage.getItem(BLOCKED_KEY) === "1"; } catch { return false; }
}

function blockAfterStorageFailure() {
  storageFailure = true;
  // Independent essential preference stores cover write-only localStorage failures.
  // The URL fallback also survives a reload when the browser blocks all storage.
  try { window.sessionStorage.setItem(BLOCKED_KEY, "1"); } catch { /* URL fallback below. */ }
  try { document.cookie = `${BLOCKED_COOKIE}=1; Max-Age=${CONSENT_LIFETIME_MS / 1000}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* URL fallback below. */ }
}

/** A fresh document stops already-running SDKs even when persistence failed. */
export function reloadAfterConsentWithdrawal() {
  if (!storageFailure) { window.location.reload(); return; }
  const url = new URL(window.location.href);
  url.searchParams.set(BLOCKED_QUERY, "1");
  window.location.replace(url.href);
}

export function isValidConsent(value: unknown, now = Date.now()): value is ConsentRecord {
  if (!value || typeof value !== "object") return false;
  const c = value as Partial<ConsentRecord>;
  return c.version === CONSENT_VERSION && typeof c.analytics === "boolean" && typeof c.marketing === "boolean" &&
    typeof c.updatedAt === "number" && Number.isFinite(c.updatedAt) && c.updatedAt <= now && c.updatedAt > 0 &&
    typeof c.expiresAt === "number" && Number.isFinite(c.expiresAt) &&
    c.expiresAt === c.updatedAt + CONSENT_LIFETIME_MS && c.expiresAt > now;
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined" || hasEmergencyBlock()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isValidConsent(value) ? value : null;
  } catch { return null; }
}

export function hasConsent(category: ConsentCategory): boolean { return readConsent()?.[category] === true; }

export function saveConsent(choices: Pick<ConsentRecord, "analytics" | "marketing">): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  const record: ConsentRecord = { version: CONSENT_VERSION, analytics: choices.analytics === true, marketing: choices.marketing === true, updatedAt: now, expiresAt: now + CONSENT_LIFETIME_MS };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    try { window.sessionStorage.removeItem(BLOCKED_KEY); } catch { /* Checked again by readConsent. */ }
    document.cookie = `${BLOCKED_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    if (new URLSearchParams(window.location.search).has(BLOCKED_QUERY)) {
      const url = new URL(window.location.href);
      url.searchParams.delete(BLOCKED_QUERY);
      window.history.replaceState(window.history.state, "", url.href);
    }
    storageFailure = false;
    const stored = readConsent();
    if (!stored || stored.updatedAt !== record.updatedAt || stored.analytics !== record.analytics || stored.marketing !== record.marketing) throw new Error("Consent could not be persisted");
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
    return stored;
  } catch {
    blockAfterStorageFailure();
    try { window.localStorage.removeItem(CONSENT_STORAGE_KEY); } catch { /* Fail closed in this document. */ }
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
    return null;
  }
}

export function openConsentSettings() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

export function isMeasurementHost(hostname: string): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MEASUREMENT_PREVIEW === "true" ||
    (process.env.NODE_ENV === "production" && ["merkalku.de", "www.merkalku.de"].includes(hostname));
}

export function canMeasure(category: ConsentCategory): boolean {
  return typeof window !== "undefined" && isMeasurementHost(window.location.hostname) && hasConsent(category);
}

export function isLeadinfoExcluded(pathname: string): boolean { return pathname === "/ausschreibung" || pathname.startsWith("/ausschreibung/"); }

/** Only optional measurement cookies, including parent-domain copies, are removed. */
export function clearOptionalCookies() {
  if (typeof document === "undefined") return;
  try {
    const names = document.cookie.split(";").map((c) => c.trim().split("=")[0]).filter((name) => /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_li_(?:id|ses)\.)/.test(name));
    const domains = ["", window.location.hostname, "." + window.location.hostname];
    if (window.location.hostname === "www.merkalku.de") domains.push("merkalku.de", ".merkalku.de");
    for (const name of names) for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
  } catch { /* Browser restrictions must not prevent the reload boundary. */ }
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && (/^_li_(?:id|ses)\./.test(key) || /^snowplowOutQueue_.*leadinfo/i.test(key))) window.localStorage.removeItem(key);
    }
  } catch { /* Collection remains blocked when storage is unavailable. */ }
}
