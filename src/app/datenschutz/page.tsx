import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – MerKalku",
  description: "Datenschutzerklärung der MerKalku Webseite gemäß DSGVO.",
};

export default function Datenschutz() {
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

        <h1 className="text-3xl font-bold tracking-tight mb-10">Datenschutzerklärung</h1>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {/* Präambel */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Präambel
            </h2>
            <p>
              Mit der folgenden Datenschutzerklärung möchten wir Sie darüber aufklären, welche Arten Ihrer
              personenbezogenen Daten (nachfolgend auch kurz als „Daten" bezeichnet) wir zu welchen Zwecken und
              in welchem Umfang verarbeiten. Die Datenschutzerklärung gilt für alle von uns durchgeführten
              Verarbeitungen personenbezogener Daten, sowohl im Rahmen der Erbringung unserer Leistungen als auch
              insbesondere auf unseren Webseiten, in mobilen Applikationen sowie innerhalb externer Onlinepräsenzen,
              wie z.&nbsp;B. unserer Social-Media-Profile (nachfolgend zusammenfassend bezeichnet als „Onlineangebot").
            </p>
          </section>

          {/* Verantwortlicher */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Verantwortlicher
            </h2>
            <p>
              Jerome Machire<br />
              Jerome Machire Leadgainers Agency e.K.<br />
              Schmalzgasse 4, 75228 Ispringen<br />
              E-Mail:{" "}
              <a href="mailto:info@merkalku.de" className="underline hover:opacity-70" style={{ color: "var(--color-primary)" }}>
                info@merkalku.de
              </a>
            </p>
            <p className="mt-2">
              Impressum:{" "}
              <Link href="/impressum" className="underline hover:opacity-70" style={{ color: "var(--color-primary)" }}>
                Impressum
              </Link>
            </p>
          </section>

          {/* Übersicht der Verarbeitungen */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Übersicht der Verarbeitungen
            </h2>
            <p className="mb-3">
              Die nachfolgende Übersicht fasst die Arten der verarbeiteten Daten und die Zwecke ihrer Verarbeitung
              zusammen und verweist auf die betroffenen Personen.
            </p>

            <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: "var(--color-text)" }}>
              Arten der verarbeiteten Daten
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Kontaktdaten</li>
              <li>Inhaltsdaten</li>
              <li>Nutzungsdaten</li>
              <li>Meta-, Kommunikations- und Verfahrensdaten</li>
              <li>Bestandsdaten</li>
              <li>Vertragsdaten</li>
              <li>Zahlungsdaten</li>
            </ul>

            <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: "var(--color-text)" }}>
              Kategorien betroffener Personen
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Kunden</li>
              <li>Interessenten</li>
              <li>Kommunikationspartner</li>
              <li>Nutzer</li>
              <li>Geschäfts- und Vertragspartner</li>
            </ul>

            <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: "var(--color-text)" }}>
              Zwecke der Verarbeitung
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Erbringung vertraglicher Leistungen und Erfüllung vertraglicher Pflichten</li>
              <li>Kontaktanfragen und Kommunikation</li>
              <li>Sicherheitsmaßnahmen</li>
              <li>Reichweitenmessung</li>
              <li>Büro- und Organisationsverfahren</li>
              <li>Verwaltung und Beantwortung von Anfragen</li>
              <li>Feedback</li>
              <li>Marketing</li>
              <li>Profile mit nutzerbezogenen Informationen</li>
              <li>Bereitstellung unseres Onlineangebotes und Nutzerfreundlichkeit</li>
              <li>Informationstechnische Infrastruktur</li>
              <li>Geschäftsprozesse und betriebswirtschaftliche Verfahren</li>
            </ul>
          </section>

          {/* Rechtsgrundlagen */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Maßgebliche Rechtsgrundlagen
            </h2>
            <p className="mb-3">
              Maßgebliche Rechtsgrundlagen nach der DSGVO: Im Folgenden erhalten Sie eine Übersicht der
              Rechtsgrundlagen der DSGVO, auf deren Basis wir personenbezogene Daten verarbeiten.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO)</strong> – Die betroffene Person hat ihre
                Einwilligung in die Verarbeitung der sie betreffenden personenbezogenen Daten für einen spezifischen
                Zweck oder mehrere bestimmte Zwecke gegeben.
              </li>
              <li>
                <strong>Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSGVO)</strong> –
                Die Verarbeitung ist für die Erfüllung eines Vertrags, dessen Vertragspartei die betroffene Person ist,
                oder zur Durchführung vorvertraglicher Maßnahmen erforderlich.
              </li>
              <li>
                <strong>Rechtliche Verpflichtung (Art. 6 Abs. 1 S. 1 lit. c) DSGVO)</strong> – Die Verarbeitung ist
                zur Erfüllung einer rechtlichen Verpflichtung erforderlich.
              </li>
              <li>
                <strong>Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO)</strong> – Die Verarbeitung ist
                zur Wahrung der berechtigten Interessen des Verantwortlichen oder eines Dritten notwendig.
              </li>
            </ul>
          </section>

          {/* Sicherheitsmaßnahmen */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Sicherheitsmaßnahmen
            </h2>
            <p>
              Wir treffen nach Maßgabe der gesetzlichen Vorgaben unter Berücksichtigung des Stands der Technik,
              der Implementierungskosten und der Art, des Umfangs, der Umstände und der Zwecke der Verarbeitung
              sowie der unterschiedlichen Eintrittswahrscheinlichkeiten und des Ausmaßes der Bedrohung der Rechte
              und Freiheiten natürlicher Personen geeignete technische und organisatorische Maßnahmen, um ein dem
              Risiko angemessenes Schutzniveau zu gewährleisten.
            </p>
          </section>

          {/* Übermittlung */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Übermittlung von personenbezogenen Daten
            </h2>
            <p>
              Im Rahmen unserer Verarbeitung von personenbezogenen Daten kommt es vor, dass diese an andere Stellen,
              Unternehmen, rechtlich selbstständige Organisationseinheiten oder Personen übermittelt beziehungsweise
              ihnen gegenüber offengelegt werden. Zu den Empfängern dieser Daten können z.&nbsp;B. mit IT-Aufgaben
              beauftragte Dienstleister gehören oder Anbieter von Diensten und Inhalten, die in eine Webseite
              eingebunden werden.
            </p>
          </section>

          {/* Internationale Datentransfers */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Internationale Datentransfers
            </h2>
            <p>
              Datenverarbeitung in Drittländern: Sofern wir Daten in einem Drittland (d.&nbsp;h., außerhalb der
              Europäischen Union (EU), des Europäischen Wirtschaftsraums (EWR)) verarbeiten oder die Verarbeitung
              im Rahmen der Inanspruchnahme von Diensten Dritter oder der Offenlegung bzw. Übermittlung von Daten
              an andere Personen, Stellen oder Unternehmen stattfindet, erfolgt dies nur im Einklang mit den
              gesetzlichen Vorgaben.
            </p>
          </section>

          {/* Rechte der betroffenen Personen */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Rechte der betroffenen Personen
            </h2>
            <p className="mb-3">Rechte der betroffenen Personen aus der DSGVO:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Widerspruchsrecht:</strong> Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen
                Situation ergeben, jederzeit gegen die Verarbeitung der Sie betreffenden personenbezogenen Daten
                Widerspruch einzulegen.
              </li>
              <li>
                <strong>Widerrufsrecht bei Einwilligungen:</strong> Sie haben das Recht, erteilte Einwilligungen
                jederzeit zu widerrufen.
              </li>
              <li>
                <strong>Auskunftsrecht:</strong> Sie haben das Recht, eine Bestätigung darüber zu verlangen, ob
                betreffende Daten verarbeitet werden.
              </li>
              <li>
                <strong>Recht auf Berichtigung:</strong> Sie haben das Recht, die Vervollständigung oder Berichtigung
                der Sie betreffenden unrichtigen Daten zu verlangen.
              </li>
              <li>
                <strong>Recht auf Löschung und Einschränkung der Verarbeitung:</strong> Sie haben das Recht, zu
                verlangen, dass Sie betreffende Daten unverzüglich gelöscht werden.
              </li>
              <li>
                <strong>Recht auf Datenübertragbarkeit:</strong> Sie haben das Recht, die Sie betreffenden Daten in
                einem gängigen maschinenlesbaren Format zu erhalten.
              </li>
              <li>
                <strong>Beschwerde bei Aufsichtsbehörde:</strong> Sie haben das Recht, sich bei einer Aufsichtsbehörde
                zu beschweren.
              </li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Einsatz von Cookies
            </h2>
            <p>
              Cookies sind kleine Textdateien bzw. sonstige Speichervermerke, die Informationen auf Endgeräten
              speichern und aus ihnen auslesen. Cookies können zu verschiedenen Zwecken eingesetzt werden, z.&nbsp;B.
              zu Zwecken der Funktionsfähigkeit, der Sicherheit und des Komforts von Onlineangeboten sowie der
              Erstellung von Analysen der Besucherströme.
            </p>
            <p className="mt-3">
              <strong>Hinweise zu Einwilligungen:</strong> Wir setzen Cookies im Einklang mit den gesetzlichen
              Vorschriften ein. Daher holen wir von den Nutzern eine vorhergehende Einwilligung ein, es sei denn,
              es ist gesetzlich nicht gefordert.
            </p>
          </section>

          {/* Geschäftliche Leistungen */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Geschäftliche Leistungen
            </h2>
            <p>
              Wir verarbeiten Daten unserer Vertrags- und Geschäftspartner, z.&nbsp;B. Kunden und Interessenten
              (zusammenfassend als „Vertragspartner" bezeichnet), im Rahmen von vertraglichen und vergleichbaren
              Rechtsverhältnissen sowie damit verbundenen Maßnahmen und im Rahmen der Kommunikation mit den
              Vertragspartnern (oder vorvertraglich).
            </p>
          </section>

          {/* Webhosting */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Bereitstellung des Onlineangebots und Webhosting
            </h2>
            <p>
              Wir verarbeiten die Daten der Nutzer, um ihnen unsere Online-Dienste zur Verfügung stellen zu können.
              Zu diesem Zweck verarbeiten wir die IP-Adresse des Nutzers, die notwendig ist, um die Inhalte und
              Funktionen unserer Online-Dienste an den Browser bzw. das Endgerät der Nutzer zu übermitteln.
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li><strong>Verarbeitete Datenarten:</strong> Nutzungsdaten, Meta-, Kommunikations- und Verfahrensdaten, Protokolldaten</li>
              <li><strong>Betroffene Personen:</strong> Nutzer</li>
              <li><strong>Rechtsgrundlagen:</strong> Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO)</li>
            </ul>
          </section>

          {/* Kontaktverwaltung */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Kontakt- und Anfrageverwaltung
            </h2>
            <p>
              Bei der Kontaktaufnahme mit uns (z.&nbsp;B. per Post, Kontaktformular, E-Mail, Telefon oder via
              soziale Medien) sowie im Rahmen bestehender Nutzer- und Geschäftsbeziehungen werden die Angaben der
              anfragenden Personen verarbeitet, soweit dies zur Beantwortung der Kontaktanfragen und etwaiger
              angefragter Maßnahmen erforderlich ist.
            </p>
          </section>

          {/* Webanalyse */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Webanalyse, Monitoring und Optimierung
            </h2>
            <p>
              Die Webanalyse (auch als „Reichweitenmessung" bezeichnet) dient der Auswertung der Besucherströme
              unseres Onlineangebots und kann Verhalten, Interessen oder demografische Informationen zu den
              Besuchern, wie beispielsweise Alter oder Geschlecht, als pseudonyme Werte umfassen.
            </p>

            <h3 className="text-sm font-semibold mt-4 mb-2" style={{ color: "var(--color-text)" }}>
              Google Analytics
            </h3>
            <p>
              Wir verwenden Google Analytics zur Messung und Analyse der Nutzung unseres Onlineangebotes auf der
              Grundlage einer pseudonymen Nutzeridentifikationsnummer. Dienstanbieter: Google Ireland Limited,
              Gordon House, Barrow Street, Dublin 4, Irland.
            </p>
          </section>

          {/* Onlinemarketing */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Onlinemarketing
            </h2>
            <p>
              Wir verarbeiten personenbezogene Daten zum Zweck des Onlinemarketings, worunter insbesondere die
              Vermarktung von Werbeflächen oder die Darstellung von werbenden und sonstigen Inhalten
              (zusammenfassend als „Inhalte" bezeichnet) anhand potenzieller Interessen der Nutzer sowie die
              Messung ihrer Effektivität fallen können.
            </p>
          </section>

          {/* Social Media */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Präsenzen in sozialen Netzwerken (Social Media)
            </h2>
            <p>
              Wir unterhalten Onlinepräsenzen innerhalb sozialer Netzwerke und verarbeiten in diesem Rahmen
              Nutzerdaten, um mit den dort aktiven Nutzern zu kommunizieren oder Informationen über uns anzubieten.
            </p>
          </section>

          {/* Änderung */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              Änderung und Aktualisierung
            </h2>
            <p>
              Wir bitten Sie, sich regelmäßig über den Inhalt unserer Datenschutzerklärung zu informieren. Wir
              passen die Datenschutzerklärung an, sobald die Änderungen der von uns durchgeführten
              Datenverarbeitungen dies erforderlich machen. Wir informieren Sie, sobald durch die Änderungen eine
              Mitwirkungshandlung Ihrerseits (z.&nbsp;B. Einwilligung) oder eine sonstige individuelle
              Benachrichtigung erforderlich wird.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
