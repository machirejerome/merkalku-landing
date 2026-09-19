/* Datenbank-Anbindung (Neon Postgres über den Vercel Marketplace). Ohne DATABASE_URL läuft die
   Seite unverändert weiter, die Funnel-Daten landen dann nur als Log-Zeile in den Vercel Logs.
   Zweck: jeden Rechner-Durchlauf speichern, auch wenn das Formular nie abgeschickt wird.
   Gespeichert werden die fünf Antworten, Herkunft (utm) und der erreichte Schritt. Dazu die
   E-Mail, sobald sie in Schritt 1 des Gates abgeschickt wurde: sie ist die einzige Chance,
   jemandem seine Auswertung noch zu schicken, der in Schritt 2 abbricht. Name und Nummer
   werden nie vor dem Absenden gespeichert, die gehen erst mit dem Absenden nach GoHighLevel;
   hier bleibt dann die GHL-Kontakt-ID als Verbindung. */

import { neon } from "@neondatabase/serverless";

export type Sql = ReturnType<typeof neon>;

let cached: Sql | null | undefined;

export function getSql(): Sql | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  cached = url ? neon(url) : null;
  return cached;
}

/* Tabellen anlegen (idempotent). Wird von scripts/setup-db.js aufgerufen und zur Sicherheit
   auch beim ersten Schreibzugriff, falls das Script noch nicht lief. */
export async function ensureSchema(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS rechner_sessions (
      sid              text PRIMARY KEY,
      quelle           text,
      variante         text,
      pfad             text,
      utm              jsonb,
      schritt_max      int  NOT NULL DEFAULT 0,
      anzahl           numeric,
      stunden          numeric,
      liegen_gelassen  text,
      wer              text,
      tool             text,
      gate_erreicht    boolean NOT NULL DEFAULT false,
      abgeschickt      boolean NOT NULL DEFAULT false,
      ghl_contact_id   text,
      ersparnis_eur    numeric,
      whatsapp_ok      boolean,
      verworfen        text,
      user_agent       text,
      erstellt_am      timestamptz NOT NULL DEFAULT now(),
      aktualisiert_am  timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS funnel_events (
      id        bigserial PRIMARY KEY,
      sid       text,
      event     text NOT NULL,
      schritt   int,
      quelle    text,
      variante  text,
      herkunft  text,
      pfad      text,
      wert      numeric,
      t         timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`ALTER TABLE rechner_sessions ADD COLUMN IF NOT EXISTS verworfen text`;
  /* E-Mail aus Gate-Schritt 1, auch wenn Schritt 2 nie kam */
  await sql`ALTER TABLE rechner_sessions ADD COLUMN IF NOT EXISTS email text`;
  await sql`ALTER TABLE rechner_sessions ADD COLUMN IF NOT EXISTS email_am timestamptz`;
  await sql`CREATE INDEX IF NOT EXISTS funnel_events_sid_idx ON funnel_events (sid)`;
  await sql`CREATE INDEX IF NOT EXISTS rechner_sessions_erstellt_idx ON rechner_sessions (erstellt_am DESC)`;
}
