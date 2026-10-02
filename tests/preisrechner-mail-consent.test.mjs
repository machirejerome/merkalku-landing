import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real route and consent validator without live CRM or database access.
function loadTs(relativePath, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  const context = vm.createContext({
    exports,
    Response,
    process: { env: { GHL_API_TOKEN: "test-token", GHL_LOCATION_ID: "test-location" } },
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  vm.runInContext(outputText, context, { filename: relativePath });
  return exports;
}

const consentModule = loadTs("../src/lib/consent.ts");
const measurementModule = loadTs("../src/lib/measurement.ts", { "./consent": consentModule });

function consent(analytics, overrides = {}) {
  const updatedAt = Date.now() - 1000;
  return {
    version: consentModule.CONSENT_VERSION,
    analytics,
    marketing: false,
    updatedAt,
    expiresAt: updatedAt + consentModule.CONSENT_LIFETIME_MS,
    ...overrides,
  };
}

async function submit(optionalConsent, payloadOverrides = {}) {
  const crm = [];
  const writes = [];
  const logs = [];
  let dbAccesses = 0;
  let schemaCalls = 0;
  const route = loadTs("../src/app/api/preisrechner-mail/route.ts", {
    "@/lib/measurement": measurementModule,
    "@/lib/db": {
      getSql() {
        dbAccesses++;
        return async (_strings, ...values) => { writes.push(values); return []; };
      },
      async ensureSchema() { schemaCalls++; },
    },
  }, {
    console: { log: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    async fetch(url, options) {
      crm.push({ url, body: JSON.parse(options.body) });
      return Response.json({ contact: { id: "test-contact" } });
    },
  });
  const response = await route.POST(new Request("https://www.merkalku.de/api/preisrechner-mail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      optionalConsent,
      sid: "test-session",
      email: "test@example.invalid",
      quelle: "preisrechner",
      ausschreibungenProMonat: 2,
      stundenProAusschreibung: 3,
      ...payloadOverrides,
    }),
  }));
  return { response, crm, writes, logs, dbAccesses, schemaCalls };
}

for (const [name, value] of [
  ["missing", undefined],
  ["denied", consent(false)],
  ["marketing-only", consent(false, { marketing: true })],
  ["expired", consent(true, {
    updatedAt: Date.now() - consentModule.CONSENT_LIFETIME_MS - 1000,
    expiresAt: Date.now() - 1000,
  })],
  ["wrong version", consent(true, { version: 0 })],
  ["malformed", { analytics: true }],
]) {
  test(`${name} analytics consent preserves service lead and blocks optional storage`, async () => {
    const result = await submit(value);
    assert.equal(result.response.status, 204);
    assert.equal(result.crm.length, 2, "CRM upsert and service context remain available");
    assert.equal(result.crm[0].body.email, "test@example.invalid");
    assert.equal(result.dbAccesses, 0);
    assert.equal(result.writes.length, 0);
    assert.equal(result.logs.length, 0, "No fallback measurement log with email");
  });
}

test("valid analytics consent allows the existing session association", async () => {
  const result = await submit(consent(true));
  assert.equal(result.response.status, 204);
  assert.equal(result.crm.length, 2);
  assert.equal(result.dbAccesses, 1);
  assert.equal(result.schemaCalls, 1);
  assert.equal(result.writes.length, 1);
  assert.ok(result.writes[0].includes("test-session"));
  assert.ok(result.writes[0].includes("test@example.invalid"));
});

test("analytics consent without a session still only processes the service lead", async () => {
  const result = await submit(consent(true), { sid: undefined });
  assert.equal(result.crm.length, 2);
  assert.equal(result.dbAccesses, 0);
  assert.equal(result.logs.length, 0);
});

test("half-gate default measurement associates the session without an explicit consent record", async () => {
  const result = await submit(null, { measurementDefault: true });
  assert.equal(result.response.status, 204);
  assert.equal(result.crm.length, 2);
  assert.equal(result.writes.length, 1);
});

for (const [name, record] of [
  ["saved rejection", consent(false)],
  ["malformed record", { analytics: true }],
  ["missing record", undefined],
]) {
  test(`half-gate default flag cannot override ${name}`, async () => {
    const result = await submit(record, { measurementDefault: true });
    assert.equal(result.response.status, 204);
    assert.equal(result.crm.length, 2);
    assert.equal(result.dbAccesses, 0);
    assert.equal(result.logs.length, 0);
  });
}
