/* Erfasst beim ersten Seitenaufruf, woher ein Besucher kommt: utm_*-Parameter der Anzeige, die
   Klick-ID "oppref" (hängt OpenAI beim Klick auf eine ChatGPT-Anzeige an die URL) und den
   Referrer-Host. Bewusst NUR im Speicher der laufenden Seite gehalten, nicht in Cookies oder
   Web-Storage: so bleibt die Erfassung ohne Einwilligung zulässig (§ 25 TDDDG greift nur bei
   Speichern auf dem Endgerät). Die Werte wandern erst mit dem abgeschickten Lead ins eigene CRM. */

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "oppref", "v"] as const;

export type Attribution = Partial<Record<(typeof KEYS)[number] | "ref" | "landing", string>>;

let imSpeicher: Attribution | null = null;
let sitzungsId: string | null = null;

/* Zufällige Sitzungs-ID, nur im Speicher der geöffneten Seite (kein Cookie, kein Web-Storage):
   verbindet die Funnel-Ereignisse eines Besuchs, ohne etwas auf dem Endgerät abzulegen. */
export function leseSitzungsId(): string {
  if (typeof window === "undefined") return "";
  if (!sitzungsId) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    sitzungsId = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return sitzungsId;
}

function sauber(v: string | null): string | undefined {
  if (!v) return undefined;
  const t = v.trim().slice(0, 120);
  return t || undefined;
}

/* Beim ersten Aufruf lesen (First-Touch), danach nur noch den gemerkten Wert liefern */
export function erfasseAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  if (imSpeicher) return imSpeicher;

  const params = new URLSearchParams(window.location.search);
  const a: Attribution = {};
  for (const k of KEYS) {
    const v = sauber(params.get(k));
    if (v) a[k] = v;
  }
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host && host !== window.location.hostname) a.ref = host.slice(0, 100);
    }
  } catch {}
  a.landing = window.location.pathname.slice(0, 100);
  imSpeicher = a;
  return a;
}

export function leseAttribution(): Attribution {
  return erfasseAttribution();
}
