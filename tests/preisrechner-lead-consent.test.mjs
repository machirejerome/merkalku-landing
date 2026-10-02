import assert from "node:assert/strict";
import { test } from "node:test";
import { consent, consentModule, expiredConsent, fakeConsole, fakeDatabase, loadTs, postRequest } from "./route-test-harness.mjs";

const pricing = loadTs("../src/lib/pricing-config.ts");
const personal = { name: "Testperson Beispiel", firma: "Beispielfirma GmbH", email: "testperson@example.invalid", phone: "+4917012345678" };

async function submit(optionalConsent, overrides = {}) {
  const crm = [];
  const ads = [];
  const db = fakeDatabase();
  const logger = fakeConsole();
  const route = loadTs("../src/app/api/preisrechner-lead/route.ts", {
    "@/lib/consent": consentModule,
    "@/lib/pricing-config": pricing,
    "@/lib/db": db.module,
  }, {
    console: logger.module,
    async fetch(url, options) {
      const call = { url, method: options.method, body: JSON.parse(options.body) };
      if (url.startsWith("https://services.leadconnectorhq.com/")) {
        crm.push(call);
        return Response.json({ contact: { id: "offline-test-contact" } });
      }
      assert.ok(url.startsWith("https://bzr.openai.com/v1/events?pid="), `Unexpected destination: ${url}`);
      ads.push(call);
      return Response.json({ ok: true });
    },
  });
  const response = await route.POST(postRequest("/api/preisrechner-lead", {
    optionalConsent,
    sid: "offline-test-session",
    ...personal,
    ausschreibungenProMonat: 2,
    stundenProAusschreibung: 3,
    kalkulationWer: "Inhaber selbst",
    kalkulationTool: "Excel",
    quelle: "preisrechner",
    utm: { utm_source: "chatgpt", utm_campaign: "offline-campaign", oppref: "offline-click-id" },
    whatsappEinwilligung: false,
    seite: "https://www.merkalku.de/preisrechner?email=testperson%40example.invalid&phone=017012345678#private",
    ...overrides,
  }));
  return { response, crm, ads, db, logs: logger.messages };
}

async function assertServiceLead(result) {
  assert.equal(result.response.status, 200);
  assert.deepEqual(await result.response.json(), { ok: true });
  assert.equal(result.crm.length, 3, "Service request keeps contact, fields and workflow tags");
  assert.equal(result.crm[0].body.email, personal.email);
  assert.equal(result.crm[0].body.companyName, personal.firma);
  assert.ok(result.crm[2].body.tags.includes("preisrechner"));
  assert.equal(result.logs.length, 0);
}

for (const [name, record] of [
  ["missing", undefined],
  ["denied", consent(false, false)],
  ["expired", expiredConsent()],
  ["invalid", { analytics: true, marketing: true }],
  ["wrong version", consent(true, true, { version: 0 })],
]) {
  test(`full service lead with ${name} consent blocks optional analytics and marketing`, async () => {
    const result = await submit(record);
    await assertServiceLead(result);
    assert.equal(result.ads.length, 0);
    assert.equal(result.db.writes.length, 0);
    assert.equal(result.db.schemaCalls, 0);
    assert.ok(!JSON.stringify(result.crm).includes("offline-campaign"));
    assert.ok(!JSON.stringify(result.crm).includes("offline-click-id"));
    assert.ok(!result.crm[2].body.tags.includes("quelle:chatgpt-ads"));
  });
}

test("marketing-only consent permits the ad conversion but no Neon session write", async () => {
  const result = await submit(consent(false, true));
  await assertServiceLead(result);
  assert.equal(result.ads.length, 1);
  assert.equal(result.ads[0].body.events[0].oppref, "offline-click-id");
  assert.equal(result.db.writes.length, 0);
  assert.equal(result.db.schemaCalls, 0);
});

test("analytics-only consent permits Neon association but no ad conversion or campaign transfer", async () => {
  const result = await submit(consent(true, false));
  await assertServiceLead(result);
  assert.equal(result.ads.length, 0);
  assert.equal(result.db.writes.length, 1);
  assert.ok(result.db.writes[0].values.includes("offline-test-session"));
  assert.ok(!JSON.stringify(result.crm).includes("offline-click-id"));
});

test("both consent categories permit their separate optional destinations", async () => {
  const result = await submit(consent(true, true));
  await assertServiceLead(result);
  assert.equal(result.ads.length, 1);
  assert.equal(result.db.writes.length, 1);
});

for (const [source, expectedPath] of [["preisrechner", "/preisrechner"], ["lp-ausschreibung", "/ausschreibung"], ["untrusted-path", "/preisrechner"]]) {
  test(`ad source_url for ${source} excludes client query, hash and personal fields`, async () => {
    const result = await submit(consent(false, true), { quelle: source });
    await assertServiceLead(result);
    assert.equal(result.ads.length, 1);
    const event = result.ads[0].body.events[0];
    assert.equal(event.source_url, `https://www.merkalku.de${expectedPath}`);
    const sent = JSON.stringify(event);
    for (const value of Object.values(personal)) assert.ok(!sent.includes(value));
    assert.ok(!event.source_url.includes("?"));
    assert.ok(!event.source_url.includes("#"));
    assert.ok(!Object.hasOwn(event, "value"));
    assert.ok(!Object.hasOwn(event.data, "value"));
    assert.deepEqual(Object.keys(event).sort(), ["action_source", "data", "id", "oppref", "source_url", "timestamp_ms", "type"].sort());
  });
}
