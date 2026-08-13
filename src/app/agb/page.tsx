import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AGB – MerKalku",
  description: "Allgemeine Geschäftsbedingungen der IntelligenzWerk UG (haftungsbeschränkt) für die Nutzung von MerKalku.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-3" style={{ color: "var(--color-text)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function AGB() {
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

        <h1 className="text-3xl font-bold tracking-tight mb-4">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-sm mb-10" style={{ color: "var(--color-text-faint)" }}>
          Stand: August 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          <Section title="§ 1 Geltungsbereich und Anbieter">
            <p>
              (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) gelten für alle Verträge über die
              Nutzung der Software „MerKalku“ sowie damit verbundene Leistungen zwischen der IntelligenzWerk UG
              (haftungsbeschränkt), Schmalzgasse 4, 75228 Ispringen, eingetragen im Handelsregister des
              Amtsgerichts Mannheim unter HRB 759441, vertreten durch den Geschäftsführer Jérôme Machire
              (nachfolgend „Anbieter“), und ihren Kunden (nachfolgend „Kunde“).
            </p>
            <p className="mt-3">
              (2) Das Angebot des Anbieters richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB,
              juristische Personen des öffentlichen Rechts oder öffentlich-rechtliche Sondervermögen. Ein Vertrag
              mit Verbrauchern im Sinne des § 13 BGB kommt nicht zustande.
            </p>
            <p className="mt-3">
              (3) Abweichende, entgegenstehende oder ergänzende Geschäftsbedingungen des Kunden werden nur dann
              Vertragsbestandteil, wenn der Anbieter ihrer Geltung ausdrücklich in Textform zugestimmt hat.
            </p>
            <p className="mt-3">
              (4) Bei Widersprüchen zwischen den Vertragsdokumenten gilt folgende Rangfolge: erstens das
              individuelle Angebot bzw. die Auftragsbestätigung, zweitens die Vereinbarung zur
              Auftragsverarbeitung, drittens diese AGB.
            </p>
          </Section>

          <Section title="§ 2 Vertragsgegenstand und Leistungsumfang">
            <p>
              (1) Der Anbieter stellt dem Kunden die webbasierte Software „MerKalku“ zur KI-gestützten Kalkulation
              von Reinigungsdienstleistungen (Software-as-a-Service) für die Dauer des Vertrags über das Internet
              zur Nutzung bereit.
            </p>
            <p className="mt-3">
              (2) „Kundendaten“ im Sinne dieser AGB sind alle vom Kunden in die Software hochgeladenen Inhalte,
              die von ihm hinterlegten Stammdaten und Parameter sowie die für ihn erzeugten Ergebnisse
              (insbesondere Kalkulationen und Angebotsunterlagen).
            </p>
            <p className="mt-3">
              (3) Der konkrete Funktionsumfang und die Vergütung ergeben sich aus dem jeweiligen Angebot bzw. der
              Auftragsbestätigung des Anbieters.
            </p>
            <p className="mt-3">
              (4) Der Anbieter schuldet die Bereitstellung der Software, nicht jedoch einen bestimmten
              wirtschaftlichen Erfolg des Kunden (z.&nbsp;B. den Gewinn von Aufträgen oder Ausschreibungen).
            </p>
            <p className="mt-3">
              (5) Geschuldet ist, dass die Software Kalkulationen und Auswertungen auf Basis der vereinbarten
              Funktionen, der hinterlegten Parameter und der Eingaben des Kunden nach dem Stand der Technik
              erzeugt. Durch künstliche Intelligenz erzeugte Ergebnisse sind ihrer Natur nach probabilistisch;
              ein Mangel liegt nicht vor, soweit einzelne Ergebnisse trotz vertragsgemäßer Funktionsweise der
              Software inhaltlich von der tatsächlichen Sachlage abweichen. Systematische oder reproduzierbare
              Fehlfunktionen der Software sind Mängel; die Mängelrechte des Kunden bleiben insoweit unberührt.
            </p>
            <p className="mt-3">
              (6) Der Anbieter ist berechtigt, die Software weiterzuentwickeln und Funktionen zu ändern oder zu
              ergänzen, soweit dies aufgrund technischer Weiterentwicklung, aus Sicherheitsgründen oder wegen
              geänderter rechtlicher Anforderungen erfolgt und der Vertragszweck hierdurch nicht gefährdet wird.
              Wesentliche Einschränkungen des vereinbarten Funktionsumfangs kündigt der Anbieter mindestens sechs
              Wochen im Voraus in Textform an; in diesem Fall kann der Kunde den Vertrag zum Zeitpunkt des
              Wirksamwerdens der Änderung in Textform kündigen.
            </p>
            <p className="mt-3">
              (7) Allgemeine Anpreisungen und Beispielrechnungen in Werbematerialien, auf der Website oder in
              Präsentationen ohne konkreten Bezug zum Vertrag sind keine Beschaffenheitsangaben. Individuelle
              Zusagen und Vereinbarungen bleiben unberührt und haben Vorrang. Garantien im Rechtssinne übernimmt
              der Anbieter nur, wenn er sie ausdrücklich als Garantie bezeichnet.
            </p>
          </Section>

          <Section title="§ 3 Vertragsschluss">
            <p>
              (1) Der Vertrag kommt durch Annahme eines Angebots des Anbieters durch den Kunden in Textform
              (z.&nbsp;B. E-Mail), durch beiderseitige Unterzeichnung eines Auftrags oder durch Freischaltung des
              Zugangs nach Bestellung zustande.
            </p>
            <p className="mt-3">
              (2) Mit Annahme des Angebots bzw. Abgabe seiner Bestellung bestätigt der Kunde, dass er als
              Unternehmer im Sinne des § 14 BGB handelt.
            </p>
            <p className="mt-3">
              (3) Die Pflichten nach § 312i Abs. 1 Satz 1 Nummer 1 bis 3 und Satz 2 BGB sind abbedungen.
            </p>
          </Section>

          <Section title="§ 4 KI-Einsatz; Prüfpflicht des Kunden">
            <p>
              (1) MerKalku erstellt Kalkulationen und Auswertungen unter Einsatz von künstlicher Intelligenz.
              Die Ergebnisse sind Arbeits- und Entscheidungshilfen und können im Einzelfall unvollständig oder
              fehlerhaft sein.
            </p>
            <p className="mt-3">
              (2) Der Kunde wird sämtliche durch die Software erzeugten Ergebnisse (insbesondere Kalkulationen,
              Preise und Angebotsunterlagen) vor deren Verwendung gegenüber Dritten durch fachlich geeignetes
              Personal auf Plausibilität und offensichtliche Unrichtigkeit prüfen. Die Verantwortung für
              abgegebene Angebote und daraus resultierende Verträge des Kunden mit seinen Auftraggebern liegt
              beim Kunden. Gesetzliche Mängelrechte des Kunden bleiben unberührt.
            </p>
            <p className="mt-3">
              (3) Verwendet der Kunde Ergebnisse ohne die nach Abs. 2 gebotene Prüfung, ist dies bei der
              Bemessung etwaiger Schadensersatzansprüche als Mitverschulden (§ 254 BGB) zu berücksichtigen.
            </p>
            <p className="mt-3">
              (4) Die Software nutzt zur Erbringung der Leistungen KI-Dienste von Drittanbietern als
              Unterauftragsverarbeiter; derzeit erfolgt die KI-Verarbeitung über Microsoft Azure OpenAI mit
              Datenverarbeitung in Rechenzentren innerhalb der Europäischen Union. Der Anbieter ist berechtigt,
              die eingesetzten KI-Modelle und Anbieter zu wechseln oder zu aktualisieren, sofern das vertraglich
              geschuldete Leistungsniveau insgesamt gewahrt bleibt und sich die Qualität der Arbeitsergebnisse
              nicht wesentlich verschlechtert; § 15 Abs. 1 gilt auch nach einem Wechsel. Ein Anspruch auf den
              Einsatz eines bestimmten Modells oder einer bestimmten Modellversion besteht nicht.
            </p>
            <p className="mt-3">
              (5) Die Software kann kundenspezifische Lern- und Optimierungsverfahren einsetzen, die
              ausschließlich auf Daten des jeweiligen Kunden beruhen und ausschließlich diesem Kunden
              zugutekommen. Eine kundenübergreifende Nutzung von Kundendaten sowie deren Nutzung zum Training
              von KI-Basismodellen des Anbieters oder Dritter findet nicht statt.
            </p>
            <p className="mt-3">
              (6) Im Sinne der Verordnung (EU) 2024/1689 (KI-Verordnung) nimmt der Anbieter die Rolle des
              Anbieters des KI-Systems ein, der Kunde die Rolle des Betreibers. Die Parteien unterstützen sich
              bei der Erfüllung der jeweils anwendbaren Pflichten. Setzt der Kunde KI-generierte Inhalte
              gegenüber Dritten ein, beachtet er etwaige eigene Kennzeichnungs- und Transparenzpflichten.
            </p>
          </Section>

          <Section title="§ 5 Verfügbarkeit, Wartung und Support">
            <p>
              (1) Der Anbieter erbringt die Leistungen mit einer Verfügbarkeit von 98&nbsp;% im Monatsmittel am
              Übergabepunkt (Ausgang des Rechenzentrums, in dem die Software gehostet wird). Die Verfügbarkeit
              berechnet sich als Verhältnis der Gesamtminuten des Kalendermonats abzüglich der Ausfallminuten zu
              den Gesamtminuten des Kalendermonats. Ein Ausfall liegt vor, wenn die Software oder ihre
              Kernfunktionen (insbesondere die Erstellung von Kalkulationen) am Übergabepunkt nicht nutzbar
              sind; Störungen eingesetzter Dienste von Unterauftragnehmern gelten als Ausfall, soweit der
              Anbieter sie nach Abs. 2 zu vertreten hat. Die Verfügbarkeitszusage ist eine Beschaffenheitsangabe
              und keine Garantie im Rechtssinne.
            </p>
            <p className="mt-3">
              (2) Als verfügbar gelten Zeiten geplanter Wartung nach Abs. 3 sowie Zeiten, in denen die Software
              aufgrund von Umständen nicht erreichbar ist, die der Anbieter auch unter Berücksichtigung des
              § 278 BGB nicht zu vertreten hat (insbesondere höhere Gewalt oder Störungen von
              Kommunikationsnetzen außerhalb des Verantwortungsbereichs des Anbieters). Die gesetzlichen Rechte
              des Kunden bei Mängeln der Software bleiben unberührt.
            </p>
            <p className="mt-3">
              (3) Geplante Wartungsarbeiten werden mindestens 48 Stunden im Voraus per E-Mail an die vom Kunden
              hinterlegte Adresse angekündigt, nach Möglichkeit außerhalb üblicher Geschäftszeiten durchgeführt
              und umfassen höchstens acht Stunden pro Kalendermonat. Bei Gefahr im Verzug, insbesondere zur
              Abwehr von Sicherheitsrisiken, ist eine kürzere Ankündigungsfrist zulässig; die Dauer wird auf das
              Wartungskontingent angerechnet. Darüber hinausgehende Wartungszeiten gelten als Ausfallzeit.
            </p>
            <p className="mt-3">
              (4) Der Kunde meldet Störungen unverzüglich in Textform an den Anbieter.
            </p>
            <p className="mt-3">
              (5) Der Anbieter nimmt Störungsmeldungen und Supportanfragen per E-Mail an Werktagen (Montag bis
              Freitag, mit Ausnahme gesetzlicher Feiertage in Baden-Württemberg) entgegen und bearbeitet sie
              innerhalb angemessener Frist. Bestimmte Reaktions- oder Wiederherstellungszeiten schuldet der
              Anbieter nur bei ausdrücklicher Vereinbarung eines Service Level Agreements.
            </p>
          </Section>

          <Section title="§ 6 Datensicherung">
            <p>
              (1) Der Anbieter sichert die in der Software gespeicherten Kundendaten regelmäßig durch
              automatisierte Datensicherungen.
            </p>
            <p className="mt-3">
              (2) Unabhängig davon obliegt es dem Kunden, seine Kundendaten in dem von der Software angebotenen
              Umfang regelmäßig zu exportieren und zusätzlich zu sichern.
            </p>
          </Section>

          <Section title="§ 7 Pflichten des Kunden">
            <p>(1) Der Kunde wird</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Zugangsdaten geheim halten, vor dem Zugriff Dritter schützen und eine Weitergabe an Dritte unterlassen,</li>
              <li>nur Inhalte hochladen, an denen er die erforderlichen Rechte besitzt,</li>
              <li>keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO) hochladen,</li>
              <li>die Software nicht missbräuchlich, rechtswidrig oder zur Beeinträchtigung Dritter nutzen.</li>
            </ul>
            <p className="mt-3">
              (2) Der Kunde stellt sicher, dass in hochgeladenen Dokumenten enthaltene personenbezogene Daten
              rechtmäßig verarbeitet werden dürfen.
            </p>
            <p className="mt-3">
              (3) Der Kunde stellt den Anbieter von allen Ansprüchen Dritter frei, die auf einer rechtswidrigen
              Nutzung der Software durch den Kunden oder auf von ihm hochgeladenen Inhalten beruhen,
              einschließlich der angemessenen Kosten der Rechtsverteidigung, es sei denn, der Kunde hat die
              Rechtsverletzung nicht zu vertreten.
            </p>
          </Section>

          <Section title="§ 8 Preise und Zahlung">
            <p>
              (1) Es gelten die im Angebot bzw. in der Auftragsbestätigung ausgewiesenen Preise, einschließlich
              einer etwaigen einmaligen Onboarding- bzw. Einrichtungsgebühr. Alle Preise verstehen sich zuzüglich
              der gesetzlichen Umsatzsteuer.
            </p>
            <p className="mt-3">
              (2) Die laufende Vergütung ist, soweit nicht anders vereinbart, monatlich im Voraus fällig. Die
              Zahlung erfolgt nach Wahl des Kunden per Überweisung auf Rechnung oder per SEPA-Lastschrift.
              Rechnungen werden elektronisch übermittelt. Bei SEPA-Lastschrift wird die Vorabinformation
              (Pre-Notification) mindestens einen Kalendertag vor Fälligkeit übermittelt; der Kunde sorgt für
              ausreichende Kontodeckung.
            </p>
            <p className="mt-3">
              (3) Bei Zahlungsverzug gelten die gesetzlichen Regelungen.
            </p>
            <p className="mt-3">
              (4) Gerät der Kunde mit einem Betrag in Verzug, der mindestens einem monatlichen Entgelt
              entspricht, ist der Anbieter berechtigt, den Zugang zur Software vorübergehend zu sperren, wenn er
              die Sperrung zuvor in Textform angekündigt und eine Nachfrist von mindestens sieben Kalendertagen
              gesetzt hat. Während der Sperrung stellt der Anbieter dem Kunden dessen Kundendaten auf Anforderung
              entsprechend § 10 Abs. 2 bereit. Die Sperrung wird nach vollständiger Zahlung unverzüglich
              aufgehoben; die Zahlungspflicht des Kunden bleibt von der Sperrung unberührt.
            </p>
            <p className="mt-3">
              (5) Der Kunde kann nur mit unbestrittenen, rechtskräftig festgestellten oder entscheidungsreifen
              Gegenforderungen aufrechnen; dies gilt nicht für Gegenforderungen, die mit der jeweiligen
              Hauptforderung in einem Gegenseitigkeitsverhältnis stehen. Zurückbehaltungsrechte stehen dem Kunden
              nur wegen Gegenansprüchen aus demselben Vertragsverhältnis zu.
            </p>
            <p className="mt-3">
              (6) Preisänderungen werden mindestens sechs Wochen vor ihrem Wirksamwerden in Textform mitgeteilt
              und werden frühestens zum Ende der jeweiligen Laufzeit wirksam, bei unbefristeten Verträgen
              frühestens sechs Wochen nach Zugang der Mitteilung. Der Kunde kann den Vertrag zum Zeitpunkt des
              Wirksamwerdens der Änderung in Textform kündigen; hierauf weist der Anbieter in der
              Änderungsmitteilung hin.
            </p>
          </Section>

          <Section title="§ 9 Laufzeit und Kündigung">
            <p>
              (1) Laufzeit und Kündigungsfristen ergeben sich aus dem jeweiligen Angebot bzw. der
              Auftragsbestätigung. Ist nichts vereinbart, läuft der Vertrag auf unbestimmte Zeit und kann von
              beiden Parteien mit einer Frist von einem Monat zum Ende eines Kalendermonats gekündigt werden.
            </p>
            <p className="mt-3">
              (2) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
            </p>
            <p className="mt-3">
              (3) Kündigungen bedürfen der Textform (z.&nbsp;B. E-Mail).
            </p>
          </Section>

          <Section title="§ 10 Datenexport und Löschung bei Vertragsende">
            <p>
              (1) Der Kunde kann seine Kundendaten während der Vertragslaufzeit über die von der Software
              angebotenen Exportfunktionen selbst exportieren.
            </p>
            <p className="mt-3">
              (2) Auf Anforderung, die dem Anbieter innerhalb von 30 Kalendertagen nach Vertragsende zugehen
              muss, stellt der Anbieter dem Kunden dessen Kundendaten einmalig unentgeltlich in einem gängigen,
              maschinenlesbaren Format (z.&nbsp;B. CSV oder JSON, Dokumente ggf. als PDF) bereit. Weitergehende
              Unterstützungs- oder Migrationsleistungen erfolgen gegen gesonderte Vergütung.
            </p>
            <p className="mt-3">
              (3) Nach Ablauf der Frist nach Abs. 2 und, im Fall fristgerechter Anforderung, nach Bereitstellung
              der Daten ist der Anbieter zur Löschung der Kundendaten einschließlich der kundenspezifischen
              Lern- und Optimierungsdaten nach § 4 Abs. 5 berechtigt und, soweit datenschutzrechtlich geboten,
              verpflichtet, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
            </p>
          </Section>

          <Section title="§ 11 Nutzungsrechte">
            <p>
              (1) Der Kunde erhält für die Vertragslaufzeit das einfache, nicht übertragbare Recht, die Software
              für eigene geschäftliche Zwecke zu nutzen. Eine Weitervermietung oder Überlassung an Dritte ist
              unzulässig. Der Kunde wird die Software nicht zurückentwickeln, dekompilieren oder disassemblieren;
              die Rechte aus § 69e UrhG bleiben unberührt.
            </p>
            <p className="mt-3">
              (2) Die Kundendaten stehen dem Kunden zu. Der Anbieter darf sie verarbeiten, soweit dies zur
              Vertragserfüllung einschließlich der kundenspezifischen Verfahren nach § 4 Abs. 5 erforderlich ist.
            </p>
          </Section>

          <Section title="§ 12 Mängelrechte">
            <p>
              (1) Der Kunde zeigt Mängel der Software unverzüglich in Textform an und unterstützt den Anbieter in
              zumutbarem Umfang bei der Fehleranalyse.
            </p>
            <p className="mt-3">
              (2) Der Anbieter beseitigt Mängel innerhalb angemessener Frist.
            </p>
            <p className="mt-3">
              (3) Eine Minderung der Vergütung durch Abzug vom laufenden Entgelt ist ausgeschlossen; der Kunde
              kann eine berechtigte Minderung durch Rückforderung des zu viel gezahlten Betrags geltend machen.
            </p>
            <p className="mt-3">
              (4) Das Selbstvornahmerecht des Kunden nach § 536a Abs. 2 Nr. 2 BGB ist ausgeschlossen; das Recht
              nach § 536a Abs. 2 Nr. 1 BGB bleibt unberührt.
            </p>
          </Section>

          <Section title="§ 13 Haftung">
            <p>
              (1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit, bei Verletzung von Leben,
              Körper oder Gesundheit, bei Arglist sowie nach dem Produkthaftungsgesetz und im Umfang ausdrücklich
              übernommener Garantien.
            </p>
            <p className="mt-3">
              (2) Bei einfacher Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher
              Vertragspflichten, das heißt solcher Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des
              Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertraut und
              vertrauen darf; in diesem Fall ist die Haftung auf den vertragstypischen, bei Vertragsschluss
              vorhersehbaren Schaden begrenzt.
            </p>
            <p className="mt-3">
              (3) Die verschuldensunabhängige Haftung für bei Vertragsschluss vorhandene Mängel nach § 536a
              Abs. 1 BGB ist ausgeschlossen.
            </p>
            <p className="mt-3">
              (4) Im Übrigen ist die Haftung des Anbieters ausgeschlossen.
            </p>
            <p className="mt-3">
              (5) Ein Mitverschulden des Kunden, insbesondere die Verwendung von Ergebnissen ohne die nach § 4
              Abs. 2 gebotene Prüfung, ist nach § 254 BGB zu berücksichtigen.
            </p>
            <p className="mt-3">
              (6) Bei einfach fahrlässig verursachtem Verlust von Kundendaten ist die Haftung auf den Aufwand
              begrenzt, der bei ordnungsgemäßer Wahrnehmung der Exportobliegenheit nach § 6 Abs. 2 für die
              Wiederherstellung erforderlich gewesen wäre. Dies gilt nicht, soweit der Verlust auf einer
              Verletzung der Sicherungspflicht des Anbieters nach § 6 Abs. 1 beruht oder soweit dem Kunden eine
              Sicherung der betroffenen Daten nicht möglich war.
            </p>
            <p className="mt-3">
              (7) Vertragliche Schadens- und Aufwendungsersatzansprüche des Kunden gegen den Anbieter verjähren
              in zwölf Monaten ab dem gesetzlichen Verjährungsbeginn. Dies gilt nicht für Ansprüche nach Abs. 1,
              für Rückforderungsansprüche nach § 12 Abs. 3 sowie für Ansprüche aus der Vereinbarung zur
              Auftragsverarbeitung oder aus dem Datenschutzrecht; insoweit gelten die gesetzlichen Fristen.
            </p>
            <p className="mt-3">
              (8) Die Haftungsbeschränkungen und -ausschlüsse nach Abs. 2 bis 4 und 6 gelten nicht in den Fällen
              des Abs. 1.
            </p>
          </Section>

          <Section title="§ 14 Vertraulichkeit">
            <p>
              (1) Die Parteien behandeln alle im Rahmen des Vertrags erlangten Geschäfts- und Betriebsgeheimnisse
              sowie als vertraulich gekennzeichnete Informationen der jeweils anderen Partei vertraulich und
              verwenden sie ausschließlich zur Durchführung des Vertrags. Dies umfasst insbesondere hochgeladene
              Ausschreibungsunterlagen, Kalkulationen und Preisstrukturen des Kunden.
            </p>
            <p className="mt-3">
              (2) Diese Pflicht besteht für die Dauer von drei Jahren nach Vertragsende fort. Gesetzliche
              Pflichten zum Schutz von Geschäftsgeheimnissen (GeschGehG) bleiben unberührt.
            </p>
          </Section>

          <Section title="§ 15 Datenschutz">
            <p>
              (1) Das Hosting der Software erfolgt in Rechenzentren in Deutschland; die KI-Verarbeitung erfolgt
              gemäß § 4 Abs. 4 in Rechenzentren innerhalb der Europäischen Union.
            </p>
            <p className="mt-3">
              (2) Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden verarbeitet, schließen die
              Parteien bei Vertragsschluss eine Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO, die
              Bestandteil des Vertrags wird und auch die eingesetzten Unterauftragsverarbeiter (einschließlich
              Hosting- und KI-Dienstleister) sowie das Verfahren bei deren Wechsel regelt.
            </p>
            <p className="mt-3">
              (3) Einzelheiten zur Datenverarbeitung ergeben sich aus der{" "}
              <Link href="/datenschutz" className="underline hover:opacity-70" style={{ color: "var(--color-primary)" }}>
                Datenschutzerklärung
              </Link>.
            </p>
          </Section>

          <Section title="§ 16 Höhere Gewalt">
            <p>
              (1) Keine Partei haftet für die Nichterfüllung ihrer Pflichten (ausgenommen Zahlungspflichten),
              soweit diese auf höherer Gewalt beruht, insbesondere Naturkatastrophen, Krieg, Epidemien,
              behördlichen Anordnungen, Arbeitskampf, Ausfällen von Energie- oder Telekommunikationsnetzen
              außerhalb des Einflussbereichs der betroffenen Partei sowie Cyberangriffen, die trotz angemessener
              Schutzmaßnahmen nicht abgewehrt werden konnten. Die gesetzlichen Rechte des Kunden bei Mängeln der
              Software bleiben unberührt.
            </p>
            <p className="mt-3">
              (2) Dauert das Ereignis länger als 60 Kalendertage an, kann jede Partei den Vertrag außerordentlich
              kündigen.
            </p>
          </Section>

          <Section title="§ 17 Referenznennung">
            <p>
              Der Anbieter darf den Kunden unter Verwendung von Name und Logo als Referenzkunden auf seiner
              Website und in Marketingunterlagen nennen. Der Kunde kann dieser Nennung jederzeit in Textform mit
              Wirkung für die Zukunft widersprechen.
            </p>
          </Section>

          <Section title="§ 18 Änderungen dieser AGB">
            <p>
              Der Anbieter kann diese AGB mit Wirkung für die Zukunft ändern, soweit dies aufgrund von Änderungen
              der Gesetzeslage oder Rechtsprechung, technischer Weiterentwicklung oder der Einführung neuer
              Funktionen erforderlich ist und die Änderung weder die Hauptleistungspflichten betrifft noch das
              Verhältnis von Leistung und Entgelt zulasten des Kunden verändert; Preisänderungen richten sich
              ausschließlich nach § 8 Abs. 6. Änderungen werden dem Kunden mindestens sechs Wochen vor
              Wirksamwerden in Textform mitgeteilt. Widerspricht der Kunde nicht innerhalb dieser Frist, gelten
              die Änderungen als genehmigt; auf diese Rechtsfolge weist der Anbieter in der Mitteilung gesondert
              hin. Widerspricht der Kunde, kann der Anbieter den Vertrag ordentlich kündigen, bei befristeten
              Verträgen mit Wirkung zum Ende der Laufzeit.
            </p>
          </Section>

          <Section title="§ 19 Schlussbestimmungen">
            <p>
              (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
            </p>
            <p className="mt-3">
              (2) Ist der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches
              Sondervermögen oder hat er seinen Sitz außerhalb der Bundesrepublik Deutschland, ist
              ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag
              der Sitz des Anbieters.
            </p>
            <p className="mt-3">
              (3) Der Kunde darf Rechte und Pflichten aus diesem Vertrag nur mit vorheriger Zustimmung des
              Anbieters in Textform übertragen; § 354a HGB bleibt unberührt. Der Anbieter ist berechtigt, den
              Vertrag mit allen Rechten und Pflichten auf ein mit ihm verbundenes Unternehmen oder einen
              Rechtsnachfolger zu übertragen. Die Übertragung wird dem Kunden mindestens vier Wochen vor
              Wirksamwerden in Textform angezeigt; der Kunde kann den Vertrag bis zum Wirksamwerden
              außerordentlich kündigen.
            </p>
            <p className="mt-3">
              (4) Individuelle Vertragsabreden haben stets Vorrang vor diesen AGB (§ 305b BGB). Im Übrigen
              bedürfen Änderungen und Ergänzungen des Vertrags der Textform.
            </p>
            <p className="mt-3">
              (5) Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der
              übrigen Bestimmungen unberührt.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
