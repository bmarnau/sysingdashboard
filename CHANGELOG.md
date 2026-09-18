# Changelog

Zentrale Änderungshistorie des Dashboards. **Pflicht:** Bei jeder Dashboard-Änderung
mit Nutzersichtbarkeit hier einen neuen Eintrag (neueste oben) ergänzen. Diese Datei
wird zur Build-Zeit in das integrierte Benutzerhandbuch (Kapitel
„Änderungshistorie") eingelesen. Die jeweils oberste Version bestimmt automatisch
`DASHBOARD_VERSION`.

Format pro Eintrag:

```
## <semver> - YYYY-MM-DD
- Kurzbeschreibung der Änderung (eine Zeile pro Bullet).
```

## 1.64.0 - 2026-09-18

- **Projektcontrolling (BSF-03A, Issue #106)**: Neue read-only Route `/projektcontrolling` für berechtigte Leitungsrollen mit Zeitraum, Systemhaus, Kunde, Projekt, Arbeitspaket, AP-Kategorie und Billable-Filter sowie reproduzierbaren KPIs, Tagestrend und Drill-down.
- **Providerneutrale Fachlogik**: Aggregation und Filter liegen im `ProjectControllingService`/`ProjectControllingRepository`; Supabase ist auf den User-JWT-Adapter begrenzt. Kein Service-Role-Normalpfad und keine Lovable-Cloud-only Fachlogik.
- **RBAC/Security**: Neue Permission `project.controlling.view` für Systemadministrator, Administrator, Teamlead und Projektmanager; Engineer, Viewer, Customer und Kiosk bleiben DENY. Customer-/Systemhouse-Scope, RLS und IDOR/BOLA-Prüfungen bleiben serverseitig.
- **Shared-Projection-Kategoriebrücke**: `category_key` und `category_observed` führen BSF-03D-Kategorien rückwärtskompatibel in den BSF-02C-Publish-Pfad; Legacy, explizit keine Kategorie, bekannte/inaktive und unbekannte historische Keys bleiben unterscheidbar. Publish-RPC und `has_permission` bleiben `SECURITY INVOKER`.
- **Golden Dataset V1**: Synthetische Referenzbasis `sysing.golden.v1` / `1.0.0` mit 8 Tätigkeiten, 25.0 h Gesamt, 20.0 h billable, 5.0 h non-billable und 80.0 % Billable-Quote; Validator und unabhängige Expected Results sind Bestandteil der Regression.
- **Qualitätsnachweis**: Finaler GitHub-Head vor dem Dokumentations-/Handbuch-Nachlauf `d9b1645` mit Security #963 und CI #969 vollständig PASS; 917 Unit/Component-Tests, 91 E2E, 7 Accessibility-Tests, BSF-02C T01–T30 und BSF-03A T01–T20d PASS, Schema-/Types-Drift NONE, Quality Gate 0 Blocker. Finaler Lovable-Exact-Head-Preview bleibt vor FINAL DONE offen.
- **Handbuch und kontextsensitive Hilfe**: Neues Kapitel „Projektcontrolling — Leistungen auswerten“ mit rollenabhängiger Route `/projektcontrolling`, Filter-/Scope-/5.000-Zeilen-Grenze und bewussten Nicht-Scope-Hinweisen; spezifische Routenhilfe wird nun vor generischen `/`-Kapitelmatches priorisiert. Handbuchversion 1.21.0.

## 1.63.0 - 2026-09-17

- **Info-Kiosk Erweiterungsbereich (BSF-KIOSK-01)**: Die vorhandene Restfläche unter der aggregierten Systemverfügbarkeit ist als unsichtbarer, höhenneutraler Layout-Slot für eine spätere freigegebene read-only Betriebsinformation abgegrenzt; heute entstehen weder Datenvertrag, Datenquelle noch sichtbare Platzhalter.
- **Info-Kiosk Layout-Abschluss (BSF-KIOSK-01)**: Die „Operative Steuerungsübersicht“ nutzt bei Full HD den verfügbaren vertikalen Raum kompakter, ohne Kennzahlen oder Visualisierungen zu entfernen; die sekundäre Ansicht bleibt responsiv nutzbar.
- **Info-Kiosk Informationsdichte (BSF-KIOSK-01)**: Der kompakte Kopf zeigt wieder Datenstand und 60-Sekunden-Refresh. Projekte und Arbeitspakete erhalten Statusanteile mit Fortschrittsbalken, die Infrastruktur zeigt aggregierte Systemverfügbarkeit und die vier kompakten Support-KPIs feste synthetische Mini-Verläufe ohne Mailinhalte oder personenbezogene Daten.
- **Info-Kiosk Wallboard-Finish (BSF-KIOSK-01)**: Die bestehende Read-only-Ansicht ist für Full-HD-Fernlesbarkeit verdichtet und zeigt operative Arbeit, Infrastruktur und Support in drei stabilen Hauptspalten. Gewöhnliche Mengen bleiben neutral; Ampelfarben kennzeichnen ausschließlich Status und Risiken. Der synthetische Referenzdatensatz nutzt deutsche Bezeichnungen, Urlaubsanzahlen ohne personenbezogene Details, Infrastruktur-Bereichswerte sowie vier Support-Kennzahlen.
- **Scope unverändert**: Keine Änderung an Authentifizierung, Rollen, Berechtigungen, Datenbank, Migrationen, Providergrenze oder externen Integrationen; der Demo-Vertrag bleibt `sysing.kiosk.demo.v1`.

## 1.62.0 - 2026-09-13

- **Arbeitspaket-Kategorien (BSF-03D, Issue #103)**: Arbeitspakete tragen optional genau eine Kategorie (`categoryKey`, Default „keine Kategorie“). Kategorien sind editierbare, systemhausweite Stammdaten; alle Kunden desselben Systemhauses nutzen denselben aktiven Bestand. Tags bleiben unabhängig; Status, Priorität und Abrechenbarkeit werden nicht abgeleitet.
- **Systemhausweite Referenzdaten**: Reference Data unterscheidet nun Kataloge mit Scope `global` und `systemhouse` (`reference_catalog.scope_type`, `reference_value.systemhouse_id`, scope-gerechte partielle Unique-Indizes, Scope-Trigger, History-Scope). AVKK-Kataloge bleiben global. Der Katalog `workpackage.category` startet ohne Seed-Werte; Keys sind stabil und unveränderlich, Kategorien werden deaktiviert statt gelöscht.
- **Import/Export/Backup**: JSON-Schema 1.2.0 mit optionalem `categoryKey`; ältere Dateien ohne Kategorie bleiben kompatibel. Unbekannte oder deaktivierte Kategorien werden beim Import und beim Restore fail-safe gemeldet, nicht still umgedeutet. Der Export erhält `categoryKey`.
- **UI und Verwaltung**: Kategorie-Auswahl im Arbeitspaket-Dialog (nur aktive Kategorien des eigenen Systemhauses, Altbestand mit deaktivierter Kategorie nachvollziehbar und editierbar), Verwaltungsdialog nur mit „Referenzdaten verwalten“; Viewer erhalten keine neuen Schreibrechte.
- **Security-/DB-Nachweis**: Live-SQL-Artefakt T01–T16 16/16 PASS in einer Transaktion mit Rollback, Live-Schema-Vertrag PASS, Security Advisor ohne neue BSF-03D-Findings (`docs/BSF-03D-VERIFICATION-2026-09-13.md`). Der Lesecache normalisiert ältere Snapshots fail-safe.
- **Status**: final verifiziert (Paket Q, 2026-09-13) — alle Quality Gates grün (Typecheck, Lint, Prettier, Vitest 765, A11y, Security 112, Technical Debt, Docs, Build, E2E 77 inkl. Kategorie-Spec 4/4, Quality Gate 0 Blocker); Preview-Auth-Broker gemäß Vertrag 425fbed entfernt. Abnahme: `docs/BSF-03D-CLOSURE-2026-09-13.md`. GitHub-PR/Merge ausstehend.

## 1.61.0 - 2026-09-13

- **Kundenverantwortung verwalten (BSF-03 P5, Issue #105)**: Neuer, von „Meine Kunden“ getrennter Bereich für Systemadministrator, Administrator und Teamlead. Verantwortungen können systemhausweit zugewiesen, gewechselt und beendet werden, auch ohne eigenen operativen Kundenzugriff.
- **Least-Privilege-Managementsicht**: Die Verwaltung zeigt ausschließlich Kundenkopf, aktuelle primäre Verantwortung und eine datenminimierte Kandidatenliste. Sie erzeugt keinen Zugriff auf Projekte, Arbeitspakete oder Tätigkeiten.
- **RLS bleibt eng**: Self-only-Regeln auf Profilen, Rollen und Systemhaus-Zugehörigkeiten sowie der Customer-Access-Scope wurden nicht verbreitert. Öffentliche P5-RPCs laufen als SECURITY INVOKER; der notwendige Fremdleseanteil ist auf private Helper mit leerem search_path begrenzt.
- **Atomarer Lifecycle**: Ein Wechsel beendet die alte und erzeugt die neue Responsibility in derselben Transaktion; ungültige Zielpersonen rollen den gesamten Wechsel zurück. Historie bleibt erhalten, Hard Delete findet nicht statt.
- **Sicherheit und Tests**: R19–R31, Unit-/Security-Verträge und E2E decken Datenminimierung, Cross-Systemhouse, IDOR/BOLA, Viewer/Customer-Ausschluss, Zuweisen, Wechseln, Beenden und Rollback ab.
- **UI-Konsistenz**: Der gemeinsame Kundenseitenrahmen behält für die persönliche Sicht „Meine Kunden“ und zeigt in der Managementroute ausdrücklich „Kundenverantwortung“.

## 1.60.0 - 2026-09-13

- **Neuer Bereich „Meine Kunden“ (BSF-03, Issue #105)**: Über die Bereichsleiste des Dashboards erreichbar. Zeigt ausschließlich Kunden mit aktiver eigener Kundenverantwortung, aktiver Systemhaus-Zugehörigkeit, mindestens lesendem Kundenzugriff und Basisberechtigung `dashboard.view`.
- **Kundendetail nur lesend**: Kundenkopf sowie freigegebene Projekte → Arbeitspakete → Tätigkeiten aus der gemeinsamen Serverdatenbasis; nicht auflösbare Zuordnungen erscheinen sichtbar unter „ohne Zuordnung“. Keine Bearbeitungs-, Lösch- oder Zuweisungsfunktionen.
- **Verantwortungs- und Zugriffsindikator**: Liste und Detail zeigen den eigenen Verantwortungsstatus, den verantwortlichen Systemingenieur (eigenes Profil) und den Read-/Write-Indikator aus dem eigenen Kundenzugriff („Nur Lesen“ / „Schreibzugriff“). Der Indikator ist reine Anzeige; Schreibaktionen bleiben an Fachberechtigungen gebunden.
- **Fail-closed**: Fremde, beendete oder unbekannte Kunden liefern einheitlich „Kunde nicht verfügbar“; Berechtigung und Datenzugriff werden serverseitig im Kontext des angemeldeten Benutzers geprüft. Verantwortung erzeugt keine Rolle und kein Schreibrecht.
- **Nachweis**: Neue Unit-, Komponenten- (inkl. Barrierefreiheit) und Sicherheitsverträge für Fachlogik, Darstellung und Serverfunktionen.
- **Durchgängiger Oberflächentest**: Reproduzierbare End-to-End-Abdeckung für Lese- und Schreibzugriff, fehlende Verantwortung, fehlenden Kundenzugriff, fremde Kundenadressen, systemhausfremde Zugriffe, beendete Verantwortung, ungültige Zugehörigkeit, Viewer, vorgetäuschte Rollen im Browser, leere Liste und Fehlerfall.

## 1.59.7 - 2026-08-25

- **Systemeinstellungen nur noch gezielt lesbar (SEC-01)**: Angemeldete Benutzer sehen ausschließlich die freigegebenen Einstellungen „Abmeldezeit bei Inaktivität" und „AVKK-Schwellwert". Alle weiteren — auch künftig ergänzte — Einstellungen sind nur mit Benutzerverwaltungs-Recht sichtbar.
- **Änderungsrecht unverändert**: Einstellungen ändern darf weiterhin ausschließlich, wer die Benutzerverwaltung nutzen darf.
- **AVKK-Prüffunktionen gehärtet**: Die interne Schreibrechtsprüfung und das Personenverzeichnis arbeiten mit festem, leerem Suchpfad und eindeutigen Objektverweisen. Fachlich ändert sich nichts; nicht angemeldete Besucher können beide Funktionen ausdrücklich nicht aufrufen.
- **Nachweis**: Neue Datenbank-Testmatrix `supabase/tests/sec01-settings-and-avkk-definer.sql` prüft Freigabeliste, Rollenmatrix und den Rückgabeumfang des Personenverzeichnisses (keine E-Mail-, Telefon- oder MFA-Daten).

## 1.59.6 - 2026-08-22

- **AVKK-Personenanzeige korrigiert (F-11)**: Bereits zugeordnete Verantwortliche erscheinen im AVKK-Detaildialog als „Vorname Nachname" statt als technische ID. Grundlage ist das datensparsame Personenverzeichnis, das in der verbundenen Backend-Datenbank aktiviert wurde.
- **Delegation für Teamleitung und Projektleitung nutzbar**: Rollen mit der Berechtigung zur Verantwortungszuordnung können aktive Personen auswählen, ohne dass vollständige Benutzerprofile (E-Mail, Telefon, MFA, Profilbild) freigegeben werden.
- **Keine Rechteerweiterung**: Engineer- und Viewer-Rollen erhalten weder Schreibrechte noch Benutzerverwaltung; die bestehenden Zugriffsregeln für Profile und Rollen bleiben unverändert.
- **Verständlicher Fehlerzustand**: Ist das Personenverzeichnis nicht erreichbar, bleibt bestehende Verantwortung lesbar und eine neue Zuordnung wird bewusst deaktiviert.

## 1.59.5 - 2026-08-21

- **Testinfrastruktur stabilisiert**: Die automatisierten Tests laufen jetzt auch ohne hinterlegte Backend-Zugangsdaten (z. B. in der CI) durch; die Meldung „Missing Supabase environment variable(s)" tritt nicht mehr auf.
- **Kein Testzugriff auf die produktive Umgebung**: Tests verwenden ausschließlich einen lokalen Stub des Backend-Clients und nicht geheime Platzhalterwerte; eine Verbindung zu einer echten Instanz ist ausgeschlossen.
- Keine Änderung an Authentifizierung, Rollenmodell (RBAC) oder Datenbankregeln (RLS).

## 1.59.4 - 2026-08-21

- **F-18 Restfix – Abrechnung und globale Suche**: In der Ansicht „Abrechnung" wird der Bearbeiten-Stift jetzt ebenfalls nur mit der Berechtigung `activity.edit` angeboten.
- **Globale Suche berechtigungskonform**: Suchtreffer zu Projekten, Arbeitspaketen und Tätigkeiten bleiben für lesende Rollen vollständig auffindbar und navigierbar; ein Bearbeitungsdialog wird nur noch bei vorhandener Berechtigung geöffnet.
- **Fail-closed-Berechtigungen**: Projekt-, Arbeitspaket-, Tätigkeits- und Abrechnungsansicht verlangen die Berechtigungsangabe verpflichtend; ein Vergessen fällt beim Typecheck auf statt stillschweigend Schreibaktionen anzuzeigen.
- **Zusätzliche Dialogsicherung**: Die Bearbeitungsdialoge für Projekt, Arbeitspaket und Tätigkeit öffnen grundsätzlich nur bei passender Berechtigung.

## 1.59.3 - 2026-08-19

- **F-18 behoben – Read-only-Rollen schreiben nicht mehr**: Die lokalen Fachobjekt-Funktionen (Projekte, Arbeitspakete, Tätigkeiten) sind jetzt durchgängig an die bestehende Berechtigungsmatrix gebunden.
- **UI-Gating**: Das globale Menü „+ Neu" erscheint nur noch, wenn mindestens eine der Berechtigungen `project.edit`, `workpackage.edit` oder `activity.edit` vorliegt; die Einträge selbst sind einzeln berechtigt. „Neu", „Bearbeiten" und „Löschen" in Projekt-, Arbeitspaket-, Tätigkeits- und Abrechnungsansicht werden nur passend zur Berechtigung angeboten.
- **Defensive Prüfung**: Die Speicher- und Löschpfade prüfen die Berechtigung unmittelbar vor der Änderung; ohne Berechtigung erfolgt keine Änderung des lokalen Bestands.
- Keine Änderung der Rollenmatrix, keine Erweiterung der Engineer-Semantik, keine neue Backend-Infrastruktur.

## 1.59.2 - 2026-08-18

- **Administratives Passwort setzen**: Im Servicebereich „Backend & Auth-Konten" können berechtigte Administratoren (`users.manage`) für ein bestehendes Konto ein neues Passwort setzen, wenn die Zustellung von Recovery-Mails scheitert (Befund F-16).
- **Schutzregeln**: Das eigene Konto ist ausgenommen; das Passwort eines Systemadministrators darf nur ein Systemadministrator setzen. Eine einfache Drosselung (max. 5 Setzungen je Administrator in 10 Minuten) nutzt die vorhandenen Prüfprotokolldaten.
- **Datenschutz**: Das Passwort wird ausschließlich als Argument der Serverfunktion übertragen, nicht zurückgegeben, nicht protokolliert, nicht auditiert und nicht im Browser gespeichert. Das Prüfprotokoll hält nur Akteur, Zielkonto, Zeitpunkt und Ergebnis fest (`auth_account.password_set`).
- **Handbuch**: Kapitel „Backend- und Auth-Administration" um die neue Aktion und den Hinweis zur eigenständigen Passwortänderung ergänzt.

## 1.59.1 - 2026-08-17

- **Passwort-Reset ehrlich gemeldet**: Die Oberfläche meldet nur noch die _Anforderung_ der Recovery-Mail und zeigt Anbieterfehler (Cooldown, Stundenlimit, abgelehntes Ziel) im Klartext statt einer pauschalen Erfolgsmeldung.
- **Prüfprotokoll**: Der Auth-Protokolleintrag hält zusätzlich den Anbieter-Statuscode fest (keine Tokens oder Adressen).
- **Handbuch**: Kapitel „Backend- und Auth-Administration" um die Zustellgrenze ohne eigene Absenderdomäne ergänzt (Befund F-16).

## 1.59.0 - 2026-08-16

- **Zentraler Daten-Refresh**: Neuer Aktualisieren-Knopf in der Dashboard-Kopfzeile lädt Kataloge, AVKK-Daten, Profil/Rolle und den lokalen Arbeitsbestand neu — ohne Seiten-Neuladen und ohne Abmeldung.
- **Teilfehler sichtbar**: Schlägt ein Bereich fehl, bleiben die übrigen aktualisiert; die Meldung benennt den betroffenen Bereich.
- **Mehrfachklick unschädlich**: Ein laufender Refresh wird wiederverwendet (Single-Flight), es gibt keine konkurrierenden Läufe.
- **Nur Lesepfade**: Der Refresh schreibt nichts und ändert keine Berechtigungen; der lokale Arbeitsbestand bleibt browsergebunden.
- **Handbuch**: Neues Kapitel „Daten aktualisieren (zentraler Refresh)".

## 1.58.10 - 2026-08-15

- **Begrüßung nur mit Vorname**: Die Dashboard-Anrede zeigt ausschließlich den Vornamen, normalisiert die Schreibweise (z. B. „alex marnau" → „Alex") und greift niemals auf E-Mail-Adressen zurück.
- **Normalisierung**: Einheitliche Klein- oder Großschreibung wird korrigiert; korrekte Eigenschreibweisen zusammengesetzter Namen bleiben erhalten.

## 1.58.9 - 2026-08-14
