import { PRICING, berechneErsparnis } from "@/lib/pricing-config";

const GHL_BASE = "https://services.leadconnectorhq.com";

const KALKULATION_WER = ["Inhaber selbst", "Kalkulator", "Büro", "Extern"];
const KALKULATION_TOOL = ["Excel", "Software", "Papier und Erfahrung"];

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
  website?: string; // Honeypot – muss leer bleiben
};

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

  // Honeypot: Bots füllen das versteckte Feld – dann still "ok" zurückgeben
  if (data.website) return Response.json({ ok: true });

  const name = (data.name || "").trim();
  const firma = (data.firma || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const phone = (data.phone || "").trim();
  const ausschreibungen = Number(data.ausschreibungenProMonat);
  const stunden = Number(data.stundenProAusschreibung);

  if (
    name.length < 2 ||
    firma.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
    phone.replace(/\D/g, "").length < 6 ||
    !Number.isFinite(ausschreibungen) || ausschreibungen < 1 || ausschreibungen > 500 ||
    !Number.isFinite(stunden) || stunden <= 0 || stunden > 40
  ) {
    return Response.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const { ersparnisEur } = berechneErsparnis(ausschreibungen, stunden);
  const heute = new Date().toLocaleDateString("de-DE");
  const intentTrigger =
    `Preisrechner ${heute}: ${ausschreibungen} Ausschr./Monat, ` +
    `${stunden} h/Ausschr., ${data.kalkulationWer || "?"} mit ${data.kalkulationTool || "?"}` +
    (data.liegenGelassen && data.liegenGelassen !== "0" ? `, lässt ${data.liegenGelassen} liegen` : "");

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const customFields: Array<{ id: string; value: string | number }> = [
    { id: FIELD_IDS.kontaktQuelle, value: "Inbound_Organic" },
    { id: FIELD_IDS.originCohort, value: "Inbound" },
    { id: FIELD_IDS.pipelineStage, value: "Lead" },
    {
      id: FIELD_IDS.aktuelleTemperatur,
      value: ausschreibungen >= PRICING.heissSchwelleAusschreibungen ? "Heiß" : "Warm",
    },
    { id: FIELD_IDS.letzterIntentTrigger, value: intentTrigger },
    { id: FIELD_IDS.ausschreibungenProMonat, value: ausschreibungen },
    { id: FIELD_IDS.stundenProAusschreibung, value: stunden },
    { id: FIELD_IDS.ersparnisProMonatEur, value: ersparnisEur },
  ];
  if (data.kalkulationWer && KALKULATION_WER.includes(data.kalkulationWer)) {
    customFields.push({ id: FIELD_IDS.kalkulationWer, value: data.kalkulationWer });
  }
  if (data.kalkulationTool && KALKULATION_TOOL.includes(data.kalkulationTool)) {
    customFields.push({ id: FIELD_IDS.kalkulationTool, value: data.kalkulationTool });
  }

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
      source: "Preisrechner merkalku.de",
    }),
  });

  if (!upsertRes.ok) {
    console.error("preisrechner-lead: GHL upsert fehlgeschlagen", upsertRes.status, await upsertRes.text());
    return Response.json({ ok: false, error: "crm" }, { status: 502 });
  }

  const contactId = (await upsertRes.json())?.contact?.id;

  // Custom Fields separat per Update setzen — der Upsert-Endpunkt verwirft sie stillschweigend
  if (contactId) {
    const fieldRes = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ customFields }),
    });
    if (!fieldRes.ok) {
      console.error("preisrechner-lead: Custom Fields setzen fehlgeschlagen", fieldRes.status, await fieldRes.text());
    }
  }

  // Tag additiv setzen (Upsert-Tags würden bestehende Tags ersetzen) –
  // der Tag "preisrechner" triggert den GHL-Workflow für E-Mail/WhatsApp-Versand
  if (contactId) {
    const tagRes = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tags: ["preisrechner"] }),
    });
    if (!tagRes.ok) {
      console.error("preisrechner-lead: Tag setzen fehlgeschlagen", tagRes.status, await tagRes.text());
    }
  }

  return Response.json({ ok: true });
}
