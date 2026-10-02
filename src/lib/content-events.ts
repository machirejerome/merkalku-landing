/** Shared browser/server boundary: content actions never carry editable worksheet fields. */
export const CONTENT_EVENTS = new Set(["checklist_edit_started", "checklist_print_clicked", "source_click", "content_product_click"]);
export const CONTENT_PATHS = new Set(["/wissen", "/wissen/ausschreibung-gebaeudereinigung-pruefen"]);

export function sanitizeContentEvent(name: string, params: Record<string, unknown>): Record<string, string | number> | null {
  if (!CONTENT_EVENTS.has(name)) return null;
  const clean: Record<string, string | number> = { content_id: "ausschreibung-gebaeudereinigung-pruefen", revision: 1 };
  if (name === "source_click" && (params.source_id === "ted_fields" || params.source_id === "ral_vergabe")) clean.source_id = params.source_id;
  return clean;
}
