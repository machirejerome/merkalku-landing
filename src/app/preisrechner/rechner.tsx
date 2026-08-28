"use client";

import { useEffect, useRef, useState } from "react";
import { PRICING, CALENDAR_URL, berechneErsparnis } from "@/lib/pricing-config";

const LOGO_URL = "/logo.webp";
const STORAGE_KEY = "preisrechner_state_v1";

/* Eine Frage pro Bildschirm (Typeform-Prinzip): winzige Schritte halten
   die Leute in Bewegung, Auto-Weiter nach jeder Antwort erspart Klicks. */

const STUNDEN_OPTIONEN = [
  { label: "unter 1 Stunde", value: 0.75 },
  { label: "1–2 Stunden", value: 1.5 },
  { label: "2–4 Stunden", value: 3 },
  { label: "4–8 Stunden", value: 6 },
  { label: "mehr als 8 Stunden", value: 10 },
];
const LIEGEN_OPTIONEN = ["Keine", "1–2 pro Monat", "3–5 pro Monat", "mehr als 5"];
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

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function Ergebnis({
  ausschreibungen,
  istStunden,
  istKostenEur,
  gesparteStunden,
  ersparnisEur,
}: {
  ausschreibungen: number;
  istStunden: number;
  istKostenEur: number;
  gesparteStunden: number;
  ersparnisEur: number;
}) {
  const animiert = useCountUp(ersparnisEur, 1200);
  return (
    <div className="step-enter">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3 text-center" style={{ color: "var(--color-primary)" }}>
        Deine Auswertung
      </p>

      {/* Die eine große Zahl zuerst – alles andere kommt danach */}
      <div
        className="rounded-2xl p-8 sm:p-10 text-center mb-4"
        style={{ background: "rgba(5,112,60,0.07)", border: "2px solid var(--color-primary)" }}
      >
        <p className="text-sm mb-2" style={{ color: "var(--color-primary)" }}>
          Mögliche Ersparnis mit MerKalku
        </p>
        <p
          aria-hidden="true"
          className="text-5xl sm:text-6xl font-bold tracking-tight"
          style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}
        >
          {animiert.toLocaleString("de-DE")} €
        </p>
        <span className="sr-only">{ersparnisEur.toLocaleString("de-DE")} Euro pro Monat</span>
        <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
          pro Monat · {Math.round(gesparteStunden).toLocaleString("de-DE")} Stunden, die ihr zurückbekommt
        </p>
      </div>

      <div className="rounded-xl p-5 mb-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Heute stecken bei euch ca.{" "}
          <strong style={{ color: "var(--color-text)" }}>
            {istStunden.toLocaleString("de-DE")} Stunden ≈ {istKostenEur.toLocaleString("de-DE")} € pro Monat
          </strong>{" "}
          in {ausschreibungen} Ausschreibungen.
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--color-text-faint)" }}>
          Konservativ gerechnet mit {PRICING.stundensatzEur} €/Büro-Stunde und{" "}
          {PRICING.merkalkuStundenProAusschreibung * 60} Minuten je Ausschreibung mit MerKalku.
        </p>
      </div>

      <div className="rounded-xl p-5 mb-10" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          📬 <strong style={{ color: "var(--color-text)" }}>Dein persönliches Preisangebot ist unterwegs</strong>{" "}
          – in wenigen Minuten per E-Mail und WhatsApp.
        </p>
      </div>

      <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <h2 className="text-xl font-bold tracking-tight mb-2">Hol dir die Zahlen schwarz auf weiß.</h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Im kostenlosen 30-Minuten-Praxischeck kalkulieren wir eine echte Ausschreibung von euch live.
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          <iframe src={CALENDAR_URL} className="w-full border-0" style={{ minHeight: "750px" }} title="Praxischeck buchen" />
        </div>
        <p className="text-xs mt-3 text-center">
          <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>
            Kalender lädt nicht? Termin hier direkt buchen →
          </a>
        </p>
      </div>
    </div>
  );
}

export default function Rechner() {
  const [step, setStepState] = useState(0);
  const [ausschreibungen, setAusschreibungen] = useState(8);
  const [liegenGelassen, setLiegenGelassen] = useState<string | null>(null);
  const [stunden, setStunden] = useState<number | null>(null);
  const [wer, setWer] = useState<string | null>(null);
  const [tool, setTool] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [firma, setFirma] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zusatz, setZusatz] = useState(""); // Honeypot – bewusst OHNE Autofill-Semantik benannt
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advanceTimer = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

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
    try {
      window.history.pushState({ prStep: n }, "");
    } catch {}
  }

  /* Beim Laden: gespeicherte Antworten wiederherstellen + History initialisieren */
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.ausschreibungen === "number") setAusschreibungen(s.ausschreibungen);
        if (typeof s.liegenGelassen === "string") setLiegenGelassen(s.liegenGelassen);
        if (typeof s.stunden === "number") setStunden(s.stunden);
        if (typeof s.wer === "string") setWer(s.wer);
        if (typeof s.tool === "string") setTool(s.tool);
        if (typeof s.step === "number") {
          // Ohne Stunden-Antwort kann das Gate nicht rechnen – dann höchstens bis Frage 3 springen
          const cap = typeof s.stunden === "number" ? GATE_STEP : 2;
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
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* Antworten fortlaufend sichern (übersteht Tab-Wechsel und Reload) */
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step: Math.min(step, GATE_STEP), ausschreibungen, liegenGelassen, stunden, wer, tool })
      );
    } catch {}
  }, [step, ausschreibungen, liegenGelassen, stunden, wer, tool]);

  /* Bei jedem Schrittwechsel: nach oben und Fokus auf die neue Frage (Screenreader) */
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const kontaktOk =
    name.trim().length >= 2 &&
    firma.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    phone.replace(/\D/g, "").length >= 8;

  /* Antwort setzen und nach kurzer Pause automatisch weiter */
  function waehleUndWeiter<T>(setter: (v: T) => void, value: T, naechster: number) {
    setter(value);
    clearAdvanceTimer();
    advanceTimer.current = window.setTimeout(() => setStep(naechster), 300);
  }

  async function absenden() {
    if (sendingRef.current || stunden === null) return;
    if (!kontaktOk) {
      setError("Bitte prüfe deine Angaben – wir brauchen Name, Firma, eine gültige E-Mail und deine Handynummer.");
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(null);

    const payload = JSON.stringify({
      name,
      firma,
      email,
      phone,
      ausschreibungenProMonat: ausschreibungen,
      stundenProAusschreibung: stunden,
      liegenGelassen: liegenGelassen ?? undefined,
      kalkulationWer: wer ? WER_GHL[wer] : undefined,
      kalkulationTool: tool ? TOOL_GHL[tool] : undefined,
      zusatz,
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
      setStep(RESULT_STEP);
    } catch {
      setError("Das hat leider nicht geklappt. Bitte versuche es noch einmal – oder schreib uns direkt an info@merkalku.de.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const ergebnis = stunden !== null ? berechneErsparnis(ausschreibungen, stunden) : null;
  /* Startet bei ~14 %, Gate ~86 % – 100 % gibt es erst mit dem Ergebnis */
  const fortschritt = Math.min(100, Math.round(((step + 1) / (GATE_STEP + 2)) * 100));

  const inputStyle = { border: "1px solid var(--color-border)", background: "var(--color-bg)" };
  const headingProps = { ref: headingRef, tabIndex: -1, style: { outline: "none" } as const };

  return (
    <main className="min-h-screen pb-20" style={{ background: "var(--color-bg)" }}>
      {/* Schlanke Nav – im Funnel ohne konkurrierenden CTA */}
      <nav
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 backdrop-blur-xl"
        style={{ background: "rgba(247,251,249,0.88)", borderBottom: "1px solid var(--color-border)" }}
      >
        <a href="/" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="MerKalku" width={34} height={34} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight hidden sm:inline">MerKalku</span>
        </a>
        {step >= RESULT_STEP && (
          <a
            href="/#termin"
            className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Termin sichern
          </a>
        )}
      </nav>

      <div className="pt-28 px-6 max-w-xl mx-auto">
        {step < RESULT_STEP && (
          <>
            {/* Fortschritt mit Zeitversprechen – nimmt die Hürde */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--color-primary)" }}>
                  Preisrechner
                </p>
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
                aria-label="Fortschritt im Preisrechner"
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${fortschritt}%`, background: "var(--color-primary)" }}
                />
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

        {/* ── Frage 1: Volumen (Slider) ── */}
        {step === 0 && (
          <form
            key="q0"
            className="step-enter"
            onSubmit={(e) => {
              e.preventDefault();
              setStep(1);
            }}
          >
            <h1 {...headingProps} className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight">
              Wie viele Ausschreibungen bearbeitet ihr pro Monat?
            </h1>
            <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
              Grobe Schätzung reicht völlig.
            </p>
            <p
              className="text-6xl font-bold text-center mb-6 tracking-tight"
              style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}
            >
              {ausschreibungen}
              {ausschreibungen >= 50 ? "+" : ""}
            </p>
            <input
              type="range"
              min={1}
              max={50}
              value={Math.min(ausschreibungen, 50)}
              onChange={(e) => setAusschreibungen(Number(e.target.value))}
              className="w-full accent-[#05703C] mb-8"
              style={{ height: "44px" }}
              aria-label="Ausschreibungen pro Monat"
              aria-valuetext={ausschreibungen >= 50 ? "50 oder mehr Ausschreibungen" : `${ausschreibungen} Ausschreibungen`}
            />
            <button
              type="submit"
              className="btn-primary w-full px-7 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              Weiter →
            </button>
          </form>
        )}

        {/* ── Frage 2: Liegen gelassene ── */}
        {step === 1 && (
          <div key="q1" className="step-enter">
            <h1 {...headingProps} className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight">
              Wie viele Ausschreibungen lasst ihr liegen, weil die Zeit fehlt?
            </h1>
            <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
              Jede davon ist ein Auftrag, bei dem ihr gar nicht erst mitbietet.
            </p>
            <div className="grid gap-3">
              {LIEGEN_OPTIONEN.map((o) => (
                <ChoiceButton key={o} label={o} selected={liegenGelassen === o} onClick={() => waehleUndWeiter(setLiegenGelassen, o, 2)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Frage 3: Stunden ── */}
        {step === 2 && (
          <div key="q2" className="step-enter">
            <h1 {...headingProps} className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight">
              Wie lange dauert eine Ausschreibungs-Kalkulation bei euch?
            </h1>
            <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
              Vom Leistungsverzeichnis bis zum fertigen Angebot.
            </p>
            <div className="grid gap-3">
              {STUNDEN_OPTIONEN.map((o) => (
                <ChoiceButton key={o.value} label={o.label} selected={stunden === o.value} onClick={() => waehleUndWeiter(setStunden, o.value, 3)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Frage 4: Wer ── */}
        {step === 3 && (
          <div key="q3" className="step-enter">
            {stunden !== null && (
              <p
                className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
                style={{ background: "rgba(5,112,60,0.08)", color: "var(--color-primary)" }}
              >
                Das sind schon ca. {Math.round(ausschreibungen * stunden)} Stunden pro Monat …
              </p>
            )}
            <h1 {...headingProps} className="text-2xl sm:text-3xl font-bold tracking-tight mb-8 leading-tight">
              Wer kalkuliert die Ausschreibungen bei euch?
            </h1>
            <div className="grid gap-3">
              {WER_OPTIONEN.map((o) => (
                <ChoiceButton key={o} label={o} selected={wer === o} onClick={() => waehleUndWeiter(setWer, o, 4)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Frage 5: Womit ── */}
        {step === 4 && (
          <div key="q4" className="step-enter">
            <h1 {...headingProps} className="text-2xl sm:text-3xl font-bold tracking-tight mb-8 leading-tight">
              Und womit wird kalkuliert?
            </h1>
            <div className="grid gap-3">
              {TOOL_OPTIONEN.map((o) => (
                <ChoiceButton key={o} label={o} selected={tool === o} onClick={() => waehleUndWeiter(setTool, o, GATE_STEP)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Gate: Auswertung freischalten ── */}
        {step === GATE_STEP && ergebnis && (
          <div key="gate" className="step-enter">
            <h1 {...headingProps} className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 leading-tight">
              Deine Auswertung ist fertig. 🎉
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              Sag uns nur noch, wohin wir Auswertung und dein persönliches Preisangebot senden dürfen.
            </p>

            {/* Verdecktes Ergebnis – Neugier ist der beste Absende-Grund.
                Dummy-Ziffern statt der echten Zahl, damit nichts über Quelltext/Reader-Mode leakt */}
            <div
              className="rounded-2xl p-6 text-center mb-6 relative overflow-hidden"
              style={{ background: "rgba(5,112,60,0.07)", border: "2px solid var(--color-primary)" }}
              aria-hidden="true"
            >
              <p className="text-sm mb-1" style={{ color: "var(--color-primary)" }}>
                Mögliche Ersparnis mit MerKalku
              </p>
              <p
                className="text-5xl font-bold tracking-tight select-none"
                style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", filter: "blur(14px)" }}
              >
                {ergebnis.ersparnisEur.toLocaleString("de-DE").replace(/\d/g, "8")} €
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                🔒 wird nach dem Absenden angezeigt
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
                  <p className="text-xs mt-1.5 ml-1" style={{ color: "var(--color-text-muted)" }}>
                    Dorthin senden wir dein Preisangebot – per WhatsApp oder SMS.
                  </p>
                </div>
                {/* Honeypot – für Menschen unsichtbar, Name bewusst ohne Autofill-Bedeutung */}
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
                {sending ? "Wird freigeschaltet …" : "Auswertung freischalten →"}
              </button>

              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4 text-xs" style={{ color: "var(--color-text-faint)" }}>
                <span>✓ 100 % kostenlos</span>
                <span>✓ Kein Spam</span>
                <span>✓ Antwort in Minuten</span>
              </div>

              <p className="text-xs mt-4 text-center leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Hinweise zur Datenverarbeitung:{" "}
                <a href="/datenschutz" className="underline hover:opacity-70">
                  Datenschutzerklärung
                </a>
              </p>
            </form>

            <div className="rounded-xl p-4 mt-6" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <p className="text-sm italic leading-relaxed mb-2" style={{ color: "var(--color-text-muted)" }}>
                „Was wir vorher in drei Tagen gemacht haben, machen wir jetzt in einer Stunde.“
              </p>
              <p className="text-xs font-semibold">
                Marco Kante ·{" "}
                <span className="font-normal" style={{ color: "var(--color-text-faint)" }}>
                  GF, Merbeck Gebäudeservice GmbH
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ── Ergebnis ── */}
        {step === RESULT_STEP && ergebnis && (
          <Ergebnis
            ausschreibungen={ausschreibungen}
            istStunden={ergebnis.istStunden}
            istKostenEur={ergebnis.istKostenEur}
            gesparteStunden={ergebnis.gesparteStunden}
            ersparnisEur={ergebnis.ersparnisEur}
          />
        )}
      </div>
    </main>
  );
}
