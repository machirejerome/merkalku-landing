# Finder: begrenzter Live-Pilot

## Aktueller Anschluss

`/ausschreibungen` verwendet die echte `POST /api/ausschreibungsfinder`-Schnittstelle (`database.ts` → `live.ts`). Der Adapter liest ausschließlich die eigene Finder-Projektion in Neon und verwendet dort gemeinsame, atomare Quotenfunktionen. Die Oberfläche zeigt keine erfundenen Beispielausschreibungen mehr. Ältere Beispiel-/Adapterartefakte im Repository belegen nicht den aktuellen Anschluss.

Am 3. Oktober 2026 wurde die Vercel-Vorschau von Commit `886b144` im Browser mit zwei echten, zuvor an TED geprüften Gingster Wettbewerbsbekanntmachungen aus Neon getestet: PLZ 18569, Radius 50 km, HTTP 200, BotID Basic und HttpOnly-/Secure-/SameSite-Strict-Cookie. Dies belegt diesen Vorschaupfad, **keine Production-Freigabe, bundesweite Abdeckung oder dauerhaft erfolgreiche Aktualisierung**. Die Finder-Seite bleibt `noindex, follow`; das geschützte Trefferinventar erhält keinen Suchmaschinen-Bypass.

SQL-Grenzen, Rollen, Quoten, Migrationen und Betrieb stehen im [Security- und Betriebs-README](../../../scripts/finder/README.md). Vertrag, SQL und HTTP-Adapter müssen bei Änderungen gemeinsam geprüft werden.

## Öffentliche Antwort und Sperren

- Höchstens zehn Treffer je Seite, höchstens zwei Seiten; keine Gesamtzahl, beliebigen Offsets oder öffentlichen Bestandsdateien. Cursor sind verschlüsselt, fünf Minuten gültig und an Abfrage, Budget-ID und Zugriffssession gebunden. Widerrufene oder ersetzte Einheiten werden auf Folgeseiten nicht durch neue Treffer aufgefüllt.
- Nur der kleine HTTP-DTO verlässt den Server: ID, Titel, Leistungsbezeichnung, Leistungsortbezeichnung, ungefähre Entfernung samt Bezugsart, Fristart/-zeit, TED-Link und Quellenprüfstand. Interne kanonische IDs, Evidenz, Versionen und Koordinaten bleiben serverseitig. Unmittelbar vor Ausgabe erfolgt erneut die Eligibility-Prüfung.
- Exakte erlaubte Origin, vertrauenswürdige Vercel-IP-Herkunft, serverseitige BotID-Prüfung, signiertes Cookie und persistente SQL-Quoten sind gemeinsam erforderlich. Origin/CORS und undurchsichtige IDs allein authentifizieren niemanden. Fehlende Konfiguration, Store-Fehler oder ungültige Adapterantwort sperren die Suche; Wissensseiten bleiben unabhängig verfügbar.
- Budget-ID höchstens 30 Tage, Zugriffssession höchstens 24 Stunden; Sessionerneuerung behält das Budget. Startgrenzen: 20 neue kanonische Einheiten/24 h und 60 je Budget-Lebenszeit; IP 40/24 h und 120/30 Tage; acht neue Suchen und drei PLZ/24 h. Weitere Grenzen siehe README. Das sind Pilotwerte, kein vollständig bewiesener Scraping-Schutz. Cookie-Löschen, IP-Rotation, Kooperation und das Kopieren bereits ausgegebener Daten bleiben Grenzen.

## Quellenpipeline und fachliche Pilotgrenzen

1. Ein gesondertes Supabase-RPC exportiert maximal 500 erlaubte öffentliche TED-Identitäten. Keine Kontakte, Mandantenzustände, Rohdaten oder gespeicherten Käuferkoordinaten. Seeds sind **noch keine als offen bestätigten Treffer**.
2. `scripts/finder/ted-revalidate.mjs` prüft Originalmetadaten, vollständige Verfahrens-/Versionsabfragen und eForms-XML erneut. Das aktuelle konservative Regelwerk akzeptiert offene Standardverfahren mit eindeutiger einzelner Bekanntmachung, passender Reinigungs-CPV, belegbarer Angebotsfrist samt Originaluhrzeit/-zeitzone und eindeutigem Leistungsort. Fehlende, widersprüchliche oder komplexe Fälle werden ausgeschlossen. Datenvertrag und UI unterscheiden Angebots- und Teilnahmefristen; **der aktuelle TED-Importer schaltet Teilnahmeverfahren noch nicht frei**. Mehrteilige Änderungs-/Ersetzungsketten und unsichere Loszuordnungen werden nicht geraten.
3. Ergebnisbekanntmachungen werden niemals Treffer. Negative Ereignisse können nur passende kanonische Verfahren-/Los-Einheiten sperren. Los A darf kein anderes aktives Los schließen. Der Bearbeitungsstatus eines MerKalku-Mandanten ist irrelevant.
4. GeoNames liefert unter CC BY 4.0 geprüfte PLZ-/Ortsreferenzen; `geodata.mjs` reproduziert den begrenzten Download und die strikte Transformation. Keine Käuferadresse als Leistungsort-Fallback. Entfernungen sind ungefähre Luftlinien zwischen Referenzpunkten, keine Entfernung zum konkreten Reinigungsobjekt. GeoNames- und Lizenzverweise bleiben in der UI sichtbar.
5. Der private Import enthält nur `{candidates, revokedCanonicalUnitIds}`. `sourceStatusCheckedAt` entsteht nach abgeschlossener Originalprüfung und ist weder `notice_checked_at` noch Importdatum. Zulässigkeit endet spätestens nach 24 Stunden, bei einer Frist innerhalb von 48 Stunden spätestens nach einer Stunde sowie stets spätestens zur Frist. SQL und HTTP prüfen dies erneut.

Der bisher belastbar erfolgreich geprüfte Bestand umfasst zwei Gingster Einheiten. Ein früher breiter Lauf mit 263 Seeds lieferte ausschließlich generische HTTP-Fehler; sein damaliges Protokoll belegt keine Ursache. Spätere getaktete Zweierkontrollen waren erfolgreich. Das bestätigt weder eine Drosselungsdiagnose noch den breiten Bestand. Eine leere Suche bedeutet nur „keine passenden freigegebenen Treffer im Pilotbestand“.

## Privater Job und Betriebsabnahme

`refresh.mjs` verbindet Seed-Export, GeoNames, TED-Prüfung und separaten Neon-Importer. Migration `003-refresh-claim.sql` erlaubt höchstens einen begonnenen Aktualisierungsversuch je rollender Stunde. Dies ist eine gemeinsame Startsperre; eine tatsächlich laufende Zeitplanung muss separat nachgewiesen werden. Der anfängliche Workflow ist manuell auslösbar.

TED ist auf 500 Seeds, 3.000 HTTP-Versuche und 600 Sekunden begrenzt; global getaktete Starts und ein Circuit Breaker begrenzen Fehlerversuche. 500 ist eine Eingangsobergrenze, keine Zusage vollständiger Verarbeitung im Zeitbudget. Die Projektion erlaubt höchstens 1.000 Einheiten; Importe erfolgen in begrenzten Paketen.

Teilprüfungen erneuern nur belegte Kandidaten. Explizite Widerrufe werden auch bei TED-Exitcode 2 **vor** neuen Kandidaten importiert. Nicht erneut belegte Einheiten des autoritativen vorherigen Bestands werden gesperrt. Bei fatalen Fehlern versucht der Job zusätzlich, den bekannten Bestand zu widerrufen; bei unerreichbarer Datenbank kann dies scheitern, ohne die vorhandene Ablaufgrenze zu verlängern. Teilimporte und verlorene Importbestätigungen fallen ebenfalls in diesen Fallback. Physische Löschung benötigt einen nachweislich ausgeführten Cleanup-Job; logische Ablaufprüfung ersetzt dies nicht.

Web und Job besitzen verschiedene eingeschränkte Neon-Logins. Der Webprozess hat keinen Importzugang; der Job verwendet den begrenzten Supabase-Exporttoken, den öffentlichen Projekt-API-Key und seine Importer-Zugangsdaten. Kein Supabase-Master-/Service-Role-Key, keine `NEXT_PUBLIC`-Secrets. Kindprozesse erhalten keine Datenbank-/Exportsecrets. Seed-, Geo- und Kandidatendateien bleiben in einem privaten temporären Verzeichnis, ohne Veröffentlichung als CI-Artefakt.

Offene Betriebsnachweise: kontrollierter breiter Quellenlauf, begrenzte Jobausführung einschließlich Teilfehler/Widerruf, periodische physische Bereinigung, Secret-/Login-Trennung im Zielsystem, NAT-/Mehrnutzerverhalten, Notbremse und Production-Abnahme. Lokale Unit-/SQL-Tests oder die erfolgreiche Zweiertreffer-Vorschau ersetzen diese Nachweise nicht.
