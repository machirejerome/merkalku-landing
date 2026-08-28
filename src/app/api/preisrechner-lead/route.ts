import { PRICING, berechneErsparnis } from "@/lib/pricing-config";

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
};

/* Deutsche Nummern nach E.164 normalisieren — GHL braucht das für den WhatsApp-Versand */
function normalisiereTelefon(raw: string): string {
  const ziffern = raw.replace(/[^\d+]/g, "");
  if (ziffern.startsWith("+")) return "+" + ziffern.slice(1).replace(/\D/g, "");
  if (ziffern.startsWith("00")) return "+" + ziffern.slice(2);
  if (ziffern.startsWith("0")) return "+49" + ziffern.slice(1);
  if (ziffern.startsWith("49") && ziffern.length >= 11) return "+" + ziffern;
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
    return Response.json({ ok: true });
  }

  const name = (data.name || "").trim();
  const firma = (data.firma || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const phone = normalisiereTelefon((data.phone || "").trim());
  const ausschreibungen = Number(data.ausschreibungenProMonat);
  const stunden = Number(data.stundenProAusschreibung);
  const liegenGelassen = LIEGEN_OPTIONEN.includes(data.liegenGelassen || "") ? (data.liegenGelassen as string) : null;

  if (
    name.length < 2 ||
    firma.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ||
    phone.replace(/\D/g, "").length < 8 ||
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
    (liegenGelassen && liegenGelassen !== "Keine" ? `, lässt ${liegenGelassen} liegen` : "");

  const heiss =
    ausschreibungen >= PRICING.heissSchwelleAusschreibungen || liegenGelassen === "mehr als 5";

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  const customFields: Array<{ id: string; value: string | number }> = [
    { id: FIELD_IDS.kontaktQuelle, value: "Inbound_Organic" },
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
        source: "Preisrechner merkalku.de",
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

    // Tag additiv setzen — triggert den GHL-Workflow (E-Mail/WhatsApp mit Preisangebot).
    // Ohne Tag geht kein Angebot raus, deshalb harter Fehler mit einem Retry.
    const setzeTag = () =>
      fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tags: ["preisrechner"] }),
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

    return Response.json({ ok: true });
  } catch (err) {
    console.error("preisrechner-lead: GHL nicht erreichbar", err);
    return Response.json({ ok: false, error: "crm" }, { status: 502 });
  }
}
