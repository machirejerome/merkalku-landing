import "server-only";
import { createCursor, queryHash, readCursor } from "./cursor";
import { evaluateEligibility, validPoint, type Point, type PublicCandidate, type SourceRule } from "./eligibility";
import { FINDER_MAX_PAGES, FINDER_PAGE_SIZE, readFinderRequest, type FinderQuery } from "./schema";

export const LIVE_UNAVAILABLE = "Die Live-Suche ist noch nicht freigeschaltet. Sie können die Suche mit fiktiven Beispielen ausprobieren.";
export type GuardDenial = { allowed: false; reason: "challenge_required" | "limited" | "unavailable"; retryAfterSeconds?: number };
export type Admission = { allowed: true; cursorSubject: string; budgetId: string; challengeVerifiedAt: number };

/** Implementations must live server-side. No production-wide database credential is needed. */
export type FinderIntegration = {
  origins: readonly string[];
  sources: readonly SourceRule[];
  cursorKey: Uint8Array;
  now: () => number;
  reader: {
    /** Licensed postcode register. A syntactically valid but unknown postcode returns null. */
    resolvePostcode: (postcode: string, signal: AbortSignal) => Promise<Point | null>;
    /** Dedicated sanitized projection only. Stable ordering and canonical-unit deduplication. */
    search: (input: { query: FinderQuery; origin: Point; limit: number; after?: string; snapshot?: string; signal: AbortSignal }) => Promise<{ candidates: PublicCandidate[]; snapshot: string; nextAfter: string | null }>;
  };
  guard: {
    /** Real server-validated challenge + session/budget identity + shared atomic request quotas + global kill. */
    admit: (request: Request, query: FinderQuery, signal: AbortSignal) => Promise<Admission | GuardDenial>;
    /** Atomically reserve unique-unit exposure in ALL applicable buckets. Recheck authoritative
     * unit versions/revocation and global kill before approving. Replays are idempotent for units,
     * never free requests. Store failure must deny. This requires narrowly scoped write rights. */
    reserveDisclosure: (input: { admission: Admission; query: FinderQuery; snapshot: string; units: { id: string; version: string }[]; signal: AbortSignal }) => Promise<{ allowed: true } | GuardDenial>;
  };
};

export function finderResponse(body: unknown, status = 200, retryAfter?: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, nosnippet", "X-Content-Type-Options": "nosniff", ...(retryAfter ? { "Retry-After": String(Math.min(3600, Math.max(1, Math.ceil(retryAfter)))) } : {}) } });
}
function unavailable(): Response { return finderResponse({ mode: "unavailable", code: "live_not_connected", message: LIVE_UNAVAILABLE }, 503, 300); }
function denied(result: GuardDenial): Response {
  if (result.reason === "unavailable") return unavailable();
  return finderResponse({ code: result.reason, message: result.reason === "limited" ? "Ihr Abrufbudget ist erreicht. Bitte versuchen Sie es später erneut." : "Bitte die Sicherheitsprüfung erneut abschließen." }, result.reason === "limited" ? 429 : 403, result.retryAfterSeconds);
}
async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  try { return await Promise.race([operation(controller.signal), new Promise<never>((_, reject) => { timeout = setTimeout(() => { controller.abort(); reject(new Error("Finder integration timeout")); }, 1500); })]); }
  finally { clearTimeout(timeout!); }
}

/** null is deliberate: no dummy limiter, no demo fallback, no env flag can unlock production. */
export function createLiveSearchHandler(integration: FinderIntegration | null) {
  return async function POST(request: Request): Promise<Response> {
    const parsed = await readFinderRequest(request);
    if (!parsed.ok) return finderResponse({ code: "invalid_query", message: parsed.message }, 400);
    if (!integration) return unavailable();
    const { query } = parsed;
    try {
      const hostOrigin = new URL(request.url).origin;
      if (!integration.origins.includes(hostOrigin) || request.headers.get("origin") !== hostOrigin || request.headers.get("sec-fetch-site") === "cross-site") return finderResponse({ code: "origin_rejected", message: "Bitte die Suche auf MerKalku öffnen." }, 403);
      if (integration.cursorKey.byteLength !== 32 || !integration.sources.length) return unavailable();
      const admission = await bounded((signal) => integration.guard.admit(request, query, signal));
      if (admission.allowed !== true) return denied(admission);
      const now = integration.now();
      if (!admission.cursorSubject || !admission.budgetId || !Number.isFinite(admission.challengeVerifiedAt) || admission.challengeVerifiedAt > now || now - admission.challengeVerifiedAt >= 20 * 60_000) return unavailable();
      const cursor = query.cursor ? readCursor(query.cursor, integration.cursorKey, admission.cursorSubject, query, now) : null;
      if (query.cursor && !cursor) return finderResponse({ code: "invalid_cursor", message: "Diese Suchseite ist abgelaufen. Bitte die Suche neu starten." }, 400);
      const origin = await bounded((signal) => integration.reader.resolvePostcode(query.postcode, signal));
      if (!origin || !validPoint(origin)) return finderResponse({ code: "unknown_postcode", message: "Diese PLZ konnte nicht zugeordnet werden. Bitte prüfen Sie die Eingabe." }, 400);
      const page = await bounded((signal) => integration.reader.search({ query, origin, limit: FINDER_PAGE_SIZE, after: cursor?.after, snapshot: cursor?.snapshot, signal }));
      if (!Array.isArray(page.candidates) || page.candidates.length > FINDER_PAGE_SIZE || typeof page.snapshot !== "string" || !page.snapshot || page.snapshot.length > 160 || (cursor && page.snapshot !== cursor.snapshot) || (page.nextAfter !== null && (typeof page.nextAfter !== "string" || !page.nextAfter || page.nextAfter.length > 160))) return unavailable();
      const canonicalUnits = new Set<string>();
      const publicIds = new Set<string>();
      const visible = page.candidates.flatMap((candidate) => {
        const result = evaluateEligibility(candidate, origin, query.radiusKm, integration.now(), integration.sources);
        if (!result.eligible || canonicalUnits.has(candidate.canonicalUnitId) || publicIds.has(candidate.publicId)) return [];
        canonicalUnits.add(candidate.canonicalUnitId); publicIds.add(candidate.publicId);
        return [{ candidate, result }];
      });
      const released = await bounded((signal) => integration.guard.reserveDisclosure({ admission, query, snapshot: page.snapshot, units: visible.map(({ candidate }) => ({ id: candidate.canonicalUnitId, version: candidate.version })), signal }));
      if (released.allowed !== true) return denied(released);
      // Time can advance during the atomic reservation. Never serialize an expired candidate.
      const stillVisible = visible.filter(({ candidate }) => evaluateEligibility(candidate, origin, query.radiusKm, integration.now(), integration.sources).eligible);
      const nextCursor = !cursor && page.nextAfter ? createCursor({ subject: admission.cursorSubject, queryHash: queryHash(query), snapshot: page.snapshot, after: page.nextAfter, page: FINDER_MAX_PAGES, expiresAt: integration.now() + 300_000 }, integration.cursorKey) : null;
      return finderResponse({ mode: "live", items: stillVisible.map(({ candidate: c, result }) => ({ id: c.publicId, title: c.title, serviceLabel: c.serviceLabel, locationLabel: result.location.label, distanceKm: Math.round(result.distanceKm * 10) / 10, distanceBasis: result.location.accuracy, deadlineKind: c.deadline.kind, deadlineAt: c.deadline.at, sourceId: c.sourceId, sourceUrl: c.sourceUrl, sourceStatusCheckedAt: c.sourceStatusCheckedAt, expiresAt: c.eligibilityExpiresAt })), nextCursor });
    } catch { return unavailable(); }
  };
}
