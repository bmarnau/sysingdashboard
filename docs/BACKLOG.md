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
- QS-06 Abrechnungsdaten nach Rolle (`billing.view`; Teamlead ja, Engineer nur Stunden), siehe `docs/QS-06-VIEWER-ABRECHNUNG.md`. QS6-1 bis QS6-3 mit Paket U7 umgesetzt (2026-11-03); Draft-PR #222 bleibt unverändert.
- L2-Cockpit: Konzept `docs/L2-COCKPIT-SCHNITT-KONZEPT.md` freigegeben (2026-10-26); P1 und P2 liegen als Draft-PRs vor, Beträge bleiben bis QS-06 ausgeschlossen.
- PW-01 bis PW-03 Passwort in der Anwendung ändern, PW-05 Passwort-Reset mit Textbeschriftung, siehe `docs/PW-01-PASSWORT-AENDERN.md`.
- TD-01 Stufe b Live-Demo-Mandant auffrischen (relativ zu heute, entschieden 2026-10-26), ausgeführt am 2026-10-28 (Postflight 7 von 7 gleich Soll, `docs/DATENAUFTRAG-TD01-AUFFRISCHUNG.md` Abschnitt 9); offen: Sichtprüfung in der App. Wiederkehrende Auffrischung als geplante Aufgabe nach dem Golden Gate.
- L2-Cockpit P3 und P4 (Route, Rollenabnahme, Hilfe); P1 ist als U1 gemergt (PR 262), P2 als U2 (PR 264), P2b als U3 (PR 266, Nacharbeit PR 267), P3 als U4 neu aufgebaut (Branch `feat/l2-u4-route`, PR offen); danach U5 Rollenabnahme in der Lovable-Vorschau, dann Hilfe und Handbuch (L2-12) sowie CHANGELOG-Eintrag mit der nächsten Versionsentscheidung (ein neuer Eintrag hebt `DASHBOARD_VERSION`). Die Drafts #226, #231, #233, #234 werden nicht gemergt.
- Systemstatus der App (Befund 2026-11-02): Die GitHub-Prüfung läuft ohne Anmeldung ins Anfragelimit (HTTP 403) und zeigt dann „nicht prüfbar“. Quelle verbessern (serverseitig gecacht oder Lesetoken als Secret, nie in Dateien) oder Anzeigetext anpassen; kein Golden-Gate-Blocker.
- Wiederherstellungsprobe (R-14), entschieden 2026-11-02: Datenexport und Wiederherstellungsprobe in einer zweiten Umgebung sind Gate vor dem ersten Publish; dazu ein Restore-Pfad als Dokument (R-04). Zeitpunkt der letzten Veröffentlichung aus dem Lovable-Verlauf nachsehen.
- L2-Cockpit AVKK-Adapter, Nacharbeit (Befund U3, 2026-11-02): Abfragen sind seitenweise begrenzt, aber ohne Obergrenze der Gesamtmenge; bei Wachstum Obergrenze mit Zustand PARTIAL prüfen.
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
- Standard "Lovable-Grenzen" (bmarnau-standards): Ein Merge auf `main`, während Lovable eigene Commits hat, ersetzt diese und löst den Lovable-Dialog "Ein Push in dein Repository hat deine Arbeit ersetzt" aus (Beobachtung 2026-10-31 nach PR 254; Lovable sichert vorher ein Backup). Vor jedem Merge Lovable-Stand per Re-check abgleichen; Dialog mit "Repository-Version behalten" beantworten, sofern die Lovable-Commits nur Plattform-Änderungen (`types.ts`) enthalten.
- Startdatei `start-sysingboard.ps1` ins Repository aufnehmen (`scripts/`, mit Hinweis in der Doku), sobald der ADG-Standard-Entwurf (Pull-Request 28) entschieden ist.
- Standard "Lovable-Grenzen" (bmarnau-standards): Plattformgrenzen sind geklärt (Publish-Quelle = Lovable-Stand, Broker nur im Editor wirksam, Merge auf main ersetzt Lovable-Commits); Eintrag im passenden Standard anlegen. Ergänzen (2026-11-02): (1) Sync-Dialog: Auswahl „Repository-Version behalten“, Lovable legt dabei `lovable-sync-*`-Branches als Sicherung an (nie mergen); die Git-Seite „In sync with GitHub“ ist nur eine Momentaufnahme. (2) Credits: schreibende Aufträge verbrauchen Credits, lesende Prompts bevorzugen. (3) Plattform-Dateien: `types.ts` erhält nach jedem Lauf +5 Zeilen `__InternalSupabase` (R-12), dazu der Ordner `.lovable/`.
- CHANGELOG und Versionssprung für das Cockpit (entschieden 2026-11-02): erst nach U5 zusammen mit Hilfe und Handbuch (L2-12, `src/lib/help-documentation.ts`).
- Cockpit U5, Beobachtung (2026-11-02, kein Blocker): Die Links im Cockpit übergeben keinen Kunden- oder Zeitraumfilter; das Projektcontrolling öffnet mit dem Standardzeitraum 01.11. bis 02.11. und zeigt alle Werte 0.
- Cockpit U5, Beobachtung (2026-11-02, kein Blocker): Die Verweigerungsseite ist ein einzelner Satz ohne Kopfzeile und ohne Weg zum Dashboard.
- Cockpit U5, Beobachtung (2026-11-02, kein Blocker): Der Leertext „Keine Aufmerksamkeitsgründe in den verfügbaren Quellen“ ist missverständlich, wenn dem Konto kein Kundenbereich zugeordnet ist.
- Cockpit U5, Lücke (2026-11-02): Demo-Konten für Administrator und Customer fehlen, beide Rollen sind in der Vorschau nicht geprüft; Anlage nur als Datenauftrag nach ADR-0037, falls gewünscht. Entschieden 2026-11-02: Lücke bleibt dokumentiert; Sam gilt als nicht einzeln geprüft (gleiche Rolle wie Alex).
- Cockpit U5, „Nicht ermittelbar“ und PARTIAL: entschieden 2026-11-02 (E-U6-1), umgesetzt in U6: PARTIAL zeigt die Zahl mit dem Hinweis „Teilweise ermittelt, Quelle unvollständig“, UNKNOWN zeigt „Nicht ermittelbar“; Tests ergänzt. Das Handbuch (L2-12) muss die PARTIAL-Anzeige beschreiben.
- RBAC-Matrix (Befund U5, 2026-11-02): erledigt mit Paket U7, `billing.view` steht in `docs/RBAC-MATRIX.md`.
- Cockpit-Kundenkreis: entschieden 2026-11-02 (E-U6-2), Cockpit zeigt auch Systemadministratoren nur „Meine Kunden“, siehe ADR-0041; Test für den Systemadministrator in U6 ergänzt. Ein Gesamtblick für Administratoren wäre ein eigenes Paket mit Migration und Sicherheitstests.
- Paket U7 Umsatz-Kachel: umgesetzt und gemergt 2026-11-03 (PR 273, `main` 2d3299a), QS6-1 bis QS6-3; Abnahme durch den Owner in der Vorschau mit Petra, Georg, Alex und Alexa steht aus.
- TanStack-Pakete anheben (2026-11-03, Vorrang; umgesetzt in PR 276, offen): `@tanstack/react-start` auf >= 1.168.60 (zieht `start-server-core` >= 1.169.39) wegen GHSA-qx66-fv34-fjm8 / CVE-2026-102989 (kritisch, reflektiertes XSS in Server-Function-Antworten); `react-router` und `router-plugin` mitziehen. Eigener PR von `main`, nicht aus `lovable-sync-1793685568`; `bun.lock` neu erzeugen, Build, Tests, E2E. Danach `bun audit` (67 Befunde am 03.11.2026) gesondert sichten.
- react-pdf-CSS dauerhaft einbinden (2026-11-03): Stylesheets per `?url`-Import im `PdfCanvasViewer` laden (Option a, ca. 2 h, empfohlen) oder als Kopie in `public/` (Option b, ca. 1 h plus Pflege bei Updates); danach prüfen, ob `css.devSourcemap` aus PR 275 entfallen kann. Stand 2026-11-04: Option b als Draft-PR 278 (Option a scheidet aus: `styles.css` wird bereits per `?url` geladen und stürzt ebenfalls ab); danach prüfen, ob das Plugin `sysing:ensure-css-config` (PR 277) entfallen kann. Lokaler Browsertest 2026-11-04 (`docs/BERICHT-2026-11-04-PR278-LOKALTEST.md`): PR 278 funktioniert mit und ohne Plugin; der Absturz ist lokal nicht nachstellbar, auch nicht ohne `css.devSourcemap`. Offen: Prüfung in der Lovable-Vorschau mit Anmeldung über Export oder Downloads, PDF mit Formularfeldern; danach Folge-PR zum Entfernen des Plugins nur bei fehlerfreier Vorschau ohne Plugin.
- Arbeitsplan nicht in Git (ART-09, REST-14, 2026-11-03): Die Planungsseite existiert nur als Claude-Artifact (Version 26, Reiter Fortschritt, Notfall, Artefakte). Quelle und Datenstand nach Git spiegeln (PPS-01 3.2, A-1) oder die Seite aus `docs/ARTEFAKTE.yaml` erzeugen bzw. dagegen prüfen (ART-05).
- Artefaktverzeichnis, Lücken (2026-11-03): Standard Wiederherstellbarkeit und Notfallhandbuch nach `docs/` übernehmen (ART-09); Nachweisregister `docs/NACHWEISE.yaml` anlegen (ART-17, REST-26); Feld `stand` je Eintrag ergänzen (ART-03, 26 von 30 fehlen); Adresse des Lovable-Editors nachtragen; Linkprüfung vor Tagesabschluss und Release festlegen (ART-07).
- QS6-4 (offen): Der Server liefert Beträge für Rollen ohne `billing.view` weiter aus; das UI-Gating ist keine Sicherheitsgrenze (R-QS6-3, im Register L2-R2). Read-only Prüfbericht zu RLS und Projektion, danach ggf. Datenauftrag nach ADR-0037.
- QS6-5 (offen): Exporte und Leistungsnachweis müssen Beträge nach `billing.view` behandeln (Tests `leistungsnachweis`, `ExportSummary`).
- QS-06 in L2-12: Hilfetext und CHANGELOG nennen, dass Systemingenieur, Viewer und Customer keine Beträge mehr sehen (Engineer nur Stunden); Handbuch entsprechend ergänzen.
- `scripts/check-rbac.mjs` (Befund U7): prüft nur die Gleichheit von Frontend- und Backend-Matrix; die in `docs/RBAC-MATRIX.md` genannten Invarianten für `billing.view` und `project.controlling.view` fehlen im Skript. Ergänzen oder Matrix-Text berichtigen.
- Vitest mit `TZ=Europe/Berlin` (Befund U7): Im Gesamtlauf überschreiten zwei Tests in `BackendAdminDialog.test.tsx` das Zeitlimit von 5000 ms (einzeln grün, auch auf `main`); Zeitlimit oder Testaufbau prüfen.
- Cockpit-Zugang (Befund U4): Die Browser-Prüfung verlangt eines der beiden Management-Rechte, der Server zusätzlich `dashboard.view`; bei U5 beobachten und die Prüfungen angleichen.
- Handbuch zu den Bewertungskriterien (Owner, 2026-11-02): Risikobewertung des Projekts (Skala, Score, Stufen, Beispiel R-07) und AVKK-Schweregrade im Cockpit mit je einem durchgerechneten Beispiel in `src/lib/help-documentation.ts`; Umsetzung nach U5 zusammen mit CHANGELOG und Version (L2-12), Beispiele gegen `docs/RISIKOREGISTER.yaml` und das Cockpit prüfen.
- F-U7-03 (Befund Abnahme U7, 2026-11-04): Ein Projekt mit Deadline 30.06.2026 ist überfällig, der Status zeigt „Im Plan“. Zu klären: Ableitungsregel des Projektstatus (Deadline gegen heutiges Datum, Europe/Berlin) und betroffenes Projekt benennen; Test ergänzen.
- Anzeigemodus auf Systemadministrator-Konto (Abnahme U7, 2026-11-04, Entscheidung offen): Konto bm@ nutzt den Anzeigemodus mit Rolle Systemadministrator (Restrisiko: volle Rechte außerhalb des Anzeigemodus). Optionen: eigenes Kiosk-Konto als Datenauftrag nach ADR-0037 oder Restrisiko annehmen. Stand 2026-11-04: kiosk@ angelegt (Rolle noch viewer), Wege A bis C und Prüfung KK-01 bis KK-06 in `docs/BERICHT-2026-11-04-KIOSK-KONTO.md`; ein Kiosk-Konto zeigt nur Demodaten. Weg A als Datenauftrag `docs/DATENAUFTRAG-KIOSK-KONTO.md` freigegeben, Ausführung offen. Nachträgliche Bestätigung der Abweichung von ADR-0037 durch eine zweite Person (Name/Rolle, Datum) offen. Weg C (kiosk im Admin-Dialog wählbar, Löschen und Einfügen in einer Transaktion) nach dem Golden Gate. Begriff Kiosk (Rolle im Code, Anzeigemodus laut Owner) in QS6-2 und `docs/RBAC-MATRIX.md` angleichen.
- Nachweisregister (2026-11-04): `docs/NACHWEISE.yaml` angelegt mit EV-0005; EV-0001 bis EV-0004 aus dem Arbeitsplan nachtragen.
- QS-06 Rolle Engineer: Abnahme in der Vorschau steht aus (EV-0005, Einschränkung).
- Demodaten monatlich aktuell (Owner, 2026-11-04): Paket 2a/2b (lokale Demodaten beim Laden und Monatswechsel verschieben, Basisdatum in Europe/Berlin, Kennzeichnung und Datenstand; DM-01 bis DM-11, DM-14, ZP-01 bis ZP-06), 2 bis 3,5 Tage; 2c monatlicher Datenauftrag für den Live-Demo-Mandanten (DM-12); 2d automatischer Zeitplan in der Datenbank nur mit ADR (DM-13). Quelle: `docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md`. Stand 2026-11-05: 2c als Vorlage `docs/DATENAUFTRAG-DEMODATEN-MONAT.md` (Parameter s_alt/s_neu, Vielfaches von 7 Tagen, lokal gegen PostgreSQL 16 getestet); erster Lauf bis 2026-11-30 mit s_neu 2026-11-25, Entscheidungen E-2c-1 bis E-2c-3 offen. 2a/2b nach dem Publish (Owner, 2026-11-05).
- Seed-Basisdatum in UTC (Befund 2026-11-04): `src/lib/demo-data/dataset.ts:23` bildet `baseDate` mit `toISOString`; zwischen 00:00 und 01:00/02:00 Berliner Zeit liegt es einen Tag zurück. Mit `berlinDate` beheben (Teil von 2a).
- CHANGELOG L2-12: Cockpit-Punkte U1 bis U6 fehlen noch im Eintrag 1.70.0.
- F-U7-04 (Befund 2026-11-04): kiosk@ als Viewer sieht 7 Projekte, 11 Arbeitspakete und 12 Tätigkeiten; alexa@ (Viewer) sah in EV-0005 10, 30 und 63. Ursache nur lesend klären (lokaler Bestand je Konto und Gerät gegen geteilte Projektionen). Erste Prüfung: Die festen Basisdaten `src/data/dashboard.json` (4, 6, 6) erklären die Zahlen allein nicht.
- Kiosk-Demodaten über denselben Ladeweg wie alle Demodaten (Owner, 2026-11-04): Heute lädt nur ein Konto mit `users.manage` den Kiosk-Datensatz im Browser des Geräts; Analyse offen. Davon hängt KK-07 im Datenauftrag Kiosk-Konto ab. Einplanung nach dem Publish zusammen mit Paket 2a/2b (Owner, 2026-11-05).
- PR-Bestand (2026-11-06, `docs/BERICHT-PR-BESTAND-2026-11-06.md`): #222, #226, #231, #233, #234 als ersetzt schließen (Owner, mit Verweis auf die Ersatz-PRs); vorher entscheiden, ob die Planungsdateien P2b und P3 nach `main` übernommen werden. #155 (SYSING-KIOSK-001, neues Doku-Gate) und #124 (Wallboard-Vertrag) entscheiden: aktualisieren oder schließen.
- F-KK-01 (A17, 2026-11-06): `/kiosk?mode=internal` für Konten mit `kiosk.view` auf `/kiosk` umleiten; Kennzeichnung im Fehlerfall nicht aus dem URL-Parameter ableiten (`src/lib/kiosk/kiosk-session-policy.ts:20-25`, `src/components/kiosk/KioskView.tsx:57-64`; etwa 2 bis 2,5 h).
- Benutzerliste ohne Option `kiosk` (A17): Auswahlfeld zeigt bei Rolle `kiosk` „System-Administrator“ (`src/components/UserManagementDialog.tsx:517-525`); eine Änderung dort ersetzt alle Rollen. Rolle `kiosk` schreibgeschützt anzeigen.
- Rückabwicklung „Kiosk-Konto anlegen“ (A17): `deleteUser` im Fehlerfall scheitert an `audit_log` und wird verschluckt (`src/lib/admin/auth-accounts.server.ts:256`); Ergebnis prüfen und melden, Konto statt Löschen archivieren.
- Konten löschen (A17): `audit_log.actor_id` ohne `ON DELETE` verhindert das Löschen jedes Kontos; die Funktion „Konto löschen“ in der Backend-Administration kann deshalb nicht gelingen. Klären: Funktion entfernen oder durch Archivieren ersetzen (kein Eingriff in `audit_log`).
- E2E-Starttests (A16): `a11y` Startseite, `error-states` leerer localStorage und `dashboard` globale Suche sind lokal auch auf `main` rot (Kaltstart des Dev-Servers); Aufwärmschritt prüfen.
