import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { webcrypto } from "node:crypto";

// Execute the actual browser libraries with observable network/DOM boundaries.
function browserHarness(initialUrl = "https://www.merkalku.de/", env = {}) {
  const scripts = [], events = [], beacons = [], navigation = [], cookies = new Map();
  const makeStorage = () => {
    const values = new Map();
    return { values, failRead: false, failWrite: false,
      getItem(key) { if (this.failRead) throw Error("read blocked"); return values.get(key) ?? null; },
      setItem(key, value) { if (this.failWrite) throw Error("write blocked"); values.set(key, value); },
      removeItem(key) { if (this.failWrite) throw Error("remove blocked"); values.delete(key); },
      key(i) { return [...values.keys()][i] ?? null; }, get length() { return values.size; },
    };
  };
  const localStorage = makeStorage(), sessionStorage = makeStorage();
  const location = { reload() { navigation.push("reload"); }, replace(url) { navigation.push(url); go(url); } };
  const go = (url) => {
    const target = new URL(url, location.href || initialUrl);
    for (const key of ["href", "origin", "hostname", "pathname", "search", "protocol"]) location[key] = target[key];
  };
  go(initialUrl);
  const document = {
    referrer: "https://search.example/private?q=email%40example.invalid",
    blockCookies: false,
    get cookie() { return [...cookies].map(([k, v]) => `${k}=${v}`).join("; "); },
    set cookie(value) {
      if (this.blockCookies) return;
      const [pair] = value.split(";"); const [key, val] = pair.split("=");
      if (value.includes("Max-Age=0")) cookies.delete(key); else cookies.set(key, val);
    },
    createElement() { return { remove() { this.removed = true; } }; },
    getElementById(id) { return scripts.find((s) => s.id === id && !s.removed); },
    head: { appendChild(script) { scripts.push(script); } },
  };
  const window = { location, localStorage, sessionStorage,
    dispatchEvent(event) { events.push(event); return true; },
    history: { state: null, replaceState(_state, _title, url) { go(url); } },
  };
  const moduleCache = new Map();
  const globals = { window, document, URL, URLSearchParams, Event, Blob,
    CustomEvent: class extends Event { constructor(name, opts) { super(name); this.detail = opts.detail; } },
    crypto: webcrypto, navigator: { sendBeacon(url, body) { beacons.push({ url, body }); return true; } },
    process: { env: { NODE_ENV: "production", NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-TEST123", ...env } },
  };
  function load(name) {
    name = path.basename(name).replace(/\.ts$/, "");
    if (moduleCache.has(name)) return moduleCache.get(name);
    const source = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    moduleCache.set(name, exports);
    vm.runInContext(outputText, vm.createContext({ ...globals, exports, require: load }), { filename: `${name}.ts` });
    return exports;
  }
  const commands = () => Array.from(window.dataLayer || [], (args) => Array.from(args));
  return { ...globals, scripts, events, beacons, navigation, load, go, commands, reloadModules: () => moduleCache.clear() };
}

test("no choice or rejection makes zero optional script, GA, funnel or pixel requests", () => {
  const h = browserHarness();
  const c = h.load("consent"), a = h.load("analytics"), m = h.load("marketing"), t = h.load("tracking");
  for (const choice of [null, { analytics: false, marketing: false }]) {
    if (choice) c.saveConsent(choice);
    a.trackPageView(); m.startMarketing(); t.trackEvent("generate_lead");
  }
  assert.equal(h.scripts.length, 0); assert.equal(h.commands().length, 0); assert.equal(h.beacons.length, 0);
  assert.equal(h.events.filter((e) => e.type === "mk:generate_lead").length, 0);
});

test("analytics-only loads GA once, records one page view per SPA path and sanitizes URLs", () => {
  const h = browserHarness("https://www.merkalku.de/?email=private@example.invalid#secret");
  h.load("consent").saveConsent({ analytics: true, marketing: false });
  const a = h.load("analytics");
  a.trackPageView(); a.trackPageView(); h.load("marketing").startMarketing();
  h.go("/preisrechner?name=Private"); a.trackPageView(); a.trackPageView();
  h.load("tracking").trackEvent("rechner_sichtbar");
  assert.equal(h.scripts.length, 1);
  assert.match(h.scripts[0].src, /^https:\/\/www.googletagmanager.com\/gtag\/js\?id=G-TEST123$/);
  const views = h.commands().filter((c) => c[0] === "event" && c[1] === "page_view");
  assert.equal(views.length, 2);
  assert.equal(views[0][2].page_location, "https://www.merkalku.de/");
  assert.equal(views[0][2].page_referrer, "https://search.example/");
  assert.equal(views[1][2].page_referrer, "https://www.merkalku.de/");
  assert.equal(h.commands().at(-1)[2].page_referrer, "https://www.merkalku.de/");
  assert.equal(h.commands().find((c) => c[0] === "config")[2].send_page_view, false);
  assert.ok(!JSON.stringify(h.commands()).includes("private@example.invalid"));
});

test("marketing-only remains independent of analytics and excludes Leadinfo on Ausschreibung", () => {
  for (const [url, expectedScripts] of [["/", 2], ["/ausschreibung", 1], ["/ausschreibung/example", 1]]) {
    const h = browserHarness(`https://www.merkalku.de${url}`);
    h.load("consent").saveConsent({ analytics: false, marketing: true });
    h.load("marketing").startMarketing(); h.load("marketing").startMarketing();
    h.load("tracking").trackEvent("generate_lead", { lead_source: "preisrechner", email: "secret" });
    assert.equal(h.scripts.length, expectedScripts);
    assert.equal(h.beacons.length, 0); assert.equal(h.commands().length, 0);
    if (url === "/") assert.equal(h.events.filter((e) => e.type === "mk:generate_lead").length, 1);
    if (url.startsWith("/ausschreibung")) assert.ok(!h.scripts.some((s) => s.src.includes("leadinfo")));
  }
});

test("funnel payloads carry consent and allowlisted progress, never calculator answers or savings as revenue", async () => {
  const h = browserHarness();
  h.load("consent").saveConsent({ analytics: true, marketing: false });
  const t = h.load("tracking");
  t.trackStand("preisrechner", { schritt: 3, anzahl: 99, stunden: 22, wer: "secret", tool: "personal" });
  t.trackLead("preisrechner", 20000, 40000);
  t.trackEvent("made_up", { email: "secret" });
  t.trackEvent("rechner_schritt", { schritt: 999, quelle: "secret", email: "secret" });
  assert.equal(h.beacons.length, 3);
  const bodies = await Promise.all(h.beacons.map(async (b) => JSON.parse(await b.body.text())));
  assert.equal(bodies[0].schritt, 3); assert.equal(bodies[0].optionalConsent.analytics, true);
  assert.equal(bodies[1].e, "generate_lead"); assert.equal(bodies[1].lead_source, "preisrechner");
  const all = JSON.stringify([bodies, h.commands()]);
  for (const excluded of ["anzahl", "stunden", "secret", '"personal"', "20000", "40000", '"value"', '"currency"']) assert.ok(!all.includes(excluded), excluded);
  assert.equal(bodies[2].schritt, undefined);
});

test("version, expiry, malformed storage and unknown hosts fail closed; preview requires explicit flag", () => {
  const h = browserHarness(); const c = h.load("consent");
  const saved = c.saveConsent({ analytics: true, marketing: true });
  for (const invalid of [{ ...saved, version: 0 }, { ...saved, updatedAt: 1, expiresAt: 1 + c.CONSENT_LIFETIME_MS }, { analytics: true }, { ...saved, updatedAt: Date.now() + 100000 }]) {
    h.window.localStorage.setItem(c.CONSENT_STORAGE_KEY, JSON.stringify(invalid));
    assert.equal(c.readConsent(), null);
  }
  h.window.localStorage.setItem(c.CONSENT_STORAGE_KEY, "{"); assert.equal(c.readConsent(), null);
  h.window.localStorage.failRead = true; assert.equal(c.readConsent(), null);
  for (const [host, env, allowed] of [["localhost", {}, false], ["preview.vercel.app", {}, false], ["localhost", { NEXT_PUBLIC_ENABLE_MEASUREMENT_PREVIEW: "true" }, true]]) {
    const preview = browserHarness(`http://${host}/`, env); const pc = preview.load("consent");
    pc.saveConsent({ analytics: true, marketing: false }); assert.equal(pc.canMeasure("analytics"), allowed);
  }
});

test("withdrawal disables GA; failed persistence cannot resurrect the old grant on reload", () => {
  const h = browserHarness(); const c = h.load("consent"), a = h.load("analytics");
  c.saveConsent({ analytics: true, marketing: true }); a.trackPageView();
  h.window.localStorage.failWrite = true;
  h.window.sessionStorage.failWrite = true;
  h.document.blockCookies = true;
  assert.equal(c.saveConsent({ analytics: false, marketing: false }), null);
  a.stopAnalytics(); c.reloadAfterConsentWithdrawal();
  assert.equal(h.window["ga-disable-G-TEST123"], true);
  assert.equal(c.canMeasure("analytics"), false);
  assert.equal(h.scripts[0].removed, true);
  assert.match(h.navigation[0], /mk_optional_blocked=1/);
  h.reloadModules();
  assert.equal(h.load("consent").readConsent(), null);
  h.load("analytics").trackPageView(); h.load("marketing").startMarketing();
  assert.equal(h.scripts.length, 1, "no new optional scripts after the fresh-document boundary");
});

test("debug mode is opt-in and consent defaults precede Google configuration", () => {
  for (const debug of [undefined, "true"]) {
    const h = browserHarness(undefined, { NEXT_PUBLIC_GA_DEBUG_MODE: debug });
    h.load("consent").saveConsent({ analytics: true, marketing: false }); h.load("analytics").trackPageView();
    const commands = h.commands();
    assert.equal(commands[0][0], "consent"); assert.equal(commands[0][1], "default");
    assert.equal(commands[0][2].ad_storage, "denied");
    assert.equal(commands.find((c) => c[0] === "config")[2].debug_mode, debug === "true" ? true : undefined);
  }
});

test("demo and calculator links are allowlisted clicks without an inferred booking", () => {
  const h = browserHarness();
  h.load("consent").saveConsent({ analytics: true, marketing: false });
  for (const event of ["demo_cta_click", "calculator_open"]) h.load("tracking").trackEvent(event, { text: "private", href: "https://private.invalid" });
  const events = h.commands().filter((c) => c[0] === "event").map((c) => c[1]);
  assert.deepEqual(events, ["page_view", "demo_cta_click", "calculator_open"]);
  assert.ok(!JSON.stringify(h.commands()).includes("private.invalid"));
});
