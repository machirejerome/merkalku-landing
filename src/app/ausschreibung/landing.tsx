"use client";

import { useEffect, useState } from "react";
import Rechner from "@/app/preisrechner/rechner";
import { FIRMA } from "@/lib/firma";
import { BILDER } from "@/lib/bilder";
import { erfasseAttribution } from "@/lib/attribution";
import { trackEvent } from "@/lib/tracking";
import { VARIANTEN, type Variante } from "./varianten";

/* Aufbau nach der MECLABS-Sequenz (C = 4m + 3v + 2(i−f) − 2a), eine Sektion je Schritt:
   1 Hero + Rechner (Motivation bestätigen, Wert in einem Satz, Anreiz, Reibung raus)
   2 Beweis (Merbeck, genau einmal)
   3 Ablauf (Mechanismus in vier Zeilen, nimmt die Preis-/Kalkulator-/Excel-/Daten-Angst)
   4 Drei Fragen aus dem ersten Gespräch
   5 Schluss: der Mensch und der Rückweg zum Rechner
   Jede Aussage genau einmal. Nach dem Ergebnis klappt die Seite zu (nur Hero + Footer). */

const LOGO_URL = "/logo.webp";
const RECHNER_ID = "rechner";
const NACH_RECHNER_ID = "nach-rechner";

/* Zum Rechner springen: eine Instanz auf der Seite, Scroll + Fokus auf die aktuelle Frage */
function zumRechner(herkunft: string) {
  const el = document.getElementById(RECHNER_ID);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => window.dispatchEvent(new Event("mk:rechner_fokus")), 600);
  trackEvent("cta_zum_rechner", { herkunft });
}

/* ═══ Nav: nur Logo, kein Ausgang ═══ */
function Nav() {
  return (
    <nav aria-label="Kopfzeile" className="fixed top-0 inset-x-0 z-50 flex items-center px-6 md:px-10 py-4 backdrop-blur-xl" style={{ background: "rgba(247,251,249,0.88)", borderBottom: "1px solid var(--color-border)" }}>
      <span className="flex items-center gap-3">
        <img src={LOGO_URL} alt="MerKalku" width={34} height={34} className="rounded-lg" />
        <span className="text-lg font-bold tracking-tight">MerKalku</span>
      </span>
    </nav>
  );
}

/* ═══ 1 Hero + Rechner ═══ */
function Hero({ variante }: { variante: Variante }) {
  const v = VARIANTEN[variante];
  return (
    <section className="relative pt-24 sm:pt-28 pb-12 sm:pb-20 px-6 overflow-hidden">
      <div aria-hidden className="hero-grid absolute inset-0 pointer-events-none" />
      <div className="relative z-10 mx-auto w-full max-w-6xl grid lg:grid-cols-[1fr_1fr] gap-6 lg:gap-16 items-start">
        <div>
          <h1 className="hero-animate hero-delay-1 text-[1.5rem] sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.12] tracking-[-0.02em] mb-3 sm:mb-5">
            {v.headline[0]}
            <br />
            <span style={{ color: "var(--color-primary)" }}>{v.headline[1]}</span>
          </h1>
          <p className="hero-animate hero-delay-2 text-[15px] sm:text-lg max-w-xl leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {v.sub}
          </p>
        </div>
        <div id={RECHNER_ID} className="hero-animate hero-delay-2 rounded-2xl p-5 sm:p-8 shadow-[0_24px_50px_-24px_rgba(5,112,60,0.35)]" style={{ background: "var(--color-bg-card)", border: "1px solid rgba(5,112,60,0.22)", borderTop: "3px solid var(--color-primary)", scrollMarginTop: "96px" }}>
          <Rechner
            quelle="lp-ausschreibung"
            embedded
            startHinweis="Keine Unterlagen nötig. Du siehst, wie viele Stunden im Monat bei euch frei werden, danach kommt dein persönliches Preisangebot."
          />
        </div>
      </div>
    </section>
  );
}

/* ═══ 2 Beweis: Merbeck, genau einmal ═══ */
function Beweis() {
  return (
    <section className="py-14 sm:py-20 px-6" style={{ background: "var(--color-primary)" }}>
      <div className="max-w-3xl mx-auto">
        <blockquote className="m-0">
          <h2 className="text-2xl sm:text-[2rem] font-bold tracking-tight text-white leading-snug">
            „Was wir vorher in drei Tagen gemacht haben, machen wir jetzt in einer Stunde.“
          </h2>
          <p className="text-sm mt-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>
            Marco Kante, Geschäftsführer, Merbeck Gebäudeservice GmbH, Köln. Referenzbetrieb von MerKalku.
          </p>
        </blockquote>
        <button
          type="button"
          onClick={() => zumRechner("referenz")}
          className="btn-light group inline-flex items-center gap-2 mt-7 px-7 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Ersparnis berechnen
          <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

/* ═══ 3 Ablauf: Mechanismus in vier Zeilen ═══ */
function Ablauf() {
  const schritte = [
    { w: "Finden.", t: "MerKalku zeigt dir passende Ausschreibungen." },
    { w: "Entscheiden.", t: "Die Zusammenfassung der Vergabeunterlagen zeigt, ob sie passt. Wenn ja: kalkulieren." },
    { w: "Kalkulieren.", t: "Räume, Flächen und Turnus aus den Unterlagen (PDF, Excel, CSV, GAEB D83/D84), Leistungswerte und Kostensätze von euch." },
    { w: "Freigeben.", t: "Drüberschauen, Kalkulation feinjustieren, Angebot hochladen." },
  ];
  return (
    <section className="py-14 sm:py-20 px-6" style={{ background: "var(--color-bg-card)" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-[2rem] font-bold tracking-tight mb-4 leading-tight">
          Von der Ausschreibung zum Angebot in vier Schritten.
        </h2>
        <p className="text-base leading-relaxed mb-6" style={{ color: "var(--color-text-muted)" }}>
          Heute heißt das: Vergabeunterlagen lesen, Raumbuch abtippen, Turnus je Raum raussuchen, Flächen übertragen. Erst dann wird kalkuliert.
          Und eine übersehene Position fällt erst auf, wenn das Angebot längst draußen ist.
        </p>
        <ol className="space-y-3 pl-0 list-none m-0">
          {schritte.map((s, i) => (
            <li key={s.w} className="text-base leading-relaxed">
              <span className="font-semibold">{i + 1}. {s.w}</span> {s.t}
              {i === 1 && BILDER.pruefansicht ? (
                /* Auf dem Handy aus dem Textrahmen ausbrechen, sonst ist der Screenshot zu klein zum Erkennen */
                <figure className="m-0 mt-4 -mx-6 sm:mx-0">
                  <div className="overflow-hidden sm:rounded-2xl" style={{ border: "1px solid var(--color-border)", borderLeftWidth: 0, borderRightWidth: 0 }}>
                    <img src={BILDER.pruefansicht} alt="MerKalku zeigt die Zusammenfassung der Vergabeunterlagen, darunter die Checkliste der Pflichtpunkte mit Quellenangabe" className="w-full h-auto block" loading="lazy" decoding="async" width={1400} height={929} />
                  </div>
                  <figcaption className="text-xs mt-2 px-6 sm:px-0" style={{ color: "var(--color-text-faint)" }}>
                    Die Zusammenfassung in MerKalku, darunter die Pflichtpunkte mit Quelle und Seitenzahl. Objektdaten im Beispiel ersetzt.
                  </figcaption>
                </figure>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="text-sm mt-6 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          DSGVO-konform. Eure Daten bleiben eure Daten.
        </p>
      </div>
    </section>
  );
}

/* ═══ 4 Drei Fragen aus dem ersten Gespräch ═══ */
function Fragen() {
  const faqs = [
    { q: "Reicht dafür nicht ChatGPT?", a: "Für eine Frage ja. Für komplette Vergabeunterlagen mit euren Leistungswerten ist MerKalku gebaut, eure Unterlagen landen in keinem allgemeinen Chat." },
    { q: "Kann KI das besser als unser Kalkulator in Excel?", a: "Nein, sie ist schneller beim Lesen. Excel kann rechnen, Excel liest keine Vergabeunterlagen." },
    { q: "Ab wann lohnt sich MerKalku?", a: "Bei ein, zwei kleinen Ausschreibungen im Jahr meist nicht. Das Angebot kommt persönlich nach dem Rechner." },
  ];
  return (
    <section className="py-14 sm:py-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-[2rem] font-bold tracking-tight mb-6 leading-tight">Was im ersten Gespräch gefragt wird.</h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={f.q} open={i === 0} className="group rounded-xl overflow-hidden" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <summary className="px-5 py-4 cursor-pointer text-sm font-semibold flex items-center justify-between list-none">
                {f.q}
                <span className="ml-4 text-lg shrink-0 transition-transform duration-200 group-open:rotate-45" style={{ color: "var(--color-primary)" }} aria-hidden>+</span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ 5 Schluss: der Mensch und der Rückweg zum Rechner ═══ */
function Schluss() {
  return (
    <section className="py-14 sm:py-20 px-6" style={{ background: "var(--color-bg-card)" }}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl sm:text-[2rem] font-bold tracking-tight mb-3 leading-tight">Liegt gerade eine Ausschreibung auf dem Tisch?</h2>
        <p className="text-base leading-relaxed mb-6" style={{ color: "var(--color-text-muted)" }}>
          Dann rechne in keiner Minute aus, was sie euch kostet.
        </p>
        <div className={FIRMA.foto ? "flex flex-col sm:flex-row items-center gap-5 text-left" : ""}>
          {FIRMA.foto ? (
            <img src={FIRMA.foto} alt={`${FIRMA.geschaeftsfuehrer}, Gründer von MerKalku`} width={96} height={96} className="rounded-2xl object-cover shrink-0" style={{ width: 96, height: 96 }} />
          ) : null}
          <div>
            <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Drei Jahre habe ich Neukunden für Gebäudereiniger gewonnen, immer war die Ausschreibung das Nadelöhr. Nach dem Rechner melde ich mich persönlich mit deinem Preisangebot. Passt es nicht, sage ich dir das.
            </p>
            <p className="text-sm font-semibold mt-3">{FIRMA.geschaeftsfuehrer}, Gründer von MerKalku</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => zumRechner("abschluss")}
          className="btn-primary group inline-flex items-center justify-center gap-2 mt-8 px-7 py-4 text-base font-semibold rounded-xl shadow-[0_12px_30px_-10px_rgba(5,112,60,0.5)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Ersparnis berechnen
          <span className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

/* ═══ Footer: Pflichtangaben, sonst nichts ═══ */
function Footer() {
  return (
    <footer id="footer" className="pt-10 pb-28 lg:pb-10 px-6" style={{ borderTop: "1px solid var(--color-border)" }}>
      <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-6 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <div>
          <p className="font-semibold mb-1" style={{ color: "var(--color-text)" }}>{FIRMA.name}</p>
          <p>{FIRMA.strasse}, {FIRMA.plzOrt}</p>
          <p>Geschäftsführer: {FIRMA.geschaeftsfuehrer} · {FIRMA.registergericht}, {FIRMA.hrb}</p>
          <p className="mt-2"><a href={`mailto:${FIRMA.email}`} className="underline hover:opacity-70">{FIRMA.email}</a></p>
        </div>
        <div className="sm:text-right">
          <p>
            <a href="/impressum" className="underline hover:opacity-70">Impressum</a>
            {" "}· <a href="/datenschutz" className="underline hover:opacity-70">Datenschutz</a>
            {" "}· <a href="/agb" className="underline hover:opacity-70">AGB</a>
          </p>
          <p className="mt-2">© 2026 {FIRMA.marke}.</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Sticky mobile CTA: ein Ziel, verschwindet sobald Rechner oder Footer sichtbar ist oder das Gate erreicht wurde ── */
function MobileCta() {
  const [zeigen, setZeigen] = useState(false);
  useEffect(() => {
    let rechnerSichtbar = true;
    let footerSichtbar = false;
    let gateErreicht = document.documentElement.getAttribute("data-rechner-fertig") === "1";
    const update = () => setZeigen(!rechnerSichtbar && !footerSichtbar && !gateErreicht);
    const rechner = document.getElementById(RECHNER_ID);
    const footer = document.getElementById("footer");
    const obsR = new IntersectionObserver(
      ([entry]) => {
        rechnerSichtbar = entry.isIntersecting;
        if (entry.isIntersecting) trackEvent("rechner_sichtbar", {});
        update();
      },
      { threshold: 0.15 }
    );
    const obsF = new IntersectionObserver(
      ([entry]) => {
        footerSichtbar = entry.isIntersecting;
        update();
      },
      { threshold: 0.05 }
    );
    if (rechner) obsR.observe(rechner);
    if (footer) obsF.observe(footer);
    const onSchritt = (e: Event) => {
      const d = (e as CustomEvent<{ schritt?: number }>).detail;
      if (typeof d?.schritt === "number" && d.schritt >= 5) {
        gateErreicht = true;
        update();
      }
    };
    window.addEventListener("mk:rechner_schritt", onSchritt);
    return () => {
      obsR.disconnect();
      obsF.disconnect();
      window.removeEventListener("mk:rechner_schritt", onSchritt);
    };
  }, []);
  if (!zeigen) return null;
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 backdrop-blur-xl" style={{ background: "rgba(247,251,249,0.92)", borderTop: "1px solid var(--color-border)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <button type="button" onClick={() => zumRechner("sticky")} className="btn-primary flex items-center justify-center gap-2 w-full px-6 py-3.5 text-base font-semibold rounded-xl active:scale-[0.99] transition-transform">
        Ersparnis berechnen
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

/* ═══ Seite ═══ */
export default function Landing({ variante }: { variante: Variante }) {
  /* Anzeigen-Parameter (utm_*, oppref, v) beim ersten Render merken; Funnel-Event */
  useEffect(() => {
    erfasseAttribution();
    trackEvent("lp_ausschreibung_view", { variante });
  }, [variante]);

  /* Fertig-Zustand: nach dem Ergebnis (oder bei Rückkehr mit fertigem Rechner) klappt die Seite zu.
     Der Rechner setzt das Flag am <html> und feuert das Event; hier nur DOM, kein State. */
  useEffect(() => {
    const el = document.getElementById(NACH_RECHNER_ID);
    const apply = () => {
      if (el) el.hidden = document.documentElement.getAttribute("data-rechner-fertig") === "1";
    };
    apply();
    window.addEventListener("mk:rechner_fertig", apply);
    return () => window.removeEventListener("mk:rechner_fertig", apply);
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Hero variante={variante} />
        <div id={NACH_RECHNER_ID}>
          <Beweis />
          <Ablauf />
          <Fragen />
          <Schluss />
        </div>
      </main>
      <Footer />
      <MobileCta />
    </>
  );
}
