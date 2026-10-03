/** Fixed event and source identifiers only; editable worksheet values never cross this boundary. */
const definitions: Record<string, { events: string[]; sources: string[] }> = {
  "ausschreibung-gebaeudereinigung-pruefen": { events: ["checklist_edit_started", "checklist_print_clicked"], sources: ["ted_fields", "ral_vergabe"] },
  "reinigungszeit-berechnen": { events: ["cleaning_time_calculated", "cleaning_time_scenario_compared", "cleaning_time_example_loaded", "cleaning_time_print_clicked"], sources: ["ral_wissen"] },
  "excel-preisblatt-pruefen": { events: ["price_sheet_example_changed", "price_sheet_print_clicked"], sources: ["excel_errors", "excel_recalculation"] },
};
export const CONTENT_EVENTS = new Set(["source_click", "content_product_click", ...Object.values(definitions).flatMap(d => d.events)]);
export const CONTENT_PATHS = new Set(["/wissen", ...Object.keys(definitions).map(id => `/wissen/${id}`)]);
export function sanitizeContentEvent(name: string, params: Record<string, unknown>, path?: string): Record<string, string | number> | null {
  if (!CONTENT_EVENTS.has(name)) return null;
  const candidate = path?.startsWith("/wissen/") ? path.slice(8) : params.content_id;
  const id = typeof candidate === "string" && Object.hasOwn(definitions, candidate) ? candidate : "ausschreibung-gebaeudereinigung-pruefen";
  const definition = definitions[id];
  if (name !== "source_click" && name !== "content_product_click" && !definition.events.includes(name)) return null;
  const clean: Record<string, string | number> = { content_id: id, revision: 1 };
  if (name === "source_click" && typeof params.source_id === "string" && definition.sources.includes(params.source_id)) clean.source_id = params.source_id;
  return clean;
}
