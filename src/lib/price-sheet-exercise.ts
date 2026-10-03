/** Deliberately fictional 12-month NET example, using integer cents. */
export const PRICE_SHEET_CHECKS = [
  "Original, Version und erlaubte Eingaben",
  "Leistung, Menge, Einheit und Zeitraum",
  "Leer, null oder nicht zutreffend",
  "Formeln, Bezüge und vollständige Bereiche",
  "Unabhängige fachliche Gegenrechnung",
  "Neuberechnung und Fehlermeldungen",
  "Gespeicherte Abgabedatei erneut öffnen",
] as const;

export type ExerciseStage = 0 | 1 | 2 | 3;
export function priceSheetExample(stage: ExerciseStage) {
  const glassQuantity = stage === 0 ? 12 : 2;
  const glassUnitCents = stage === 3 ? 50000 : 45000;
  const specialCents = stage >= 2 ? 25000 : null;
  const rows = [
    { name: "Büroreinigung", quantity: 12, unit: "Monate", priceCents: 80000, totalCents: 960000, included: true },
    { name: "Glasreinigung", quantity: glassQuantity, unit: "Termine", priceCents: glassUnitCents, totalCents: glassQuantity * glassUnitCents, included: true },
    { name: "Sonderleistung", quantity: 1, unit: "Leistung", priceCents: specialCents, totalCents: specialCents, included: stage > 0 },
    { name: "Treppenhaus", quantity: 12, unit: "Monate", priceCents: 5000, totalCents: 60000, included: stage > 0 },
  ];
  const sumCents = rows.reduce((sum, row) => sum + (row.included ? row.totalCents ?? 0 : 0), 0);
  return { rows, sumCents, complete: stage >= 2, glassQuantity, unresolved: stage === 0 ? 3 : stage === 1 ? 1 : 0 };
}
export function euro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
