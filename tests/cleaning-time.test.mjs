import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./route-test-harness.mjs";

const { evaluateCleaningTime, emptyCleaningTimeInput, cleaningTimeExample, parseCleaningNumber, formatCleaningDuration, CLEANING_TIME_REVISION } = loadTs("../src/lib/cleaning-time.ts");
function valid(input) {
  const result = evaluateCleaningTime(input);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}

test("revision 2 starts with no area or assumed performance and cannot calculate missing inputs", () => {
  assert.equal(CLEANING_TIME_REVISION, 2);
  const empty = emptyCleaningTimeInput();
  assert.equal(empty.area, "");
  assert.equal(empty.performance, "");
  const evaluated = evaluateCleaningTime(empty);
  assert.equal(evaluated.ok, false);
  assert.equal(evaluated.errors.length, 2);
  assert.equal(evaluateCleaningTime({ ...empty, area: "0" }).ok, false);
});

test("explicit fictional example is two hours for ONE cleaning without any period multiplier", () => {
  const result = valid(cleaningTimeExample());
  assert.equal(result.surfaceHours, 2);
  assert.equal(result.extraMinutes, 0);
  assert.equal(result.totalHours, 2);
  assert.equal(formatCleaningDuration(result.totalHours), "2 h");
});

test("optional extra time is added once in minutes and remains distinct from surface time", () => {
  const result = valid({ ...cleaningTimeExample(), extraMinutes: "15" });
  assert.equal(result.surfaceHours, 2);
  assert.equal(result.totalHours, 9 / 4);
  assert.equal(formatCleaningDuration(result.totalHours), "2 h 15 min");
  assert.equal(valid({ ...cleaningTimeExample(), extraMinutes: " " }).totalHours, 2);
  assert.equal(evaluateCleaningTime({ ...cleaningTimeExample(), extraMinutes: "abc" }).ok, false);
  assert.equal(evaluateCleaningTime({ ...cleaningTimeExample(), extraMinutes: "-5" }).ok, false);
});

test("decimal inputs preserve arithmetic precision until presentation", () => {
  const result = valid({ area: "1000,5", performance: "250,125", extraMinutes: "7,5" });
  assert.equal(result.surfaceHours, 4);
  assert.equal(result.totalHours, 33 / 8);
  assert.equal(formatCleaningDuration(result.totalHours), "4 h 7 min 30 s");
});

test("explicit zero area is valid, while zero or missing performance is never valid", () => {
  assert.equal(valid({ area: "0", performance: "300", extraMinutes: "" }).totalHours, 0);
  assert.equal(valid({ area: "0", performance: "300", extraMinutes: "15" }).totalHours, 0.25);
  for (const performance of ["", " ", "0", "-1", "NaN", "Infinity"]) {
    assert.equal(evaluateCleaningTime({ area: "600", performance, extraMinutes: "" }).ok, false);
  }
});

test("ambiguous separators, scientific and nonfinite values are rejected without guessing", () => {
  for (const value of ["", " ", null, undefined, "NaN", "Infinity", "1e999", "-1", "1.000", "1.000,5", "1,000.5", "1 000", "250m²/h"]) assert.equal(parseCleaningNumber(value), null, String(value));
  assert.equal(parseCleaningNumber("600,5"), 600.5);
  assert.equal(parseCleaningNumber("300.5"), 300.5);
});

test("overflow and invalid subsequent inputs have no reusable result", () => {
  assert.equal(evaluateCleaningTime({ area: "9007199254740991", performance: "0,00000000000000000000001", extraMinutes: "" }).ok, false);
  const invalid = evaluateCleaningTime({ ...cleaningTimeExample(), performance: "" });
  assert.equal(invalid.ok, false);
  assert.equal(Object.hasOwn(invalid, "value"), false);
});
