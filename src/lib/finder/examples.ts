export type ExampleCard = {
  id: string; title: string; serviceLabel: string; locationLabel: string; distanceKm: number;
  deadlineKind: "tender" | "request"; deadlineLabel: string; scopeLabel: string;
  sourceLabel: string; sourceStatusLabel: string;
};

/** Entirely invented UI illustrations. Never input to the live eligibility/projection. */
const examples: readonly ExampleCard[] = [
  { id: "example-school", title: "Unterhaltsreinigung einer Schule", serviceLabel: "Unterhaltsreinigung", locationLabel: "Fiktiver Schulstandort", distanceKm: 6, deadlineKind: "tender", deadlineLabel: "Beispiel: noch 14 Tage", scopeLabel: "Ein Schulgebäude · ein fiktives Los", sourceLabel: "Fiktive Beispielquelle", sourceStatusLabel: "Keine echte Quellenprüfung – erfundener Fall" },
  { id: "example-office", title: "Reinigung zweier Verwaltungsgebäude", serviceLabel: "Unterhalt & Glas", locationLabel: "Fiktiver Verwaltungsstandort", distanceKm: 18, deadlineKind: "request", deadlineLabel: "Beispiel: noch 9 Tage", scopeLabel: "Zwei Gebäude · fiktives Teilnahmeverfahren", sourceLabel: "Fiktive Beispielquelle", sourceStatusLabel: "Keine echte Quellenprüfung – erfundener Fall" },
  { id: "example-sport", title: "Glasreinigung einer Sporthalle", serviceLabel: "Glasreinigung", locationLabel: "Fiktiver Hallenstandort", distanceKm: 37, deadlineKind: "tender", deadlineLabel: "Beispiel: noch 21 Tage", scopeLabel: "Eine Halle · ein fiktives Los", sourceLabel: "Fiktive Beispielquelle", sourceStatusLabel: "Keine echte Quellenprüfung – erfundener Fall" },
  { id: "example-library", title: "Unterhaltsreinigung einer Bibliothek", serviceLabel: "Unterhaltsreinigung", locationLabel: "Fiktiver Bibliotheksstandort", distanceKm: 72, deadlineKind: "request", deadlineLabel: "Beispiel: noch 18 Tage", scopeLabel: "Eine Bibliothek · fiktives Teilnahmeverfahren", sourceLabel: "Fiktive Beispielquelle", sourceStatusLabel: "Keine echte Quellenprüfung – erfundener Fall" },
];

export function exampleSearch(radiusKm: number): ExampleCard[] { return examples.filter((item) => item.distanceKm <= radiusKm).map((item) => ({ ...item })); }
