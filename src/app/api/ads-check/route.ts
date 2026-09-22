/* Prüfseite für die OpenAI-Conversions-Anbindung. Aufruf: /api/ads-check
   Sagt, ob der API-Key in dieser Umgebung ankommt, und macht damit einen Testaufruf mit
   validate_only, der nichts zählt. Gibt keinen Schlüsselwert preis, nur ob und wie lang.
   Darf nach der Einrichtung gelöscht werden. */

const OPENAI_PIXEL_ID = "5AqDj4XKxG9a38E7EVMjyN";

export async function GET() {
  const pixel = process.env.OPENAI_ADS_PIXEL_ID || OPENAI_PIXEL_ID;
  const token = process.env.OPENAI_ADS_API_TOKEN;

  const befund: Record<string, unknown> = {
    pixelId: pixel,
    pixelIdAusUmgebung: Boolean(process.env.OPENAI_ADS_PIXEL_ID),
    tokenGesetzt: Boolean(token),
    tokenLaenge: token ? token.length : 0,
    tokenAnfang: token ? token.slice(0, 11) + "…" : null,
  };

  if (!token) {
    befund.ergebnis = "OPENAI_ADS_API_TOKEN ist in dieser Umgebung nicht gesetzt. Deshalb wird keine Conversion gemeldet.";
    return Response.json(befund, { headers: { "Cache-Control": "no-store" } });
  }

  const jetzt = Date.now();
  try {
    const res = await fetch(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(pixel)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        validate_only: true,
        events: [
          {
            id: `ads-check-${jetzt}`,
            type: "lead_created",
            timestamp_ms: jetzt,
            source_url: "https://www.merkalku.de/ausschreibung",
            action_source: "web",
            data: { type: "customer_action" },
          },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });
    befund.status = res.status;
    befund.antwort = (await res.text()).slice(0, 400);
    befund.ergebnis = res.ok
      ? "Key funktioniert, der Testaufruf wurde angenommen (validate_only, es wurde nichts gezählt)."
      : "Der Key kommt an, OpenAI lehnt den Aufruf aber ab. Siehe antwort.";
  } catch (err) {
    befund.ergebnis = "OpenAI war von Vercel aus nicht erreichbar: " + String(err).slice(0, 200);
  }

  return Response.json(befund, { headers: { "Cache-Control": "no-store" } });
}
