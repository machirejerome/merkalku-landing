/* E-Mail aus Schritt 1 des Kontakt-Gates sichern.
   Seit der Aufteilung des Gates gibt jemand die E-Mail ab, bevor er Name und Nummer einträgt.
   Bricht er danach ab, wäre sie ohne diese Route verloren, obwohl er sie abgeschickt hat, um
   seine Auswertung zu bekommen.

   Der Kontakt wird deshalb hier schon in GoHighLevel angelegt, aber BEWUSST OHNE TAG.
   Der Tag `preisrechner` kommt erst mit dem vollständigen Absenden in preisrechner-lead dazu.
   Zwei Gründe: der Workflow darf nicht auf einem halben Kontakt laufen, und weil der Tag dann
   wirklich neu gesetzt wird, feuert der Auslöser "Tag added" auch zuverlässig.

   Zusätzlich landet die Adresse an der eigenen Sitzung in Neon, zusammen mit den fünf Antworten. */

import { getSql, ensureSchema } from "@/lib/db";

const GHL_BASE = "https://services.leadconnectorhq.com";

const FIELD_IDS = {
  letzterIntentTrigger: "bghok7OmDvqe99FJlzHE",
  ausschreibungenProMonat: "8aJKW3fnzj7dcZkksdqF",
  stundenProAusschreibung: "omyS3OlqCeudYW9N0ehF",
} as const;

const QUELLEN = {
  preisrechner: "Preisrechner merkalku.de (E-Mail, Formular offen)",
  "lp-ausschreibung": "LP Ausschreibung (Ads) merkalku.de (E-Mail, Formular offen)",
} as const;

const MAX_PRO_IP = 10;
const FENSTER_MS = 10 * 60 * 1000;
const treffer = new Map<string, number[]>();

function zuVieleAnfragen(ip: string) {
  if (!ip) return false;
  const jetzt = Date.now();
  const liste = (treffer.get(ip) || []).filter((t) => jetzt - t < FENSTER_MS);
  liste.push(jetzt);
  treffer.set(ip, liste);
  if (treffer.size > 5000) treffer.clear();
  return liste.length > MAX_PRO_IP;
}

let schemaOk = false;

type Nutzlast = {
  sid?: string;
  email?: string;
  quelle?: string;
  seite?: string;
  ausschreibungenProMonat?: number;
  stundenProAusschreibung?: number;
};

/* Legt den Kontakt mit der E-Mail an bzw. findet ihn wieder. Setzt keine Tags. */
async function inGhlAnlegen(data: Nutzlast, email: string, quelle: string | null) {
  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) return;

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };
  const source = (quelle && QUELLEN[quelle as keyof typeof QUELLEN]) || QUELLEN.preisrechner;

  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers,
    body: JSON.stringify({ locationId, email, source }),
  });
  if (!res.ok) {
    console.error("preisrechner-mail: GHL upsert fehlgeschlagen", res.status, await res.text());
    return;
  }
  const contactId = (await res.json())?.contact?.id;
  if (!contactId) return;

  /* Ohne die Antworten wäre der halbe Kontakt eine nackte Adresse. Mit ihnen kann Jérôme
     entscheiden, ob sich ein Nachfassen lohnt. Wird beim vollständigen Absenden überschrieben. */
  const anzahl = Number(data.ausschreibungenProMonat);
  const stunden = Number(data.stundenProAusschreibung);
  const heute = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const customFields: Array<{ id: string; value: string | number }> = [
    {
      id: FIELD_IDS.letzterIntentTrigger,
      value:
        `Preisrechner ${heute}: E-Mail abgegeben, Formular nicht abgeschlossen` +
        (Number.isFinite(anzahl) ? `, ${anzahl} Ausschr./Monat` : "") +
        (Number.isFinite(stunden) ? `, ${stunden} h/Ausschr.` : ""),
    },
  ];
  if (Number.isFinite(anzahl) && anzahl > 0 && anzahl <= 500) {
    customFields.push({ id: FIELD_IDS.ausschreibungenProMonat, value: anzahl });
  }
  if (Number.isFinite(stunden) && stunden > 0 && stunden <= 40) {
    customFields.push({ id: FIELD_IDS.stundenProAusschreibung, value: stunden });
  }

  const feldRes = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ customFields }),
  });
  if (!feldRes.ok) {
    console.error("preisrechner-mail: Felder fehlgeschlagen", feldRes.status, await feldRes.text());
  }
}

export async function POST(request: Request) {
  let data: Nutzlast;
  try {
    data = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const sid = typeof data.sid === "string" ? data.sid.slice(0, 40) : "";
  const email = (typeof data.email === "string" ? data.email : "").trim().toLowerCase().slice(0, 200);
  const quelle = typeof data.quelle === "string" ? data.quelle.slice(0, 40) : null;
  const pfad = typeof data.seite === "string" ? data.seite.slice(0, 200) : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return new Response(null, { status: 204 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 45);
  if (zuVieleAnfragen(ip)) return new Response(null, { status: 204 });

  try {
    await inGhlAnlegen(data, email, quelle);
  } catch (err) {
    console.error("preisrechner-mail: GHL nicht erreichbar", err);
  }

  const sql = getSql();
  if (!sql || !sid) {
    console.log(JSON.stringify({ funnel: "gate_mail_gespeichert", sid, email, quelle, t: new Date().toISOString() }));
    return new Response(null, { status: 204 });
  }

  try {
    if (!schemaOk) {
      await ensureSchema(sql);
      schemaOk = true;
    }
    await sql`
      INSERT INTO rechner_sessions (sid, quelle, pfad, email, email_am, schritt_max, gate_erreicht)
      VALUES (${sid}, ${quelle}, ${pfad}, ${email}, now(), 5, true)
      ON CONFLICT (sid) DO UPDATE SET
        email = EXCLUDED.email,
        email_am = now(),
        quelle = COALESCE(rechner_sessions.quelle, EXCLUDED.quelle),
        gate_erreicht = true,
        aktualisiert_am = now()`;
  } catch (err) {
    console.error("preisrechner-mail: Schreiben fehlgeschlagen", err);
  }
  return new Response(null, { status: 204 });
}
