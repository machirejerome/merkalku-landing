# Finder: gesperrter Live-Anschluss

`/api/ausschreibungsfinder` ist absichtlich mit `createLiveSearchHandler(null)` verbunden und antwortet auf gültige Suchanfragen mit HTTP 503. Kein Env-Schalter, Service-Key, In-Memory-Zähler oder erfolgreiches Beispiel schaltet Live frei. `/beispiel` liefert ausschließlich frei erfundene UI-Beispiele nach einer bewussten Nutzeraktion; keine Datenbankverbindung.

Vor Anschluss müssen eigenständige, serverseitige Implementierungen von `FinderIntegration` abgenommen sein:

1. **Reader:** eigener sanitierter Suchbestand, positive Quellen-/Feld-Allowlist, nur SELECT bzw. begrenztes Execute. Kein Production-Master-Key. Kein anonymer Datenbank-/RPC-/Realtime-/Storage-Zugang. Der Reader liefert stabil sortierte, kanonisch deduplizierte Wettbewerbs-/Los-Einheiten; maximal zehn pro Seite. Lizenziertes PLZ-Register. Keine Buyer-Fallback-Geometrie.
2. **Admission:** echte servervalidierte Challenge einschließlich action/hostname/Replay-Schutz; sessiongebundener `cursorSubject`; separate serververgebene Budget-ID maximal 30 Tage, Zugriffssession maximal 24h. Sessionerneuerung behält Budget-ID. Ursprungs-Header sind keine Authentifizierung.
3. **Atomare Quoten:** gemeinsamer konsistenter Store, keine rein regionalen/in-memory Counter. Eng begrenzte Schreibrechte nur für Quotenoperationen. Jede Request- und Expositionsdimension vor Ausgabe reservieren; Cachehit/Parallelität/Neusession dürfen übergeordnete Grenzen nicht umgehen. `reserveDisclosure` prüft zusätzlich aktuelle autoritative Versionen/Widerrufe und Notbremse. Bei Störung ablehnen, nicht nur loggen.
4. **Freigabedaten:** `sourceStatusCheckedAt` mit tatsächlichem Quellen-/Versions-/Offenheitsnachweis, nicht `notice_checked_at`. Genaue Fristart und Quellenuhrzeit/Zeitzone; aktuelle Version; nachgewiesener Leistungsort. Unklare/abgelaufene/aufgehobene Einheiten sperren. Ergebnisereignisse dürfen intern losbezogen schließen, nie Treffer werden. Tenantstatus ist irrelevant.
5. **Betrieb:** dauerhafter geheimer 32-Byte-Cursorschlüssel nur serverseitig, explizite Origin-/Quellenhost-Allowlist, Source-/Quoten-/Kosten-Notbremse und getestete Deployment-/Supabase-Bypass-Sperren. Keyrotation verwirft alte Cursor. Keine Keys im Frontend, keine Produktionsdaten in HTML/Build/Feeds. UI für Live-Antworten und reale Challenge erst gemeinsam mit Adapter aktivieren.

Startwerte aus `finder-security-challenge-2026-10-03.json`: anonyme Budget-ID 20 neue kanonische Einheiten/24h und 60 während ihrer maximal 30-tägigen Lebenszeit; IP 40/24h und 120 rollierend/30d; acht Suchen und drei PLZ/24h; zehn Treffer × maximal zwei Seiten. Keine automatische Quotenerhöhung durch Self-Service-Konto. Geprüfte Teamausnahmen bleiben begrenzt und serverquotiert. Kurzfristige Request-/Netz-/Kostenlimits zusätzlich. Das ist ein Tuningvorschlag, kein bewiesener Schutz.

Cookie-Löschen, IP-Rotation und kooperierende Personen bleiben Grenzen. Bereits an Menschen ausgegebene Daten können kopiert werden. Die Vorschau implementiert keine solche Identitäts-/Quoteninfrastruktur und behauptet sie nicht.

Tests prüfen Requestgrenzen, Fail-closed-Verhalten, Eligibility, Response-Allowlist, Quotenreihenfolge und Cursorbindung offline. Sie ersetzen keine Parallelitäts-/Regionen-/NAT-/WAF-/Providerabnahme. Seiten/Artikel bleiben bei gesperrter Finder-API erreichbar. Root führt Build und Browserabnahme aus.
