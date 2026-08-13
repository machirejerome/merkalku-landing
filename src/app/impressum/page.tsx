import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – MerKalku",
  description: "Impressum der MerKalku Webseite. Angaben gemäß § 5 DDG.",
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
              Angaben gemäß § 5 DDG
            </h2>
            <p>
              IntelligenzWerk UG (haftungsbeschränkt)<br />
              Schmalzgasse 4<br />
              75228 Ispringen
            </p>
            <p className="mt-3">
              Vertreten durch den Geschäftsführer: Jérôme Machire
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
              Registereintrag
            </h2>
            <p>
              Rechtsform: Unternehmergesellschaft (haftungsbeschränkt)<br />
              Registergericht: Amtsgericht Mannheim<br />
              Registernummer: HRB 759441
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p>
              Jérôme Machire<br />
              Schmalzgasse 4<br />
              75228 Ispringen
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Verbraucherstreitbeilegung
            </h2>
            <p>
              Hinweis gemäß § 36 Verbraucherstreitbeilegungsgesetz (VSBG): Wir sind nicht bereit oder verpflichtet,
              an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
