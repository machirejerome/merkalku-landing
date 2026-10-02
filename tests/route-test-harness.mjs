import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

/** Real TypeScript modules, isolated imports, fake environment, and no ambient network. */
export function loadTs(relativePath, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  const context = vm.createContext({
    exports,
    Response,
    AbortSignal: { timeout: () => undefined },
    process: { env: {
      GHL_API_TOKEN: "offline-test-token",
      GHL_LOCATION_ID: "offline-test-location",
      OPENAI_ADS_API_TOKEN: "offline-test-ads-token",
    } },
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    fetch() { throw new Error("Network must be explicitly mocked"); },
    ...globals,
  });
  vm.runInContext(outputText, context, { filename: relativePath });
  return exports;
}

export const consentModule = loadTs("../src/lib/consent.ts");

export function consent(analytics, marketing = false, overrides = {}) {
  const updatedAt = Date.now() - 1000;
  return {
    version: consentModule.CONSENT_VERSION,
    analytics,
    marketing,
    updatedAt,
    expiresAt: updatedAt + consentModule.CONSENT_LIFETIME_MS,
    ...overrides,
  };
}

export function expiredConsent() {
  const expiresAt = Date.now() - 1000;
  return consent(true, true, {
    updatedAt: expiresAt - consentModule.CONSENT_LIFETIME_MS,
    expiresAt,
  });
}

export function fakeDatabase() {
  const writes = [];
  let accesses = 0;
  let schemaCalls = 0;
  return {
    writes,
    get accesses() { return accesses; },
    get schemaCalls() { return schemaCalls; },
    module: {
      getSql() {
        accesses++;
        return async (strings, ...values) => {
          writes.push({ query: strings.join("?"), values });
          return [];
        };
      },
      async ensureSchema() { schemaCalls++; },
    },
  };
}

export function fakeConsole() {
  const messages = [];
  const capture = (...args) => messages.push(args);
  return { messages, module: { log: capture, warn: capture, error: capture } };
}

export function postRequest(path, body) {
  return new Request(`https://www.merkalku.de${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
