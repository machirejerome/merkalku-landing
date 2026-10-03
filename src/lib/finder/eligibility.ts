export type SourceRule = { id: string; hosts: readonly string[] };
export type Point = { lat: number; lon: number };
export type PerformanceLocation = Point & {
  label: string;
  role: "performance";
  provenanceVerified: boolean;
  accuracy: "verified_object" | "verified_performance_postcode_centroid";
};

/** Input contract for the dedicated sanitized projection, never a production-table row. */
export type PublicCandidate = {
  publicId: string;
  canonicalUnitId: string;
  version: string;
  title: string;
  serviceLabel: string;
  sourceId: string;
  sourceUrl: string;
  publicProvenance: boolean;
  redistributionApproved: boolean;
  cleaningRelevanceApproved: boolean;
  noticeFormType: string;
  lifecycle: string;
  isCurrentVersion: boolean;
  unresolvedChangeOrClosure: boolean;
  deadline: { kind: "tender" | "request"; at: string; accuracy: string; sourceVerified: boolean; timezoneKnown: boolean };
  sourceStatusCheckedAt: string;
  sourceEvidenceDigest: string;
  eligibilityExpiresAt: string;
  revoked: boolean;
  locations: PerformanceLocation[];
};

export type Eligibility = { eligible: true; distanceKm: number; location: PerformanceLocation } | { eligible: false };
const validText = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
export function validPoint(point: Point): boolean { return Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180; }
function timestamp(value: unknown): number {
  return typeof value === "string" && /T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}
export function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, h))), Math.sqrt(Math.max(0, 1 - h)));
}

/** Fail closed. Tenant workflow state and notice_checked_at are intentionally absent. */
export function evaluateEligibility(candidate: PublicCandidate, origin: Point, radius: number, now: number, sources: readonly SourceRule[]): Eligibility {
  if (!candidate || !Number.isFinite(now) || !validPoint(origin) || ![10, 25, 50, 100].includes(radius)) return { eligible: false };
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(candidate.publicId) || !validText(candidate.canonicalUnitId, 160) || !validText(candidate.version, 160) || !validText(candidate.title, 240) || !validText(candidate.serviceLabel, 100)) return { eligible: false };
  if (candidate.publicProvenance !== true || candidate.redistributionApproved !== true || candidate.cleaningRelevanceApproved !== true) return { eligible: false };
  if (candidate.noticeFormType !== "competition" || candidate.lifecycle !== "open" || candidate.isCurrentVersion !== true || candidate.unresolvedChangeOrClosure !== false || candidate.revoked !== false) return { eligible: false };
  const source = sources.find((rule) => rule.id === candidate.sourceId);
  if (!source) return { eligible: false };
  try {
    const url = new URL(candidate.sourceUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !source.hosts.includes(url.hostname) || [...url.searchParams.keys()].some((key) => /token|secret|signature|password|api.?key/i.test(key))) return { eligible: false };
  } catch { return { eligible: false }; }
  const deadline = candidate.deadline;
  if (!deadline || !["tender", "request"].includes(deadline.kind) || deadline.accuracy !== "source_explicit_datetime" || deadline.sourceVerified !== true || deadline.timezoneKnown !== true) return { eligible: false };
  const due = timestamp(deadline.at);
  const checked = timestamp(candidate.sourceStatusCheckedAt);
  const expires = timestamp(candidate.eligibilityExpiresAt);
  if (![due, checked, expires].every(Number.isFinite) || due <= now || checked > now || expires <= now || !validText(candidate.sourceEvidenceDigest, 256)) return { eligible: false };
  const ttl = due - now <= 48 * 3600_000 ? 3600_000 : 24 * 3600_000;
  if (now - checked > ttl || expires > Math.min(due, checked + ttl)) return { eligible: false };
  if (!Array.isArray(candidate.locations) || !candidate.locations.length || candidate.locations.length > 20) return { eligible: false };
  if (candidate.locations.some((loc) => !loc || loc.role !== "performance" || loc.provenanceVerified !== true || !["verified_object", "verified_performance_postcode_centroid"].includes(loc.accuracy) || !validPoint(loc) || !validText(loc.label, 160))) return { eligible: false };
  const nearest = candidate.locations.map((location) => ({ location, distanceKm: distanceKm(origin, location) })).sort((a, b) => a.distanceKm - b.distanceKm)[0];
  return nearest.distanceKm <= radius ? { eligible: true, ...nearest } : { eligible: false };
}
