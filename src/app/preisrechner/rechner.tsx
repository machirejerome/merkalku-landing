"use client";

import { useState } from "react";
import { PRICING, CALENDAR_URL, berechneErsparnis } from "@/lib/pricing-config";

const LOGO_URL = "/logo.webp";

const STUNDEN_OPTIONEN = [
  { label: "1–2 Stunden", value: 1.5 },
  { label: "2–4 Stunden", value: 3 },
  { label: "4–8 Stunden", value: 6 },
  { label: "mehr als 8 Stunden", value: 10 },
];
const LIEGEN_OPTIONEN = ["0", "1–2", "3–5", "mehr als 5"];
const WER_OPTIONEN = ["Inhaber selbst", "Kalkulator", "Büro", "Extern"];
const TOOL_OPTIONEN = ["Excel", "Software", "Papier und Erfahrung"];

function OptionButton({
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
      className="px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-150 w-full"
      style={{
        border: selected ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
        background: selected ? "rgba(5,112,60,0.07)" : "var(--color-bg-card)",
        color: selected ? "var(--color-primary)" : "var(--color-text)",
      }}
    >
      {label}
    </button>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold mb-3 mt-8 first:mt-0">{children}</p>;
}

export default function Rechner() {
  const [step, setStep] = useState(0);
  const [ausschreibungen, setAusschreibungen] = useState(8);
  const [liegenGelassen, setLiegenGelassen] = useState<string | null>(null);
  const [stunden, setStunden] = useState<number | null>(null);
  const [wer, setWer] = useState<string | null>(null);
  const [tool, setTool] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [firma, setFirma] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kontaktOk =
    name.trim().length >= 2 &&
    firma.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    phone.replace(/\D/g, "").length >= 6;

  async function absenden() {
    if (!kontaktOk || stunden === null) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/preisrechner-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          firma,
          email,
          phone,
          ausschreibungenProMonat: ausschreibungen,
          stundenProAusschreibung: stunden,
          liegenGelassen: liegenGelassen ?? undefined,
          kalkulationWer: wer ?? undefined,
          kalkulationTool: tool ?? undefined,
          website,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Das hat leider nicht geklappt. Bitte versuche es noch einmal – oder schreib uns direkt an info@merkalku.de.");
    } finally {
      setSending(false);
    }
  }

  const ergebnis = stunden !== null ? berechneErsparnis(ausschreibungen, stunden) : null;

  return (
    <main className="min-h-screen pb-20" style={{ background: "var(--color-bg)" }}>
      {/* Schlanke Nav */}
      <nav
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 backdrop-blur-xl"
        style={{ background: "rgba(247,251,249,0.88)", borderBottom: "1px solid var(--color-border)" }}
      >
        <a href="/" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="MerKalku" width={34} height={34} className="rounded-lg" />
          <span className="text-lg font-bold tracking-tight hidden sm:inline">MerKalku</span>
        </a>
        <a
          href="/#termin"
          className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Termin sichern
        </a>
      </nav>

      <div className="pt-28 px-6 max-w-2xl mx-auto">
        {step < 3 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary)" }}>
              Preisrechner
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 leading-tight">
              Was kosten euch Ausschreibungen wirklich?
            </h1>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Drei kurze Schritte – dann siehst du deine mögliche Ersparnis und bekommst dein
              persönliches Preisangebot per E-Mail und WhatsApp.
            </p>

            {/* Fortschritt */}
            <div className="flex items-center gap-2 mb-8" aria-label={`Schritt ${step + 1} von 3`}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{ background: i <= step ? "var(--color-primary)" : "var(--color-border)" }}
                />
              ))}
              <span className="text-xs ml-2" style={{ color: "var(--color-text-faint)" }}>
                {step + 1}/3
              </span>
            </div>
          </>
        )}

        {/* ── Schritt 1: Volumen ── */}
        {step === 0 && (
          <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <StepLabel>Wie viele Ausschreibungen bearbeitet ihr pro Monat?</StepLabel>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={30}
                value={Math.min(ausschreibungen, 30)}
                onChange={(e) => setAusschreibungen(Number(e.target.value))}
                className="flex-1 accent-[#05703C]"
                aria-label="Ausschreibungen pro Monat"
              />
              <input
                type="number"
                min={1}
                max={500}
                value={ausschreibungen}
                onChange={(e) => setAusschreibungen(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                className="w-20 px-3 py-2 rounded-lg text-center font-semibold"
                style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
              />
            </div>

            <StepLabel>Wie viele lasst ihr pro Monat liegen, weil die Zeit fehlt?</StepLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LIEGEN_OPTIONEN.map((o) => (
                <OptionButton key={o} label={o} selected={liegenGelassen === o} onClick={() => setLiegenGelassen(o)} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-primary w-full mt-8 px-7 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              Weiter →
            </button>
          </div>
        )}

        {/* ── Schritt 2: Ist-Zustand ── */}
        {step === 1 && (
          <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <StepLabel>Wie lange dauert eine Ausschreibungs-Kalkulation bei euch heute?</StepLabel>
            <div className="grid grid-cols-2 gap-2">
              {STUNDEN_OPTIONEN.map((o) => (
                <OptionButton key={o.value} label={o.label} selected={stunden === o.value} onClick={() => setStunden(o.value)} />
              ))}
            </div>

            <StepLabel>Wer kalkuliert bei euch?</StepLabel>
            <div className="grid grid-cols-2 gap-2">
              {WER_OPTIONEN.map((o) => (
                <OptionButton key={o} label={o} selected={wer === o} onClick={() => setWer(o)} />
              ))}
            </div>

            <StepLabel>Womit wird kalkuliert?</StepLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TOOL_OPTIONEN.map((o) => (
                <OptionButton key={o} label={o} selected={tool === o} onClick={() => setTool(o)} />
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="px-6 py-4 text-base font-semibold rounded-xl"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              >
                ← Zurück
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={stunden === null || !wer || !tool}
                className="btn-primary flex-1 px-7 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Weiter →
              </button>
            </div>
          </div>
        )}

        {/* ── Schritt 3: Kontakt ── */}
        {step === 2 && (
          <form
            className="rounded-2xl p-6 sm:p-8"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
            onSubmit={(e) => {
              e.preventDefault();
              absenden();
            }}
          >
            <StepLabel>Fast geschafft – wohin dürfen wir Auswertung und Preisangebot senden?</StepLabel>
            <div className="grid gap-3">
              <input
                type="text"
                required
                placeholder="Vor- und Nachname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="px-4 py-3 rounded-xl text-sm"
                style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
              />
              <input
                type="text"
                required
                placeholder="Firma"
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
                autoComplete="organization"
                className="px-4 py-3 rounded-xl text-sm"
                style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
              />
              <input
                type="email"
                required
                placeholder="Geschäftliche E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="px-4 py-3 rounded-xl text-sm"
                style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
              />
              <input
                type="tel"
                required
                placeholder="Handynummer (WhatsApp – dorthin senden wir dein Preisangebot)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className="px-4 py-3 rounded-xl text-sm"
                style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)" }}
              />
              {/* Honeypot – für Menschen unsichtbar */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
              />
            </div>

            <p className="text-xs mt-4 leading-relaxed" style={{ color: "var(--color-text-faint)" }}>
              Mit dem Absenden erhältst du deine Auswertung auf dieser Seite sowie dein persönliches
              Preisangebot per E-Mail und WhatsApp. Hinweise zur Datenverarbeitung:{" "}
              <a href="/datenschutz" className="underline hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>
                Datenschutzerklärung
              </a>
            </p>

            {error && (
              <p className="text-sm mt-4 font-medium" style={{ color: "var(--color-danger)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-4 text-base font-semibold rounded-xl"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              >
                ← Zurück
              </button>
              <button
                type="submit"
                disabled={!kontaktOk || sending}
                className="btn-primary flex-1 px-7 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {sending ? "Wird berechnet …" : "Ersparnis anzeigen →"}
              </button>
            </div>
          </form>
        )}

        {/* ── Ergebnis ── */}
        {step === 3 && ergebnis && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary)" }}>
              Deine Auswertung
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8 leading-tight">
              Da steckt richtig Geld drin.
            </h1>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl p-6" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Euer Aufwand heute
                </p>
                <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  {ergebnis.istStunden.toLocaleString("de-DE")} Std.
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  ≈ {ergebnis.istKostenEur.toLocaleString("de-DE")} € pro Monat für {ausschreibungen} Ausschreibungen
                </p>
              </div>
              <div
                className="rounded-2xl p-6"
                style={{ background: "rgba(5,112,60,0.07)", border: "2px solid var(--color-primary)" }}
              >
                <p className="text-xs mb-2" style={{ color: "var(--color-primary)" }}>
                  Mögliche Ersparnis mit MerKalku
                </p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }}>
                  ca. {ergebnis.ersparnisEur.toLocaleString("de-DE")} € / Monat
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {Math.round(ergebnis.gesparteStunden).toLocaleString("de-DE")} Stunden, die ihr zurückbekommt
                </p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-10" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                📬 <strong style={{ color: "var(--color-text)" }}>Dein persönliches Preisangebot ist unterwegs</strong> – du
                bekommst es in wenigen Minuten per E-Mail und WhatsApp.
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--color-text-faint)" }}>
                So rechnen wir: deine Angaben × {PRICING.stundensatzEur} €/Stunde Bürokosten; mit MerKalku
                kalkulieren wir konservativ mit {PRICING.merkalkuStundenProAusschreibung * 60} Minuten je
                Ausschreibung statt deiner heutigen Zeit.
              </p>
            </div>

            <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <h2 className="text-xl font-bold tracking-tight mb-2">
                Willst du die Zahlen für deinen Betrieb schwarz auf weiß?
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Im kostenlosen 30-Minuten-Praxischeck kalkulieren wir eine echte Ausschreibung von euch live.
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
                <iframe
                  src={CALENDAR_URL}
                  className="w-full border-0"
                  style={{ minHeight: "650px" }}
                  title="Praxischeck buchen"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
