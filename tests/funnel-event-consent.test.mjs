import assert from "node:assert/strict";
import { test } from "node:test";
import { consent, expiredConsent, fakeConsole, fakeDatabase, loadTs, measurementModule, postRequest } from "./route-test-harness.mjs";

async function submit(optionalConsent, overrides = {}) {
  const db = fakeDatabase();
  const logger = fakeConsole();
  const route = loadTs("../src/app/api/funnel-event/route.ts", {
    "@/lib/measurement": measurementModule,
    "@/lib/content-events": loadTs("../src/lib/content-events.ts"),
    "@/lib/db": db.module,
  }, { console: logger.module });
  const response = await route.POST(postRequest("/api/funnel-event", {
    e: "rechner_stand",
    sid: "offline-test-session",
    p: "/preisrechner",
    quelle: "preisrechner",
    schritt: 2,
    optionalConsent,
    utm: { oppref: "offline-click-id" },
    ...overrides,
  }));
  return { response, db, logs: logger.messages };
}

for (const [name, record] of [
  ["missing", undefined],
  ["denied", consent(false, false)],
  ["marketing-only", consent(false, true)],
  ["expired", expiredConsent()],
  ["invalid", { analytics: true }],
  ["wrong version", consent(true, true, { version: 0 })],
  ["non-boolean", consent(true, true, { analytics: "true" })],
]) {
  test(`funnel rejects ${name} analytics consent before DB access or logging`, async () => {
    const result = await submit(record);
    assert.equal(result.response.status, 204);
    assert.equal(result.db.accesses, 0);
    assert.equal(result.db.writes.length, 0);
    assert.equal(result.logs.length, 0);
  });
}

test("funnel accepts valid analytics consent while discarding unconsented campaign IDs", async () => {
  const result = await submit(consent(true, false));
  assert.equal(result.response.status, 204);
  assert.equal(result.db.writes.length, 2);
  assert.ok(result.db.writes[0].query.includes("funnel_events"));
  assert.ok(result.db.writes[1].query.includes("rechner_sessions"));
  assert.ok(!JSON.stringify(result.db.writes).includes("offline-click-id"));
  assert.equal(result.logs.length, 0);
});

test("funnel ignores unrecognised events even with valid consent", async () => {
  const result = await submit(consent(true, true), { e: "unrecognised-event" });
  assert.equal(result.response.status, 204);
  assert.equal(result.db.accesses, 0);
  assert.equal(result.logs.length, 0);
});

test("funnel accepts explicitly marked default measurement without a consent record", async () => {
  const result = await submit(null, { measurementDefault: true });
  assert.equal(result.response.status, 204);
  assert.equal(result.db.writes.length, 2);
  assert.equal(result.logs.length, 0);
});

for (const [name, record] of [
  ["saved rejection", consent(false, false)],
  ["marketing-only choice", consent(false, true)],
  ["malformed record", { analytics: true }],
  ["expired record", expiredConsent()],
  ["missing record", undefined],
]) {
  test(`funnel default flag cannot override ${name}`, async () => {
    const result = await submit(record, { measurementDefault: true });
    assert.equal(result.response.status, 204);
    assert.equal(result.db.accesses, 0);
    assert.equal(result.logs.length, 0);
  });
}

test("funnel requires a literal boolean true for default measurement", async () => {
  const result = await submit(null, { measurementDefault: "true" });
  assert.equal(result.db.accesses, 0);
  assert.equal(result.logs.length, 0);
});

test("content events persist event/path/source only and discard even crafted confidential fields", async () => {
  for (const event of ["checklist_edit_started", "checklist_print_clicked", "source_click", "content_product_click"]) {
    const result = await submit(null, {
      measurementDefault: true, e: event, p: "/wissen/ausschreibung-gebaeudereinigung-pruefen", sid: "0123456789abcdef01234567",
      content_id: "PRIVATE-content", revision: 98765, source_id: "ted_fields", finding: "PRIVATE-finding", owner: "PRIVATE-person",
      original_reference: "PRIVATE-reference", anzahl: 98765, stunden: 98765, liegen: "PRIVATE-secret", wer: "PRIVATE-secret", tool: "PRIVATE-secret",
      quelle: "PRIVATE-secret", herkunft: "PRIVATE-secret", v: "PRIVATE-secret", value: 98765,
    });
    assert.equal(result.db.writes.length, 1);
    assert.ok(result.db.writes[0].values.includes(event));
    assert.ok(result.db.writes[0].values.includes("/wissen/ausschreibung-gebaeudereinigung-pruefen"));
    assert.ok(!JSON.stringify(result.db.writes).includes("PRIVATE"));
    assert.ok(!JSON.stringify(result.db.writes).includes("98765"));
    if (event === "source_click") assert.ok(result.db.writes[0].values.includes("ted_fields"));
    assert.equal(result.logs.length, 0);
  }
});

test("content events reject unrecognised paths and retain the saved opt-out", async () => {
  for (const [record, path] of [[null, "/wissen/private-client-name"], [consent(false, false), "/wissen"]]) {
    const result = await submit(record, { measurementDefault: true, e: "checklist_edit_started", p: path });
    assert.equal(result.db.accesses, 0); assert.equal(result.logs.length, 0);
  }
});

test("content fallback logs contain no submitted worksheet fields or unknown source IDs", async () => {
  const logger = fakeConsole();
  const route = loadTs("../src/app/api/funnel-event/route.ts", {
    "@/lib/measurement": measurementModule,
    "@/lib/content-events": loadTs("../src/lib/content-events.ts"),
    "@/lib/db": { getSql: () => null },
  }, { console: logger.module });
  await route.POST(postRequest("/api/funnel-event", {
    optionalConsent: null, measurementDefault: true, e: "source_click", p: "/wissen",
    source_id: "PRIVATE-URL", sid: "PRIVATE-person", original_reference: "PRIVATE-file", finding: "PRIVATE-note", next: "PRIVATE-deadline",
  }));
  assert.equal(logger.messages.length, 1);
  assert.ok(!JSON.stringify(logger.messages).includes("PRIVATE"));
});
