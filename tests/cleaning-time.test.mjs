import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./route-test-harness.mjs";

const { evaluateCleaningTime, emptyCleaningTimeInput, cleaningTimeExample, changeCleaningPeriod, parseCleaningNumber, formatCleaningDuration } = loadTs("../src/lib/cleaning-time.ts");

function oneGroup(overrides = {}) {
  const input = emptyCleaningTimeInput();
  input.period = "Woche";
  Object.assign(input.groups[0], { area: "1000", performance: "250", visits: "5" }, overrides);
  return input;
}

function valid(input) {
  const result = evaluateCleaningTime(input);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}

test("empty input does not silently become a zero-hour calculation", () => {
  const result = evaluateCleaningTime(emptyCleaningTimeInput());
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.field === "cleaning-period"));
  assert.ok(result.errors.some((error) => error.field.endsWith("-area")));
});

test("fictional mixed object agrees with independently derived weekly and daily reference totals", () => {
  const result = valid(cleaningTimeExample());
  assert.ok(Math.abs(result.totalHours - 109 / 6) < 1e-12);
  assert.ok(Math.abs(result.alternativeTotalHours - 535 / 24) < 1e-12);
  assert.ok(Math.abs(result.totalHours - (3 * (3 + 50 / 60) + 2 * (3 + 20 / 60))) < 1e-12);
  assert.ok(Math.abs(result.alternativeTotalHours - (3 * (4 + 42.5 / 60) + 2 * (4 + 5 / 60))) < 1e-12);
  assert.ok(Math.abs(result.differenceHours - 33 / 8) < 1e-12);
  assert.equal(formatCleaningDuration(result.totalHours), "18 h 10 min");
  assert.equal(formatCleaningDuration(result.alternativeTotalHours), "22 h 17 min 30 s");
});

test("shared object extra is counted once even when several groups have different frequencies", () => {
  const example = cleaningTimeExample();
  const withExtra = valid(example);
  const withoutExtra = valid({ ...example, extraEnabled: false });
  assert.ok(Math.abs(withExtra.totalHours - withoutExtra.totalHours - 100 / 60) < 1e-12);
  assert.ok(Math.abs(withExtra.alternativeTotalHours - withoutExtra.alternativeTotalHours - 100 / 60) < 1e-12);
});

test("decimal comma preserves fractional work before presentation rounding", () => {
  const input = oneGroup({ area: "1000,5", performance: "250,125", visits: "3" });
  Object.assign(input, { extraEnabled: true, extraMinutes: "7,5", extraVisits: "3" });
  assert.equal(valid(input).totalHours, 12.375);
});

test("zero visits and zero area are explicit valid values but never excuse missing performance", () => {
  assert.equal(valid(oneGroup({ visits: "0" })).totalHours, 0);
  const input = oneGroup({ area: "0" });
  Object.assign(input, { extraEnabled: true, extraMinutes: "15", extraVisits: "5" });
  assert.equal(valid(input).totalHours, 1.25);
  assert.equal(evaluateCleaningTime(oneGroup({ visits: "0", performance: "" })).ok, false);
});

test("missing, nonfinite, negative, scientific and ambiguous numeric input is rejected", () => {
  for (const value of ["", " ", null, undefined, "NaN", "Infinity", "1e999", "-1", "1.000", "1.000,5", "1,000.5", "1 000", "250m²/h"]) {
    assert.equal(parseCleaningNumber(value), null, String(value));
  }
  assert.equal(parseCleaningNumber("1000"), 1000);
  assert.equal(parseCleaningNumber("250,125"), 250.125);
  assert.equal(parseCleaningNumber("250.5"), 250.5);
  assert.equal(evaluateCleaningTime(oneGroup({ performance: "0" })).ok, false);
  assert.equal(evaluateCleaningTime(oneGroup({ visits: "2,5" })).ok, false);
});

test("enabled optional blocks require explicit values and disabled blocks cannot corrupt totals", () => {
  const input = oneGroup();
  assert.equal(valid({ ...input, extraEnabled: false, extraMinutes: "bad", extraVisits: "bad" }).totalHours, 20);
  assert.equal(evaluateCleaningTime({ ...input, extraEnabled: true }).ok, false);
  assert.equal(evaluateCleaningTime({ ...input, compare: true }).ok, false);
  assert.equal(valid({ ...input, compare: false }).alternativeTotalHours, null);
  input.groups[0].alternative = "500";
  const faster = valid({ ...input, compare: true });
  assert.equal(faster.alternativeTotalHours, 10);
  assert.equal(faster.differenceHours, -10);
});

test("changing the period clears group and object counts rather than multiplying or reinterpreting", () => {
  const changed = changeCleaningPeriod(cleaningTimeExample(), "Monat");
  assert.equal(changed.period, "Monat");
  assert.ok(changed.groups.every((group) => group.visits === ""));
  assert.equal(changed.extraVisits, "");
  assert.equal(changed.periodDescription, "");
  assert.equal(evaluateCleaningTime(changed).ok, false);
  assert.equal(valid({ ...oneGroup({ visits: "20" }), period: "Monat" }).totalHours, 80);
});

test("custom periods need their own name and a numeric overflow never becomes a result", () => {
  const input = oneGroup();
  assert.equal(evaluateCleaningTime({ ...input, period: "Eigener Zeitraum", periodDescription: " " }).ok, false);
  assert.equal(valid({ ...input, period: "Eigener Zeitraum", periodDescription: "03.–11.10.2026" }).totalHours, 20);
  assert.equal(evaluateCleaningTime(oneGroup({ area: "9007199254740991", performance: "0,00000000000000000000001" })).ok, false);
});

test("invalid changes return no reusable previous value and notes have no mathematical effect", () => {
  const input = oneGroup();
  const original = valid(input).totalHours;
  input.groups[0].source = "Lokale Notiz: <script>private</script>";
  input.groups[0].scope = "Private Leistungsbeschreibung";
  assert.equal(valid(input).totalHours, original);
  input.groups[0].performance = "";
  const invalid = evaluateCleaningTime(input);
  assert.equal(invalid.ok, false);
  assert.equal(Object.hasOwn(invalid, "value"), false);
});
