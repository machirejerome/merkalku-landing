"use client";

import { useEffect, useRef, useState } from "react";

const LOGO_URL = "/logo.webp";

const CALENDAR_URL =
  "https://api.leadconnectorhq.com/widget/booking/ulqrL3P8HU0BkQLF8jcR";

/* ═══════════════════════════════════════════
   ICONS – hand-rolled, single 1.5 stroke weight
   (avoids emoji and the default Lucide/Feather AI look)
   ═══════════════════════════════════════════ */
function Icon({ children, className = "w-6 h-6" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const DocIcon = () => (
  <Icon>
    <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </Icon>
);
const AlertIcon = () => (
  <Icon>
    <path d="M12 4 2.7 20h18.6L12 4Z" />
    <path d="M12 10v4" />
    <path d="M12 17.5h.01" />
  </Icon>
);
const PersonIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Icon>
);
const TrendIcon = () => (
  <Icon>
    <path d="M4 16l5-5 3 3 7-7" />
    <path d="M16 7h4v4" />
  </Icon>
);

/* ── Fade-in wrapper ── */
function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`fade-section ${className}`}>{children}</div>;
}

/* ── Lazy Calendar – auto-resizes via iframe-resizer (GHL widget supports it natively) ── */
function LazyCalendar() {
  const ref = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [load, setLoad] = useState(false);

  /* Lazy-load: only render iframe when section scrolls into view */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoad(true); obs.disconnect(); } },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* Load iframe-resizer host script & init once iframe is mounted */
  useEffect(() => {
    if (!load || !iframeRef.current) return;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/iframe-resizer/4.3.11/iframeResizer.min.js";
    script.onload = () => {
      // @ts-expect-error – iFrameResize is added globally by the script
      if (window.iFrameResize) {
        // @ts-expect-error – iFrameResize global typing not available
        window.iFrameResize(
          {
            checkOrigin: false,
            heightCalculationMethod: "lowestElement",
            log: false,
          },
          iframeRef.current
        );
      }
    };
    document.head.appendChild(script);

    return () => { script.remove(); };
  }, [load]);

  return (
    <div ref={ref}>
      {load ? (
        <iframe
          ref={iframeRef}
          src={CALENDAR_URL}
          className="w-full border-0"
          style={{ width: "1px", minWidth: "100%", minHeight: "600px" }}
          title="Termin buchen"
        />
      ) : (
        <div className="flex items-center justify-center" style={{ minHeight: "700px", color: "var(--color-text-muted)" }}>
          <p className="text-sm">Kalender wird geladen…</p>
        </div>
      )}
    </div>
  );
}

/* ── Reusable CTA Button ── */
function CtaButton({ label = "Kostenlos Termin sichern", className = "" }: { label?: string; className?: string }) {
  return (
    <a
      href="#termin"
      className={`btn-primary group inline-flex items-center gap-2 px-7 py-4 text-base font-semibold rounded-xl shadow-[0_12px_30px_-10px_rgba(5,112,60,0.5)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] ${className}`}
    >
      {label}
      <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
    </a>
  );
}

/* ═══════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════ */
function Nav() {
  useEffect(() => {
    const nav = document.getElementById("nav");
    const handler = () => nav?.classList.toggle("shadow-sm", window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav id="nav" aria-label="Hauptnavigation" className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 backdrop-blur-xl transition-shadow" style={{ background: "rgba(247,251,249,0.88)", borderBottom: "1px solid var(--color-border)" }}>
      <a href="#" className="flex items-center gap-3">
        <img src={LOGO_URL} alt="MerKalku" width={34} height={34} className="rounded-lg" />
        <span className="text-lg font-bold tracking-tight hidden sm:inline">MerKalku</span>
      </a>
      <a href="#termin" className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
        Termin sichern
      </a>
    </nav>
  );
}

/* ═══════════════════════════════════════════
   HERO – asymmetric split: copy left, real product video right
   ═══════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center pt-28 pb-20 px-6 overflow-hidden">
      <div aria-hidden className="hero-grid absolute inset-0 pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-6xl grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        {/* Left: copy */}
        <div className="text-center lg:text-left">
          <span className="hero-animate hero-delay-1 inline-flex items-center gap-2 px-3.5 py-1.5 mb-7 text-xs font-semibold tracking-wide rounded-md" style={{ color: "var(--color-primary)", background: "rgba(5,112,60,0.07)", border: "1px solid rgba(5,112,60,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-primary-light)" }} />
            Für Gebäudereiniger mit 50+ Mitarbeitern
          </span>

          <h1 className="hero-animate hero-delay-2 text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.05] tracking-[-0.02em] mb-6">
            Ausschreibung hochladen.
            <br />
            <span style={{ color: "var(--color-primary)" }}>KI kalkuliert. Fertig.</span>
          </h1>

          <p className="hero-animate hero-delay-3 text-lg max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            PDF, Excel, CSV, GAEB – egal welches Format. MerKalku erkennt alle Räume automatisch und liefert Ihnen die{" "}
            <span className="font-semibold" style={{ color: "var(--color-text)" }}>fertige Kalkulation in Sekunden.</span>
          </p>

          <div className="hero-animate hero-delay-4 flex flex-col sm:flex-row items-center lg:items-start gap-4 sm:gap-5">
            <CtaButton />
            <p className="text-sm" style={{ color: "var(--color-text-faint)" }}>
              Kostenlos · 30 Minuten · Unverbindlich
            </p>
          </div>
        </div>

        {/* Right: hero animation – video for performance (poster = instant LCP) */}
        <a
          href="#termin"
          className="hero-animate hero-delay-3 rounded-2xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(5,112,60,0.28)] block hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero-poster.webp"
            className="w-full h-auto block"
            preload="auto"
          >
            <source src="/hero-animation.mp4" type="video/mp4" />
            <source src="/hero-animation.webm" type="video/webm" />
            <img src="/hero-poster.webp" alt="MerKalku Demo" className="w-full h-auto block" />
          </video>
        </a>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   PAIN – Mirror their daily reality
   ═══════════════════════════════════════════ */
function PainSection() {
  const pains = [
    { Icon: DocIcon, title: "Jedes Mal andere Unterlagen", text: "Ausschreibungen, Raumlisten vom Kunden, Baupläne, Grundrisse, PDFs, Excel-Tabellen, Fließtext – jedes Objekt kommt in einem anderen Format. Und jedes Mal muss alles von Hand abgetippt werden." },
    { Icon: AlertIcon, title: "Fehler, die Marge kosten", text: "Ein vergessener Zuschlag, ein falscher Mindestlohn, ein Zahlendreher in der Stundenberechnung – und der Auftrag wird zum Verlustgeschäft." },
    { Icon: PersonIcon, title: "Alles hängt an einer Person", text: "Wenn Ihr Kalkulator krank ist oder geht, steht der Betrieb still. Wissen, das nur in einem Kopf steckt, ist ein Unternehmensrisiko." },
    { Icon: TrendIcon, title: "Wachstum ohne mehr Personal?", text: "Mehr Aufträge gewinnen heißt mehr kalkulieren. Aber eine neue Bürokraft einstellen? Bei 85% Personalkostenquote?" },
  ];
  return (
    <section className="py-24 px-6">
      <FadeIn className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary)" }}>
          Kommt Ihnen das bekannt vor?
        </p>
        <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-6 leading-tight">
          Ihr Büro arbeitet am Limit –<br />und trotzdem bleiben Aufträge liegen.
        </h2>
        <p className="text-base mb-14 max-w-2xl leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Sie wissen, dass da draußen Aufträge warten. Aber zwischen Kalkulation,
          Nacharbeit und Personalplanung bleibt einfach keine Zeit, noch mehr Angebote rauszuschicken.
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          {pains.map((p, i) => (
            <div key={i} className="rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(5,112,60,0.25)]" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5" style={{ background: "rgba(5,112,60,0.08)", color: "var(--color-primary)" }}>
                <p.Icon />
              </span>
              <h3 className="text-base font-semibold mb-2">{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{p.text}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   TRANSFORMATION – Before → After (the "after" wins visually)
   ═══════════════════════════════════════════ */
function Transformation() {
  return (
    <section className="py-24 px-6" style={{ background: "var(--color-bg-card)" }}>
      <FadeIn className="max-w-5xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary)" }}>
          Die Veränderung
        </p>
        <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-14 leading-tight">
          Was sich mit MerKalku ändert
        </h2>

        <div className="grid sm:grid-cols-2 gap-5 items-stretch">
          {/* VORHER – muted, sunken */}
          <div className="rounded-2xl p-8 sm:p-10" style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-6" style={{ color: "var(--color-danger)" }}>
              Ohne MerKalku
            </p>
            <ul className="space-y-4">
              {[
                "Jedes Objekt von Hand abtippen – egal ob Ausschreibung, Kundenliste oder Bauplan",
                "Stunden pro Angebot verloren, bevor überhaupt gerechnet wird",
                "Angst vor Kalkulationsfehlern",
                "Nur 5–8 Angebote pro Monat schaffbar",
                "Wissen nur im Kopf einer Person",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  <span aria-hidden className="mt-0.5 shrink-0 font-semibold" style={{ color: "var(--color-danger)" }}>✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* NACHHER – elevated, brand-tinted, top accent */}
          <div className="relative rounded-2xl p-8 sm:p-10 shadow-[0_24px_50px_-24px_rgba(5,112,60,0.4)]" style={{ background: "var(--color-bg-card)", border: "1px solid rgba(5,112,60,0.22)", borderTop: "3px solid var(--color-primary)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-6" style={{ color: "var(--color-primary)" }}>
              Mit MerKalku
            </p>
            <ul className="space-y-4">
              {[
                "PDF, Bauplan, Excel, Kundendaten – die KI erkennt jedes Format automatisch",
                "Kalkulation in Minuten statt Stunden",
                "Zuschläge und Mindestlohn automatisch berücksichtigt",
                "Doppelt so viele Angebote rausschicken",
                "Jeder im Büro kann kalkulieren",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium leading-relaxed">
                  <span aria-hidden className="mt-0.5 shrink-0 font-semibold" style={{ color: "var(--color-primary)" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <CtaButton label="Jetzt selbst erleben" />
        </div>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   TESTIMONIAL – Social Proof
   ═══════════════════════════════════════════ */
function Testimonial() {
  return (
    <section className="py-24 px-6">
      <FadeIn className="max-w-2xl mx-auto text-center">
        <div className="relative">
          <span className="absolute -top-8 -left-2 text-7xl leading-none select-none" style={{ color: "rgba(5,112,60,0.18)", fontFamily: "var(--font-display)" }} aria-hidden>
            „
          </span>
          <blockquote className="text-2xl sm:text-[1.75rem] font-bold leading-snug tracking-tight mb-8" style={{ fontFamily: "var(--font-display)" }}>
            Was wir vorher in drei Tagen gemacht haben, machen wir jetzt in einer Stunde.
          </blockquote>
        </div>
        <div className="w-10 h-0.5 rounded-full mx-auto mb-6" style={{ background: "var(--color-primary-light)" }} />
        <p className="text-base font-semibold">Marco Kante</p>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Geschäftsführer, Merbeck Gebäudeservice GmbH, Köln
        </p>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   HOW IT WORKS – 3 Steps to reduce fear
   ═══════════════════════════════════════════ */
function HowItWorks() {
  return (
    <section className="py-24 px-6 relative overflow-hidden" style={{ background: "var(--color-primary)" }}>
      <div className="absolute -top-52 -right-52 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(45,232,154,0.1)" }} />
      <FadeIn className="max-w-5xl mx-auto relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary-light)" }}>
          In 3 Schritten
        </p>
        <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight text-white mb-6 leading-tight">
          So finden Sie heraus, ob MerKalku
          <br />für Ihren Betrieb funktioniert
        </h2>
        <p className="text-base mb-14 max-w-xl" style={{ color: "rgba(255,255,255,0.65)" }}>
          Kein langer Onboarding-Prozess. Kein Risiko. In 30 Minuten wissen Sie Bescheid.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {[
            { step: "01", title: "Termin buchen", text: "Wählen Sie unten einen freien Slot. Dauert 30 Sekunden." },
            { step: "02", title: "Praxischeck", text: "Wir nehmen ein echtes Beispiel und kalkulieren es live – vor Ihren Augen." },
            { step: "03", title: "Entscheidung", text: "Sie wissen, ob es passt. Kein Druck, kein Vertrag, kein Kleingedrucktes." },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <p className="text-2xl font-bold mb-4" style={{ color: "var(--color-primary-light)", fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}>
                {s.step}
              </p>
              <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{s.text}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="#termin"
            className="btn-light group inline-flex items-center gap-2 px-7 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Jetzt Slot aussuchen
            <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </a>
        </div>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   STATS – Defensible facts only (no fabricated metrics)
   ═══════════════════════════════════════════ */
function Stats() {
  const stats = [
    { number: "4 Formate", label: "PDF, Excel, GAEB, CSV" },
    { number: "Minuten", label: "statt Stunden je Kalkulation" },
    { number: "85 %", label: "Personalkostenquote der Branche*" },
    { number: "30 Min.", label: "kostenloser Praxischeck" },
  ];
  return (
    <section className="py-16 px-6">
      <FadeIn className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-card)" }}>
          {stats.map((s, i) => (
            <div key={i} className="text-center py-8 px-4" style={{ borderRight: i % 4 !== 3 ? "1px solid var(--color-border)" : undefined, borderBottom: i < 2 ? "1px solid var(--color-border)" : undefined }}>
              <p className="text-xl sm:text-2xl font-bold mb-1 tracking-tight" style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}>
                {s.number}
              </p>
              <p className="text-xs sm:text-sm leading-snug" style={{ color: "var(--color-text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-center" style={{ color: "var(--color-text-faint)" }}>
          * Branchenrichtwert Gebäudereinigung
        </p>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CALENDAR – Full-width embedded booking
   ═══════════════════════════════════════════ */
function Calendar() {
  return (
    <section id="termin" className="py-24 px-6 scroll-mt-24" style={{ background: "var(--color-bg-card)" }}>
      <FadeIn className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-[380px_1fr] gap-12 items-start">
          {/* Left: Copy */}
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary)" }}>
              Kostenloser Praxischeck
            </p>
            <h2 className="text-3xl sm:text-[2.25rem] font-bold tracking-tight mb-6 leading-tight">
              In 30 Minuten wissen Sie, ob MerKalku zu Ihrem Betrieb passt.
            </h2>
            <div className="space-y-4 mb-8">
              {[
                "Wir kalkulieren ein echtes Beispiel live vor Ihren Augen",
                "Sie erfahren, wo Ihr Betrieb konkret Zeit einsparen kann",
                "Keine Präsentation, kein Verkaufsgespräch – nur Praxis",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span aria-hidden className="mt-0.5 shrink-0 text-sm font-semibold" style={{ color: "var(--color-primary)" }}>✓</span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{item}</p>
                </div>
              ))}
            </div>

            {/* Micro-Testimonial */}
            <div className="rounded-xl p-5" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              <p className="text-sm italic leading-relaxed mb-3" style={{ color: "var(--color-text-muted)" }}>
                „Was wir vorher in drei Tagen gemacht haben, machen wir jetzt in einer Stunde.“
              </p>
              <p className="text-xs font-semibold">Marco Kante</p>
              <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>
                GF, Merbeck Gebäudeservice GmbH
              </p>
            </div>
          </div>

          {/* Right: Calendar – lazy loaded for performance */}
          <div className="rounded-2xl overflow-hidden shadow-[0_24px_50px_-24px_rgba(5,112,60,0.3)]" style={{ border: "1px solid var(--color-border)" }}>
            <LazyCalendar />
          </div>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: "var(--color-text-faint)" }}>
          Keine Kreditkarte · Kein Abo · Kein Kleingedrucktes
        </p>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FAQ – Objection handling
   ═══════════════════════════════════════════ */
function Faq() {
  const faqs = [
    {
      q: "Wie funktioniert MerKalku konkret?",
      a: "Sie laden Ihre Ausschreibung hoch – als PDF, Excel oder CSV. Unsere KI erkennt automatisch alle Räume, Flächen, Bodenarten und Turnus-Angaben. Sie prüfen die Daten kurz, MerKalku rechnet den Rest: Stunden, Lohnkosten, Deckungsbeitrag. Am Ende bekommen Sie ein fertiges Angebots-PDF in Ihrem Firmen-Branding. Der komplette Prozess dauert Minuten statt Stunden."
    },
    {
      q: "Was passiert mit meinen Leistungsverzeichnissen und PDFs?",
      a: "Unsere KI-Engine liest sogar komplexe Leistungsverzeichnisse mit 50–200 Seiten automatisch aus – tabellarische Listen genauso wie Grundrisse mit beschrifteten Räumen. Sie sehen das Original-PDF links und die erkannten Räume rechts, und bestätigen jeden Raum mit einem Klick. Kein Abtippen mehr."
    },
    {
      q: "Kann jeder im Büro damit arbeiten – oder brauche ich einen Spezialisten?",
      a: "Genau das ist der Punkt. MerKalku führt Schritt für Schritt durch den Prozess: Import, Validierung, Kalkulation, Revierplanung. Die Leistungswerte, Zuschläge und Lohnkosten sind hinterlegt – kein Spezialwissen nötig. Ihre Erfahrung steckt im System, nicht mehr nur im Kopf einer Person."
    },
    {
      q: "Wie hilft mir MerKalku bei der Revierplanung?",
      a: "Nach der Kalkulation verteilen Sie die Räume per Drag-and-Drop auf Reviere. Die KI schlägt automatisch eine Aufteilung vor, basierend auf Ihrer Schichtzeit. Am Ende bekommen Sie einen fertigen Revierplan als PDF – mit farbigen Markierungen auf den Original-Grundrissen. Direkt einsatzbereit für Ihre Objektleitung."
    },
    {
      q: "Ist das ein Verkaufsgespräch?",
      a: "Nein. Wir nehmen eine echte Ausschreibung und kalkulieren sie gemeinsam live durch. Danach wissen Sie, ob dieser Weg für Ihren Betrieb funktioniert. Kein Druck, kein Vertrag, kein Kleingedrucktes."
    },
    {
      q: "Was kostet MerKalku?",
      a: "Das 30-Minuten-Gespräch ist komplett kostenlos. Über Konditionen sprechen wir nur, wenn es für beide Seiten Sinn macht. Es gibt keine versteckten Kosten und keine Verpflichtung."
    },
  ];

  return (
    <section className="py-24 px-6">
      <FadeIn className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10 text-center">
          Häufige Fragen
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} open={i === 0} className="group rounded-xl overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <summary className="px-6 py-5 cursor-pointer text-sm font-semibold flex items-center justify-between list-none">
                {faq.q}
                <span className="ml-4 text-lg shrink-0 transition-transform duration-200 group-open:rotate-45" style={{ color: "var(--color-primary)" }} aria-hidden>+</span>
              </summary>
              <div className="px-6 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center">
          <CtaButton label="Termin sichern – kostenlos" />
        </div>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="pt-8 pb-28 lg:pb-8 px-6 text-center" style={{ borderTop: "1px solid var(--color-border)" }}>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        © 2026 MerKalku – Mehr Aufträge. Weniger Büro. &nbsp;|&nbsp;{" "}
        <a href="/impressum" className="underline hover:opacity-70">Impressum</a>
        {" "}&nbsp;|&nbsp;{" "}
        <a href="/datenschutz" className="underline hover:opacity-70">Datenschutz</a>
        {" "}&nbsp;|&nbsp;{" "}
        <a href="/agb" className="underline hover:opacity-70">AGB</a>
      </p>
    </footer>
  );
}

/* ── Sticky mobile CTA – persistent conversion path on a long page ── */
function MobileCta() {
  return (
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 backdrop-blur-xl"
      style={{ background: "rgba(247,251,249,0.92)", borderTop: "1px solid var(--color-border)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <a href="#termin" className="btn-primary flex items-center justify-center gap-2 w-full px-6 py-3.5 text-base font-semibold rounded-xl active:scale-[0.99] transition-transform">
        Kostenlos Termin sichern
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE – Psychological scroll flow
   ═══════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* 1. HOOK – Business outcome, not features */}
        <Hero />
        {/* 2. AGITATE – Mirror their daily pain */}
        <PainSection />
        {/* 3. TRANSFORM – Before vs After */}
        <Transformation />
        {/* 4. PROOF – Real person, real result */}
        <Testimonial />
        {/* 5. REDUCE RISK – Simple 3-step process */}
        <HowItWorks />
        {/* 6. AUTHORITY – Hard facts */}
        <Stats />
        {/* 7. CONVERT – Calendar with copy side-by-side */}
        <Calendar />
        {/* 8. HANDLE OBJECTIONS */}
        <Faq />
      </main>
      <Footer />
      <MobileCta />
    </>
  );
}
