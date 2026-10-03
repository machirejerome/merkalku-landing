import { createHash } from "node:crypto";
import type { PublicCandidate, PerformanceLocation } from "./eligibility";

/** Intentionally narrow initial pilot. Complex change/result chains require a later reviewed resolver. */
export const TED_FIELDS = ["publication-number", "notice-identifier", "notice-version", "procedure-identifier", "form-type", "notice-type", "competition-termination-proc", "procurement-relaunch-proc", "change-notice-version-identifier", "previous-notice-id-proc", "winner-selection-status", "non-award-justification"] as const;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const DETAIL = /^https:\/\/ted\.europa\.eu\/(?:de|en)\/notice\/-\/detail\/(\d{1,7}-20\d{2})$/;
const CLEANING_CPV: Record<string, string> = { "90911200": "Gebäudereinigung", "90911300": "Fensterreinigung", "90919200": "Büroreinigung", "90919300": "Schulreinigung" };
export type TedSeed = { publicationNumber: string; noticeIdentifier: string; procedureIdentifier: string };
export type TedMeta = Record<string, unknown>;
export type TedLot = { id: string; title: string; cpv: string; locations: { postcode: string; city: string; country: string }[]; tenderDates: string[]; tenderTimes: string[]; requestDates: string[]; requestTimes: string[] };
export type TedXml = { noticeIdentifier: string; version: string; procedureIdentifier: string; formType: string; noticeType: string; procedureType: string; rootType: string; hasChangeOrClosure: boolean; lots: TedLot[] };
export type Geodata = { sourceUrl: string; sourceArchiveSha256: string; license: { url: string; attribution: string }; performancePlaces: { postcode: string; city: string; lat: number; lon: number; sourceAccuracy: number | null }[] };
function fail(code: string): never { throw new Error(code); }
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const nonempty = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const version = (v: unknown): string => typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v < 10000 ? String(v).padStart(2, "0") : typeof v === "string" && /^\d{1,4}$/.test(v) && Number(v) > 0 ? String(Number(v)).padStart(2, "0") : fail("invalid_version");
export function parseTedSeeds(input: unknown): TedSeed[] {
  const v = input as { schemaVersion?: unknown; kind?: unknown; candidates?: unknown };
  if (!v || v.schemaVersion !== 1 || v.kind !== "supabase_ted_seed_export" || !Array.isArray(v.candidates) || v.candidates.length > 500) fail("invalid_seed_export");
  const seeds = v.candidates.map((row: Record<string, unknown>) => {
    if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).sort().join(",") !== "external_id,procedure_identifier,source_portal,source_url") fail("unsafe_seed_fields");
    if (row.source_portal !== "ted" || typeof row.source_url !== "string" || !DETAIL.test(row.source_url) || typeof row.external_id !== "string" || !UUID.test(row.external_id) || typeof row.procedure_identifier !== "string" || !UUID.test(row.procedure_identifier)) fail("invalid_seed_identity");
    return { publicationNumber: DETAIL.exec(row.source_url)![1], noticeIdentifier: row.external_id, procedureIdentifier: row.procedure_identifier };
  });
  if (new Set(seeds.map((s) => s.publicationNumber)).size !== seeds.length) fail("duplicate_seeds");
  return seeds;
}

/** No partial pages, hidden continuation, or timeout can establish a current procedure. */
export function completeSearch(value: unknown): TedMeta[] {
  const data = value as { notices?: unknown; totalNoticeCount?: unknown; iterationNextToken?: unknown; timedOut?: unknown };
  if (!data || data.timedOut !== false || !Array.isArray(data.notices) || !Number.isInteger(data.totalNoticeCount) || data.totalNoticeCount !== data.notices.length || data.notices.length > 100 || (data.iterationNextToken !== null && data.iterationNextToken !== undefined)) fail("incomplete_ted_search");
  return data.notices.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) fail("invalid_ted_metadata");
    return Object.fromEntries(TED_FIELDS.filter((key) => Object.hasOwn(row, key)).map((key) => [key, row[key]]));
  });
}
export function assertSimpleCurrent(seed: TedSeed, publication: TedMeta[], procedure: TedMeta[], versions: TedMeta[], referring: TedMeta[]): TedMeta {
  if (publication.length !== 1 || procedure.length !== 1 || versions.length !== 1 || referring.length !== 0) fail("complex_or_changed_procedure");
  for (const meta of [publication[0], procedure[0], versions[0]]) {
    if (meta["publication-number"] !== seed.publicationNumber || meta["notice-identifier"] !== seed.noticeIdentifier || meta["procedure-identifier"] !== seed.procedureIdentifier || meta["form-type"] !== "competition" || meta["notice-type"] !== "cn-standard" || meta["competition-termination-proc"] !== false || meta["procurement-relaunch-proc"] !== false) fail("not_current_open_competition");
    for (const key of ["change-notice-version-identifier", "previous-notice-id-proc", "winner-selection-status", "non-award-justification"]) {
      if (meta[key] !== undefined && meta[key] !== null && !(Array.isArray(meta[key]) && meta[key].length === 0)) fail("unresolved_change_or_result");
    }
    if (version(meta["notice-version"]) !== version(publication[0]["notice-version"])) fail("source_version_conflict");
  }
  return publication[0];
}
export function canonicalUnitId(procedure: string, lot: string): string {
  if (!UUID.test(procedure) || !/^LOT-\d{4}$/.test(lot)) fail("invalid_canonical_unit");
  return `ted:${procedure}:${lot}`;
}
export function exactDeadline(lot: TedLot): PublicCandidate["deadline"] {
  const tender = lot.tenderDates.length + lot.tenderTimes.length;
  const request = lot.requestDates.length + lot.requestTimes.length;
  if ((tender && request) || (!tender && !request)) fail("ambiguous_deadline_kind");
  const dates = tender ? lot.tenderDates : lot.requestDates;
  const times = tender ? lot.tenderTimes : lot.requestTimes;
  if (dates.length !== 1 || times.length !== 1) fail("missing_or_multiple_deadlines");
  const date = /^(\d{4})-(\d{2})-(\d{2})(Z|[+-]\d{2}:\d{2})?$/.exec(dates[0]);
  const time = /^(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/.exec(times[0]);
  if (!date || !time || (date[4] && date[4] !== time[4])) fail("missing_or_conflicting_timezone");
  const [year, month, day, hour, minute, second] = [Number(date[1]), Number(date[2]), Number(date[3]), Number(time[1]), Number(time[2]), Number(time[3])];
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) fail("invalid_deadline_components");
  const zone = time[4];
  if (zone !== "Z" && (Number(zone.slice(1, 3)) > 14 || Number(zone.slice(4)) > 59 || (Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4)) !== 0))) fail("invalid_timezone");
  const at = `${date[1]}-${date[2]}-${date[3]}T${time[1]}:${time[2]}:${time[3]}${zone}`;
  if (!Number.isFinite(Date.parse(at))) fail("invalid_deadline");
  return { kind: tender ? "tender" : "request", at, accuracy: "source_explicit_datetime", sourceVerified: true, timezoneKnown: true };
}
const normalizeCity = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
export function validateGeodata(input: unknown): Geodata {
  const geo = input as Geodata;
  if (!geo || geo.sourceUrl !== "https://download.geonames.org/export/zip/DE.zip" || !/^[a-f0-9]{64}$/.test(geo.sourceArchiveSha256) || geo.license?.url !== "https://creativecommons.org/licenses/by/4.0/" || !nonempty(geo.license.attribution, 1000) || !Array.isArray(geo.performancePlaces) || !geo.performancePlaces.length || geo.performancePlaces.length > 100000) fail("unverified_geodata");
  return geo;
}
function performanceLocations(lot: TedLot, geo: Geodata): PerformanceLocation[] {
  if (!Array.isArray(lot.locations) || !lot.locations.length || lot.locations.length > 20) fail("missing_performance_locations");
  return lot.locations.map((location) => {
    if (location.country !== "DEU" || !/^\d{5}$/.test(location.postcode) || !nonempty(location.city, 120)) fail("invalid_performance_location");
    const matches = geo.performancePlaces.filter((p) => p.postcode === location.postcode && nonempty(p.city, 120) && normalizeCity(p.city) === normalizeCity(location.city));
    const unique = new Map(matches.map((p) => [`${p.lat}:${p.lon}`, p]));
    if (unique.size !== 1) fail("unresolved_performance_georeference");
    const point = [...unique.values()][0];
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180 || typeof point.sourceAccuracy !== "number" || point.sourceAccuracy < 4 || point.sourceAccuracy > 6) fail("insufficient_georeference");
    return { lat: point.lat, lon: point.lon, label: `${location.postcode} ${location.city}`, role: "performance", provenanceVerified: true, accuracy: "verified_performance_postcode_reference" };
  });
}
export function candidatesFromVerifiedSource(seed: TedSeed, meta: TedMeta, xml: TedXml, geo: Geodata, checkedAt: string, evidenceSha256: string): { candidates: PublicCandidate[]; rejected: { canonicalUnitId: string; reason: string }[] } {
  const checked = Date.parse(checkedAt);
  if (!Number.isFinite(checked) || !/^[a-f0-9]{64}$/.test(evidenceSha256)) fail("invalid_evidence");
  if (xml.rootType !== "ContractNotice" || xml.noticeIdentifier !== seed.noticeIdentifier || xml.procedureIdentifier !== seed.procedureIdentifier || version(xml.version) !== version(meta["notice-version"]) || xml.formType !== "competition" || xml.noticeType !== "cn-standard" || xml.procedureType !== "open" || xml.hasChangeOrClosure !== false) fail("xml_metadata_or_lifecycle_conflict");
  if (!Array.isArray(xml.lots) || !xml.lots.length || xml.lots.length > 20 || new Set(xml.lots.map((l) => l.id)).size !== xml.lots.length) fail("invalid_lot_mapping");
  const candidates: PublicCandidate[] = [], rejected: { canonicalUnitId: string; reason: string }[] = [];
  for (const lot of xml.lots) {
    const id = canonicalUnitId(seed.procedureIdentifier, lot.id);
    try {
      if (!nonempty(lot.title, 240) || !Object.hasOwn(CLEANING_CPV, lot.cpv)) fail("unsupported_title_or_cleaning_cpv");
      const deadline = exactDeadline(lot), due = Date.parse(deadline.at);
      if (deadline.kind !== "tender") fail("unsupported_open_request_deadline");
      if (due <= checked) fail("deadline_expired");
      const locations = performanceLocations(lot, geo);
      const ttl = due - checked <= 48 * 3600_000 ? 3600_000 : 24 * 3600_000;
      candidates.push({ publicId: `ted_${hash(id).slice(0, 40)}`, canonicalUnitId: id, version: `${seed.noticeIdentifier}-${version(xml.version)}`, title: lot.title, serviceLabel: CLEANING_CPV[lot.cpv], sourceId: "ted", sourceUrl: `https://ted.europa.eu/de/notice/-/detail/${seed.publicationNumber}`, publicProvenance: true, redistributionApproved: true, cleaningRelevanceApproved: true, noticeFormType: "competition", lifecycle: "open", isCurrentVersion: true, unresolvedChangeOrClosure: false, deadline, sourceStatusCheckedAt: checkedAt, sourceEvidenceDigest: `sha256:${evidenceSha256}`, eligibilityExpiresAt: new Date(Math.min(due, checked + ttl)).toISOString(), revoked: false, locations });
    } catch (error) { rejected.push({ canonicalUnitId: id, reason: error instanceof Error ? error.message : "ineligible_lot" }); }
  }
  return { candidates, rejected };
}
export function priorUnits(input: unknown): string[] {
  const value = input as { candidates?: unknown };
  if (!value || !Array.isArray(value.candidates) || value.candidates.length > 1000) fail("invalid_previous_batch");
  return value.candidates.map((row) => {
    if (!row || typeof row.canonicalUnitId !== "string") fail("invalid_previous_unit");
    const match = /^ted:([a-f0-9-]{36}):(LOT-\d{4})$/.exec(row.canonicalUnitId);
    if (!match) fail("invalid_previous_ted_unit");
    return canonicalUnitId(match[1], match[2]);
  });
}
