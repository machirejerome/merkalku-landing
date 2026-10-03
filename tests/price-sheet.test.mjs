import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./route-test-harness.mjs";
const { priceSheetExample } = loadTs("../src/lib/price-sheet-exercise.ts");
test("fictional workbook keeps blank prices distinct from zero and corrects quantity + omitted range", () => {
  const first = priceSheetExample(0); const corrected = priceSheetExample(1);
  assert.equal(first.sumCents, 1500000); assert.equal(first.glassQuantity, 12);
  assert.equal(first.rows[2].priceCents, null); assert.equal(first.rows[3].included, false);
  assert.equal(corrected.sumCents, 1110000); assert.equal(corrected.complete, false);
  assert.equal(corrected.glassQuantity, 2); assert.equal(corrected.rows[2].priceCents, null);
  assert.equal(corrected.rows[3].included, true);
});
test("intentional pricing closes example and unit price edit changes two visits by 100 euro", () => {
  const complete = priceSheetExample(2); const edited = priceSheetExample(3);
  assert.equal(complete.sumCents, 1135000); assert.equal(complete.complete, true);
  assert.equal(edited.sumCents, 1145000); assert.equal(edited.sumCents - complete.sumCents, 10000);
});
