import { isValidConsent } from "./consent";

/** Transport mode is not a consent record. An existing choice always takes precedence. */
export function resolveMeasurement(optionalConsent: unknown, measurementDefault: unknown) {
  if (isValidConsent(optionalConsent)) {
    return { analytics: optionalConsent.analytics, marketing: optionalConsent.marketing, source: "choice" as const };
  }
  // Require the explicit null/true pair; absent, malformed and expired records cannot opt in.
  if (optionalConsent === null && measurementDefault === true) {
    return { analytics: true, marketing: true, source: "default" as const };
  }
  return { analytics: false, marketing: false, source: "blocked" as const };
}
