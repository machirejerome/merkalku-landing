"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  PRICING,
  CALENDAR_URL,
  ANZAHL_KLASSEN,
  STUNDEN_KLASSEN,
  berechneErsparnis,
  merkalkuStunden,
} from "@/lib/pricing-config";
import { FIRMA } from "@/lib/firma";
import { leseAttribution, leseSitzungsId } from "@/lib/attribution";
import { trackEvent, trackLead, trackStand, type Quelle } from "@/lib/tracking";

const LOGO_URL = "/logo.webp";

/* Eine Frage pro Bildschirm (Typeform-Prinzip): winzige Schritte halten die Leute in
   Bewegung, Auto-Weiter nach jeder Antwort erspart Klicks. Reihenfolge nach Aufwand und
   Rechenlogik: erst die beiden Zahlen, die jeder als Rechnung versteht (Anzahl x Dauer),
   dann die Verlust-Frage, dann zwei leichte Ausklang-Fragen, zuletzt die Kontaktdaten. */

const LIEGEN_OPTIONEN = ["Keine", "1–2 pro Monat", "3–5 pro Monat", "mehr als 5", "Weiß ich nicht genau"];
/* Nur diese Werte kennt die Auswahlliste in GHL; "Weiß ich nicht genau" wird nicht übertragen */
const LIEGEN_GHL = new Set(["Keine", "1–2 pro Monat", "3–5 pro Monat", "mehr als 5"]);
const WER_OPTIONEN = ["Ich selbst (Inhaber)", "Unser Kalkulator", "Das Büro-Team", "Extern"];
const TOOL_OPTIONEN = ["Excel", "Eine Software", "Papier und Erfahrung"];

/* GHL-Werte müssen zu den Picklist-Optionen der Custom Fields passen */
const WER_GHL: Record<string, string> = {
  "Ich selbst (Inhaber)": "Inhaber selbst",
  "Unser Kalkulator": "Kalkulator",
  "Das Büro-Team": "Büro",
  Extern: "Extern",
};
const TOOL_GHL: Record<string, string> = {
  Excel: "Excel",
  "Eine Software": "Software",
  "Papier und Erfahrung": "Papier und Erfahrung",
};

const GATE_STEP = 5;
const RESULT_STEP = 6;

/* Wortlaut der WhatsApp-Einwilligung. Versioniert, damit der Nachweis in GHL eindeutig ist. */
export const WHATSAPP_EINWILLIGUNG_VERSION = "v4";
export const WHATSAPP_EINWILLIGUNG_TEXT =
  `Rückfragen zu meiner Auswertung und zum Preis per WhatsApp an diese Nummer, jederzeit mit „Stopp“ beendbar.`;

function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function ChoiceButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="w-full px-5 py-4 rounded-xl text-base font-medium text-left transition-all duration-150"
      style={{
        border: selected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
        background: selected ? "rgba(5,112,60,0.08)" : "var(--color-bg-card)",
        color: selected ? "var(--color-primary)" : "var(--color-text)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        minHeight: "52px",
      }}
    >
      {label}
    </button>
  );
}

/* Kalender erst nach Klick laden (Zwei-Klick-Lösung): das GoHighLevel-Widget liegt in den USA
   und soll nicht ohne Zutun des Nutzers geladen werden. Nebeneffekt: kein iframe im ersten Viewport. */
export function KalenderZweiKlick({ prominent, stunden }: { prominent: boolean; stunden?: number }) {
  useEffect(() => {
    trackEvent("kalender_geoeffnet", {});
  }, []);
  return (
    <div
      className="rounded-2xl p-6 sm:p-8"
      style={{
        background: "var(--color-bg-card)",
        border: prominent ? "1px solid rgba(5,112,60,0.3)" : "1px solid var(--color-border)",
        borderTop: prominent ? "3px solid var(--color-primary)" : undefined,
      }}
    >
      <h2 className="text-xl font-bold tracking-tight mb-2">
        {typeof stunden === "number" && stunden > 0
          ? `Du hast gerade ${stunden.toLocaleString("de-DE")} Stunden ausgerechnet.`
          : "Lieber gleich an eurer eigenen Ausschreibung?"}
      </h2>
      <p className="text-sm mb-5 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        Sehen wir uns an, ob das bei euch wirklich so ist. 30 Minuten mit {FIRMA.geschaeftsfuehrer}: bring die Ausschreibung mit,
        die gerade auf dem Tisch liegt, wir lesen die Vergabeunterlagen live ein und du siehst eure Kalkulation statt Demo-Daten.
        Am Ende weißt du, was MerKalku bei euch kostet. Kostenlos.
      </p>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
        <iframe src={CALENDAR_URL} className="w-full border-0" style={{ minHeight: "750px" }} title="Praxischeck buchen" />
      </div>
      <p className="text-xs mt-3" style={{ color: "var(--color-text-faint)" }}>
        <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
          Kalender lädt nicht? Termin hier direkt buchen
        </a>
      </p>
    </div>
  );
}

function Ergebnis({
  anzahl,
  stunden,
  liegenGelassen,
  wer,
  whatsappOk,
  heiss,
}: {
  anzahl: number;
  stunden: number;
  liegenGelassen: string | null;
  wer: string | null;
  whatsappOk: boolean;
  heiss: boolean;
}) {
  /* Stundensatz ist auf der Seite anpassbar, damit der Betrieb seine eigene Zahl einsetzen kann.
     Die Auswertung per E-Mail rechnet mit dem Standardsatz. */
  const [satz, setSatz] = useState<number>(PRICING.stundensatzEur);
  const [satzOffen, setSatzOffen] = useState(false);
  const basis = berechneErsparnis(anzahl, stunden);
  const gesparteStunden = Math.round(basis.gesparteStunden);
  const ersparnisEur = Math.round((basis.gesparteStunden * satz) / 10) * 10;
  const animiert = useCountUp(gesparteStunden, 1000);
  const anzahlLabel = ANZAHL_KLASSEN.find((k) => k.value === anzahl)?.label ?? `${anzahl} pro Monat`;
  const stundenLabel = STUNDEN_KLASSEN.find((k) => k.value === stunden)?.label ?? `${stunden} h`;
  const liegtEtwas = liegenGelassen && liegenGelassen !== "Keine" && liegenGelassen !== "Weiß ich nicht genau";
  /* KLEIN: Ersparnis (Standardsatz) unter der Schwelle → Argument über liegen gelassene Ausschreibungen, WhatsApp zuerst */
  const klein = basis.ersparnisEur < PRICING.kleinSchwelleEur;
  const mkStd = merkalkuStunden(stunden);
  const zusatzZeitlich = Math.floor(basis.gesparteStunden / mkStd);
  const nichtInhaber = wer !== null && wer !== "Ich selbst (Inhaber)";

  return (
    <div className="step-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3 text-center" style={{ color: "var(--color-primary)" }}>
        Deine Auswertung
      </p>

      {/* Die eine große Zahl zuerst: Stunden, nicht Euro. Handwerker rechnen in Stunden. */}
      <div className="rounded-2xl p-8 sm:p-10 text-center mb-4" style={{ background: "rgba(5,112,60,0.07)", border: "2px solid var(--color-primary)" }}>
        <p className="text-sm mb-2" style={{ color: "var(--color-primary)" }}>
          Stunden im Monat, die bei euch frei werden
        </p>
        <p
          aria-hidden="true"
          className="text-5xl sm:text-6xl font-bold tracking-tight"
          style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}
        >
          rund {animiert.toLocaleString("de-DE")}
        </p>
        <span className="sr-only">rund {gesparteStunden.toLocaleString("de-DE")} Stunden pro Monat</span>
        <p className={klein ? "text-sm mt-4 font-semibold" : "text-base mt-4 font-semibold"} style={{ color: "var(--color-text)" }}>
          ≈ {ersparnisEur.toLocaleString("de-DE")} € pro Monat
          <span className="font-normal text-sm" style={{ color: "var(--color-text-muted)" }}>
            {" "}bei {satz} € je Bürostunde{" "}
            <button type="button" onClick={() => setSatzOffen((o) => !o)} className="underline hover:opacity-70">
              {satzOffen ? "übernehmen" : "Kostensatz anpassen"}
            </button>
          </span>
        </p>
        {satzOffen && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <label htmlFor="satz" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Euer Kostensatz je Bürostunde:
            </label>
            <input
              id="satz"
              type="number"
              min={10}
              max={300}
              step={5}
              value={satz}
              onChange={(e) => setSatz(Math.min(300, Math.max(10, Number(e.target.value) || 0)))}
              className="w-24 px-3 py-2 rounded-lg text-base text-center"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-card)" }}
            />
            <span className="text-sm">€/h</span>
          </div>
        )}
      </div>

      <div className="rounded-xl p-5 mb-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Heute stecken bei euch rund{" "}
          <strong style={{ color: "var(--color-text)" }}>
            {Math.round(basis.istStunden).toLocaleString("de-DE")} Stunden im Monat
          </strong>{" "}
          in Ausschreibungen ({anzahlLabel}, {stundenLabel} je Stück).
          {liegtEtwas && (
            <>
              {" "}Die Ausschreibungen, die ihr heute liegen lasst ({liegenGelassen}), wären zeitlich drin.
            </>
          )}
          {zusatzZeitlich >= 3 && (
            <>
              {liegtEtwas
                ? " Darüber hinaus bleibt Zeit für deutlich mehr Ausschreibungen und Angebote."
                : " Mit der frei werdenden Zeit sind deutlich mehr Ausschreibungen und Angebote drin."}
            </>
          )}
        </p>
        {klein && (
          <p className="text-sm leading-relaxed mt-2" style={{ color: "var(--color-text)" }}>
            Bei eurem Volumen rechnet sich MerKalku vor allem über die Ausschreibungen, die heute liegen bleiben.
            Ob das bei euch passt, klärt {FIRMA.geschaeftsfuehrer} kurz mit dir.
          </p>
        )}
        <details className="mt-3">
          <summary className="text-xs font-semibold cursor-pointer" style={{ color: "var(--color-primary)" }}>
            So haben wir gerechnet
          </summary>
          <div className="text-xs mt-2 leading-relaxed space-y-1" style={{ color: "var(--color-text-muted)" }}>
            <p>
              Eure Dauer heute: {stundenLabel} je Ausschreibung. Mit MerKalku gerechnet: {mkStd * 60} Minuten je Ausschreibung
              {mkStd >= 1 ? " (ab 4 Stunden bisherigem Aufwand rechnen wir mit 1 Stunde statt 30 Minuten)" : ""}.
              Anzahl × (eure Dauer − {mkStd * 60} Minuten) = frei werdende Stunden. Mal {satz} € je Bürostunde = Ersparnis in Euro.
            </p>
            {zusatzZeitlich >= 1 && (
              <p>
                Rein zeitlich wären mit den frei werdenden Stunden {zusatzZeitlich.toLocaleString("de-DE")} Ausschreibungen mehr im Monat möglich
                ({Math.round(basis.gesparteStunden).toLocaleString("de-DE")} Stunden geteilt durch {mkStd * 60} Minuten). Ob so viele passende
                ausgeschrieben werden und ob ihr die Aufträge personell stemmt, steht auf einem anderen Blatt.
              </p>
            )}
            <p>
              Mit MerKalku dauert eine Ausschreibung meist 10 bis 30 Minuten, große Vergabeunterlagen unter einer Stunde: die KI liest die
              Unterlagen und füllt die Kalkulation mit euren Leistungswerten und Kostensätzen, du prüfst und gibst frei.
            </p>
            <p>Das ist eine Rechnung auf Basis deiner Angaben, kein gemessenes Kundenergebnis.</p>
          </div>
        </details>
      </div>

      <div className="rounded-xl p-5 mb-10" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <p className="text-sm font-semibold mb-2">Was jetzt passiert</p>
        <ol className="text-sm leading-relaxed space-y-1.5" style={{ color: "var(--color-text-muted)" }}>
          <li>1. Deine Auswertung kommt per E-Mail{nichtInhaber ? ", zum Weiterleiten an die Geschäftsführung" : ""}.</li>
          <li>
            2.{" "}
            {whatsappOk
              ? `${FIRMA.geschaeftsfuehrer} schreibt dir per WhatsApp, innerhalb eines Werktags.`
              : `${FIRMA.geschaeftsfuehrer} ruft dich kurz an, innerhalb eines Werktags.`}
          </li>
          <li>3. Im Gespräch sagt er dir, was MerKalku bei euch kostet.</li>
        </ol>
        <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Den Preis nennt {FIRMA.geschaeftsfuehrer.split(" ")[0]} im Gespräch, nicht vorher. Nicht um dich hinzuhalten,
          sondern weil er erst sehen will, ob MerKalku bei euren Ausschreibungen trägt. Wenn nicht, sagt er dir das.
        </p>
      </div>

      {/* Einziger Nebenweg: der Kalender, bei Heiß-Leads hervorgehoben */}
      <KalenderZweiKlick prominent={heiss && !klein} stunden={gesparteStunden} />
    </div>
  );
}

type RechnerProps = {
  /* Herkunft des Leads: steuert Tags/Quelle in GHL und den Speicher-Schlüssel */
  quelle?: Quelle;
  /* true = ohne eigene Nav/Seitenrahmen, z.B. eingebettet in eine Landingpage */
  embedded?: boolean;
  /* Überschrift über dem Rechner in der eingebetteten Variante (optional) */
  titel?: string;
  /* Eine Zeile unter den Antworten von Frage 1: was der Nutzer bekommt (eingebettet) */
  startHinweis?: string;
};

export default function Rechner({ quelle = "preisrechner", embedded = false, titel, startHinweis }: RechnerProps = {}) {
  const STORAGE_KEY = quelle === "preisrechner" ? "preisrechner_state_v2" : `rechner_${quelle}_v2`;
  const [step, setStepState] = useState(0);
  const [anzahl, setAnzahl] = useState<number | null>(null);
  const [stunden, setStunden] = useState<number | null>(null);
  const [liegenGelassen, setLiegenGelassen] = useState<string | null>(null);
  const [wer, setWer] = useState<string | null>(null);
  const [tool, setTool] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [firma, setFirma] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappOk, setWhatsappOk] = useState(true);
  const [zusatz, setZusatz] = useState(""); // Honeypot – bewusst OHNE Autofill-Semantik benannt
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);
  const gateSeit = useRef<number>(0);

  const advanceTimer = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const erstesRender = useRef(true);
  const letzterStand = useRef("");

  function clearAdvanceTimer() {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }

  /* Schrittwechsel immer über diese Funktion: hält Browser-History synchron,
     damit Swipe-Back am Handy eine Frage zurückgeht statt die Seite zu verlassen */
  function setStep(n: number) {
    clearAdvanceTimer();
    setStepState(n);
    trackEvent("rechner_schritt", { schritt: n, quelle });
    try {
      window.history.pushState({ prStep: n }, "");
    } catch {}
  }

  /* Beim Laden: gespeicherte Antworten wiederherstellen + History initialisieren.
     Nach abgeschlossenem Rechner direkt das Ergebnis zeigen, kein zweites Gate. */
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.anzahl === "number") setAnzahl(s.anzahl);
        if (typeof s.stunden === "number") setStunden(s.stunden);
        if (typeof s.liegenGelassen === "string") setLiegenGelassen(s.liegenGelassen);
        if (typeof s.wer === "string") setWer(s.wer);
        if (typeof s.tool === "string") setTool(s.tool);
        if (typeof s.whatsappOk === "boolean") setWhatsappOk(s.whatsappOk);
        if (s.fertig === true && typeof s.anzahl === "number" && typeof s.stunden === "number") {
          setFertig(true);
          setStepState(RESULT_STEP);
          document.documentElement.setAttribute("data-rechner-fertig", "1");
          window.dispatchEvent(new Event("mk:rechner_fertig"));
        } else if (typeof s.step === "number") {
          // Ohne die beiden Rechen-Antworten kann das Gate nicht rechnen: dann höchstens bis Frage 2 springen
          const cap = typeof s.anzahl === "number" && typeof s.stunden === "number" ? GATE_STEP : 1;
          setStepState(Math.min(s.step, cap));
        }
      }
      window.history.replaceState({ prStep: 0 }, "");
    } catch {}

    const onPop = (e: PopStateEvent) => {
      const s = e.state?.prStep;
      if (typeof s === "number") {
        clearAdvanceTimer();
        setStepState(Math.min(s, GATE_STEP));
      }
    };
    window.addEventListener("popstate", onPop);

    /* Zweiter Einstieg auf der Landingpage: "zum Rechner" setzt den Fokus auf die aktuelle Frage */
    const onFokus = () => headingRef.current?.focus({ preventScroll: true });
    window.addEventListener("mk:rechner_fokus", onFokus);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("mk:rechner_fokus", onFokus);
    };
  }, [STORAGE_KEY]);

  /* Antworten fortlaufend sichern (übersteht Tab-Wechsel und Reload) und anonym an den Server melden,
     damit auch Durchläufe zählen, die vor dem Formular abbrechen */
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step: Math.min(step, GATE_STEP), anzahl, stunden, liegenGelassen, wer, tool, whatsappOk, fertig })
      );
    } catch {}
    if (anzahl !== null && !fertig) {
      const stand = { schritt: Math.min(step, GATE_STEP), anzahl, stunden, liegen: liegenGelassen, wer, tool };
      const key = JSON.stringify(stand);
      if (key !== letzterStand.current) {
        letzterStand.current = key;
        trackStand(quelle, stand);
      }
    }
  }, [STORAGE_KEY, quelle, step, anzahl, stunden, liegenGelassen, wer, tool, whatsappOk, fertig]);

  /* Zeitpunkt der ersten Antwort merken (Junk-Schutz: ein Mensch braucht für 5 Fragen plus Formular
     länger als ein paar Sekunden; Autofill im Formular selbst darf nicht als Bot zählen) */
  useEffect(() => {
    if (step >= 1 && !gateSeit.current) gateSeit.current = Date.now();
  }, [step]);

  /* Bei jedem Schrittwechsel: nach oben (eingebettet: zum Rechner) und Fokus auf die neue Frage.
     Beim allerersten Render nicht springen, sonst zieht eine eingebettete Instanz die Seite beim
     Laden zum Rechner. */
  useEffect(() => {
    if (erstesRender.current) {
      erstesRender.current = false;
      if (!embedded) headingRef.current?.focus({ preventScroll: true });
      return;
    }
    if (embedded) containerRef.current?.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, embedded]);

  const kontaktOk =
    name.trim().length >= 2 &&
    firma.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    phone.replace(/\D/g, "").length >= 8;

  /* Antwort setzen und nach kurzer Pause automatisch weiter (sichtbares Auswahl-Feedback) */
  function waehleUndWeiter<T>(setter: (v: T) => void, value: T, naechster: number) {
    setter(value);
    clearAdvanceTimer();
    advanceTimer.current = window.setTimeout(() => setStep(naechster), 320);
  }

  async function absenden() {
    if (sendingRef.current || anzahl === null || stunden === null) return;
    if (!kontaktOk) {
      setError("Bitte prüfe deine Angaben: Name, Firma, eine gültige E-Mail und deine Handynummer mit Vorwahl, z. B. 0171 …");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(null);

    const payload = JSON.stringify({
      t0: gateSeit.current || undefined,
      sid: leseSitzungsId(),
      name,
      firma,
      email,
      phone,
      ausschreibungenProMonat: anzahl,
      stundenProAusschreibung: stunden,
      liegenGelassen: liegenGelassen && LIEGEN_GHL.has(liegenGelassen) ? liegenGelassen : undefined,
      liegenUnklar: liegenGelassen === "Weiß ich nicht genau" ? true : undefined,
      kalkulationWer: wer ? WER_GHL[wer] : undefined,
      kalkulationTool: tool ? TOOL_GHL[tool] : undefined,
      zusatz,
      quelle,
      utm: leseAttribution(),
      whatsappEinwilligung: whatsappOk,
      whatsappEinwilligungVersion: WHATSAPP_EINWILLIGUNG_VERSION,
      seite: typeof window !== "undefined" ? window.location.href.slice(0, 500) : undefined,
    });
    const post = () =>
      fetch("/api/preisrechner-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });

    try {
      let res = await post();
      if (!res.ok && res.status >= 500) {
        // Ein Infrastruktur-Schluckauf darf keinen fertigen Lead kosten: einmal automatisch neu versuchen
        await new Promise((r) => setTimeout(r, 1500));
        res = await post();
      }
      if (!res.ok) throw new Error(String(res.status));
      trackLead(quelle, berechneErsparnis(anzahl, stunden).ersparnisEur);
      setFertig(true);
      document.documentElement.setAttribute("data-rechner-fertig", "1");
      window.dispatchEvent(new Event("mk:rechner_fertig"));
      setStep(RESULT_STEP);
    } catch {
      setError(`Das hat leider nicht geklappt. Bitte versuche es noch einmal oder schreib uns direkt an ${FIRMA.email}.`);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const istStunden = anzahl !== null && stunden !== null ? Math.round(anzahl * stunden) : null;
  const ergebnis = anzahl !== null && stunden !== null ? berechneErsparnis(anzahl, stunden) : null;
  const heiss = (anzahl ?? 0) >= PRICING.heissSchwelleAusschreibungen || liegenGelassen === "mehr als 5";
  /* Startet bei ~14 %, Gate ~86 %: 100 % gibt es erst mit dem Ergebnis */
  const fortschritt = Math.min(100, Math.round(((step + 1) / (GATE_STEP + 2)) * 100));

  const inputStyle = { border: "1px solid var(--color-border)", background: "var(--color-bg)" };
  const headingProps = { ref: headingRef, tabIndex: -1, style: { outline: "none" } as const };
  /* Eigenständige Seite: die Frage ist die H1. Eingebettet hat die Landingpage schon eine H1. */
  const Frage: "h1" | "h2" = embedded ? "h2" : "h1";
  const frageKlasse = embedded ? "text-xl sm:text-2xl font-bold tracking-tight mb-2 leading-tight" : "text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight";
  const anzahlLabel = ANZAHL_KLASSEN.find((k) => k.value === anzahl)?.label;
  const stundenLabel = STUNDEN_KLASSEN.find((k) => k.value === stunden)?.label;

  const inhalt = (
    <div
      ref={containerRef}
      className={embedded ? "max-w-xl mx-auto" : "pt-28 px-6 max-w-xl mx-auto"}
      style={embedded ? { scrollMarginTop: "96px" } : undefined}
    >
        {step < RESULT_STEP && (
          <>
            {embedded && titel && step === 0 && (
              <p className="text-lg font-bold tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>
                {titel}
              </p>
            )}
            {/* Fortschritt mit Zeitversprechen: nimmt die Hürde */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {!embedded ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--color-primary)" }}>
                    Ersparnis-Rechner
                  </p>
                ) : <span />}
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {step < GATE_STEP ? `Frage ${step + 1} von 5 · keine 60 Sekunden` : "Fast geschafft"}
                </p>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--color-border)" }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={RESULT_STEP}
                aria-valuenow={step}
                aria-label="Fortschritt im Ersparnis-Rechner"
              >
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${fortschritt}%`, background: "var(--color-primary)" }} />
              </div>
            </div>

            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center text-xs font-medium mb-2 py-3 pr-3 hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-text-muted)", minHeight: "44px" }}
              >
                ← zurück
              </button>
            )}
          </>
        )}

        {/* Frage 1: Anzahl (Klassen statt Slider: mit dem Daumen bedienbar, gleiche Bedienung wie alle anderen Fragen) */}
        {step === 0 && (
          <div key="q0" className="step-enter">
            <Frage {...headingProps} className={frageKlasse}>
              Wie viele Ausschreibungen bearbeitet ihr pro Monat?
            </Frage>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              Grobe Schätzung reicht.
            </p>
            <div className="grid gap-3">
              {ANZAHL_KLASSEN.map((o) => (
                <ChoiceButton key={o.value} label={o.label} selected={anzahl === o.value} onClick={() => waehleUndWeiter(setAnzahl, o.value, 1)} />
              ))}
            </div>
            {startHinweis && (
              <p className="text-xs mt-4 leading-relaxed" style={{ color: "var(--color-text-faint)" }}>
                {startHinweis}
              </p>
            )}
          </div>
        )}

        {/* Frage 2: Dauer */}
        {step === 1 && (
          <div key="q1" className="step-enter">
            <Frage {...headingProps} className={frageKlasse}>
              Wie lange dauert eine Ausschreibungs-Kalkulation bei euch?
            </Frage>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              Von den Vergabeunterlagen bis zum fertigen Angebot, alles zusammen.
            </p>
            <div className="grid gap-3">
              {STUNDEN_KLASSEN.map((o) => (
                <ChoiceButton key={o.value} label={o.label} selected={stunden === o.value} onClick={() => waehleUndWeiter(setStunden, o.value, 2)} />
              ))}
            </div>
          </div>
        )}

        {/* Frage 3: Liegen gelassene (Verlust-Frage, mit sichtbarem Zwischenwert aus 1 x 2) */}
        {step === 2 && (
          <div key="q2" className="step-enter">
            {istStunden !== null && (
              <p className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ background: "rgba(5,112,60,0.08)", color: "var(--color-primary)" }}>
                Das sind rund {istStunden.toLocaleString("de-DE")} Stunden im Monat …
              </p>
            )}
            <Frage {...headingProps} className={frageKlasse}>
              Wie viele Ausschreibungen lasst ihr liegen, weil die Zeit fehlt?
            </Frage>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              Jede davon ist ein Auftrag, bei dem ihr gar nicht erst mitbietet.
            </p>
            <div className="grid gap-3">
              {LIEGEN_OPTIONEN.map((o) => (
                <ChoiceButton key={o} label={o} selected={liegenGelassen === o} onClick={() => waehleUndWeiter(setLiegenGelassen, o, 3)} />
              ))}
            </div>
          </div>
        )}

        {/* Frage 4: Wer */}
        {step === 3 && (
          <div key="q3" className="step-enter">
            <Frage {...headingProps} className={frageKlasse}>
              Wer kalkuliert die Ausschreibungen bei euch?
            </Frage>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              Damit deine Auswertung an die richtige Stelle geht.
            </p>
            <div className="grid gap-3">
              {WER_OPTIONEN.map((o) => (
                <ChoiceButton key={o} label={o} selected={wer === o} onClick={() => waehleUndWeiter(setWer, o, 4)} />
              ))}
            </div>
          </div>
        )}

        {/* Frage 5: Womit */}
        {step === 4 && (
          <div key="q4" className="step-enter">
            <Frage {...headingProps} className={frageKlasse}>
              Und womit wird kalkuliert?
            </Frage>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              Damit deine Auswertung zeigt, was sich konkret ändert.
            </p>
            <div className="grid gap-3">
              {TOOL_OPTIONEN.map((o) => (
                <ChoiceButton key={o} label={o} selected={tool === o} onClick={() => waehleUndWeiter(setTool, o, GATE_STEP)} />
              ))}
            </div>
          </div>
        )}

        {/* Gate: Auswertung zuschicken. Service-Framing statt "freischalten". */}
        {step === GATE_STEP && ergebnis && istStunden !== null && (
          <div key="gate" className="step-enter">
            <Frage {...headingProps} className={frageKlasse}>
              Deine Auswertung ist fertig. Wohin sollen wir sie schicken?
            </Frage>
            <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
              {wer !== null && wer !== "Ich selbst (Inhaber)" ? "Per E-Mail, mit Rechenweg, zum Weiterleiten an die Geschäftsführung." : "Per E-Mail, mit Rechenweg."}{" "}
              Danach meldet sich {FIRMA.geschaeftsfuehrer} und sagt dir im Gespräch, was MerKalku bei euch kostet.
            </p>

            {/* Echter Teaser (ohne Gate berechenbar) + verdecktes Ergebnis dahinter */}
            <div className="rounded-2xl p-6 text-center mb-4 relative overflow-hidden" style={{ background: "rgba(5,112,60,0.07)", border: "2px solid var(--color-primary)" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-text)" }}>
                Ihr steckt aktuell rund {istStunden.toLocaleString("de-DE")} Stunden im Monat in Ausschreibungen.
              </p>
              <p className="text-sm mb-1" style={{ color: "var(--color-primary)" }}>
                Davon frei werdend mit MerKalku
              </p>
              <p aria-hidden="true" className="text-5xl font-bold tracking-tight select-none" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", filter: "blur(14px)" }}>
                {Math.round(ergebnis.gesparteStunden).toLocaleString("de-DE")} Std.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                absenden();
              }}
            >
              <div className="grid gap-3">
                <input type="text" name="name" required minLength={2} placeholder="Vor- und Nachname" aria-label="Vor- und Nachname" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="px-4 py-3.5 rounded-xl text-base" style={inputStyle} />
                <input type="text" name="organization" required minLength={2} placeholder="Firma" aria-label="Firma" value={firma} onChange={(e) => setFirma(e.target.value)} autoComplete="organization" className="px-4 py-3.5 rounded-xl text-base" style={inputStyle} />
                <input type="email" name="email" required placeholder="Geschäftliche E-Mail" aria-label="Geschäftliche E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="px-4 py-3.5 rounded-xl text-base" style={inputStyle} />
                <div>
                  <input type="tel" name="tel" required pattern="[0-9+ ()/-]{8,}" placeholder="Handynummer" aria-label="Handynummer" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" className="w-full px-4 py-3.5 rounded-xl text-base" style={inputStyle} />
                  <p className="text-xs mt-1.5 ml-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                    Damit {FIRMA.geschaeftsfuehrer} dir den Preis sagen kann und für Rückfragen zur Auswertung. Es meldet sich der Gründer persönlich, sonst niemand.
                  </p>
                </div>

                {/* WhatsApp ist elektronische Post im Sinne des UWG: eigene, leere Einwilligung, getrennt vom Datenschutzhinweis */}
                <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer rounded-xl p-3" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                  <input
                    type="checkbox"
                    name="whatsapp_ok"
                    checked={whatsappOk}
                    onChange={(e) => setWhatsappOk(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#05703C]"
                  />
                  <span style={{ color: "var(--color-text)" }}>
                    {WHATSAPP_EINWILLIGUNG_TEXT}
                    <span className="block text-xs mt-1" style={{ color: "var(--color-text-faint)" }}>
                      Ohne Haken: kurzer Rückruf statt WhatsApp.
                    </span>
                  </span>
                </label>

                {/* Honeypot: für Menschen unsichtbar, Name bewusst ohne Autofill-Bedeutung */}
                <input
                  type="text"
                  name="pr_zusatz_x"
                  value={zusatz}
                  onChange={(e) => setZusatz(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm mt-4 font-medium" style={{ color: "var(--color-danger)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full mt-5 px-7 py-4 text-base font-semibold rounded-xl shadow-[0_12px_30px_-10px_rgba(5,112,60,0.5)] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {sending ? "Wird gerechnet …" : "Auswertung anzeigen"}
              </button>
              <p className="text-xs mt-3 leading-relaxed text-center" style={{ color: "var(--color-text-muted)" }}>
                Kein Vertrag, kein Newsletter. Deine Angaben nutzen wir für deine Auswertung und das Gespräch dazu, Details in der{" "}
                <a href="/datenschutz" className="underline hover:opacity-70">
                  Datenschutzerklärung
                </a>
                .
              </p>
            </form>

          </div>
        )}

        {/* Ergebnis */}
        {step === RESULT_STEP && anzahl !== null && stunden !== null && (
          <Ergebnis anzahl={anzahl} stunden={stunden} liegenGelassen={liegenGelassen} wer={wer} whatsappOk={whatsappOk} heiss={heiss} />
        )}
    </div>
  );

  if (embedded) return inhalt;

  return (
    <main className="min-h-screen pb-20" style={{ background: "var(--color-bg)" }}>
      {/* Schlanke Nav: im Funnel ohne konkurrierenden CTA */}
      <nav
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 backdrop-blur-xl"
        style={{ background: "rgba(247,251,249,0.88)", borderBottom: "1px solid var(--color-border)" }}
      >
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="MerKalku" width={34} height={34} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight hidden sm:inline">MerKalku</span>
        </Link>
      </nav>
      {inhalt}
    </main>
  );
}
