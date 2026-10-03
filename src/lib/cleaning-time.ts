export const CLEANING_TIME_CONTENT_ID = "reinigungszeit-berechnen";
export const CLEANING_TIME_REVISION = 2;
export const CLEANING_TIME_CONTENT_DATE = "2026-10-03";
export const CLEANING_TIME_PUBLISHED_DATE = "2026-10-03";

/** One cleaning only. An empty optional extra field explicitly means no extra time. */
export type CleaningTimeInput = { area: string; performance: string; extraMinutes: string };
export type CleaningTimeResult = { area: number; performance: number; extraMinutes: number; surfaceHours: number; totalHours: number };
export type CleaningTimeError = { field: "area" | "performance" | "extraMinutes" | "result"; message: string };
export type CleaningTimeEvaluation = { ok: true; value: CleaningTimeResult } | { ok: false; errors: CleaningTimeError[] };

export function emptyCleaningTimeInput(): CleaningTimeInput {
  return { area: "", performance: "", extraMinutes: "" };
}

/** Accept German decimal comma; reject ambiguous thousands separators and nonfinite values. */
export function parseCleaningNumber(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(text) || /^\d+\.\d{3}$/.test(text)) return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER ? value : null;
}

export function evaluateCleaningTime(input: CleaningTimeInput): CleaningTimeEvaluation {
  const errors: CleaningTimeError[] = [];
  const area = parseCleaningNumber(input.area);
  const performance = parseCleaningNumber(input.performance);
  const extraMinutes = typeof input.extraMinutes === "string" && input.extraMinutes.trim() === "" ? 0 : parseCleaningNumber(input.extraMinutes);
  if (area === null) errors.push({ field: "area", message: "Fläche ab 0 eingeben, ohne Tausendertrennzeichen: zum Beispiel 600 oder 600,5." });
  if (performance === null || performance <= 0) errors.push({ field: "performance", message: "Eigenen Leistungswert größer als 0 eingeben, zum Beispiel als Dezimalzahl mit Komma." });
  if (extraMinutes === null) errors.push({ field: "extraMinutes", message: "Zusatzminuten ab 0 eingeben oder das optionale Feld leeren." });
  if (errors.length) return { ok: false, errors };
  const surfaceHours = area! / performance!;
  const totalHours = surfaceHours + extraMinutes! / 60;
  if (!Number.isFinite(totalHours) || totalHours > Number.MAX_SAFE_INTEGER / 3600) {
    return { ok: false, errors: [{ field: "result", message: "Diese Zahlen ergeben keinen zuverlässig darstellbaren Wert. Bitte Zahlen und Einheiten prüfen." }] };
  }
  return { ok: true, value: { area: area!, performance: performance!, extraMinutes: extraMinutes!, surfaceHours, totalHours } };
}

export function cleaningTimeExample(): CleaningTimeInput {
  return { area: "600", performance: "300", extraMinutes: "" };
}

export function formatCleaningHours(hours: number): string {
  if (hours > 0 && hours < 0.005) return "< 0,01";
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(hours);
}

export function formatCleaningDuration(hours: number): string {
  const seconds = Math.round(hours * 3600);
  if (seconds === 0) return hours > 0 ? "< 1 s" : "0 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : "", s ? `${s} s` : ""].filter(Boolean).join(" ");
}
