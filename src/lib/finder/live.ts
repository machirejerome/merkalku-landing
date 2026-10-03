import "server-only";
import { createCursor, queryHash, readCursor } from "./cursor";
import { evaluateEligibility, validPoint, type Point, type PublicCandidate } from "./eligibility";
import { identityCookie, normalizedClientIp, pseudonym, readIdentity, renewIdentity } from "./identity";
import { readFinderRequest, type FinderQuery } from "./schema";
import { finderResponse } from "./server";

export type DatabaseResult = { allowed: false; reason: string; retryAfterSeconds?: number } | {
  allowed: true; candidates: PublicCandidate[]; origin: Point; snapshot: string; nextAfter: string | null;
};
export type FinderLiveDependencies = {
  key: Uint8Array; origins: string[]; onVercel: boolean; now: () => number;
  verifyBot: () => Promise<{ isHuman: boolean; isBot: boolean; isVerifiedBot: boolean; bypassed: boolean }>;
  entry: (ip: string) => Promise<{ allowed: boolean; reason?: string; retryAfterSeconds?: number }>;
  search: (input: { budgetHash: string; sessionHash: string; ipHash: string; budgetIssuedAt: string; sessionIssuedAt: string; query: FinderQuery; after?: string; snapshot?: string }) => Promise<DatabaseResult>;
};
const sources = [{ id: "ted", hosts: ["ted.europa.eu"] }];
const unavailable = () => finderResponse({ code: "unavailable", message: "Die Suche ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut." }, 503, 60);
function denial(reason?: string, retry?: number): Response {
  if (reason === "limited") return finderResponse({ code: "limited", message: "Das Abruflimit für diese Suche ist erreicht. Bitte versuchen Sie es später erneut. Das bedeutet nicht, dass es keine Ausschreibungen gibt." }, 429, retry ?? 3600);
  if (reason === "unknown_postcode") return finderResponse({ code: reason, message: "Diese PLZ konnte nicht zugeordnet werden. Bitte prüfen Sie die Eingabe." }, 400);
  if (reason === "invalid_cursor") return finderResponse({ code: reason, message: "Diese Suchseite ist abgelaufen. Bitte die Suche neu starten." }, 400);
  return unavailable();
}
async function bounded<T>(operation: Promise<T>, ms = 6000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try { return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Finder timeout")), ms); })]); }
  finally { clearTimeout(timer!); }
}

/** One database transaction performs search, shared quotas and disclosure reservation. */
export function createDatabaseFinderHandler(deps: FinderLiveDependencies | null) {
  return async function POST(request: Request): Promise<Response> {
    if (!deps || deps.key.byteLength !== 32) return unavailable();
    const ownOrigin = new URL(request.url).origin;
    if (!deps.origins.includes(ownOrigin) || request.headers.get("origin") !== ownOrigin || request.headers.get("sec-fetch-site") === "cross-site") return finderResponse({ code: "origin_rejected", message: "Bitte die Suche auf MerKalku öffnen." }, 403);
    const ip = normalizedClientIp(request, deps.onVercel);
    if (!ip) return unavailable();
    try {
      const ipHash = pseudonym(deps.key, "ip", ip);
      const entry = await bounded(deps.entry(ipHash));
      if (entry.allowed !== true) return denial(entry.reason, entry.retryAfterSeconds);
      const parsed = await readFinderRequest(request);
      if (!parsed.ok) return finderResponse({ code: "invalid_query", message: parsed.message }, 400);
      const bot = await bounded(deps.verifyBot());
      if (bot.isHuman !== true || bot.isBot !== false || bot.isVerifiedBot !== false || bot.bypassed !== false) return finderResponse({ code: "verification_failed", message: "Die Sicherheitsprüfung konnte nicht bestätigt werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut." }, 403);
      const now = deps.now();
      const identity = renewIdentity(readIdentity(request.headers.get("cookie"), deps.key, now), now);
      const budgetHash = pseudonym(deps.key, "budget", identity.budget);
      const sessionHash = pseudonym(deps.key, "session", identity.session);
      const subject = `${budgetHash}/${sessionHash}`;
      const cursor = parsed.query.cursor ? readCursor(parsed.query.cursor, deps.key, subject, parsed.query, now) : null;
      if (parsed.query.cursor && !cursor) return denial("invalid_cursor");
      const result = await bounded(deps.search({ budgetHash, sessionHash, ipHash, budgetIssuedAt: new Date(identity.budgetAt).toISOString(), sessionIssuedAt: new Date(identity.sessionAt).toISOString(), query: parsed.query, after: cursor?.after, snapshot: cursor?.snapshot }));
      let response: Response;
      if (result.allowed !== true) response = denial(result.reason, result.retryAfterSeconds);
      else {
        if (!validPoint(result.origin) || !Array.isArray(result.candidates) || result.candidates.length > 10 || typeof result.snapshot !== "string" || !result.snapshot || result.snapshot.length > 160 || (cursor && cursor.snapshot !== result.snapshot) || ![null, "2"].includes(result.nextAfter)) return unavailable();
        const seen = new Set<string>();
        const items = result.candidates.flatMap((candidate) => {
          const eligibility = evaluateEligibility(candidate, result.origin, parsed.query.radiusKm, deps.now(), sources);
          if (!eligibility.eligible || seen.has(candidate.canonicalUnitId)) return [];
          seen.add(candidate.canonicalUnitId);
          return [{ id: candidate.publicId, title: candidate.title, serviceLabel: candidate.serviceLabel, locationLabel: eligibility.location.label, distanceKm: Math.round(eligibility.distanceKm * 10) / 10, distanceBasis: eligibility.location.accuracy, deadlineKind: candidate.deadline.kind, deadlineAt: candidate.deadline.at, sourceUrl: candidate.sourceUrl, sourceStatusCheckedAt: candidate.sourceStatusCheckedAt }];
        });
        const nextCursor = !cursor && result.nextAfter ? createCursor({ subject, queryHash: queryHash(parsed.query), snapshot: result.snapshot, after: result.nextAfter, page: 2, expiresAt: deps.now() + 300_000 }, deps.key) : null;
        response = finderResponse({ mode: "live", items, nextCursor });
      }
      response.headers.append("Set-Cookie", identityCookie(identity, deps.key, deps.now()));
      return response;
    } catch { return unavailable(); }
  };
}
