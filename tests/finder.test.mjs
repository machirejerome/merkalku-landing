import assert from "node:assert/strict";
import { test } from "node:test";
import * as crypto from "node:crypto";
import { loadTs } from "./route-test-harness.mjs";

const globals = { Request, URL, Buffer, TextDecoder, AbortController, setTimeout, clearTimeout };
const schema = loadTs("../src/lib/finder/schema.ts", {}, globals);
const eligibility = loadTs("../src/lib/finder/eligibility.ts", {}, globals);
const cursor = loadTs("../src/lib/finder/cursor.ts", { "server-only": {}, "node:crypto": crypto }, globals);
const server = loadTs("../src/lib/finder/server.ts", { "server-only": {}, "./cursor": cursor, "./eligibility": eligibility, "./schema": schema }, globals);
const examples = loadTs("../src/lib/finder/examples.ts", {}, globals);
const exampleRoute = loadTs("../src/app/api/ausschreibungsfinder/beispiel/route.ts", { "@/lib/finder/examples": examples, "@/lib/finder/schema": schema, "@/lib/finder/server": server }, globals);
const liveRoute = loadTs("../src/app/api/ausschreibungsfinder/route.ts", { "@/lib/finder/server": server }, globals);
const now = Date.parse("2026-10-03T09:00:00Z");
const iso = (offset) => new Date(now + offset).toISOString();
const sourceRules = [{ id: "ted", hosts: ["ted.europa.eu"] }];
const key = new Uint8Array(32).fill(17);
const query = { postcode: "76275", radiusKm: 50 };
const post = (body = query, headers = {}) => new Request("https://www.merkalku.de/api/ausschreibungsfinder", { method: "POST", headers: { "content-type": "application/json", origin: "https://www.merkalku.de", ...headers }, body: JSON.stringify(body) });

function candidate(overrides = {}) {
  return {
    publicId: "public_opaque_notice_000001", canonicalUnitId: "procedure-1/lot-1", version: "version-1", title: "Test notice", serviceLabel: "Unterhaltsreinigung", sourceId: "ted", sourceUrl: "https://ted.europa.eu/de/notice/-/detail/1-2026", publicProvenance: true, redistributionApproved: true, cleaningRelevanceApproved: true, noticeFormType: "competition", lifecycle: "open", isCurrentVersion: true, unresolvedChangeOrClosure: false, deadline: { kind: "tender", at: iso(10 * 86400_000), accuracy: "source_explicit_datetime", sourceVerified: true, timezoneKnown: true }, sourceStatusCheckedAt: iso(-60_000), sourceEvidenceDigest: "test-evidence-not-a-real-notice", eligibilityExpiresAt: iso(12 * 3600_000), revoked: false, locations: [{ lat: 49, lon: 8.4, label: "Verified test location", role: "performance", provenanceVerified: true, accuracy: "verified_performance_postcode_centroid" }], ...overrides,
  };
}

function fixture() {
  const calls = [];
  const integration = {
    origins: ["https://www.merkalku.de"], sources: sourceRules, cursorKey: key, now: () => now,
    reader: {
      async resolvePostcode() { calls.push("postcode"); return { lat: 49, lon: 8.4 }; },
      async search() { calls.push("read"); return { candidates: [candidate()], snapshot: "snapshot-1", nextAfter: null }; },
    },
    guard: {
      async admit() { calls.push("admit"); return { allowed: true, cursorSubject: "budget-1/session-1", budgetId: "budget-1", challengeVerifiedAt: now }; },
      async reserveDisclosure(input) { calls.push("reserve"); assert.equal(input.units.length, 1); return { allowed: true }; },
    },
  };
  return { calls, integration };
}

test("strict search schema rejects harvesting parameters and malformed input", () => {
  for (const bad of [null, [], {}, { ...query, postcode: "7627" }, { ...query, postcode: "00000" }, { ...query, postcode: 76275 }, { ...query, postcode: " 76275" }, { ...query, radiusKm: 500 }, { ...query, radiusKm: "50" }, { ...query, offset: 10 }, { ...query, bbox: [1, 2, 3, 4] }, { ...query, mode: "live" }, { ...query, cursor: "wrong" }]) assert.equal(schema.parseFinderQuery(bad).ok, false);
  assert.equal(schema.parseFinderQuery({ postcode: "01067", radiusKm: 10 }).ok, true);
});

test("body is capped by actual bytes even without Content-Length", async () => {
  const large = new Request("https://www.merkalku.de/api/ausschreibungsfinder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...query, extra: "x".repeat(3000) }) });
  assert.equal((await schema.readFinderRequest(large)).ok, false);
  assert.equal((await schema.readFinderRequest(post(query, { "content-type": "text/plain" }))).ok, false);
});

test("actual live route is disconnected, no-store and noindex with no inventory", async () => {
  const response = await liveRoute.POST(post());
  assert.equal(response.status, 503);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  assert.equal((await response.json()).code, "live_not_connected");
});

test("a stalled body read is cancelled and rejected without waiting indefinitely", async () => {
  let cancelled = false;
  const fastSchema = loadTs("../src/lib/finder/schema.ts", {}, { ...globals, setTimeout: (callback) => setTimeout(callback, 1) });
  const request = { headers: new Headers({ "content-type": "application/json" }), body: { getReader: () => ({ read: () => new Promise(() => {}), cancel: async () => { cancelled = true; }, releaseLock() {} }) } };
  assert.equal((await fastSchema.readFinderRequest(request)).ok, false);
  assert.equal(cancelled, true);
});

test("only explicitly requested synthetic endpoint returns labeled examples", async () => {
  const response = await exampleRoute.POST(post());
  const body = await response.json();
  assert.equal(body.mode, "example"); assert.equal(body.items.length, 3);
  assert.match(body.message, /frei erfunden/);
  assert.ok(body.items.every((item) => item.sourceLabel.includes("Fiktive") && item.sourceStatusLabel.includes("Keine echte") && item.deadlineLabel.startsWith("Beispiel:")));
  assert.ok(body.items.some((item) => item.deadlineKind === "request"));
  assert.ok(body.items.every((item) => !Object.hasOwn(item, "sourceUrl") && !Object.hasOwn(item, "publishedAt")));
  assert.equal(examples.exampleSearch(10).length, 1);
  assert.equal(examples.exampleSearch(100).length, 4);
});

test("eligibility accepts current competition with offer OR participation deadline", () => {
  const tender = candidate();
  assert.equal(eligibility.evaluateEligibility(tender, { lat: 49, lon: 8.4 }, 50, now, sourceRules).eligible, true);
  assert.equal(eligibility.evaluateEligibility(candidate({ deadline: { ...tender.deadline, kind: "request" } }), { lat: 49, lon: 8.4 }, 50, now, sourceRules).eligible, true);
});

test("eligibility fails closed for results, stale sources, inferred deadlines and buyer locations", () => {
  const base = candidate();
  const invalid = [
    { noticeFormType: "result" }, { lifecycle: "unknown" }, { revoked: true }, { isCurrentVersion: false }, { unresolvedChangeOrClosure: true }, { publicProvenance: false }, { redistributionApproved: false }, { sourceId: "manuell" }, { sourceStatusCheckedAt: iso(-25 * 3600_000), notice_checked_at: iso(0) }, { sourceStatusCheckedAt: iso(60_000) }, { sourceEvidenceDigest: "" }, { eligibilityExpiresAt: iso(-1) },
    { sourceUrl: "https://ted.europa.eu.evil.example/" }, { sourceUrl: "https://ted.europa.eu/?token=private" }, { sourceUrl: "http://ted.europa.eu/" },
    { deadline: { ...base.deadline, kind: "unknown" } }, { deadline: { ...base.deadline, accuracy: "inferred_end_of_day" } }, { deadline: { ...base.deadline, timezoneKnown: false } }, { deadline: { ...base.deadline, at: iso(-1) } },
    { locations: [{ ...base.locations[0], role: "buyer" }] }, { locations: [{ ...base.locations[0], accuracy: "unknown" }] }, { locations: [{ ...base.locations[0], lat: NaN }] }, { locations: [] },
  ];
  for (const invalidCase of invalid) assert.equal(eligibility.evaluateEligibility(candidate(invalidCase), { lat: 49, lon: 8.4 }, 50, now, sourceRules).eligible, false, JSON.stringify(invalidCase));
});

test("close deadlines require hourly source evidence; distance is checked server-side", () => {
  const base = candidate();
  const close = candidate({ deadline: { ...base.deadline, at: iso(2 * 3600_000) }, eligibilityExpiresAt: iso(30 * 60_000) });
  assert.equal(eligibility.evaluateEligibility(close, { lat: 49, lon: 8.4 }, 50, now, sourceRules).eligible, true);
  assert.equal(eligibility.evaluateEligibility({ ...close, sourceStatusCheckedAt: iso(-61 * 60_000) }, { lat: 49, lon: 8.4 }, 50, now, sourceRules).eligible, false);
  assert.equal(eligibility.evaluateEligibility(base, { lat: 52.5, lon: 13.4 }, 10, now, sourceRules).eligible, false);
});

test("cursor is encrypted, tamper-proof, query/session-bound and expires", () => {
  const claims = { subject: "budget-1/session-1", queryHash: cursor.queryHash(query), snapshot: "snapshot-1", after: "opaque-key", page: 2, expiresAt: now + 300_000 };
  const token = cursor.createCursor(claims, key);
  assert.ok(cursor.readCursor(token, key, claims.subject, query, now));
  assert.equal(cursor.readCursor(token, key, "another-session", query, now), null);
  assert.equal(cursor.readCursor(token, key, claims.subject, { ...query, radiusKm: 100 }, now), null);
  assert.equal(cursor.readCursor(token, key, claims.subject, query, now + 300_000), null);
  assert.equal(cursor.readCursor(`${token.slice(0, -5)}ABCDE`, key, claims.subject, query, now), null);
  assert.ok(!Buffer.from(token, "base64url").toString("utf8").includes(claims.subject));
});

test("quota admission precedes reads; denial and guard outage disclose nothing", async () => {
  for (const fail of ["limit", "outage"]) {
    const { integration, calls } = fixture();
    integration.guard.admit = async () => { if (fail === "outage") throw new Error("store offline"); return { allowed: false, reason: "limited", retryAfterSeconds: 60 }; };
    const response = await server.createLiveSearchHandler(integration)(post());
    assert.equal(response.status, fail === "limit" ? 429 : 503);
    assert.deepEqual(calls, []);
    assert.equal(Object.hasOwn(await response.json(), "items"), false);
  }
});

test("same-origin header alone grants nothing; foreign origin rejected before reads", async () => {
  const { integration, calls } = fixture();
  const response = await server.createLiveSearchHandler(integration)(post(query, { origin: "https://other.example" }));
  assert.equal(response.status, 403); assert.deepEqual(calls, []);
});

test("only explicit response allowlist is released after atomic disclosure reservation", async () => {
  const { integration, calls } = fixture();
  integration.reader.search = async () => { calls.push("read"); return { candidates: [candidate({ kontakt_email: "must-not-leak", raw_data: { private: true } })], snapshot: "snapshot-1", nextAfter: null }; };
  const response = await server.createLiveSearchHandler(integration)(post());
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["admit", "postcode", "read", "reserve"]);
  const body = await response.json();
  assert.equal(body.items.length, 1); assert.equal(body.items[0].deadlineKind, "tender");
  assert.equal(Object.hasOwn(body, "total"), false);
  const serialized = JSON.stringify(body);
  for (const privateField of ["kontakt_email", "must-not-leak", "raw_data", "canonicalUnitId", "sourceEvidenceDigest"]) assert.ok(!serialized.includes(privateField));
});

test("disclosure quota failure cannot return cached/read inventory", async () => {
  const { integration } = fixture();
  integration.guard.reserveDisclosure = async () => ({ allowed: false, reason: "limited" });
  const response = await server.createLiveSearchHandler(integration)(post());
  assert.equal(response.status, 429); assert.equal(Object.hasOwn(await response.json(), "items"), false);
});

test("result for lot A does not hide eligible lot B; duplicate canonical units are not exposed twice", async () => {
  const { integration } = fixture();
  integration.reader.search = async () => ({ candidates: [candidate({ noticeFormType: "result", canonicalUnitId: "procedure-1/lot-A" }), candidate({ canonicalUnitId: "procedure-1/lot-B" }), candidate({ canonicalUnitId: "procedure-1/lot-B", publicId: "public_opaque_notice_000002" })], snapshot: "snapshot-1", nextAfter: null });
  const response = await server.createLiveSearchHandler(integration)(post());
  assert.equal(response.status, 200); assert.equal((await response.json()).items.length, 1);
});

test("pagination is bounded to two pages with fixed query, session and snapshot", async () => {
  const { integration } = fixture();
  integration.reader.search = async () => ({ candidates: [candidate()], snapshot: "snapshot-1", nextAfter: "ordered-key-10" });
  const handler = server.createLiveSearchHandler(integration);
  const first = await (await handler(post())).json();
  assert.equal(typeof first.nextCursor, "string");
  const second = await (await handler(post({ ...query, cursor: first.nextCursor }))).json();
  assert.equal(second.nextCursor, null);
  const changed = await handler(post({ ...query, radiusKm: 100, cursor: first.nextCursor }));
  assert.equal(changed.status, 400);
});

test("oversized reader response and source expiration during guard reservation fail closed", async () => {
  const oversized = fixture().integration;
  oversized.reader.search = async () => ({ candidates: Array.from({ length: 11 }, () => candidate()), snapshot: "snapshot-1", nextAfter: null });
  assert.equal((await server.createLiveSearchHandler(oversized)(post())).status, 503);
  const { integration } = fixture();
  let clock = now;
  integration.now = () => clock;
  integration.guard.reserveDisclosure = async () => { clock += 13 * 3600_000; return { allowed: true }; };
  const response = await server.createLiveSearchHandler(integration)(post());
  assert.equal(response.status, 200); assert.equal((await response.json()).items.length, 0);
});
