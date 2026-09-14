/* Export der Rechner-Durchläufe als CSV (Excel-tauglich, Semikolon, UTF-8 mit BOM).
   Aufruf: https://www.merkalku.de/api/funnel-export?key=<FUNNEL_EXPORT_KEY>&tage=30
   Geschützt über die Umgebungsvariable FUNNEL_EXPORT_KEY; ohne sie ist die Adresse tot (404).
   Enthält keine Kontaktdaten: bei abgeschickten Durchläufen nur die GoHighLevel-Kontakt-ID. */

import { getSql } from "@/lib/db";

const SPALTEN = [
  "sid", "erstellt_am", "aktualisiert_am", "quelle", "variante", "utm_source", "utm_campaign", "utm_content", "oppref",
  "schritt_max", "gate_erreicht", "abgeschickt", "anzahl", "stunden", "liegen_gelassen", "wer", "tool",
  "ersparnis_eur", "whatsapp_ok", "verworfen", "ghl_contact_id", "user_agent",
];

function csvZelle(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const key = process.env.FUNNEL_EXPORT_KEY;
  const url = new URL(request.url);
  if (!key || url.searchParams.get("key") !== key) return new Response("Not found", { status: 404 });

  const sql = getSql();
  if (!sql) return new Response("Keine Datenbank verbunden (DATABASE_URL fehlt).", { status: 503 });

  const tage = Math.min(365, Math.max(1, Number(url.searchParams.get("tage")) || 90));
  const rows = (await sql`
    SELECT sid, erstellt_am, aktualisiert_am, quelle, variante,
           utm->>'utm_source' AS utm_source, utm->>'utm_campaign' AS utm_campaign, utm->>'utm_content' AS utm_content, utm->>'oppref' AS oppref,
           schritt_max, gate_erreicht, abgeschickt, anzahl, stunden, liegen_gelassen, wer, tool,
           ersparnis_eur, whatsapp_ok, verworfen, ghl_contact_id, user_agent
    FROM rechner_sessions
    WHERE erstellt_am > now() - (${tage} || ' days')::interval
    ORDER BY erstellt_am DESC`) as Record<string, unknown>[];

  const zeilen = [SPALTEN.join(";"), ...rows.map((r) => SPALTEN.map((c) => csvZelle(r[c])).join(";"))];
  const datum = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + zeilen.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rechner-durchlaeufe-${datum}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
