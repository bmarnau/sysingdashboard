# Sysing Dashboard — Backlog

Stand: 2026-10-31
Status: lebendes, chat-unabhängiges Backlog

GitHub ist die maßgebliche Quelle. Neue Backlog-Einträge werden hier fachlich beschrieben und bei Einplanung in Sprint-/Meilensteinplanung mit `docs/ROADMAP-MVP-BSF.md` synchronisiert.

## BSF — Produktdomain & Auth-Mail-Infrastruktur

**Status:** geplant  
**Meilenstein:** BSF — Betriebsfähiges Systemhaus-Fundament  
**Priorität:** hoch / früh im BSF  
**Aufwand:** ca. 1–2 Lovable-Prompts plus DNS-/df.eu-Konfiguration

### Ausgangslage

Die Domain `sysingdashboard.de` ist bei df.eu registriert. Der aktuelle plattformverwaltete Standard-Mailversand der Lovable-Cloud-Auth-Instanz ist für Registrierung, Bestätigung und Passwort-Recovery an externe Empfänger nicht zuverlässig genug. Das wurde bei der F-11-Abnahme praktisch sichtbar.

### Ziel

`sysingdashboard.de` wird die offizielle Produkt- und Betriebsdomain des Sysing Dashboards. Domain-, App- und Mailstruktur sollen so aufgebaut werden, dass sie langfristig unabhängig von einer einzelnen Hosting-/Entwicklungsplattform nutzbar bleiben.

### Geplante Domainstruktur

- `sysingdashboard.de` / `www.sysingdashboard.de`: Produkt-/Informationsseite oder kontrollierte Weiterleitung
- `app.sysingdashboard.de`: bevorzugte produktive Adresse der Dashboard-Anwendung
- `board.sysingdashboard.de`: derzeit nicht erforderlich; nur bei späterem fachlichem Bedarf
- Domainnamen und Basis-URLs dürfen nicht hart im Code verdrahtet werden, sondern müssen konfigurierbar bleiben

### Geplante Funktionsadressen

- `noreply@sysingdashboard.de`: automatisierte Auth-/Systemmails
- `info@sysingdashboard.de`: allgemeiner Kontakt
- `support@sysingdashboard.de`: Support
- `security@sysingdashboard.de`: Sicherheitshinweise / Responsible Disclosure
- `admin@sysingdashboard.de`: technische Administration

Kontakt- oder Supportformulare sind zunächst **nicht** Bestandteil dieses Arbeitspakets. Die Adressen können anfangs als normale Postfächer/Aliase betrieben werden.

### Auth- und Mailbetrieb

Der BSF-Schritt soll einen kontrollierten und belastbaren Mailpfad für mindestens folgende Auth-Funktionen bereitstellen:

- Registrierung
- E-Mail-Bestätigung
- Passwort-Recovery
- sicherheitsrelevante Systemhinweise, soweit später erforderlich

Dazu gehören mindestens:

- eigener/geeigneter Mailanbieter bzw. SMTP-/Transaktionsmailpfad
- Absendername `SysIng Dashboard`
- Absenderadresse bevorzugt `noreply@sysingdashboard.de`
- Reply-To nach fachlicher Entscheidung
- SPF
- DKIM
- DMARC, zunächst mit Monitoring
- Ende-zu-Ende-Zustelltests an externe Empfänger
- nachvollziehbare Fehler-/Zustellprotokollierung ohne sensible Inhalte
- keine SMTP-Zugangsdaten, Tokens oder sonstigen Secrets im Code oder in der Dokumentation

### Architektur- und Sicherheitsanforderungen

- Mail- und Domainkonfiguration über Environment-/Provider-Konfiguration
- keine harte Lovable-Cloud-Abhängigkeit
- Fachlogik von Mailprovider/SMTP-Implementierung trennen
- Auth-, Daten- und Mailprovider austauschbar halten
- Secrets ausschließlich in geeigneter Server-/Secret-Verwaltung
- keine Zugangsdaten im Client
- Rate-Limits und Missbrauchsschutz berücksichtigen
- Datenschutz und Logging-Grenzen dokumentieren
- Docker-/On-Premises-Betrieb langfristig berücksichtigen

### Bezug zu bestehenden Findings

- F-15: fehlender externer Betreiberzugang zur plattformverwalteten Backend-Instanz bleibt ein eigener Portabilitäts-/Betreiberhoheitsbefund
- F-16/F-17 bzw. administrative Passwort-Wiederherstellung sind kurzfristige MVP-/Betriebsmechanismen und ersetzen den produktiven Mail-/Recovery-Kanal nicht
- der eigene Domain-/Mailpfad ist die langfristig belastbare Lösung für Auth-Mailzustellung

### TDF / SYSING-001

SYSING-001 soll die Domain-, Auth-Mail- und Betriebsarchitektur ab dem Zeitpunkt ihrer Planung und Umsetzung entsprechend dem tatsächlichen Reifegrad darstellen. Geplante und umgesetzte Zustände müssen klar getrennt bleiben.

### Abnahmekriterien

Das Arbeitspaket ist abgeschlossen, wenn mindestens:

1. `sysingdashboard.de` als offizielle Produktdomain dokumentiert ist,
2. `app.sysingdashboard.de` als bevorzugte App-Adresse technisch vorbereitet bzw. produktiv nutzbar ist,
3. URLs konfigurierbar und nicht hart codiert sind,
4. der Auth-Mailversand über einen kontrollierten Absender der eigenen Domain erfolgt,
5. SPF, DKIM und DMARC geprüft sind,
6. Registrierung, E-Mail-Bestätigung und Passwort-Recovery Ende-zu-Ende erfolgreich getestet wurden,
7. Zustellfehler nachvollziehbar bewertet werden können,
8. keine Secrets im Client/Repository/Dokumentation vorhanden sind,
9. Handbuch, Betriebsdokumentation, technischer Prüfbericht und SYSING-001 synchronisiert sind.

### Nicht Bestandteil dieses Arbeitspakets

- Microsoft Graph
- Exchange-Online-Mailauswertung
- automatischer E-Mail-Ausgang aus Fachprozessen
- Kontakt-/Supportformulare
- KI-/Agentenfunktionen

Diese Themen bleiben gemäß Roadmap nachgelagert.

---

## AVKK — Entwicklungsleitlinie und Ausbaupfad

**Status:** verbindliche fachliche Leitlinie  
**Meilensteine:** MVP → BSF → Post-BSF  
**Kernmodell:** AVKK bleibt unverändert

### Fachlicher Kern

AVKK bleibt das verbindliche fachliche Kernmodell des Sysing Dashboards:

- **A – Aufgabe**
- **V – Verantwortung**
- **K – Kompetenz**
- **K – Konsequenz**

AVKK wird nicht umbenannt und nicht um weitere Buchstaben erweitert. Zusätzliche Aspekte wie Ziele, Kapazität, Ressourcen oder Führungskreisläufe werden als Kontext, Rahmenbedingung oder auf AVKK aufbauende Funktion modelliert.

### Entwicklungslogik

Die fachliche Weiterentwicklung folgt diesem Dreisatz:

**MVP: Transparenz schaffen → BSF: Führung ermöglichen → Post-BSF: Entscheidungen intelligent vorbereiten.**

### MVP — AVKK erkennen

Ziel des MVP ist, AVKK transparent und belastbar sichtbar zu machen.

Dazu gehören insbesondere:

- Aufgaben vollständig und eindeutig erfassen,
- Verantwortung personenbezogen sichtbar machen,
- Kompetenz bewerten,
- Konsequenzen bewerten,
- Frühindikatoren und Gefährdungen erkennen,
- „Mein AVKK“ als persönliche Arbeitssicht,
- Managementsicht auf relevante AVKK-Sachverhalte,
- Rollen-/Rechtekonformität und Mehrbenutzerfähigkeit nachweisen.

### BSF — AVKK führen

Im BSF wird AVKK vom reinen Transparenzmodell zu einem Führungs- und Entscheidungsinstrument weiterentwickelt.

Geplante Ausbaurichtung:

- Kundenverantwortung in die AVKK-Sichten einbeziehen,
- kundenbezogene Gesamtsicht auch ohne unmittelbare Einzelverantwortung,
- Kapazität und Ressourcen als Erfüllbarkeitsfaktoren berücksichtigen,
- AVKK-Check vor Delegation bzw. Verantwortungsübernahme,
- Eskalations- und Handlungsoptionen vorbereiten,
- Aggregation von Signalen über Tätigkeit → Arbeitspaket → Projekt → Kunde,
- Managementcockpit stärker auf Führungsentscheidungen ausrichten,
- Kompetenz- und Ressourcenengpässe gezielt sichtbar machen.

### Kapazität bleibt Rahmenbedingung, kein fünfter AVKK-Bestandteil

Eine Person kann Verantwortung nur sinnvoll übernehmen, wenn neben der fachlichen Kompetenz auch notwendige Befugnisse, Ressourcen und zeitliche Kapazität vorhanden sind.

Kapazität wird deshalb ausdrücklich **nicht** zu einem zusätzlichen AVKK-Buchstaben. Sie ist eine Rahmenbedingung der Erfüllbarkeit innerhalb bzw. im Umfeld der Kompetenzbewertung.

Beispielhafte Logik:

- fachliche Kompetenz vorhanden,
- Befugnis vorhanden,
- Ressourcen vorhanden,
- Zeitkapazität fehlt,
- daraus folgt: Verantwortung ist derzeit gefährdet bzw. Führungsentscheidung erforderlich.

### AVKK-Check vor Delegation

Als BSF-Zielbild wird ein AVKK-Check vor Übernahme bzw. Delegation einer Aufgabe vorgesehen.

Der Check soll mindestens prüfen:

- **Aufgabe:** Ist sie eindeutig, verständlich und terminlich bestimmt?
- **Verantwortung:** Ist klar, wer persönlich verantwortlich ist und wofür?
- **Kompetenz:** Sind Können, Befugnisse, Ressourcen und zeitliche Erfüllbarkeit ausreichend?
- **Konsequenz:** Sind relevante Folgen bei Erfüllung bzw. Nichterfüllung bekannt?

Bei erkannten Engpässen soll Sysing nicht nur warnen, sondern mögliche Führungsentscheidungen vorbereiten, zum Beispiel:

- Priorität ändern,
- Termin anpassen,
- Ressourcen ergänzen,
- Verantwortung anders zuordnen,
- eskalieren.

Die Entscheidung selbst bleibt beim verantwortlichen Menschen.

### Kundenverantwortung und AVKK

Die bereits geplante Kundenverantwortung wird fachlich mit AVKK verbunden.

Ist ein Systemingenieur für einen Kunden verantwortlich, benötigt er eine Gesamtsicht auf die relevanten Projekte, Arbeitspakete und Tätigkeiten dieses Kunden, auch wenn andere Personen die unmittelbare AVKK-Verantwortung tragen.

Dabei bleibt verbindlich:

- Kundenverantwortung ist nicht gleich Objektverantwortung,
- Kundenverantwortung ist nicht gleich AVKK-Verantwortung,
- Sichtbarkeit erzeugt nicht automatisch Schreibrechte,
- der Grund der Sichtbarkeit soll nachvollziehbar bleiben.

### Post-BSF — AVKK intelligent unterstützen

Nach BSF kann AVKK schrittweise um intelligente, unterstützende Funktionen erweitert werden.

Mögliche Entwicklungsrichtung:

- historische AVKK-Muster erkennen,
- wiederkehrende Kompetenz- oder Ressourcenengpässe erkennen,
- organisationsweites Lernen aus AVKK-Historie,
- KI-gestützte Risiko- und Konsequenzanalyse,
- Entscheidungsvorlagen für Priorisierung, Ressourcen und Delegation,
- Gesprächs- und Eskalationsvorbereitung,
- Mustererkennung über Kunden, Projekte und Rollen hinweg.

Verbindlicher KI-Grundsatz:

> **Sysing erkennt, analysiert und bereitet Entscheidungen vor. Der verantwortliche Mensch entscheidet.**

KI-/Agentenfunktionen bleiben damit zunächst READ/PROPOSE-orientiert und Human-in-the-loop.

### Externe Inspiration / Abgrenzung

Externe Darstellungen zu ZAVKK, Führungskreisläufen, SystemChecks oder ähnlichen Methoden können als fachliche Inspiration dienen, werden aber nicht automatisch Bestandteil des Sysing-Fachmodells.

Insbesondere gilt:

- keine Umbenennung von AVKK zu ZAVKK,
- keine Übernahme fremder „Systemgesetze“ ohne separate fachliche und rechtliche Bewertung,
- kein fremder SystemCheck als Pflichtbestandteil ohne eigene Produktentscheidung,
- allgemeine Prinzipien wie Kapazitätsprüfung, Delegationsvorbereitung, Engpasssichtbarkeit und menschliche Führungsentscheidung dürfen als Inspiration in die Weiterentwicklung einfließen.

### TDF / SYSING-001

SYSING-001 soll diese AVKK-Entwicklungslogik ab der nächsten passenden Baseline nachvollziehbar darstellen:

- AVKK als unverändertes Kernmodell,
- MVP = Transparenz,
- BSF = Führung,
- Post-BSF = intelligente Entscheidungsvorbereitung,
- klare Trennung zwischen umgesetzt, geplant und konzeptionell.

## Ergänzungen 2026-10-25 (Golden Gate, nach dem Golden Gate)

- QS-04 Domain und Auth-Mail (eigene Absenderdomäne, Vorlagen, Versandroute mit Review).
- QS-06 Abrechnungsdaten nach Rolle (`billing.view`; Teamlead ja, Engineer nur Stunden), siehe `docs/QS-06-VIEWER-ABRECHNUNG.md`. Umsetzung als Draft-PR #222 vorbereitet; offen: QS6-4 (serverseitig), QS6-5 (Export), CHANGELOG nach Merge von PR #220.
- L2-Cockpit: Konzept `docs/L2-COCKPIT-SCHNITT-KONZEPT.md` freigegeben (2026-10-26); P1 und P2 liegen als Draft-PRs vor, Beträge bleiben bis QS-06 ausgeschlossen.
- PW-01 bis PW-03 Passwort in der Anwendung ändern, PW-05 Passwort-Reset mit Textbeschriftung, siehe `docs/PW-01-PASSWORT-AENDERN.md`.
- TD-01 Stufe b Live-Demo-Mandant auffrischen (relativ zu heute, entschieden 2026-10-26), ausgeführt am 2026-10-28 (Postflight 7 von 7 gleich Soll, `docs/DATENAUFTRAG-TD01-AUFFRISCHUNG.md` Abschnitt 9); offen: Sichtprüfung in der App. Wiederkehrende Auffrischung als geplante Aufgabe nach dem Golden Gate.
- L2-Cockpit P3 und P4 (Route, Rollenabnahme, Hilfe); P1 liegt als Draft-PR #226, P2 als Draft-PR #231 vor.
- L2-Cockpit P2b: AVKK-Server-Lesepfad (Befunde hoch/kritisch je Kunde) ohne zweite Fachlogik; bis dahin meldet das Cockpit AVKK als UNAVAILABLE. Entscheidung siehe `docs/L2-COCKPIT-SCHNITT-KONZEPT.md` Abschnitt 11.
- DOC-01 erledigt 2026-10-25: Prüfskripte `scripts/check-docs-sync.mjs` und `scripts/check-project-docs.mjs` nutzen `fileURLToPath` und laufen unter Windows. Offen (sollte): dieselbe Korrektur in `check-bundle.mjs`, `check-no-console.mjs`, `generate-test-report.mjs`, `test-example-files.mjs`.
- B2 Verantwortlichen-Filter der Arbeitssicht: Stellvertretungen berücksichtigen? Fachliche Entscheidung nach dem Golden Gate (Beobachtung aus Test K-2).
- GIT-01 Gemergte Remote-Branches löschen (40 vorbereitet, Lovable-Branches nur nach Rückfrage): `docs/GIT-AUFRAEUMEN.md`. Empfehlung: zusätzlich in GitHub „Automatically delete head branches“ aktivieren.
- GIT-02: GitHub-Einstellung „Automatically delete head branches“ einschalten (Nutzer, Repository-Einstellungen); danach `git:hygiene --strict` optional in die CI aufnehmen.
- TD-01 TB-5: Kategorien für Demo-Arbeitspakete (Katalog `workpackage.category` füllen, `category_key` setzen) als eigener Datenauftrag nach dem Golden Gate; der lokale Datensatz enthält keine Kategorien und müsste zuerst erweitert werden.

## Ergänzung 2026-10-28 (Planungsrunde)

- Einheit Arbeitstag nach den ersten drei Paketen am gemessenen Tempo nachmessen.
- Rückkehr zu Codex wäre eine neue Entscheidung (ADR-0039).

## Ergänzung 2026-10-28 (TD-01-Sichtprüfung)

- TB-7: Angebotsunterstützung (Kunde A) zeigt "Nicht zugeordnet"; Ursache klären (Verantwortungsprojektion), danach ggf. Datenauftrag nach ADR-0037.

## Ergänzung 2026-10-28 (ADR-0038, angenommen)

- Nach dem BSF: Azure-/Entra-Migrationsfähigkeit und weiterer Reporting-Ausbau (L7 Reporting 2 bleibt im Golden Gate).
- Planungsrunde: Schätzfelder für BSF-04/04A, BSF-DOC-01 bis -03, QS-06, BSF-06 und BSF-FINAL-INTERNAL ergänzen.

## Ergänzung 2026-10-29 (Befunde aus Git-Aufräumen und S0-05)

- Hygiene-Skript: Squash-Erkennung per PR-Abgleich. `npm run git:hygiene` erkennt Squash-Merges nicht; "0 gemergte Branches" ist deshalb nicht aussagekräftig. Das Skript sollte Branches mit gemergtem PR (REST, `head.ref`) zusätzlich ausweisen und je Branch prüfen, ob der Dateistand mit `main` übereinstimmt. Beleg: `docs/BERICHT-2026-10-28-S0-05-AUFRAEUMEN-MERGE.md`.
- Test `BackendAdminDialog.test.tsx` schlug unter Volllast zweimal fehl; Ursache nicht belegt. Zu klären: Ursache und Stabilisierung, vor einer Bewertung als instabil.

## Ergänzung 2026-10-31 (Sicherung Codex-Arbeitsstand)

- Codex-Inhalte aus `backup/codex-2026-10-31` (`2a0cf1d9`) sichten: ADR-Entwürfe 0036 bis 0040 (Nummern auf `main` anders belegt, bei Übernahme neu nummerieren), Dev-Container und Golden-Gate-Skripte, `management-cockpit-service.ts` mit Test (Abgleich mit L2-Cockpit P1 bis P3). Je Inhalt entscheiden: übernehmen (eigener PR) oder verwerfen. Bis dahin Branch und lokale Ordner `_sicherung_*` erhalten. Beleg: `docs/BERICHT-2026-10-31-SICHERUNG.md`.
- ADR-0040 ist am 2026-10-31 angenommen; Regel AQGS-TCA-01 steht in `docs/PROJECT-GOVERNANCE.md` (8a). Beim ersten Paket den Mehraufwand der Ziel-Test-Matrix mitmessen; CHANGELOG-Eintrag gemäß Governance Abschnitt 13 bei der nächsten Version.

## Ergänzung 2026-10-31 (Arbeitsumgebung und Toolchain)

- Auftragsvorlagen von `npm ci` auf `bun install --frozen-lockfile` und Node 22 umstellen (CI: `NODE_VERSION: "22"`, nur `bun.lock` im Repo).
- `package.json`: `engines` (Node 22) und `packageManager` festlegen, damit lokale Umgebung und CI übereinstimmen.
- Basisordner `C:\Users\bmarn\OneDrive\Dokumente\Dashboard` (alter Prototyp vom Juli, kein Repo): `data/` und `docs/` sichten, danach archivieren.
- Codex-ADR 0039 und 0040 aus `backup/codex-2026-10-31` als Vorlage für BSF-06 nutzen (nicht mergen); bei einer Übernahme neu nummerieren.
