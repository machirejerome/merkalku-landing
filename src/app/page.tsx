"use client";

import { useEffect, useRef } from "react";

const LOGO_URL =
  "https://assets.cdn.filesafe.space/sRRsx7vsmU8JNdRtaxx0/media/20bc56c1-b9a1-4a60-afa7-cd602d4b9ff3.png";

const CALENDAR_URL =
  "https://api.leadconnectorhq.com/widget/booking/ulqrL3P8HU0BkQLF8jcR";

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

/* ── Reusable CTA Button ── */
function CtaButton({ label = "Kostenlos Termin sichern →", className = "" }: { label?: string; className?: string }) {
  return (
    <a
      href="#termin"
      className={`inline-block px-8 py-4 text-white text-base font-semibold rounded-xl shadow-lg hover:opacity-90 hover:-translate-y-0.5 hover:shadow-xl transition-all ${className}`}
      style={{ background: "var(--color-primary)" }}
    >
      {label}
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
    <nav id="nav" className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 backdrop-blur-xl transition-shadow" style={{ background: "rgba(247,251,249,0.88)", borderBottom: "1px solid var(--color-border)" }}>
      <a href="#" className="flex items-center gap-3">
        <img src={LOGO_URL} alt="MerKalku" width={34} height={34} className="rounded-lg" />
        <span className="text-lg font-bold tracking-tight hidden sm:inline">MerKalku</span>
      </a>
      <a href="#termin" className="px-5 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-all hover:-translate-y-0.5" style={{ background: "var(--color-primary)" }}>
        Termin sichern
      </a>
    </nav>
  );
}

/* ═══════════════════════════════════════════
   HERO – High-level business outcome hook
   ═══════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-6 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(45,232,154,0.06)" }} />
      <div className="absolute -bottom-60 -left-20 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(5,112,60,0.04)" }} />

      <div className="relative z-10 max-w-3xl text-center">
        <div className="hero-animate hero-delay-1 inline-block px-4 py-1.5 mb-8 text-xs font-semibold tracking-wide uppercase rounded-full" style={{ color: "var(--color-primary)", background: "rgba(5,112,60,0.07)", border: "1px solid rgba(5,112,60,0.15)" }}>
          Für Gebäudereiniger mit 50+ Mitarbeitern
        </div>

        <h1 className="hero-animate hero-delay-2 text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.12] tracking-tight mb-6">
          Ausschreibung hochladen.
          <br />
          <span style={{ color: "var(--color-primary)" }}>KI kalkuliert. Fertig.</span>
        </h1>

        <p className="hero-animate hero-delay-3 text-lg max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          PDF, Excel, CSV, GAEB – egal welches Format. MerKalku erkennt alle Räume automatisch und liefert Ihnen die{" "}
          <span className="font-semibold" style={{ color: "var(--color-text)" }}>fertige Kalkulation in Sekunden.</span>
        </p>

        {/* Hero Animation – Video for performance (poster = instant LCP) */}
        <a
          href="#termin"
          className="hero-animate hero-delay-3 mx-auto mb-10 rounded-2xl overflow-hidden shadow-xl block hover:shadow-2xl transition-shadow cursor-pointer"
          style={{ border: "1px solid var(--color-border)", maxWidth: "720px" }}
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

        <div className="hero-animate hero-delay-4">
          <CtaButton />
        </div>

        <p className="hero-animate hero-delay-5 mt-12 text-sm" style={{ color: "var(--color-text-faint)" }}>
          Kostenlos · 30 Minuten · Unverbindlich
        </p>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hero-animate hero-delay-5">
        <div className="w-6 h-10 rounded-full flex items-start justify-center pt-2" style={{ border: "2px solid var(--color-border)" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--color-primary)" }} />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   PAIN – Mirror their daily reality
   ═══════════════════════════════════════════ */
function PainSection() {
  return (
    <section className="py-24 px-6">
      <FadeIn className="max-w-4xl mx-auto">
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
          {[
            { icon: "📄", title: "Jedes Mal andere Unterlagen", text: "Ausschreibungen, Raumlisten vom Kunden, Baupläne, Grundrisse, PDFs, Excel-Tabellen, Fließtext – jedes Objekt kommt in einem anderen Format. Und jedes Mal muss alles von Hand abgetippt werden." },
            { icon: "⚠️", title: "Fehler, die Marge kosten", text: "Ein vergessener Zuschlag, ein falscher Mindestlohn, ein Zahlendreher in der Stundenberechnung – und der Auftrag wird zum Verlustgeschäft." },
            { icon: "🔒", title: "Alles hängt an einer Person", text: "Wenn Ihr Kalkulator krank ist oder geht, steht der Betrieb still. Wissen, das nur in einem Kopf steckt, ist ein Unternehmensrisiko." },
            { icon: "📉", title: "Wachstum ohne mehr Personal?", text: "Mehr Aufträge gewinnen heißt mehr kalkulieren. Aber eine neue Bürokraft einstellen? Bei 85% Personalkostenquote?" },
          ].map((p, i) => (
            <div key={i} className="rounded-2xl p-7 hover:-translate-y-1 transition-all" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <span className="text-2xl mb-4 block">{p.icon}</span>
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
   TRANSFORMATION – Before → After
   ═══════════════════════════════════════════ */
function Transformation() {
  return (
    <section className="py-24 px-6" style={{ background: "var(--color-bg-card)" }}>
      <FadeIn className="max-w-4xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary)" }}>
          Die Veränderung
        </p>
        <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight mb-14 leading-tight">
          Was sich mit MerKalku ändert
        </h2>

        <div className="grid sm:grid-cols-2 gap-0 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {/* VORHER */}
          <div className="p-8 sm:p-10" style={{ background: "#fafafa" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-6" style={{ color: "#D32D2D" }}>
              ✕ Ohne MerKalku
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
                  <span className="mt-0.5 shrink-0" style={{ color: "#D32D2D" }}>✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* NACHHER */}
          <div className="p-8 sm:p-10" style={{ background: "rgba(5,112,60,0.03)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-6" style={{ color: "var(--color-primary)" }}>
              ✓ Mit MerKalku
            </p>
            <ul className="space-y-4">
              {[
                "PDF, Bauplan, Excel, Kundendaten – die KI erkennt jedes Format automatisch",
                "Kalkulation in Minuten statt Stunden",
                "Fehlerfreie Angebote auf Knopfdruck",
                "Doppelt so viele Angebote rausschicken",
                "Jeder im Büro kann kalkulieren",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium leading-relaxed">
                  <span className="mt-0.5 shrink-0" style={{ color: "var(--color-primary)" }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <CtaButton label="Jetzt selbst erleben →" />
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
          <span className="absolute -top-6 -left-2 text-7xl font-serif leading-none select-none" style={{ color: "rgba(45,232,154,0.3)" }}>
            „
          </span>
          <blockquote className="text-2xl sm:text-[1.75rem] font-bold leading-snug tracking-tight mb-8">
            Was wir vorher in drei Tagen gemacht haben, machen wir jetzt in einer Stunde.<span style={{ color: "rgba(45,232,154,0.4)" }}>&ldquo;</span>
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
      <div className="absolute -top-52 -right-52 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(45,232,154,0.12)" }} />
      <FadeIn className="max-w-4xl mx-auto relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-primary-light)" }}>
          In 3 Schritten
        </p>
        <h2 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight text-white mb-6 leading-tight">
          So finden Sie heraus, ob MerKalku
          <br />für Ihren Betrieb funktioniert
        </h2>
        <p className="text-base mb-14 max-w-xl" style={{ color: "rgba(255,255,255,0.6)" }}>
          Kein langer Onboarding-Prozess. Kein Risiko. In 30 Minuten wissen Sie Bescheid.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          {[
            { step: "01", title: "Termin buchen", text: "Wählen Sie unten einen freien Slot. Dauert 30 Sekunden." },
            { step: "02", title: "Praxischeck", text: "Wir nehmen ein echtes Beispiel und kalkulieren es live – vor Ihren Augen." },
            { step: "03", title: "Entscheidung", text: "Sie wissen, ob es passt. Kein Druck, kein Vertrag, kein Kleingedrucktes." },
          ].map((s, i) => (
            <div key={i} className="backdrop-blur rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--color-primary-light)" }}>
                Schritt {s.step}
              </p>
              <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{s.text}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="#termin"
            className="inline-block px-8 py-4 text-base font-semibold rounded-xl hover:opacity-90 hover:-translate-y-0.5 hover:shadow-xl transition-all"
            style={{ background: "#fff", color: "var(--color-primary)" }}
          >
            Jetzt Slot aussuchen →
          </a>
        </div>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   STATS – Authority numbers
   ═══════════════════════════════════════════ */
function Stats() {
  return (
    <section className="py-16 px-6">
      <FadeIn className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { number: "3x", label: "mehr Angebote pro Monat" },
            { number: "85%", label: "Personalkostenquote in der Branche" },
            { number: "0", label: "Kalkulationsfehler" },
            { number: "30", label: "Minuten für Ihren Praxischeck" },
          ].map((s, i) => (
            <div key={i} className="text-center py-7 px-4 rounded-2xl" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--color-primary)", fontVariantNumeric: "tabular-nums" }}>
                {s.number}
              </p>
              <p className="text-xs sm:text-sm" style={{ color: "var(--color-text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CALENDAR – Full-width embedded booking
   ═══════════════════════════════════════════ */
function Calendar() {
  return (
    <section id="termin" className="py-24 px-6" style={{ background: "var(--color-bg-card)" }}>
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
                  <span className="mt-0.5 shrink-0 text-sm" style={{ color: "var(--color-primary)" }}>✓</span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{item}</p>
                </div>
              ))}
            </div>

            {/* Micro-Testimonial */}
            <div className="rounded-xl p-5" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              <p className="text-sm italic leading-relaxed mb-3" style={{ color: "var(--color-text-muted)" }}>
                „Was wir vorher in drei Tagen gemacht haben, machen wir jetzt in einer Stunde.<span style={{ color: "var(--color-primary-light)" }}>“</span>
              </p>
              <p className="text-xs font-semibold">Marco Kante</p>
              <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>
                GF, Merbeck Gebäudeservice GmbH
              </p>
            </div>
          </div>

          {/* Right: Calendar */}
          <div className="rounded-2xl overflow-hidden shadow-xl" style={{ border: "1px solid var(--color-border)" }}>
            <iframe
              src={CALENDAR_URL}
              className="w-full border-0"
              style={{ minHeight: "750px" }}
              scrolling="no"
              title="Termin buchen"
            />
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
            <details key={i} className="group rounded-xl overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <summary className="px-6 py-5 cursor-pointer text-sm font-semibold flex items-center justify-between list-none">
                {faq.q}
                <span className="ml-4 text-lg shrink-0 transition-transform group-open:rotate-45" style={{ color: "var(--color-primary)" }}>+</span>
              </summary>
              <div className="px-6 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center">
          <CtaButton label="Termin sichern – kostenlos →" />
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
    <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid var(--color-border)" }}>
      <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>
        © 2026 MerKalku – Mehr Aufträge. Weniger Büro. &nbsp;|&nbsp;{" "}
        <a href="/impressum" className="underline hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>Impressum</a>
        {" "}&nbsp;|&nbsp;{" "}
        <a href="/datenschutz" className="underline hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>Datenschutz</a>
      </p>
    </footer>
  );
}

/* ═══════════════════════════════════════════
   PAGE – Psychological scroll flow
   ═══════════════════════════════════════════ */
export default function Home() {
  return (
    <>
      <Nav />
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
      {/* 6. AUTHORITY – Hard numbers */}
      <Stats />
      {/* 7. CONVERT – Calendar with copy side-by-side */}
      <Calendar />
      {/* 8. HANDLE OBJECTIONS */}
      <Faq />
      <Footer />
    </>
  );
}
