/* Cookieloser Funnel-Zähler. Nimmt Ereignisse aus tracking.ts entgegen und speichert sie in
   Neon Postgres (DATABASE_URL). Ohne Datenbank: strukturierte Log-Zeile in den Vercel Logs.
   Es werden nie Namen, E-Mails oder Nummern angenommen; die Sitzungs-ID lebt nur im Speicher
   der geöffneten Seite (kein Cookie, kein Web-Storage). */

import { getSql, ensureSchema } from "@/lib/db";

const ERLAUBT = new Set([
  "lp_ausschreibung_view", "rechner_schritt", "rechner_stand", "generate_lead", "cta_zum_rechner",
  "kalender_geoeffnet", "kalender_link", "whatsapp_geoeffnet", "video_gestartet", "tel_klick", "rechner_sichtbar",
]);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

let schemaOk = false;

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }
  const e = typeof data.e === "string" ? data.e : "";
  if (!ERLAUBT.has(e)) return new Response(null, { status: 204 });

  const sid = str(data.sid, 40);
  const zeile = {
    funnel: e,
    sid,
    schritt: num(data.schritt),
    quelle: str(data.quelle, 40),
    herkunft: str(data.herkunft, 40),
    variante: str(data.v, 20),
    pfad: str(data.p, 60),
    wert: num(data.value),
    /* Rechner-Antworten (nur bei rechner_stand gefüllt), keine Kontaktdaten */
    anzahl: num(data.anzahl),
    stunden: num(data.stunden),
    liegen: str(data.liegen, 40),
    wer: str(data.wer, 40),
    tool: str(data.tool, 40),
    ua: (request.headers.get("user-agent") || "").slice(0, 120),
    t: new Date().toISOString(),
  };

  const sql = getSql();
  if (!sql) {
    console.log(JSON.stringify(zeile));
    return new Response(null, { status: 204 });
  }

  try {
    if (!schemaOk) {
      await ensureSchema(sql);
      schemaOk = true;
    }
    await sql`INSERT INTO funnel_events (sid, event, schritt, quelle, variante, herkunft, pfad, wert)
              VALUES (${sid}, ${e}, ${zeile.schritt}, ${zeile.quelle}, ${zeile.variante}, ${zeile.herkunft}, ${zeile.pfad}, ${zeile.wert})`;

    if (sid) {
      const utm = data.utm && typeof data.utm === "object" ? (data.utm as Record<string, unknown>) : null;
      if (e === "lp_ausschreibung_view" || e === "rechner_stand") {
        /* Sitzung anlegen bzw. Stand der Antworten fortschreiben (nur die fünf Rechner-Antworten) */
        await sql`INSERT INTO rechner_sessions (sid, quelle, variante, pfad, utm, user_agent, schritt_max, anzahl, stunden, liegen_gelassen, wer, tool, gate_erreicht)
                  VALUES (${sid}, ${zeile.quelle}, ${zeile.variante}, ${zeile.pfad}, ${utm ? JSON.stringify(utm) : null}, ${zeile.ua},
                          ${num(data.schritt) ?? 0}, ${num(data.anzahl)}, ${num(data.stunden)}, ${str(data.liegen, 40)}, ${str(data.wer, 40)}, ${str(data.tool, 40)},
                          ${(num(data.schritt) ?? 0) >= 5})
                  ON CONFLICT (sid) DO UPDATE SET
                    quelle = COALESCE(EXCLUDED.quelle, rechner_sessions.quelle),
                    variante = COALESCE(EXCLUDED.variante, rechner_sessions.variante),
                    utm = COALESCE(EXCLUDED.utm, rechner_sessions.utm),
                    schritt_max = GREATEST(rechner_sessions.schritt_max, EXCLUDED.schritt_max),
                    anzahl = COALESCE(EXCLUDED.anzahl, rechner_sessions.anzahl),
                    stunden = COALESCE(EXCLUDED.stunden, rechner_sessions.stunden),
                    liegen_gelassen = COALESCE(EXCLUDED.liegen_gelassen, rechner_sessions.liegen_gelassen),
                    wer = COALESCE(EXCLUDED.wer, rechner_sessions.wer),
                    tool = COALESCE(EXCLUDED.tool, rechner_sessions.tool),
                    gate_erreicht = rechner_sessions.gate_erreicht OR EXCLUDED.gate_erreicht,
                    aktualisiert_am = now()`;
      } else if (e === "rechner_schritt") {
        await sql`UPDATE rechner_sessions SET schritt_max = GREATEST(schritt_max, ${num(data.schritt) ?? 0}),
                  gate_erreicht = gate_erreicht OR ${(num(data.schritt) ?? 0) >= 5}, aktualisiert_am = now() WHERE sid = ${sid}`;
      }
    }
  } catch (err) {
    console.warn("funnel-event: DB-Schreiben fehlgeschlagen", err);
    console.log(JSON.stringify(zeile));
  }
  return new Response(null, { status: 204 });
}
