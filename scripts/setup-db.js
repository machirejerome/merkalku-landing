/* Legt die Tabellen für Funnel-Daten in Neon Postgres an. Einmalig ausführen, nachdem
   DATABASE_URL in .env.local (lokal) bzw. in den Vercel-Umgebungsvariablen steht:
   node scripts/setup-db.js */
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}
loadEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL fehlt (.env.local). In Vercel: Storage → Neon Postgres verbinden, dann `vercel env pull` oder den Wert kopieren.");
  process.exit(1);
}

(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS rechner_sessions (
      sid text PRIMARY KEY, quelle text, variante text, pfad text, utm jsonb,
      schritt_max int NOT NULL DEFAULT 0, anzahl numeric, stunden numeric, liegen_gelassen text, wer text, tool text,
      gate_erreicht boolean NOT NULL DEFAULT false, abgeschickt boolean NOT NULL DEFAULT false,
      ghl_contact_id text, ersparnis_eur numeric, whatsapp_ok boolean, user_agent text,
      erstellt_am timestamptz NOT NULL DEFAULT now(), aktualisiert_am timestamptz NOT NULL DEFAULT now())`;
  await sql`
    CREATE TABLE IF NOT EXISTS funnel_events (
      id bigserial PRIMARY KEY, sid text, event text NOT NULL, schritt int, quelle text, variante text,
      herkunft text, pfad text, wert numeric, t timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE INDEX IF NOT EXISTS funnel_events_sid_idx ON funnel_events (sid)`;
  await sql`CREATE INDEX IF NOT EXISTS rechner_sessions_erstellt_idx ON rechner_sessions (erstellt_am DESC)`;
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM rechner_sessions`;
  console.log(`✓ Tabellen vorhanden. rechner_sessions: ${count} Zeilen`);
})().catch((e) => {
  console.error("Fehler:", e.message);
  process.exit(1);
});
