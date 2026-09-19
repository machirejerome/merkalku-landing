/* E-Mail aus Schritt 1 des Kontakt-Gates sichern.
   Seit der Aufteilung des Gates gibt jemand die E-Mail ab, bevor er Name und Nummer einträgt.
   Bricht er danach ab, wäre sie ohne diese Route verloren, obwohl er sie abgeschickt hat, um
   seine Auswertung zu bekommen. Genau dafür wird sie hier gespeichert, an der Sitzung, in der
   auch seine fünf Antworten stehen.

   Bewusst NICHT: kein GoHighLevel. Ein halber Kontakt ohne Name und Nummer würde den
   Workflow auslösen und eine neue Sorte unvollständiger Leads in die Pipeline spülen.
   Der vollständige Lead geht weiterhin erst beim Absenden über /api/preisrechner-lead raus. */

import { getSql, ensureSchema } from "@/lib/db";

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

export async function POST(request: Request) {
  let data: { sid?: string; email?: string; quelle?: string; seite?: string };
  try {
    data = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const sid = typeof data.sid === "string" ? data.sid.slice(0, 40) : "";
  const email = (typeof data.email === "string" ? data.email : "").trim().toLowerCase().slice(0, 200);
  const quelle = typeof data.quelle === "string" ? data.quelle.slice(0, 40) : null;
  const pfad = typeof data.seite === "string" ? data.seite.slice(0, 200) : null;

  /* Ohne Sitzung gäbe es nichts, woran die Adresse hängt: dann lieber gar nicht speichern */
  if (!sid || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return new Response(null, { status: 204 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 45);
  if (zuVieleAnfragen(ip)) return new Response(null, { status: 204 });

  const sql = getSql();
  if (!sql) {
    /* Ohne Datenbank wenigstens eine Log-Zeile, damit die Adresse nicht spurlos verschwindet */
    console.log(JSON.stringify({ funnel: "gate_mail_gespeichert", sid, email, quelle, t: new Date().toISOString() }));
    return new Response(null, { status: 204 });
  }

  try {
    if (!schemaOk) {
      await ensureSchema(sql);
      schemaOk = true;
    }
    /* Die Zeile gibt es meist schon aus den Antwort-Ereignissen, sicherheitshalber anlegen.
       Eine einmal gesetzte Adresse wird nicht überschrieben, falls jemand zurückgeht und ändert:
       COALESCE hielte die alte fest, deshalb bewusst die neuere nehmen. */
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
