import { PRICING, berechneErsparnis } from "@/lib/pricing-config";
import { getSql, ensureSchema } from "@/lib/db";

/* Stille Verwerfung (Honeypot, Mindestzeit) in der eigenen Datenbank festhalten, damit ein
   geschluckter Lead nie unsichtbar bleibt. Der Absender sieht trotzdem sein Ergebnis. */
async function markiereVerworfen(sid: string | undefined, grund: string) {
  const sql = getSql();
  if (!sql || !sid) return;
  try {
    await ensureSchema(sql);
    await sql`INSERT INTO rechner_sessions (sid, verworfen, gate_erreicht, schritt_max) VALUES (${sid.slice(0, 40)}, ${grund}, true, 5)
              ON CONFLICT (sid) DO UPDATE SET verworfen = EXCLUDED.verworfen, gate_erreicht = true, aktualisiert_am = now()`;
  } catch (err) {
    console.warn("preisrechner-lead: Verwerfung nicht markiert", err);
  }
}

/* Nach dem Absenden: Durchlauf in der eigenen Datenbank als abgeschickt markieren (nur Kontakt-ID, keine Kontaktdaten) */
async function markiereAbgeschickt(args: { sid?: string; contactId: string; ersparnisEur: number; whatsappOk: boolean; quelle: string }) {
  const sql = getSql();
  if (!sql || !args.sid) return;
  try {
    await ensureSchema(sql);
    await sql`INSERT INTO rechner_sessions (sid, quelle, abgeschickt, ghl_contact_id, ersparnis_eur, whatsapp_ok, gate_erreicht, schritt_max)
              VALUES (${args.sid.slice(0, 40)}, ${args.quelle}, true, ${args.contactId}, ${args.ersparnisEur}, ${args.whatsappOk}, true, 6)
              ON CONFLICT (sid) DO UPDATE SET abgeschickt = true, ghl_contact_id = EXCLUDED.ghl_contact_id,
                ersparnis_eur = EXCLUDED.ersparnis_eur, whatsapp_ok = EXCLUDED.whatsapp_ok, gate_erreicht = true,
                schritt_max = GREATEST(rechner_sessions.schritt_max, 6), aktualisiert_am = now()`;
  } catch (err) {
    console.warn("preisrechner-lead: Sitzung nicht markiert", err);
  }
}

const GHL_BASE = "https://services.leadconnectorhq.com";

const KALKULATION_WER = ["Inhaber selbst", "Kalkulator", "Büro", "Extern"];
const KALKULATION_TOOL = ["Excel", "Software", "Papier und Erfahrung"];
const LIEGEN_OPTIONEN = ["Keine", "1–2 pro Monat", "3–5 pro Monat", "mehr als 5"];

/* GHL-Custom-Field-IDs (Location sRRsx7vsmU8JNdRtaxx0) — per ID referenziert,
   weil der Upsert key-basierte Felder stillschweigend verwirft */
const FIELD_IDS = {
  kontaktQuelle: "J4VXDUlGMNoZ1IVCEK5V",
  originCohort: "OmzbyXbbmPVf3PRCCEXj",
  pipelineStage: "RegGtKgF7uPWjSDsoSqZ",
  aktuelleTemperatur: "fdCWFLyG3LyGuLKrqFDq",
  letzterIntentTrigger: "bghok7OmDvqe99FJlzHE",
  ausschreibungenProMonat: "8aJKW3fnzj7dcZkksdqF",
  stundenProAusschreibung: "omyS3OlqCeudYW9N0ehF",
  kalkulationWer: "IUKM3BnZGFBh22IloCcf",
  kalkulationTool: "awaZWlCDSv7dJfVFkDqe",
  ersparnisProMonatEur: "a1IgBBTUOURUG1ECncv3",
  liegenGelassen: "9BU3bSe5a9Mt446ikmG1",
  whatsappEinwilligung: "q2ke7iDrbtLdDzKZPajK",
  anzeigenHerkunft: "7Wmn06i2tyQkPa7D9hD0",
} as const;

type LeadPayload = {
  name?: string;
  firma?: string;
  email?: string;
  phone?: string;
  ausschreibungenProMonat?: number;
  stundenProAusschreibung?: number;
  liegenGelassen?: string;
  kalkulationWer?: string;
  kalkulationTool?: string;
  zusatz?: string; // Honeypot – muss leer bleiben
  /* Herkunft: "preisrechner" (Standard, /preisrechner) oder "lp-ausschreibung" (Ads-Landingpage) */
  quelle?: string;
  /* Anzeigen-Parameter, clientseitig beim ersten Seitenaufruf erfasst (utm_*, oppref, v, ref) */
  utm?: Record<string, string>;
  /* "Weiß ich nicht genau" bei den liegen gelassenen Ausschreibungen */
  liegenUnklar?: boolean;
  /* WhatsApp-Einwilligung (UWG § 7): eigener Haken, Wortlaut versioniert im Rechner */
  whatsappEinwilligung?: boolean;
  whatsappEinwilligungVersion?: string;
  /* Seite, auf der das Formular stand (Nachweis der Einwilligung) */
  seite?: string;
  /* Zeitstempel (ms), ab dem das Gate sichtbar war: Bots füllen in Sekunden */
  t0?: number;
  /* Sitzungs-ID des Funnel-Zählers (nur im Speicher der Seite), verbindet Durchlauf und Lead */
  sid?: string;
};

/* Junk-Schutz: eine neue Anzeigenplattform bringt einen unbekannten Bot-Anteil, und jeder Fake-Lead
   löst eine WhatsApp an eine fremde Nummer aus. Deshalb: Mindestzeit im Gate, Nummern-Plausibilität
   für DE/AT/CH, Rate-Limit je IP (best effort im Prozess, auf Vercel je Instanz). */
/* Gemessen ab der ersten Rechner-Antwort (nicht ab dem Formular): unter 5 Sekunden für 5 Fragen
   plus 4 Felder schafft kein Mensch, auch nicht mit Autofill */
const MINDESTZEIT_MS = 5000;
const RATE_FENSTER_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const rateMap = new Map<string, number[]>();
function rateLimitiert(ip: string): boolean {
  if (!ip) return false;
  const jetzt = Date.now();
  const liste = (rateMap.get(ip) || []).filter((t) => jetzt - t < RATE_FENSTER_MS);
  liste.push(jetzt);
  rateMap.set(ip, liste);
  if (rateMap.size > 5000) rateMap.clear();
  return liste.length > RATE_MAX;
}

/* Plausibilität: Landesvorwahl DE/AT/CH und 8 bis 13 Ziffern danach */
function telefonPlausibel(e164: string): boolean {
  const m = /^\+(49|43|41)(\d{8,13})$/.exec(e164);
  return !!m;
}

const QUELLEN = {
  preisrechner: { kontaktQuelle: "Inbound_Organic", source: "Preisrechner merkalku.de", tags: ["preisrechner"] },
  "lp-ausschreibung": { kontaktQuelle: "Ads", source: "LP Ausschreibung (Ads) merkalku.de", tags: ["preisrechner", "lp-ausschreibung"] },
} as const;
type QuelleKey = keyof typeof QUELLEN;

/* UTM-Werte auf whitelisted Keys + harmlose Zeichen reduzieren, bevor sie ins CRM wandern */
function utmKurz(utm: Record<string, string> | undefined): string {
  if (!utm || typeof utm !== "object") return "";
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "v", "oppref", "ref"];
  const teile = keys
    .filter((k) => typeof utm[k] === "string" && utm[k].trim())
    .map((k) => `${k.replace("utm_", "")}=${utm[k].replace(/[^\w.\-\/ äöüÄÖÜß]/g, "").slice(0, 60)}`);
  return teile.join(" ");
}

/* Conversion an OpenAI melden (Anzeigen in ChatGPT), serverseitig.
   Nutzlast nach OpenAI-Vorgabe: ein Objekt mit validate_only und events, action_source "web",
   data.type "customer_action". Eine frühere Fassung schickte ein nacktes Array mit "website"
   und eigenen data-Feldern, das wäre abgelehnt worden.

   Die Pixel-ID ist dieselbe wie im Pixel im Layout und steht dort ohnehin im Quelltext, deshalb
   als Vorgabewert hinterlegt. Zu setzen ist nur OPENAI_ADS_API_TOKEN. Fehler kosten nie den Lead. */
const OPENAI_PIXEL_ID = "5AqDj4XKxG9a38E7EVMjyN";

async function meldeConversionAnOpenAI(args: { eventId: string; seite: string; oppref?: string; wert?: number; quelle: string }) {
  const pixel = process.env.OPENAI_ADS_PIXEL_ID || OPENAI_PIXEL_ID;
  const token = process.env.OPENAI_ADS_API_TOKEN;
  if (!pixel || !token) return;

  /* Die Pflichtfelder genau nach Vorgabe. Alles Weitere ist ein Zusatz, der im Zweifel wegfällt. */
  const pflicht = {
    id: args.eventId,
    type: "lead_created",
    timestamp_ms: Date.now(),
    source_url: args.seite,
    action_source: "web",
    data: { type: "customer_action" },
  };
  const mitZusatz: Record<string, unknown> = {
    ...pflicht,
    data: { type: "customer_action", value: args.wert, currency: "EUR", lead_type: args.quelle },
    ...(args.oppref ? { oppref: args.oppref } : {}),
  };

  const senden = (event: Record<string, unknown>) =>
    fetch(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(pixel)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ validate_only: false, events: [event] }),
      signal: AbortSignal.timeout(4000),
    });

  try {
    let res = await senden(mitZusatz);
    if (res.status >= 400 && res.status < 500) {
      /* Zusatzfelder sind nicht dokumentiert. Werden sie abgelehnt, zählt die Conversion trotzdem. */
      const grund = await res.text();
      console.warn("preisrechner-lead: OpenAI lehnte die Zusatzfelder ab, zweiter Versuch ohne", res.status, grund);
      res = await senden(pflicht);
    }
    if (!res.ok) console.warn("preisrechner-lead: OpenAI-Conversion abgelehnt", res.status, await res.text());
  } catch (err) {
    console.warn("preisrechner-lead: OpenAI-Conversion nicht gesendet", err);
  }
}

/* Deutsche Nummern nach E.164 normalisieren — GHL braucht das für den WhatsApp-Versand */
function normalisiereTelefon(raw: string): string {
  const ziffern = raw.replace(/[^\d+]/g, "");
  if (ziffern.startsWith("+")) return "+" + ziffern.slice(1).replace(/\D/g, "");
  if (ziffern.startsWith("00")) return "+" + ziffern.slice(2);
  if (ziffern.startsWith("0")) return "+49" + ziffern.slice(1);
  if (/^(49|43|41)\d{8,}$/.test(ziffern)) return "+" + ziffern;
  return "+49" + ziffern;
}

export async function POST(request: Request) {
  const token = process.env.GHL_API_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) {
    console.error("preisrechner-lead: GHL_API_TOKEN/GHL_LOCATION_ID nicht gesetzt");
    return Response.json({ ok: false, error: "config" }, { status: 500 });
  }

  let data: LeadPayload;
  try {
    data = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot: Bots füllen das versteckte Feld – still "ok", aber loggen,
  // damit False Positives (Autofill echter Nutzer) auffallen würden
  if (data.zusatz) {
    console.warn("preisrechner-lead: Honeypot ausgelöst, Domain:", (data.email || "?").split("@")[1] || "?");
    await markiereVerworfen(data.sid, "honeypot");
    return Response.json({ ok: true });
  }
  const ipFruh = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 45);
  if (rateLimitiert(ipFruh)) {
    console.warn("preisrechner-lead: Rate-Limit, IP", ipFruh);
    return Response.json({ ok: false, error: "rate" }, { status: 429 });
  }
  if (typeof data.t0 === "number" && Number.isFinite(data.t0) && Date.now() - data.t0 < MINDESTZEIT_MS && Date.now() - data.t0 >= 0) {
    // Zu schnell für einen Menschen: still "ok" wie beim Honeypot, mit Log
    console.warn("preisrechner-lead: Mindestzeit unterschritten", Math.round((Date.now() - data.t0) / 1000), "s");
    await markiereVerworfen(data.sid, `mindestzeit ${Math.round((Date.now() - data.t0) / 1000)}s`);
    return Response.json({ ok: true });
  }

  const name = (data.name || "").trim();
  const firma = (data.firma || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const phone = normalisiereTelefon((data.phone || "").trim());
  const ausschreibungen = Number(data.ausschreibungenProMonat);
  const stunden = Number(data.stundenProAusschreibung);
  const liegenGelassen = LIEGEN_OPTIONEN.includes(data.liegenGelassen || "") ? (data.liegenGelassen as string) : null;
  const quelle: QuelleKey = data.quelle && data.quelle in QUELLEN ? (data.quelle as QuelleKey) : "preisrechner";
  const herkunft = QUELLEN[quelle];
  const utmInfo = utmKurz(data.utm);
  const whatsappOk = data.whatsappEinwilligung === true;
  const seite = typeof data.seite === "string" ? data.seite.slice(0, 500) : "";
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 45);
  const jetzt = new Date();

  if (
    name.length < 2 ||
    firma.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
    !telefonPlausibel(phone) ||
    !Number.isFinite(ausschreibungen) || ausschreibungen < 1 || ausschreibungen > 500 ||
    !Number.isFinite(stunden) || stunden <= 0 || stunden > 40
  ) {
    return Response.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const { ersparnisEur } = berechneErsparnis(ausschreibungen, stunden);
  const heute = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const intentTrigger =
    `Preisrechner ${heute}: ${ausschreibungen} Ausschr./Monat, ` +
    `${stunden} h/Ausschr., ${data.kalkulationWer || "?"} mit ${data.kalkulationTool || "?"}` +
    (liegenGelassen && liegenGelassen !== "Keine" ? `, lässt ${liegenGelassen} liegen` : "") +
    (data.liegenUnklar ? ", liegen gelassen: unklar" : "") +
    (quelle !== "preisrechner" ? ` | ${quelle}` : "") +
    (utmInfo ? ` | ${utmInfo}` : "") +
    (whatsappOk ? " | WhatsApp ok" : " | WhatsApp nein");

  const heiss =
    ausschreibungen >= PRICING.heissSchwelleAusschreibungen || liegenGelassen === "mehr als 5";

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const customFields: Array<{ id: string; value: string | number }> = [
    { id: FIELD_IDS.kontaktQuelle, value: herkunft.kontaktQuelle },
    { id: FIELD_IDS.originCohort, value: "Inbound" },
    { id: FIELD_IDS.pipelineStage, value: "Lead" },
    { id: FIELD_IDS.aktuelleTemperatur, value: heiss ? "Heiß" : "Warm" },
    { id: FIELD_IDS.letzterIntentTrigger, value: intentTrigger },
    { id: FIELD_IDS.ausschreibungenProMonat, value: ausschreibungen },
    { id: FIELD_IDS.stundenProAusschreibung, value: stunden },
    { id: FIELD_IDS.ersparnisProMonatEur, value: ersparnisEur },
  ];
  if (liegenGelassen) {
    customFields.push({ id: FIELD_IDS.liegenGelassen, value: liegenGelassen });
  }
  /* Einwilligungs-Nachweis: Ja/Nein, Zeitpunkt, Wortlaut-Version, Seite, IP (Beweislast liegt beim Werbenden) */
  customFields.push({
    id: FIELD_IDS.whatsappEinwilligung,
    value: whatsappOk
      ? `Ja | ${jetzt.toISOString()} | Wortlaut ${data.whatsappEinwilligungVersion || "?"} | ${seite || "?"} | IP ${ip || "?"}`
      : `Nein | ${jetzt.toISOString()}`,
  });
  if (utmInfo) {
    customFields.push({ id: FIELD_IDS.anzeigenHerkunft, value: utmInfo.slice(0, 250) });
  }
  if (data.kalkulationWer && KALKULATION_WER.includes(data.kalkulationWer)) {
    customFields.push({ id: FIELD_IDS.kalkulationWer, value: data.kalkulationWer });
  }
  if (data.kalkulationTool && KALKULATION_TOOL.includes(data.kalkulationTool)) {
    customFields.push({ id: FIELD_IDS.kalkulationTool, value: data.kalkulationTool });
  }

  try {
    const [firstName, ...rest] = name.split(/\s+/);
    const upsertRes = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        locationId,
        firstName,
        lastName: rest.join(" ") || undefined,
        email,
        phone,
        companyName: firma,
        source: herkunft.source,
      }),
    });

    if (!upsertRes.ok) {
      console.error("preisrechner-lead: GHL upsert fehlgeschlagen", upsertRes.status, await upsertRes.text());
      return Response.json({ ok: false, error: "crm" }, { status: 502 });
    }

    const contactId = (await upsertRes.json())?.contact?.id;
    if (!contactId) {
      console.error("preisrechner-lead: Upsert ohne contactId");
      return Response.json({ ok: false, error: "crm" }, { status: 502 });
    }

    // Custom Fields separat per Update — der Upsert-Endpunkt verwirft sie stillschweigend.
    // Weicher Fehler: Lead + Tag sind wichtiger als die Zusatzfelder.
    const fieldRes = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ customFields }),
    });
    if (!fieldRes.ok) {
      console.error("preisrechner-lead: Custom Fields fehlgeschlagen", fieldRes.status, await fieldRes.text());
    }

    // Tags additiv setzen — "preisrechner" triggert den GHL-Workflow (Auswertungs-Mail + persönliche Kontaktaufnahme),
    // "lp-ausschreibung" markiert Leads der Ads-Landingpage für Auswertung und Filter.
    // Ohne Tag geht keine Auswertung raus, deshalb harter Fehler mit einem Retry.
    const setzeTag = () =>
      fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          tags: [
            ...herkunft.tags,
            whatsappOk ? "whatsapp-ok" : "whatsapp-nein",
            ...(data.utm?.utm_source === "chatgpt" ? ["quelle:chatgpt-ads"] : []),
          ],
        }),
      });
    let tagRes = await setzeTag();
    if (!tagRes.ok) {
      await new Promise((r) => setTimeout(r, 1000));
      tagRes = await setzeTag();
    }
    if (!tagRes.ok) {
      console.error("preisrechner-lead: Tag setzen fehlgeschlagen", tagRes.status, await tagRes.text());
      return Response.json({ ok: false, error: "crm" }, { status: 502 });
    }

    await markiereAbgeschickt({ sid: data.sid, contactId, ersparnisEur, whatsappOk, quelle });

    await meldeConversionAnOpenAI({
      eventId: `lead-${contactId}`,
      seite: seite || "https://merkalku.de/",
      oppref: data.utm?.oppref,
      wert: ersparnisEur,
      quelle,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("preisrechner-lead: GHL nicht erreichbar", err);
    return Response.json({ ok: false, error: "crm" }, { status: 502 });
  }
}
