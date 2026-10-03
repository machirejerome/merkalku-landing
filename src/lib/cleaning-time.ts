export const CLEANING_TIME_CONTENT_ID = "reinigungszeit-berechnen";
export const CLEANING_TIME_REVISION = 1;
export const CLEANING_TIME_CONTENT_DATE = "2026-10-03";

export type CleaningGroup = {
  id: string;
  name: string;
  area: string;
  performance: string;
  alternative: string;
  visits: string;
  scope: string;
  source: string;
  open: string;
};

export type CleaningTimeInput = {
  period: "" | "Woche" | "Monat" | "Jahr" | "Eigener Zeitraum";
  periodDescription: string;
  groups: CleaningGroup[];
  compare: boolean;
  extraEnabled: boolean;
  extraMinutes: string;
  extraVisits: string;
  extraDescription: string;
};

export type CleaningTimeResult = {
  period: string;
  groups: { id: string; name: string; area: number; performance: number; alternative: number | null; visits: number; hours: number; alternativeHours: number | null }[];
  surfaceHours: number;
  extraHours: number;
  totalHours: number;
  alternativeSurfaceHours: number | null;
  alternativeTotalHours: number | null;
  differenceHours: number | null;
};

export type CleaningTimeError = { field: string; message: string };
export type CleaningTimeEvaluation = { ok: true; value: CleaningTimeResult } | { ok: false; errors: CleaningTimeError[] };

export function emptyCleaningGroup(id: string): CleaningGroup {
  return { id, name: "", area: "", performance: "", alternative: "", visits: "", scope: "", source: "", open: "" };
}

export function emptyCleaningTimeInput(): CleaningTimeInput {
  return { period: "", periodDescription: "", groups: [emptyCleaningGroup("group-1")], compare: false, extraEnabled: false, extraMinutes: "", extraVisits: "", extraDescription: "" };
}

/** Explicit period changes must never reinterpret the old visit count. */
export function changeCleaningPeriod(input: CleaningTimeInput, period: CleaningTimeInput["period"]): CleaningTimeInput {
  if (period === input.period) return input;
  return { ...input, period, periodDescription: "", groups: input.groups.map((group) => ({ ...group, visits: "" })), extraVisits: "" };
}

/** German decimal comma, optional unambiguous decimal point; never guess thousands. */
export function parseCleaningNumber(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(text) || /^\d+\.\d{3}$/.test(text)) return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER ? value : null;
}

export function evaluateCleaningTime(input: CleaningTimeInput): CleaningTimeEvaluation {
  const errors: CleaningTimeError[] = [];
  if (!["Woche", "Monat", "Jahr", "Eigener Zeitraum"].includes(input.period)) errors.push({ field: "cleaning-period", message: "Bitte einen Zeitraum wählen." });
  if (input.period === "Eigener Zeitraum" && !input.periodDescription.trim()) errors.push({ field: "cleaning-period-description", message: "Bitte den eigenen Zeitraum benennen." });
  if (input.groups.length === 0) errors.push({ field: "cleaning-groups", message: "Bitte mindestens eine Raumgruppe erfassen." });

  function read(raw: string, field: string, label: string, positive = false, integer = false) {
    const value = parseCleaningNumber(raw);
    if (value === null) errors.push({ field, message: `${label}: Zahl ohne Tausendertrennzeichen eingeben, zum Beispiel 1000 oder 250,5.` });
    else if (positive && value <= 0) errors.push({ field, message: `${label}: Der Leistungswert muss größer als 0 sein.` });
    else if (integer && !Number.isSafeInteger(value)) errors.push({ field, message: `${label}: Bitte eine ganze Einsatzzahl ab 0 eingeben.` });
    return value;
  }

  const groups = input.groups.map((group, index) => {
    const name = group.name.trim() || `Raumgruppe ${index + 1}`;
    const area = read(group.area, `${group.id}-area`, `${name}, Fläche`);
    const performance = read(group.performance, `${group.id}-performance`, `${name}, Basis` , true);
    const visits = read(group.visits, `${group.id}-visits`, `${name}, Einsätze`, false, true);
    const alternative = input.compare ? read(group.alternative, `${group.id}-alternative`, `${name}, Alternative`, true) : null;
    return { id: group.id, name, area: area ?? 0, performance: performance ?? 0, visits: visits ?? 0, alternative, hours: 0, alternativeHours: null as number | null };
  });
  const extraMinutes = input.extraEnabled ? read(input.extraMinutes, "cleaning-extra-minutes", "Zusätzliche Arbeitsminuten") : 0;
  const extraVisits = input.extraEnabled ? read(input.extraVisits, "cleaning-extra-visits", "Objektbesuche für die Zusatzzeit", false, true) : 0;
  if (errors.length) return { ok: false, errors };

  for (const group of groups) {
    group.hours = group.area / group.performance * group.visits;
    group.alternativeHours = input.compare ? group.area / group.alternative! * group.visits : null;
  }
  const surfaceHours = groups.reduce((sum, group) => sum + group.hours, 0);
  const extraHours = extraMinutes! / 60 * extraVisits!;
  const totalHours = surfaceHours + extraHours;
  const alternativeSurfaceHours = input.compare ? groups.reduce((sum, group) => sum + group.alternativeHours!, 0) : null;
  const alternativeTotalHours = alternativeSurfaceHours === null ? null : alternativeSurfaceHours + extraHours;
  const values = [surfaceHours, extraHours, totalHours, ...(alternativeTotalHours === null ? [] : [alternativeTotalHours])];
  if (values.some((value) => !Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER / 3600)) {
    return { ok: false, errors: [{ field: "cleaning-groups", message: "Mit diesen Zahlen lässt sich kein zuverlässig darstellbares Ergebnis berechnen. Bitte Eingaben und Einheiten prüfen." }] };
  }
  return { ok: true, value: {
    period: input.periodDescription.trim() ? `${input.period}: ${input.periodDescription.trim()}` : input.period,
    groups, surfaceHours, extraHours, totalHours, alternativeSurfaceHours, alternativeTotalHours,
    differenceHours: alternativeTotalHours === null ? null : alternativeTotalHours - totalHours,
  } };
}

export function cleaningTimeExample(): CleaningTimeInput {
  return {
    period: "Woche", periodDescription: "Fiktive Woche Montag bis Freitag", compare: true,
    groups: [
      { ...emptyCleaningGroup("example-office"), name: "Büro", area: "600", performance: "300", alternative: "240", visits: "5", scope: "Büroreinigung an Mo, Di, Mi, Do, Fr; gemeinsamer Zusatzblock nicht enthalten.", source: "Fiktiver Lehrwert, kein Branchenbenchmark." },
      { ...emptyCleaningGroup("example-sanitary"), name: "Sanitär", area: "100", performance: "100", alternative: "80", visits: "5", scope: "Sanitärreinigung an Mo, Di, Mi, Do, Fr; gemeinsamer Zusatzblock nicht enthalten.", source: "Fiktiver Lehrwert, kein Branchenbenchmark." },
      { ...emptyCleaningGroup("example-traffic"), name: "Verkehrsflächen", area: "300", performance: "600", alternative: "480", visits: "3", scope: "Verkehrsflächen an Mo, Mi, Fr; gemeinsamer Zusatzblock nicht enthalten.", source: "Fiktiver Lehrwert, kein Branchenbenchmark." },
    ],
    extraEnabled: true, extraMinutes: "20", extraVisits: "5", extraDescription: "Ein gemeinsamer Zusatzblock je Objektbesuch. In keinem Leistungswert enthalten; insgesamt 100 Arbeitsminuten in der Woche.",
  };
}

export function formatCleaningHours(hours: number): string {
  const absolute = Math.abs(hours);
  if (absolute > 0 && absolute < 0.005) return `${hours < 0 ? "−" : ""}< 0,01`;
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(hours);
}

export function formatCleaningDuration(hours: number): string {
  const seconds = Math.round(Math.abs(hours) * 3600);
  if (seconds === 0 && hours !== 0) return `${hours < 0 ? "−" : ""}< 1 s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  return `${hours < 0 ? "−" : ""}${h} h ${m} min${s ? ` ${s} s` : ""}`;
}
