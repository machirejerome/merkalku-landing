import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – MerKalku",
  description: "Impressum der MerKalku Webseite. Angaben gemäß § 5 TMG.",
};

export default function Impressum() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium mb-10 hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-primary)" }}
        >
          ← Zurück zur Startseite
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-10">Impressum</h1>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Angaben gemäß § 5 TMG
            </h2>
            <p>
              Jerome Machire<br />
              Jerome Machire Leadgainers Agency e.K.<br />
              Schmalzgasse 4<br />
              75228 Ispringen
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Kontakt
            </h2>
            <p>
              E-Mail:{" "}
              <a href="mailto:info@merkalku.de" className="underline hover:opacity-70" style={{ color: "var(--color-primary)" }}>
                info@merkalku.de
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Rechtsform
            </h2>
            <p>Eingetragener Kaufmann (e.K.)</p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Umsatzsteuer-ID
            </h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
              DE362922044
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Online-Streitbeilegung
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-70"
                style={{ color: "var(--color-primary)" }}
              >
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p className="mt-3">
              Hinweis gemäß § 36 Verbraucherstreitbeilegungsgesetz (VSBG): Wir sind nicht bereit oder verpflichtet,
              an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
