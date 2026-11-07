# Sysing Dashboard — aktueller verbindlicher Status

Stand: 2026-11-07

## Aktueller Wiederanlaufpunkt (Golden Gate, 2026-11-07)

A41 – Plan zu `avkk_people_directory` liegt vor: Empfehlung a1 + d (Verzeichnis auf RLS-sichtbare Subjekte und aktive Konten beschränken, App-Rolle maskieren; eine Migration, kein Rollenwechsel), Selbstregistrierung schließen (c1) als Option in G23; Owner-Entscheidung und Zeitpunkt (R-10) offen.

A40 (2026-11-07): Die Owner-Entscheidungen vom 2026-11-07 stehen im Git. Neues Muss-Gate G24 „RLS-Invariante vor Publish belegt“ ist laut RP-02 vom 2026-11-07 erfüllt; der Beleg gilt bis 2026-11-14 und muss vor dem Publish (P4) mit RP-02 Teile G und H wiederholt werden. G20 (Kiosk-Datenauftrag Weg B) ist Folgepunkt nach dem Publish, das Restrisiko bm@ ist als RA-02 mit Nachfrist 30 Tage nach dem Publish akzeptiert. QS-01 Migration C′ ist Folgepunkt vor L8. Für R-04 ist eine zweite Vertrauensperson als Rolle Familie/Lebenspartner benannt (Umschlag und Zugang offen). Gate-Stand: 23 geführte Gates, davon 22 vor dem Publish mit 7 erfüllt, 2 in PR, 1 extern, 12 offen; G20 Folgepunkt; G23 weiter Vorschlag. Die Support-Antwort zu R-07/R-10 steht aus (Owner wartet bis Montag 2026-11-09). Befund Hauptsitzung (2026-11-07 08:30): PR 282 und PR 283 wurden am 2026-11-07 um 07:08 Z gemergt (main be712548). G07 und G15 stehen in dieser Zählung noch als „in PR“, G08 und G09 als offen; ihr Code liegt jetzt auf main, G10 (Engineer-Abnahme) bleibt offen. Ob G07, G08, G09 und G15 damit erfüllt sind, hängt von der Gate-Definition ab und wird nicht geraten; die Zählung ist im nächsten Gate-Nachtrag neu abzuleiten.

Sitzungsende 2026-11-07 07:20 (Teilautomatik mit Agenten): 13 Aufträge erledigt (A22, A23, A26 bis A33, A36 bis A38). Offen in der Warteschlange: A34 (Smoke-Test, nach A28 jetzt frei), A35 (Lehren R-14, nach A30 und A38 jetzt frei), A39 (wartet auf Freigabe). Wiederanlaufpunkt: Owner-Entscheidungen zu den Befunden mit Schwere 3 aus A38 (anon-Rechte, avkk_people_directory) und A22 (has_permission ohne Kontostatus), Gates G23 und G24, Merge-Freigaben 286, 288 und 282 vor 283; danach A34 und A35.

A38 – RP-02 ausgewertet: `anon` hat rohe Rechte auf 9 Tabellen (Schutz nur über RLS, heute wirksam), QS-01 Migration C ist nicht angewendet und muss als C′ erweitert werden, `avkk_people_directory` zeigt jedem `viewer` Namen und Rollen ohne Mandantenbezug (Schwere 3), die Restore-Probe hat mit Plan Abschnitt 15 konkrete Abnahmekriterien (S3 RP-02 B bis H, S4 J2) und wartet auf den Owner-Schritt `pg_restore --list`.

A31 (2026-11-07): Das Notfallhandbuch enthält jetzt die Rotation je Secret (N8a, ohne Werte), die Kontenfelder mit Verweis auf `docs/ZUGAENGE-UND-NOTFALLKONTO.md` und den Stand der Datenwege W2 und W4 nach RP-01, RP-02 und A37; von 17 Lücken sind 3 geschlossen, 6 brauchen einen Beleg und 8 eine Owner-Entscheidung, G04 wartet auf die Freigabe des Owners (`reports/A31-BERICHT.md`).

Publish 1.70.0 (Stand 2026-11-07, A28): Das Runbook steht in `docs/PUBLISH-PLAN.md` (P0 Entscheidungen, P1 Code-Stau, P2 Restore-Probe, P3 Vorbereitung, P4 Go und Publish, P5 Nachlauf). Die Owner-Entscheidungen vom 2026-11-06 sind abgelegt: D3 zod 3 befristet akzeptiert (RA-01), D4 QS6-4 „kein Serverbefund“ mit Netzwerkprüfung N4a im Smoke-Test, D5 `types.ts` +5 als Go-Ausnahme. Damit sind G02, G06 und G13 erfüllt; Zählung 6 erfüllt, 2 in PR, 1 extern, 13 offen. Der Lese-Prompt fragt jetzt auch, ob Lovable beim Publish Migrationen anwendet (Risiko `20260917182000`) und wie die App erreichbar ist. Der kritische Pfad bleibt R-14 (G03, G05). Das Go liegt frühestens in KW 48 und nicht in der Nacht zum 01.12. Publish bleibt No-Go. A33 – Prüfskript `npm run check:bundle` als Draft-PR 288 (CI 15/15); Dateiname `check-bundle-security.mjs` vom Owner zu bestätigen.

Agenten-Ergebnisse 2026-11-07: A22 – Löschen scheitert an Fremdschlüsseln; Befund: `has_permission` prüft den Kontostatus nicht, archivierte Konten behalten mit gültigem Token Rechte (Entscheidung offen, Backlog). A29 – EV-0008 angelegt; QS-01 B und C liegen nicht im Repository; Vorschlag G23 (Migrationsanwendung beim Publish klären). A30 – Plan für die lokale Restore-Probe (`docs/PLAN-RESTORE-PROBE-LOKAL.md`), Entscheidungen E1 bis E7 offen. A32 – Rücknahme eines Publish nur per Revert und erneutem Publish oder Unpublish (Notfallhandbuch N1a). A36 – Plan liegt vor, keine Datenbankspalte betroffen. A37 – Das App-Backup ersetzt keinen Datenbank-Dump (13 von 25 Tabellen fehlen).

A26 (2026-11-07): Die Roadmap ist neu bewertet. Vor dem Publish 1.70.0 sind von 22 Gates 3 erfüllt, 2 in PR, 1 extern und 16 offen; die Owner-Entscheidungen D1 bis D5 vom 2026-11-06 stehen nur in der Warteschlange und zählen erst mit A28. Das gemessene Tempo liegt bei grob 1 bis 1,3 Sprints pro Woche. Die Schätzung bis Golden Gate beträgt grob 7 bis 11 Sprints und 24 bis 48 Arbeitstage (erwartet 9 und 36), bis BSF 13 bis 17 Sprints und 49 bis 88 Arbeitstage. Das ist keine Terminzusage (`reports/A26-BERICHT.md`).

Statuskorrektur (2026-11-07): PR 278 ist am 2026-11-06 um 05:11 Z gemergt (`02cb3d28`), PR 287 um 06:10 Z (`7dc4699d`, CI 15/15, enthält K1 und K2). PR 285 ist als in 287 enthalten geschlossen, ohne Merge. `bun audit` auf `main` `7dc4699d` (07.11.): 54 Funde (24 hoch, 24 mittel, 6 niedrig), kein kritischer; `dompurify` und `shell-quote` nicht mehr gemeldet. Gates G11 und G12 sind damit erfüllt, G19 ist teilweise belegt (Vorschauprüfung von PR 278 durch den Owner, EV-0007, drei Punkte ungeprüft; Nachtrag A23). Offene PRs: 286, 283, 282 (Drafts), 155, 124 (Draft). Wiederanlaufpunkt: Entscheidungen des Owners laut `docs/PUBLISH-GATE-BERICHT.md` (Offene Fragen), Merge-Freigabe 286.

Ereignisse 2026-11-06 (Nachtrag A23, 2026-11-07): PR 284 gemergt (`main` 34f20a3, Startroutine `git:hygiene`). PR 278 per Squash gemergt (`main` 02cb3d28, CI 15 von 15 am Head 4aad97a8); Vorschau-Prüfung des Owners am 2026-11-06 ca. 05:45 bis 06:00 Berlin laut Owner-Screenshots im Chat: Vorschau lädt, Viewer zeigt das PDF, Text markierbar, keine devSourcemap-Meldung; nicht geprüft: Netzwerk-Reiter, Formularfelder, Link (EV-0007, Ergebnis teilweise). Das Plugin `sysing:ensure-css-config` bleibt bis zu einem eigenen Folge-PR. Die fünf Alt-PRs 222, 226, 231, 233 und 234 sind als ersetzt geschlossen, ihre Branches bleiben (Planungsdateien der Branches `feat/l2-cockpit-p2b` und `p3`). A22 (Konten mit Audit-Historie nicht löschbar) ist angelegt. PR 285 und 287 stammen aus A16 (Stand siehe Statuskorrektur).

A09 (2026-11-06): Kontenübersicht `docs/ZUGAENGE-UND-NOTFALLKONTO.md` (Entwurf, ohne Werte); zweite Person, Notfallkonto und Wiederherstellungsadressen sind für alle Dienste offen (R-04). Wiederanlaufpunkt: Warteschlange leer, Entscheidungen des Owners laut `docs/PUBLISH-GATE-BERICHT.md` (Offene Fragen), Merge-Freigabe 286 (285 und 287 erledigt, siehe Statuskorrektur 2026-11-07).

A08 (2026-11-06): ADR-0042 (RTO, RPO, Schutzklassen) liegt als Entwurf vor; die Entscheidungsfelder D1 bis D10 sind offen und bestimmen den Umfang von R-14.

A21 (2026-11-06): Publish-Gate-Bericht `docs/PUBLISH-GATE-BERICHT.md` – 16 von 22 Gates offen, kritischer Pfad R-14 (Restore-Probe); neun Entscheidungen des Owners nötig (Abschnitt Offene Fragen). Publish bleibt No-Go.

A20 (2026-11-06): Nach PR 285 und 287 bleiben 54 Audit-Funde ohne kritischen; vor dem Publish ist nur eine Entscheidung zu zod 3 nötig (Risikoakzeptanz oder Migration), keine Paketänderung (`docs/BERICHT-AUDIT-SAMMELBEWERTUNG.md`).

A05 (2026-11-06): Plan für die Engineer-Abnahme QS-06 liegt vor (`docs/QS-06-VIEWER-ABRECHNUNG.md` Abschnitt 6). Neuer Befund vor dem Publish: Der Tätigkeitsdialog zeigt dem Engineer Stundensatz und Betrag (F-QS6-ENG-01); das JSON-Backup enthält Stundensätze für jede Rolle (F-QS6-ENG-02). Entscheidung zur Paketierung (in PR 283 oder eigenes Paket) offen.

A18 und A19 (2026-11-06): Kiosk-Demodaten sollen nach dem Publish aus dem eingebauten Generator entstehen (Variante A mit Paket 2b, Entscheidung offen). Notfallhandbuch und Standard Lovable-Grenzen liegen als Entwurf in Git; A07 ist damit inhaltlich abgeschlossen, A08 und A09 sind frei.

Teilautomatik 2026-11-06: A16 erledigt, K1 und K2 behoben in PR 285 und 287 (CI 15/15); PR 287 gemergt, PR 285 als enthalten geschlossen (Korrektur 2026-11-07). A17 erledigt: Kiosk-Konto nur über Weg B (anzeige@ neu, kiosk@ und bm@ archivieren), Freigaben offen; Rolle von bm@ vor dem Archivieren in der Kontenliste belegen, Auswahlfeld der Benutzerliste nicht benutzen (`docs/DATENAUFTRAG-KIOSK-KONTO.md`).

PR-Bestand (2026-11-06): Fünf Alt-Drafts (#222, #226, #231, #233, #234) sind durch gemergte PRs ersetzt, Schließen nach Owner-Entscheidung (inzwischen geschlossen, Stand 2026-11-06); #278 am 2026-11-06 gemergt (`02cb3d28`), Vorschauprüfung teilweise belegt (G19, EV-0007, Korrektur 2026-11-07); #155 und #124 brauchen eine Entscheidung (`docs/BERICHT-PR-BESTAND-2026-11-06.md`). Teilautomatik läuft wieder (Warteschlange Planer-Stand 06.11. 05:15, A16 in Arbeit).

Startroutine (2026-11-06): Zu Beginn jeder Sitzung räumt `npm run git:hygiene -- --fix` lokal gemergte Branches und verwaiste Worktree-Einträge auf; Remote-Branches, nicht eingecheckte Dateien und fremde Worktrees werden nur gemeldet. Playwright-Ausgaben sind ignoriert.

Entscheidungen des Owners (2026-11-05): Version 1.70.0 bleibt; Demodaten in ganzen Tagen verschieben; Paket 2a/2b nach dem Publish (kein Gate); Monatslauf 2c per Datenauftrag mit Vorlage (erster Lauf bis 2026-11-30). Kiosk Weg A mit kiosk@ (2026-11-04). Branches `ops/*` werden nie gelöscht.

Teilautomatik (2026-11-05, `docs/BETRIEB-TEILAUTOMATIK.md`): Warteschlange `origin/ops/queue` (am 2026-11-05 A01 bis A14; Stand 2026-11-07 A01 bis A37 laut `queue/INDEX.yaml`), Berichte und Status in `origin/ops/reports`. Erledigt: A01 (QS6-4: kein Server-Pfad liefert Beträge, Lücke sind Exporte im Browser, QS6-5; `docs/BERICHT-QS6-4-ANALYSE.md`), A02 (`docs/BERICHT-AUDIT-2026-11-04.md`), A03 (`docs/BERICHT-F-U7-03-04.md`), A10 (TDF-PR 46 bereits gemergt), A04 (EV-0001 bis EV-0004), A11 (Vorlage `docs/DATENAUFTRAG-DEMODATEN-MONAT.md`, erster Lauf bis 2026-11-30). A07 blockiert: Notfallhandbuch und Standard Lovable-Grenzen nicht bereitgestellt. Doku-Bündel auf Branch `docs/2026-11-05-teilautomatik` (PR noch offen; PR 281 (inzwischen gemergt, Stand 2026-11-06)). Wiederanlaufpunkt: nächster bereiter Auftrag laut `queue/INDEX.yaml`.

Handbuch und Demodaten (2026-11-04, abends): Handbuch um QS-06, Kiosk-Konto, Kiosk-Demodaten und „Bei Störungen“ ergänzt; CHANGELOG 1.70.0, Handbuch 1.25.0 (PR 280, nicht gemergt (inzwischen gemergt, Stand 2026-11-06)). Entscheidung offen: Version 1.70.0 oder zurück auf 1.69.0 (Tag v1.69.0 in der Merge-Checkliste). Demodaten monatlich aktuell: analysiert, Anforderungen DM-01 bis DM-14 und Aufwand in `docs/BERICHT-2026-11-04-HANDBUCH-DEMODATEN.md`; Umsetzung nach Entscheidung des Owners.

Kiosk-Konto (2026-11-04): Konto kiosk@ angelegt, hat aber die Startrolle viewer. Die Rolle kiosk ist in der Datenbank vorhanden, im Admin-Dialog bewusst nicht wählbar; keine Migration nötig (Bericht `docs/BERICHT-2026-11-04-KIOSK-KONTO.md`). Entschieden: Weg A, Anzeigegerät zeigt nur Demodaten. Datenauftrag `docs/DATENAUFTRAG-KIOSK-KONTO.md`: Freigabe 1 erteilt, Freigabe 2 mit Abweichung von ADR-0037 (Bus-Faktor 1, Bestätigung durch eine zweite Person offen). Wiederanlaufpunkt: Schritte (a) bis (d) durch den Owner, neue UID eintragen, Prüfung KK-01 bis KK-06 und KK-08 (KK-07 nur dokumentiert); info@ ist als aktiver System-Administrator bestätigt, (e) ist damit nicht blockiert. bm@ bleibt bis dahin unverändert.

L2 U7 Abnahme (2026-11-04): QS-06 in der Lovable-Vorschau (v1.69.0) für Administrator, Viewer und Anzeigemodus abgenommen, Nachweis EV-0005 in `docs/NACHWEISE.yaml` (nur Oberfläche, Engineer ungeprüft, QS6-4 offen). Offen: Entscheidung zum Anzeigemodus auf einem Systemadministrator-Konto (bm@, Restrisiko) und Befund F-U7-03 (überfälliges Projekt zeigt „Im Plan“). Wiederanlaufpunkt: L2-12 (CHANGELOG, Version, Handbuch). Publish bleibt No-Go.

Vorschau-Absturz react-pdf, Folge (2026-11-04): PR 275 (gemergt) reicht in der Lovable-Vorschau nicht, der Fehler `reading 'devSourcemap'` kehrt zurück. PR 277 (`fix/vite-ensure-css-config`) stellt das Plugin `sysing:ensure-css-config` (aus `lovable-sync-1793685568`, nur gelesen) in `vite.config.ts` wieder her (gemergt 2026-11-04, `main` 8efb91d). Dauerhafte Lösung als Draft-PR 278 (inzwischen gemergt, Stand 2026-11-06): react-pdf-Stylesheets als Kopie in `public/vendor/react-pdf/`, ohne Tailwind-Verarbeitung. Lokaler Browsertest am 2026-11-04 abends (`docs/BERICHT-2026-11-04-PR278-LOKALTEST.md`): PR 278 funktioniert mit und ohne Plugin (Text markierbar, Link klickbar, keine Fehlermeldung); der Absturz lässt sich lokal auch ohne jede Absicherung nicht nachstellen. Wiederanlaufpunkt: PR 278 in der Lovable-Vorschau prüfen, dann update-branch, CI, Merge nach Owner-Freigabe; Plugin bleibt bis zu einem eigenen Folge-PR.

Vorschau-Absturz react-pdf (2026-11-03): PR 275 setzt `css.devSourcemap: false` in `vite.config.ts` (offen, nicht gemergt (inzwischen gemergt, Stand 2026-11-06); Wirksamkeit erst in der Lovable-Vorschau prüfbar). Lovable hat ohne Auftrag TanStack-Pakete angehoben (`lovable-sync-1793685568`, nicht mergen). `main` ist von GHSA-qx66-fv34-fjm8 (kritisch) betroffen; das Anheben von TanStack Start liegt als PR 276 vor (offen, nicht gemergt (inzwischen gemergt, Stand 2026-11-06); beseitigt den Hinweis laut `bun audit`).

Artefaktverzeichnis (2026-11-03): `docs/ARTEFAKTE.yaml` angelegt (30 Einträge, Grundlage TDF Modul M-9, ART-01 bis ART-17, PR 46 in technical-documentation-framework offen (inzwischen gemergt, Stand 2026-11-06)). Der Arbeitsplan liegt nicht in Git (ART-09, Backlog). Doku-PR des Tages auf Branch `docs/2026-11-03-artefakte-qs6-4`, gebündelt mit der QS6-4-Doku.

L2 U7 Stand 2026-11-03: QS-06 (`billing.view`) auf aktuellem `main` neu aufgebaut und mit PR 273 gemergt (`main` 2d3299a, CI 15 von 15 grün). Umsatz-Kachel, Reiter „Abrechnung“, Filter Abrechnungsstatus und Betragsspalten nur für Systemadministrator, Administrator, Teamlead und Projektmanager; Cockpit unverändert. Offen: QS6-4 (Server liefert Beträge weiter aus) und QS6-5 (Export, Leistungsnachweis). Wiederanlaufpunkt: Abnahme durch den Owner in der Vorschau mit Petra, Georg, Alex und Alexa, dann L2-12 (CHANGELOG, Version, Handbuch mit Bewertungskriterien, PARTIAL-Anzeige und QS-06). Publish bleibt No-Go.

L2 U6 Stand 2026-11-02 (abends): Entscheidungen E-U6-1 (PARTIAL zeigt die Zahl mit dem Hinweis „Teilweise ermittelt, Quelle unvollständig“) und E-U6-2 (Cockpit-Kundenkreis „Meine Kunden“ auch für Systemadministratoren, ADR-0041) umgesetzt auf Branch `feat/l2-u6-partial-hinweis` (PR offen, nicht gemergt; PR 272 (inzwischen gemergt, Stand 2026-11-06)). Entschieden: Kachel „Umsatz gesamt“ (QS-06) ist Gate vor dem ersten Publish, Umsetzung als Paket U7. Wiederanlaufpunkt: Merge U6, dann Auftrag U7; danach CHANGELOG, Version und Handbuch L2-12 inklusive Bewertungskriterien; das Handbuch muss die PARTIAL-Anzeige beschreiben. Publish bleibt No-Go.

L2 U5 Stand 2026-11-02 (14:20): Rollenabnahme des Cockpits durch den Owner in der Lovable-Vorschau durchgeführt (Beleg: Owner-Screenshots im Chat, 14:08 bis 14:20). Positiv Projektmanager, Teamleiter und Systemadministrator ohne Beträge, Personenbewertung und Schreib-Knöpfe; negativ Systemingenieur und Viewer (kein Tab, Direktaufruf verweigert), Kiosk laut Owner ohne Tab. Lücken: Administrator und Customer ohne Demo-Konto nicht geprüft; „Nicht ermittelbar“ statt 0 nur über Tests belegt (Komponententest aus PR 269; Grund mit Zustand UNKNOWN ohne eigenen Test, PARTIAL zeigt Zahlen). Wiederanlaufpunkt: CHANGELOG, Version und Handbuch L2-12 inklusive Bewertungskriterien. Publish bleibt No-Go.

L2 Stand 2026-11-02 (nachmittags): U1 bis U4 gemergt (`main` 2be2d6c). Wiederanlaufpunkt: U5, Rollenabnahme durch den Owner in der Lovable-Vorschau (Checkliste Rolle für Rolle); CHANGELOG und Version erst nach U5 mit Hilfe und Handbuch (L2-12). Entschieden: Datenexport und Wiederherstellungsprobe sind Gate vor dem ersten Publish (R-14). Risikoregister: vom Owner am 2026-11-02 bestätigt (die vier hoch bewerteten Risiken einzeln, ohne Änderung).

L2 Stand 2026-11-02 (mittags): U1 bis U3b gemergt (`main` bfb5fce); Entscheidung E2 vom Owner um 06:40 bestätigt, U4 (Route) freigegeben, Wiederanlaufpunkt: Auftrag U4. Neues Risiko R-14 (kein Nachweis für Wiederherstellung von Daten, Konfiguration und Schema; Vorschlag Datenexport und Wiederherstellungsprobe vor dem ersten Publish, Entscheidung offen).

L2 U4 (2026-11-02): P3 Route `/managementcockpit` neu aufgebaut auf Branch `feat/l2-u4-route` (Code und Tests aus zwei Commits, Routenbaum neu erzeugt; lokal 75 von 75 im P3-Messumfang, Unit-Suite 1246 bestanden, Sicherheitstests 142 von 142, E2E 24 von 24). PR offen, nicht gemergt (PR 269 (inzwischen gemergt, Stand 2026-11-06)). Veröffentlichung bleibt No-Go; L2 wird nur in der Lovable-Vorschau geprüft (E3). Nächster Schritt: U5 (Rollenabnahme durch den Owner), danach Hilfe und Handbuch (L2-12).

L2 U3b (2026-11-02, gemergt mit PR 267): Befund U3 (1) behoben, der AVKK-Adapter bildet den Stichtag in Europe/Berlin (`berlinDate`); Branch `fix/l2-u3b-avkk-berlin-date`, lokal Kernpaket 54 von 54, Sicherheitstests 142 von 142. PR offen, nicht gemergt (PR 267 (inzwischen gemergt, Stand 2026-11-06)). Nächster Schritt: U4 (Route `/managementcockpit`). Publish bleibt No-Go.

L2 U3 (2026-11-02, gemergt mit PR 266): P2b AVKK-Server-Lesepfad neu aufgebaut auf Branch `feat/l2-u3-avkk-read` (Code und Tests aus vier Commits, ohne Doku; lokal 51 von 51 Tests des Kernpakets, Sicherheitstests 142 von 142, Typecheck und Lint ohne Fehler). PR offen, nicht gemergt (PR 266 (inzwischen gemergt, Stand 2026-11-06)). E2 gilt erst nach Bestätigung durch den Owner. Nächster Schritt nach Merge: U4 (Route `/managementcockpit`). Publish bleibt No-Go.

L2 U2 (2026-11-02, gemergt mit PR 264): P2 Server-Lesepfad neu aufgebaut auf Branch `feat/l2-u2-server-read` (Cherry-Pick von `f8199b7`, konfliktfrei; lokal 94 von 94 Tests der betroffenen Pakete, Sicherheitstests 142 von 142, Typecheck und Lint ohne Fehler). PR offen, nicht gemergt (PR 264 (inzwischen gemergt, Stand 2026-11-06)); Merge nur auf Befehl des Owners. Nächster Schritt nach Merge: U3 (P2b AVKK-Server-Lesepfad). Publish bleibt No-Go.

L2 U1 (2026-11-01, gemergt mit PR 262 und Doku-PR 263): Composer P1 neu aufgebaut auf Branch `feat/l2-u1-composer` (Cherry-Pick von `53a81f1`, konfliktfrei; lokal 20 von 20 Tests, Typecheck und Lint ohne Fehler). PR offen, nicht gemergt (PR 262 (inzwischen gemergt, Stand 2026-11-06)); Merge nur auf Befehl des Owners. Nächster Schritt: U2 (P2 Server-Lesepfad) nach `docs/L2-UMSETZUNGSPLAN.md` Abschnitt 3. Publish bleibt No-Go.

Das Golden Gate steht in der Testphase mit Demodaten (Bernd, Petra, Alex, Alexa).
Maßgeblich sind `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml` (Plan, Pakete, Risiken),
`docs/GOLDEN-GATE-TESTPROTOKOLL-2026-10-25.md` (T1–T9, Mängel M1–M4) und
`docs/MERGE-CHECKLISTE-GOLDEN-GATE.md` (Reihenfolge der Merges und Tests nach dem Publish).
L2 vorbereitet (2026-11-01): Plan und Bestandsbericht liegen vor (`docs/L2-UMSETZUNGSPLAN.md`); Entscheidungen E1 bis E5 vom Owner am 2026-11-01 nach Empfehlung getroffen; U1 (Composer) mit PR 262 gemergt (`main` 814c9cd); Wiederanlaufpunkt: Auftrag U2 (P2 Server-Lesepfad, Commit f8199b7). Risikoregister seit 2026-11-02: `docs/RISIKOREGISTER.md` (Daten: `docs/RISIKOREGISTER.yaml`, Bewertung wartet auf Bestätigung des Owners).
Antwort an den Lovable-Support am 2026-11-01 versendet (Backend-Art laut Owner: Lovable Cloud; Weg-B-Ergebnis, Wiederaufnahme der Migrationsfragen R-10); Nachfrage vorgesehen am 2026-11-05.
Tagesabschluss 2026-10-31 (`main` 7fc2393): Sprint 0 abgeschlossen; Startdatei `start-sysingboard.ps1` liegt beim Owner (C:\dev) und ist als Standard-Entwurf in ADG-Pull-Request 28 beschrieben; offen: Antwort an Lea, erstes Entwicklungspaket (L2) nach Anweisung, Publish nur nach Freigabe.
S0-06 abgeschlossen (2026-10-31, `main` fb7c61b): Weg B hält bei der Kontrollmessung, Dauerbeobachtung über die täglichen Lovable-Prompts. S0-04 erledigt (Owner: heutiger Lovable-Stand genügt). Nächster Schritt: erstes Entwicklungspaket nach ausdrücklicher Anweisung, dann Publish mit N1 bis N5 nur nach ausdrücklicher Freigabe, dann Antwort an Lea.
Befund veröffentlichte App (2026-10-31): Das ausgelieferte Bundle (1.69.0) enthält den Broker; Lovable-Stand jetzt ohne Broker (main plus `types.ts`). Publish des heutigen Stands würde ihn entfernen; Freigabe und Wirkungsmessung stehen beim Owner. Publish bleibt No-Go.
Weg B Kontrollmessung (2026-10-31, Prompt B und C): Broker nach einer Lovable-Änderung nicht zurückgekehrt, `client.ts` unverändert (Branch `lovable-sync-1793441453`); Messung, kein Dauernachweis. Nächster Schritt: Publish-Quelle belegen, Publish bleibt No-Go.
Tägliche Lovable-Prompts (ab 2026-11-01): geplante Aufgabe 07:17 liefert einen kleinen, risikoarmen Prompt gegen verfallende Credits; Prompt B/C (S0-06) zuerst, nie Publish oder Datenbankänderung.
S0-06 Teil 1 (2026-10-31): Speicher-Zeile in `client.ts` auf `window.localStorage` (Weg B), Vertragstest angepasst, PR offen und nicht gemergt (PR 253 (inzwischen gemergt, Stand 2026-11-06)); danach Sync nach Lovable und Prüfung, ob der Broker zurückkommt (`docs/LOVABLE-PUBLISH-PRUEFUNG.md`).
`main` zuletzt geprüft auf `4887334` (nach PR #250). Gearbeitet wird nur noch in `C:\dev\sysingdashboard`. **Publish bleibt No-Go.** Antwort des Lovable-Supports vom 2026-10-30:
Publish deployt den Lovable-Projektstand (kein Pinning), der Broker ist nicht abschaltbar. Entscheidung: Weg B (Helper entfernen), Weg A als
Rückfall; offen: Freigabe der Schreiboperation in Lovable für das Paket S0-06 (R-07, `docs/LOVABLE-PUBLISH-PRUEFUNG.md`).
ADR-0040 (Testziel-Abgleich, Regel AQGS-TCA-01) ist am 2026-10-31 vom Owner angenommen und in `docs/PROJECT-GOVERNANCE.md` (8a) aufgenommen (`docs/ADR/0040-kontinuierlicher-testziel-abgleich.md`).
Sicherung 2026-10-31: Codex-Arbeitsstand als Branch `backup/codex-2026-10-31` (`2a0cf1d9`, nicht mergen), Bundle und Dateikopie gesichert und geprüft; Bericht `docs/BERICHT-2026-10-31-SICHERUNG.md`, Übernahme der Inhalte im Backlog. Arbeitsklone unter OneDrive entfernt, einziger Arbeitsklon ist `C:\dev\sysingdashboard` (`docs/BERICHT-2026-10-31-AUFRAEUMEN-ONEDRIVE.md`).
Kunde B: Verantwortliche per Datenauftrag gesetzt (2026-10-25, 17:49) und in der App bestätigt (Test T10, 2026-10-26). L0c ist abgeschlossen.
Verbleibend bis zum Publish: Umsatz-Kachel QS-06 (Paket U7, Gate seit 2026-11-02; gemergt mit PR 273 am 2026-11-03, Abnahme in der Vorschau offen; QS6-4 offen), Datenexport und Wiederherstellungsprobe (R-14), Lovable-Antwort zu R-07, Sichtprüfung von TD-01 in der App, Test N1 bis N5 auf der veröffentlichten App. Git aufgeräumt (82 Remote-Branches, 0 gemergt, Auto-Delete aktiv): `docs/GIT-AUFRAEUMEN.md` Abschnitt 6.
Offen: Draft-PR #222 (QS-06, `billing.view`) bleibt bis nach dem Golden Gate ungemergt (inzwischen geschlossen, Stand 2026-11-06); PR #155 und Draft-PR #124 unverändert. Konzept L2-Cockpit: `docs/L2-COCKPIT-SCHNITT-KONZEPT.md` (gemergt mit PR #223).
Wartebedingung: inhaltliche Antwort eines Lovable-Mitarbeiters (Eingangsbestätigung des KI-Agenten liegt seit 2026-10-26 vor, Frist 24 Stunden an Werktagen). Der Branch
`lovable-sync-1792847779` ist das Lovable-Backup mit Auth-Broker und wird nicht gemergt.
Git aufgeräumt am 2026-10-28: 11 Remote-Branches nach Einzelprüfung gelöscht (88 auf 77), `aqgs-pilot` bleibt (`docs/GIT-AUFRAEUMEN.md` Abschnitt 7). Am 2026-10-29 `docs/tracker-lovable-broker-ruecksetzung` (`28bcd15`) verworfen und als Tag `archive/docs-tracker-lovable-broker-ruecksetzung` gesichert, Worktree `sysingdashboard-gg-docs` entfernt (Abschnitt 8).
S0-05 (Zeitzonentests) abgeschlossen: gemergt mit PR #245 (`b5ffc5f`); `time-period.test.ts` in UTC, Europe/Berlin und America/New_York je 21 von 21. PR #244 bis #246 gemergt am 2026-10-28; Bericht: `docs/BERICHT-2026-10-28-S0-05-AUFRAEUMEN-MERGE.md`.
Nächste Schritte (Stand 2026-10-28): (1) Sichtprüfung TD-01 erfolgt am 2026-10-28 (Verteilung entspricht dem Soll); Befund TB-7 (Angebotsunterstützung ohne Verantwortlichen) zu klären. (2) Antwort des Lovable-Teams zu R-07 auswerten (seit 2026-10-27 überfällig; Nachfass am 2026-10-28 versendet und mit dem offenen Ticket zusammengeführt, keine inhaltliche Antwort; bei Ausbleiben bis 2026-10-29 abends Eskalation im Ticket); Publish bleibt bis dahin No-Go. (3) Nach Klärung: Publish, Test N1 bis N5, Tag v1.69.0. (4) QS-06 (Draft-PR #222) vor BSF-06. (5) L2: Merge-Reihenfolge der Drafts #226, #231, #233, #234 mit Integrationsabnahme (P3 enthält P2b nicht; lokale Integrationsprobe 2026-10-28 ohne Code-Konflikte, 88 Tests grün), dann P4 und Hilfe (L2-12). Anzeigename: "Golden Gate" heißt seit 2026-10-28 "Interne Freigabe 1.0" (IDs und Dateinamen unverändert). Meilensteine und Schätzung: ADR-0038 (angenommen 2026-10-28) und `roadmap_schaetzung` im Tracker; bis Golden Gate 9 Pakete, 26 bis 43 Arbeitstage, bis BSF 15 Pakete, 51 bis 83 Arbeitstage (Analogieschätzung; Arbeitstag = Tag Gesamtaufwand, Kalenderzeit hängt von der Verfügbarkeit des Owners ab); MVP formal abgeschlossen (PR #60).
Entschieden 2026-10-26: TD-01 Stufe b läuft relativ zu heute (Stufe 0 ausgeführt, Schreibauftrag in `docs/DATENAUFTRAG-TD01-AUFFRISCHUNG.md` vorbereitet und lokal getestet, Freigabe 1 erteilt 2026-10-26 20:36; der Versuch am 2026-10-27 scheiterte am Zugriff von Work, nichts geschrieben; ausgeführt am 2026-10-28 mit Stichtag 2026-10-28 in der SQL-Konsole des Lovable-Projekts, Postflight 7 von 7 gleich Soll, Rückbau nicht ausgelöst; Sichtprüfung in der App steht aus). L2-Cockpit freigegeben, P1 als Draft-PR #226 und P2 (Server-Lesepfad) als Draft-PR #231, der AVKK-Server-Lesepfad (P2b) als Draft-PR #233 und die Route (P3) als Draft-PR #234 (alle nicht gemergt, CI grün; #226, #231, #233, #234 (inzwischen geschlossen, Stand 2026-11-06), ersetzt durch PR 262 bis 269); offen sind die Integrationsabnahme beider Zweige und die Rollenabnahme (P4). ADG-PR #15 gemergt.
Vorbereitet: Datenauftrag Kunde B, Stufe 0 (read-only), `docs/DATENAUFTRAG-KUNDE-B-VERANTWORTLICHE.md`;
nächster Schritt dort ist die Ausführung des Berichts durch den Nutzer in Lovable/Work.
Nach dem Golden Gate: QS-04 (Auth-Mail), QS-06 (Abrechnungsdaten nach Rolle,
`docs/QS-06-VIEWER-ABRECHNUNG.md`), danach BSF-06 (Docker). Konzepte: `docs/PW-01-PASSWORT-AENDERN.md`,
`docs/TD-01-STUFE-B-KONZEPT.md`.

## Vorheriger Wiederanlaufpunkt (BSF-03E, 2026-10-15)

**BSF-03E ist nach P5-Gesamtabnahme abgeschlossen; nächster geplanter
Fachsprint ist BSF-07.** GitHub-Stand:
`main@008c798af1c6901c23526eaab1cf1b8e0242676a` nach dem signierten Squash-Merge
von PR #185.

Die AP-Arbeitssicht auf `/verantwortungen` verwendet dieselbe serverseitig
autorisierte AP-Menge für alle drei Gruppierungen. Ein unabhängiger Review
entdeckte und schloss vor Merge zusätzlich den Same-Account-Revalidierungsfall,
ohne die unmittelbare Invalidation bei Konto- oder Berechtigungswechseln
abzuschwächen.

GG-01 ist abgeschlossen: Die drei BSF-03E-Migrationen wurden 3/3 atomar auf die Lovable-verwaltete Supabase-Datenbank angewendet; History, RLS/Policies, Funktionen, Trigger, Indizes und Berechtigungen sind im Postflight bestätigt. Nachweis: `docs/BSF-03E-DATABASE-SYNC-2026-10-14.md`.

Exact-Head-CI #1403, Security #1401 sowie Post-Merge-CI #1404 und Security #1402
sind vollständig PASS. Der frische read-only Lovable-Check bestätigt weiterhin
Migration History, RLS, Policies, Funktionen, Trigger, Index und Due-Projektion.
Abschlussnachweis: `docs/BSF-03E-CLOSURE-2026-10-15.md`. Es erfolgte kein Release
und kein Deployment. Die nachfolgenden datierten Abschnitte dokumentieren
frühere Evidenzstände.

## Zweck

Dieses Dokument benennt die aktuell maßgeblichen Status- und Abnahmequellen. Ältere Sprint-, Planungs- und Release-Candidate-Dokumente bleiben als historische Evidenz erhalten, sind aber für Aussagen zum aktuellen BSF-Stand nachrangig.

## Aktuelle Referenzen

Für den F-11-/MVP-Abschluss gelten weiterhin in dieser Reihenfolge:

1. `docs/F11-MVP-CONSOLIDATION-2026-08-24.md`
2. `docs/ROLE-ACCEPTANCE-09C-FINAL-2026-08-24.md`
3. `docs/MVP-CLOSURE-STATUS-2026-08-24.md`
4. `docs/MVP-ACCEPTANCE-REPORT-FINAL-2026-08-24.md`
5. die mit PR #39 nach `main` übernommene F-11-Runtime-Evidenz
6. der laufaktuelle technische Prüfbericht aus dem jeweils letzten vollständig grünen CI-Lauf

Für den laufenden BSF-Ausbau gelten zusätzlich:

1. `docs/BSF-CURRENT-PRIORITIES.md` — operative Reihenfolge und aktueller Wiederanlaufpunkt,
2. `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md` — verbindliche interne Kiosk-first-Reihenfolge,
3. `docs/BSF-03B-CLOSURE-2026-09-21.md` — Abschluss BSF-03B „Teamlead-Leistungsnachweis V1“,
4. `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md` — abgeschlossener KIOSK-02-Nachweis,
5. `docs/BSF-03A-CLOSURE-2026-09-14.md` — abgeschlossener BSF-03A-Nachweis,
6. `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md` — abgeschlossener KIOSK-01-Nachweis,
7. `docs/BSF-03E-CLOSURE-2026-10-15.md` — P5-Gesamtabnahme und Abschluss,
8. `docs/BSF-03E-DATABASE-SYNC-2026-10-14.md` — abgeschlossener GG-01-Datenbanknachweis,
9. `docs/SPRINT-PLAN-MVP-BSF.md` — operative Sprintfolge,
10. `docs/BSF-01-ARCHITECTURE-BASELINE.md` — Architektur-Baseline,
11. `docs/ADR/0029-systemhouse-customer-scope.md` — kanonischer Systemhaus-/Customer-Scope,
12. `docs/BSF-CONCEPT-REGISTER.md` — gesicherte fachliche Entscheidungen,
13. `docs/BSF-02B-IMPLEMENTATION.md` — umgesetzte Systemhouse-Membership-/Customer-Access-Grenze,
14. `docs/BSF-03-CLOSURE-2026-09-13.md` — Abschluss Kundenverantwortung/Kundensicht,
15. `docs/BSF-03D-CLOSURE-2026-09-13.md` — Abschluss Arbeitspaket-Kategorien,
16. `docs/BSF-03B-VERIFICATION-2026-09-21.md` — DB-/Security-/Regressionsnachweis für BSF-03B,
17. `docs/CODEX-GIT-CI-RULE.md` (Dateiname historisch, Inhalt seit 2026-10-28 auf Claude Code umgestellt) — projektweite Minimal-Fix-, Eskalations- und Git-/CI-Werkzeugregel.

Historische Dokumente werden nicht rückwirkend umgeschrieben. Abweichende OPEN-/PARTIAL-Aussagen darin beschreiben den damaligen Prüfzeitpunkt und werden durch die oben genannten laufenden Quellen fortgeschrieben.

## Produkt- und Plattformstatus

- Produktive Anwendung: `https://sysingdashboard.lovable.app`
- Source of Truth für Code und Dokumentation: GitHub `bmarnau/sysingdashboard`
- Dashboard-Kandidat: `1.69.0`; BSF-03E ist integriert und P5-abgenommen. Der veröffentlichte GitHub-Release bleibt bis zur separaten Release-Veröffentlichung `v1.65.0`.
- Produktiver MVP-/BSF-Daten-/Auth-Provider: Supabase
- Authentifizierung, RBAC und RLS: technisch und durch Rollen-/Negativtests nachgewiesen
- Azure SQL, Azure Table Storage und Microsoft Entra ID: optionaler Migrations-/Erweiterungspfad, nicht Voraussetzung des aktuellen BSF-Schritts
- Lovable: veröffentlichte Referenzumgebung und gezieltes Implementierungs-/Preview-Werkzeug, keine fachlich unersetzbare Laufzeitlogik und keine Merge-/Release-Instanz
- Lokale Toolchain: optional; Bun/Node können bei vorhandenem Repository-Checkout genutzt werden, ein lokaler Clone ist keine allgemeine Projektvoraussetzung
- Fachlogik, Authentifizierung, Datenzugriff und provider-spezifische Implementierungen bleiben getrennte Verantwortungsbereiche
- Docker-/Container-Portabilität sowie Azure-/Entra-Migrationsfähigkeit bleiben verbindliche Architekturziele
- MVP bleibt **100 % / BASELINE READY**; der aktive Entwicklungshorizont ist **BSF — Betriebsfähiges Systemhaus-Fundament**.

## Aktueller Arbeitsstand 22.09.2026

- BSF-KIOSK-02 / PR #147 ist nach vollständiger Abnahme auf `main` gemergt; Release `v1.65.0` ist veröffentlicht.
- BSF-03B / Issue #107 ist **FINAL DONE und gemergt**. PR #149 wurde als GitHub-signierter Squash-Commit `12b37be8ce8e5e8e3668d6622ace13872a7f3c48` nach `main` integriert. Der zuvor vollständig grüne Exact-Head und der Merge-Commit besitzen denselben Git-Tree `25ae707e08726f6d357c940a983afc14552d5b03`.
- Der erste Post-Merge-CI am 22.09. deckte einen **kalendertagsabhängigen E2E-Harness-Escape** auf: die BSF-03B-Fixtures endeten fest am 21.09., während der Produktdefault korrekt „aktueller Monat bis heute“ verwendete. Dadurch wurden am 22.09. korrekt erzeugte Fixture-Snapshots beim Test-Refresh aus der Historie gefiltert. PR #152 korrigierte ausschließlich die Test-Referenzzeit; Produktlogik, Assertions, Expected Results, DB, RBAC und RLS blieben unverändert. Der Fix ist als GitHub-signierter Commit `1ca8f0937a7217de74050061ae39c9c3f028784c` auf `main`; der PR-Gate-Lauf bestätigte **110/110 Playwright PASS**.
- **BSF-03E / #63 ist abgeschlossen.** P0–P3b sind integriert, P5 ist belegt; P4-Bulk bleibt bewusst optional und nicht freigegeben. Nächster geplanter Fachsprint ist **BSF-07 / #140**.
- Patch 1.65.1 ergänzt die sichtbare Versions-/Datumsangabe sowie den AQGS-evidenzkalibrierten Systemstatus und ist vollständig abgenommen. Der korrigierte read-only Lovable-Exact-Head-Retest bestätigt Fresh-Refresh, Fail-closed-Verhalten, beide Zielauflösungen und Tree-Integrität; der frühere Fresh-Refresh-FAIL war ein Harness-False-Negative. Commitbezogene CI-/Security-Aussagen werden weiterhin ausschließlich aus den jeweiligen GitHub-Actions-Runs abgeleitet.

## Aktueller BSF-Stand

### BSF-02 / BSF-02C — DONE

Die minimale gemeinsame Mehrbenutzer-Daten-/Read-Basis einschließlich Shared Projection, transaktionaler Publish-RPC und Runtime-Publish-/Read-Pfad ist abgeschlossen. T01–T30 und T31–T51 einschließlich Atomic Rollback, Security Advisor sowie vollständige CI-/Security-/E2E-/Accessibility-/Technical-Debt-/Quality-Gates sind PASS.

### BSF-03 — DONE / Issue #105

BSF-03 „Kundenverantwortung und Kundensicht“ ist mit P1–P5 fachlich abgeschlossen. P1/P2 lieferten das Datenbank-/Security-Fundament, P3/P4 die persönliche fail-closed Sicht **Meine Kunden** und das read-only Kundendetail, P5 ergänzt die getrennte Managementsicht **Kundenverantwortung**.

Verbindlicher Endzustand:

- Responsibility ist Beziehung/Scope und keine globale Rolle,
- Responsibility allein erzeugt weder `customer_access` noch Schreibrechte,
- `Meine Kunden` bleibt die Schnittmenge aus aktiver Membership, eigener aktiver Responsibility, Customer Access >= read und `dashboard.view`,
- `Kundenverantwortung` ist getrennt und nur mit `customer.responsibility.manage` nutzbar,
- Systemadministrator, Administrator und Teamlead verwalten Responsibility im eigenen Systemhaus auch ohne eigenen operativen Customer Access,
- Kandidaten werden nur als ID + Anzeigename geliefert; die Self-only-RLS wurde nicht verbreitert,
- Wechsel erfolgt atomar und historisiert,
- Cross-Systemhouse, IDOR/BOLA, Viewer/Customer-Ziele und manipulierte Browserrollen bleiben DENY.

P5-Evidenz: Migration `20260913150000_bsf03_p5_responsibility_management`, SQL-Vertrag R19–R31, Live-Read-only-Prüfung von Funktionsmodus/Grants/RLS sowie 90 Unit-/Component-Testdateien mit 704 PASS / 4 TODO auf dem geprüften Funktions-Head. Abschlussnachweis: `docs/BSF-03-CLOSURE-2026-09-13.md`.

### BSF-03D — DONE / Issue #103

Arbeitspaket-Kategorien sind mit Version 1.62.0 als systemhausweit editierbarer Katalog `workpackage.category` umgesetzt: Scope `systemhouse`, keine Seed-Werte, Key unveränderlich, deaktivieren statt löschen, `WorkPackage.categoryKey?: string | null` mit Default „keine Kategorie“, Tags unabhängig und keine Ableitung von billable/priority/status. JSON-Schema 1.2.0 bleibt für Import/Export/Backup/Restore rückwärtskompatibel.

Abschlussnachweis:

- Live-SQL-Artefakt `supabase/tests/bsf03d-workpackage-category.sql`: **T01–T16 16/16 PASS** mit Rollback,
- Live-Schema-Vertrag PASS,
- Security Advisor ohne neues BSF-03D-Finding gegenüber SEC-01,
- vollständiger Gate-Lauf einschließlich Typecheck, Lint, Prettier, Unit/Component, A11y, Security, Technical Debt, Docs, Projektstatus, Build, E2E und Quality Gate PASS,
- PR/Merge nach `main` abgeschlossen; Issue #103 geschlossen,
- Nachweise: `docs/BSF-03D-VERIFICATION-2026-09-13.md` und `docs/BSF-03D-CLOSURE-2026-09-13.md`.

### BSF-KIOSK-01 — DONE / Issue #135

Der Info-Kiosk-Demo-Pilot wurde mit PR #141 am 2026-09-17 nach `main` integriert. Merge-Commit: `91adefa97054aa3cbc6ad03e4cb2a58b868e4e75`. Post-Merge Security #849 und CI #855 sind PASS. Der Kiosk bleibt read-only, nutzt in KIOSK-01 ausschließlich synthetische Demo-Daten und besitzt keine produktive Graph-/SharePoint-/Exchange-/PRTG-/MCP-/Agenten-Anbindung. Abschlussnachweis: `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md`.

### BSF-03A — DONE / Issue #106

BSF-03A ist am 19.09.2026 nach vollständiger Finalabnahme mit PR #144 nach `main` integriert worden. Merge-Commit: `b9aef5aa9b3174f2abd022e11d492190102933a4`.

Finaler Kandidaten-Head `763cf874b9f5bb8fadbd2875d7e11f0bd7165361`:

- Security #989: **PASS**,
- CI #995: **PASS**,
- Quality Gate: **PASS / 0 Blocker**,
- Golden Dataset V1: **PASS**,
- targeted Vitest: **11 Dateien / 66 Tests PASS**,
- Project-Controlling E2E und Scope-Security E2E: **PASS**,
- isolierter Lovable-Exact-Tree-Nachweis: **TREE_MATCH JA**,
- 1920×1080 und 1366×768: **PASS**,
- Filterhierarchie, KPI/Trend/Drill-down, Read-only UI, Runtime Console und Network/ServerFn: **PASS**.

Die produktive Lovable-Codebasis war wegen historischer Drift nicht Prüfobjekt; die Abnahme erfolgte gegen einen frischen temporären Checkout des exakten GitHub-Kandidaten. Keine versionierte Datei und keine DB-/Auth-/RBAC-/RLS-/Providerlogik wurde durch die Finalabnahme verändert. Abschlussnachweis: `docs/BSF-03A-CLOSURE-2026-09-14.md`.

### BSF-KIOSK-02 — FINAL DONE / READY FOR MERGE / Issue #136

KIOSK-02 bindet den bestehenden Info-Kiosk an den serverseitig abgesicherten BSF-03A-Read-/Controlling-Vertrag an. Der Demo-Pfad bleibt unverändert erhalten; im expliziten internen Modus entsteht eine **Hybrid-Sicht**:

- INTERN: Projekte, Arbeitspakete und Tätigkeiten,
- DEMO: Verfügbarkeit, Infrastruktur und Support,
- bei internem Fehler: **NICHT VERFÜGBAR**, kein stiller Demo-Fallback.

Der technische Kiosk-Account bleibt ausschließlich auf `kiosk.view` begrenzt. Interne Leistungsdaten erfordern serverseitig `project.controlling.view` sowie die bestehenden Membership-, Customer-Access- und RLS-Grenzen. Es wurde keine neue Permission, Tabelle, Migration oder Kiosk-spezifische Aggregationslogik eingeführt.

Finaler Lovable-Funktionskandidat:

`528b5bc8373a51b7c3e946241b07467bd3245dd9`

Nachweise:

- Git tree EXPECTED = ACTUAL = `ab0a5655485c50f9b7be5f3c8fa0a36166aeb949`,
- Tree Match: **JA**,
- targeted Vitest: **11 Dateien / 69 Tests PASS**,
- Golden Dataset V1: **PASS**,
- Kiosk Demo/Internal/Security E2E: **PASS**, zusammen **9/9**,
- 1920×1080 und 1366×768: **PASS**,
- exakt **3× INTERN** und **3× DEMO**,
- Zeitraum und echte Source-Freshness sichtbar,
- Datenminimierung, Read-only UI, Runtime Console und Network: **PASS**,
- Fail-closed / kein Demo-Fallback: **PASS**,
- `client.ts` Drift: **NEIN**,
- `previewAuthStorage.ts` im Kandidaten: **NEIN**,
- Migration oder DB-/Auth-/RBAC-/RLS-Änderung: **NEIN**,
- versionierte Dateien im Prüfobjekt verändert: **NEIN**.

Der vorherige GitHub-Code-/Dokumentationskandidat war bereits mit Security #1092 und CI #1098 vollständig grün. Die abschließenden Statusdokumente laufen vor Merge erneut durch die normalen Required Checks.

BSF-KIOSK-02 gilt damit als **FINAL DONE**. PR #147 ist auf `main` gemergt; Release `v1.65.0` ist veröffentlicht. Abschlussnachweis: `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md`.

### BSF-03B — FINAL DONE / Issue #107

Der Teamlead-Leistungsnachweis V1 ist abgeschlossen. Er trennt die operative Shared Activity vom revisionsgebundenen Billable-Review, finalisiert atomar in unveränderbare Snapshots, verhindert Doppelverwendung über Claims und unterstützt Replacement-Versionen sowie PDF/CSV/JSON aus dem finalen Snapshot.

Abschlussnachweise:

- Permission `performance.statement.manage`: Teamlead regulär, Systemadministrator Break-glass; übrige Fachrollen DENY,
- Migration `20260921095742_bsf03b_performance_statement` live,
- RLS auf allen fünf BSF-03B-Tabellen; kein anon/PUBLIC-DML,
- interne SECURITY-DEFINER-Funktionen mit `search_path=""` und ohne direktes authenticated/anon/PUBLIC-EXECUTE,
- Security #1247 PASS,
- CI #1252 PASS einschließlich Golden Dataset, vollständiger BSF-02C/03A/03B-Regression, E2E, A11y, Backup/Restore und Quality Gate,
- offizieller Supabase Security Advisor BASELINE_ONLY, keine neuen BSF-03B-Findings,
- Lovable Exact-Head Visual Preview: NOT EVIDENCED wegen fehlender identitätsgebundener GitHub-Head-Bindung; nicht als PASS umgedeutet,
- Abschluss: `docs/BSF-03B-CLOSURE-2026-09-21.md`.

PR #149 ist nach vollständiger Exact-Head-Abnahme nach `main` gemergt. Der nachgelagerte E2E-Harness-Escape und seine rein testseitige Korrektur sind in Issue #107 und PR #152 dokumentiert.

## F-11

**Status: CLOSED / PASS**

Nachgewiesen sind unter anderem:

- reale Rollen- und Negativtests für Systemingenieur, Projektmanager, Teamleitung, Viewer und Administrator,
- Benutzerverwaltung und Namensdarstellung,
- Backup-Runtime einschließlich Integrität und Zeitstempellogik,
- Downloadbereich,
- Log Viewer,
- finale Administrator-Gesamtsicht,
- produktiver Systemstatus-Retest mit SYSSTAT-01 bis SYSSTAT-04 PASS,
- serverseitige Berechtigungsgrenzen und RLS-Negativpfade.

`Role Preview` ist für den MVP **N/A — kein Produktbestandteil**. Es wird kein künstliches Impersonation-/Preview-Feature nur zur Erfüllung eines historischen Prüfpunkts gebaut.

## MVP-Abschluss und wirksame Baseline

Die fachliche F-11-Abzeichnung ist abgeschlossen. PR #60 wurde mit finalem Head `05c8f8261a865a3672d3b00adbb316641b889140` vollständig gegatet und anschließend mit Head-SHA-Schutz gemergt.

Finale Gate-Evidenz von PR #60:

- Security #398: PASS,
- CI #407: PASS,
- Prettier / ESLint / TypeScript / RBAC / Docs / Projektmanifest: PASS,
- Unit & Components / Backend / API / RBAC & Security: PASS,
- Import/Export / Backup/Restore / Production Build: PASS,
- Playwright E2E / Accessibility / Technical Debt: PASS,
- Technical Report / Quality Gate: PASS.

Damit gilt seit dem Merge von PR #60:

**MVP: 100 % / BASELINE READY — wirksame MVP-Baseline ist der Merge-Commit `03fe38692da598520b7f793efecc030952cadc39`.**

## Post-MVP-Fortschreibung

### PR #61 — E2E-Lückenmatrix

- gemergt,
- Security #400: PASS,
- CI #409: PASS einschließlich Technical Report und Quality Gate,
- Issue #36 als `completed` geschlossen,
- E2E-Dokumentation trennt synthetische Supabase-Sessions, Smoke-/Sichtbarkeitsanker und tiefe funktionale Abdeckung klarer.

### PR #62 — TanStack Validator-API

- gemergt,
- Security #402: PASS,
- CI #411: PASS einschließlich Technical Report und Quality Gate,
- fünf produktive `.inputValidator(...)`-Verwendungen semantisch neutral auf `.validator(...)` migriert,
- Regressionstest verhindert die erneute Verwendung der deprecated API,
- konkrete `inputValidator`-Warnung in Production Build und E2E von zuvor 10 Logeinträgen auf 0 reduziert,
- keine Änderung an Auth-, RBAC-, RLS- oder Datenbanksemantik,
- Issue #59 als `completed` geschlossen.

### PR #65 — laufenden Status korrigiert

- ausschließlich `docs/CURRENT-STATUS.md` auf den wirksamen MVP-/Post-MVP-Stand fortgeschrieben,
- historische Abschlussdokumente bewusst unverändert gelassen,
- Security #404: PASS,
- CI #413: PASS einschließlich Docs-Sync, E2E, Technical Report und Quality Gate,
- Merge-Commit: `ea28740cca3512bc5ca21e874e83985312de85d9`,
- Issue #64 als `completed` geschlossen.

### Lovable-Governance-Vorfall und Recovery PR #66

Am 24.08.2026 erzeugte ein ausdrücklich als Plan-/Analyseauftrag ohne Code-/GitHub-Änderung gestarteter Lovable-Lauf dennoch direkte Änderungen auf dem damals ungeschützten GitHub-Branch `main`:

- Commit `2f6ea1050ba5bc27938a793c970ae729df05641f` änderte unbeauftragt `src/integrations/supabase/client.ts` und fügte `src/integrations/supabase/previewAuthStorage.ts` hinzu,
- Commit `0e561578beae51c4850ecffeeed337af22233c23` fügte `.lovable/plan.md` hinzu,
- Merge `f60b7ed06efac220cb5ca6899c4eedea74ee2a55` gelangte ohne PR-/CI-Pfad direkt auf `main`.

Der Drift wurde bewusst nicht per Direkt-Revert korrigiert. Recovery erfolgte über Branch + PR #66:

- Recovery-Head `4ccedb3531edeb4fda8a4c62e48f86f741494dae`,
- die drei unbeauftragten Dateiveränderungen vollständig entfernt bzw. zurückgesetzt,
- Vergleich gegen den zuvor vollständig abgenommenen Stand `ea28740cca3512bc5ca21e874e83985312de85d9`: **keine Dateiabweichung**,
- Security #407: PASS,
- CI #416: PASS,
- Static / Unit & Components / Backend / API / RBAC & Security / Import/Export / Backup/Restore / Production Build / Playwright E2E / Accessibility / Technical Debt: PASS,
- `14 · Technical Report & Quality Gate`: PASS,
- Merge mit Expected-Head-SHA.

Recovery-Referenzstand nach PR #66:

`425fbed6cecbf5900a0eda17c735f90221d31d8d`

Der vollständige Dateibaum dieses Recovery-Referenzstands ist gegenüber `ea28740...` identisch. Nachfolgende reine Governance-/Dokumentationsänderungen ändern diese technische Recovery-Aussage nicht; für den jeweils aktuellen GitHub-HEAD ist `main` selbst die maßgebliche Quelle.

### PR #68 — Lovable-Governance dauerhaft dokumentiert

- `docs/CURRENT-STATUS.md` und `docs/AI-ASSISTED-DEVELOPMENT-WORKFLOW.md` auf den nach Recovery #66 geltenden sicheren Kooperationsmodus fortgeschrieben,
- Lovable-Planmodus-Vorfall als Governance-Evidenz verankert,
- isolierte Project Variant / Nicht-main-Arbeitsfläche als bevorzugter Lovable-Arbeitsmodus dokumentiert,
- Security #411: PASS,
- CI #420: PASS einschließlich Docs-Sync, E2E sowie `14 · Technical Report & Quality Gate`,
- Issue #67 als `completed` geschlossen.

### PR #70 — aktiven Branch-Schutz in laufender Governance festgeschrieben

- `docs/CURRENT-STATUS.md` und `docs/AI-ASSISTED-DEVELOPMENT-WORKFLOW.md` auf das aktive Ruleset fortgeschrieben,
- Security #413: PASS,
- CI #422: PASS einschließlich E2E, Accessibility, Technical Debt und `14 · Technical Report & Quality Gate`,
- Merge mit Expected-Head-SHA,
- Issue #69 als `completed` geschlossen.

### PR #74 — operative BSF-Prioritäten und Lovable-Einsatz

- neue tägliche Source of Truth `docs/BSF-CURRENT-PRIORITIES.md`,
- `docs/SPRINT-PLAN-MVP-BSF.md` auf den priorisierten Nutzwertpfad synchronisiert,
- Projektmanager-Leistungssicht als BSF-03A und Teamlead-Leistungsnachweis als BSF-03B vorgezogen,
- Dokumentationskonsolidierung sowie SYSING-001/TDF und Board-Zugriff als eigene DOC-Schritte verankert,
- Lovable-Einsatz je priorisiertem Punkt und 5-Credit-Tagesregel dokumentiert,
- Security #416: PASS,
- CI #425: PASS einschließlich Docs-Sync, E2E, Accessibility, Technical Debt und `14 · Technical Report & Quality Gate`,
- Issue #71 als `completed` geschlossen.

### PR #128 — BSF-03 P3/P4 „Meine Kunden“

- nach Synchronisierung mit aktuellem `main` vollständig gegatet und gemergt,
- Security #592: PASS,
- CI #599: PASS,
- 696 Tests PASS / 4 TODO,
- vollständige E2E-/Accessibility-/Technical-Debt-/Technical-Report-Gates PASS,
- Merge-Commit `a9f40cb56aed7bdfd7d0baef2d9023755923967c`,
- kein Deploy.

### PR #129 / #130 — Git-/CI-Governance

- #129 schreibt Codex als bevorzugtes Werkzeug für Git-/CI-Fehler fest,
- #130 ergänzt Verhältnismäßigkeit/Minimal-Fix, 15–20-Minuten-Eskalation, Umgebungsprüfung und Fallback-Regel,
- #130 Exact Head: Security #594 PASS, CI #601 PASS,
- keine Produkt-, DB-, RLS-, RBAC-, Auth- oder Runtime-Änderung.

## Branch Protection aktiv — Issue #53 abgeschlossen

Issue #53 ist seit 25.08.2026 **CLOSED / COMPLETED**. GitHub schützt den Default-Branch `main` technisch mit dem Repository-Ruleset `main-release-governance`.

Verifizierter Ruleset-Stand:

- Ruleset-ID: `21372842`,
- Enforcement: `active`,
- Target: `~DEFAULT_BRANCH` (`main`),
- GitHub Branch API: `protected: true`,
- Bypass-Liste: leer,
- `current_user_can_bypass: never`,
- Branch-Löschung blockiert (`deletion`),
- Force-/Non-Fast-Forward-Pushes blockiert (`non_fast_forward`),
- Pull Request vor Merge verpflichtend,
- Required approvals: `0`,
- Required Check: `14 · Technical Report & Quality Gate`,
- Required Check: `Secrets, Headers, Azure-Strings`,
- `strict_required_status_checks_policy: true` — der PR-Branch muss vor Merge mit dem aktuellen `main` abgeglichen sein.

Damit ist die organisatorische PR-/CI-Regel durch GitHub selbst technisch erzwungen. Die klassische Branch-Protection-Unterstruktur kann weiterhin `protection.enabled: false` melden; maßgeblich sind `protected: true` und das aktive Ruleset.

### Lovable-/Werkzeugregel unter aktivem Branch-Schutz

Branch Protection ist eine letzte technische Sicherheitsgrenze und ersetzt nicht den kontrollierten Entwicklungsprozess.

- GitHub bleibt Source of Truth.
- Änderungen werden über benannte Branches bzw. nachweislich isolierte Arbeitsflächen vorbereitet und über Pull Requests integriert.
- Lovable wird bevorzugt auf einer nachweislich isolierten Nicht-main-Arbeitsfläche eingesetzt.
- Ein Variant = ein Auftrag = ein Scope.
- ChatGPT koordiniert Scope, GitHub-Diff, Security/CI und Abnahme.
- Zusatzbefunde werden nur vorgeschlagen, nicht ungefragt umgesetzt.
- Auth/RBAC/RLS/Supabase/Migrationen/Seeds und `src/integrations/supabase/*` werden nur bei ausdrücklichem Scope geändert.
- Git-/CI-Fehler: Claude Code bevorzugt (ADR-0039, seit 2026-10-28; zuvor Codex), sofern verfügbar; andernfalls kleinstmögliches geeignetes Fallback-Werkzeug.
- Klar lokalisierte mechanische Kleinfehler werden proportional behandelt; nach etwa 15–20 Minuten ohne Lösung wird Werkzeug/Umgebung/Root Cause/Scope neu bewertet.
- Merge erfolgt erst nach den durch das Ruleset erzwungenen Required Checks; Expected-Head-SHA bleibt zusätzliches Integritätssignal.

## BSF aktiv — aktueller roter Faden

Die operative Reihenfolge ist in `docs/BSF-CURRENT-PRIORITIES.md`, `docs/BSF-INTERNAL-KIOSK-FIRST-ROADMAP.md` und `docs/SPRINT-PLAN-MVP-BSF.md` festgeschrieben:

`BSF-03D DONE → KIOSK-01 DONE → BSF-03A DONE → KIOSK-02 DONE → BSF-03B DONE → BSF-03E → BSF-07 → KIOSK-03 → BSF-03C → DOC-01/02/03 → BSF-04 → BSF-04A → BSF-05A → BSF-06 → BSF-09 → BSF-FINAL-INTERNAL → INTEGRATION-READINESS → externe Integrationen/MCP/Agenten`

Die kanonische Kundenidentität bleibt `(systemhouseId, customerId)`; `systemhouseId` ist providerneutral und nicht gleich Microsoft Entra Tenant ID. Kundenverantwortung bleibt Scope/Beziehung, keine globale Rolle. Der vollständige Datenhaltungsumbau bleibt BSF-04.

## Dokumentationszustand

- `docs/ENTWICKLUNGSTAGEBUCH.md` ist bis zum GG-01-Abschluss und P3b-Restack vom 2026-10-14 fortgeschrieben.
- `README.md`, `docs/PROJECT-STATUS.yaml`, `docs/BSF-CURRENT-PRIORITIES.md`, `docs/SPRINT-PLAN-MVP-BSF.md`, `roadmap.md` und dieses Dokument bilden gemeinsam den aktuellen BSF-03E-Kandidatenstand ab.
- `docs/BSF-KIOSK-01-CLOSURE-2026-09-14.md` dokumentiert den abgeschlossenen KIOSK-01-Sprint; PR #141 ist auf `main`.
- `docs/BSF-03A-CLOSURE-2026-09-14.md` dokumentiert den vollständig abgenommenen und gemergten BSF-03A-Sprint; `docs/BSF-KIOSK-02-CLOSURE-2026-09-19.md` ist der laufende KIOSK-02-Abnahmenachweis.
- Benutzerhandbuch und kontextsensitive Hilfe stehen auf Version **1.24.0**; P3a-Einzelaktionen, P3b-Arbeitssicht, Projektcontrolling, KIOSK-02 Hybrid-/Quellenstatus, aktuelle RBAC-/Kiosk-Rechte, Kundenverantwortung, der heutige Supabase-MVP-Betriebsmodus und die AQGS-konforme Systemstatus-Evidenzlogik sind synchronisiert.
- `SYSING-001` existiert als Living Document `docs/SYSING-001_Sysing-Dashboard-Produktuebersicht_V0.2.1.md` mit gemeinsamer Markdown-Quelle für PDF/Word.
- SYSING-001 wird in BSF-DOC-02 kontrolliert aktualisiert und TDF-konform abgenommen; es wird keine zweite Dokumentquelle erzeugt.
- BSF-DOC-03 macht die freigegebene SYSING-001-Fassung read-only aus dem Board erreichbar.
- Kontext-sensitive Hilfe und Benutzerhandbuch bleiben Teil der Definition of Done jedes betroffenen Fachsprints; BSF-DOC-01 bleibt zusätzlicher Konsolidierungsblock.

## Bewusst zurückgestellter Zukunftsscope

Issue #63 dokumentiert die BSF-Vertretungs- und Personensicht für Verantwortlichkeiten. Dieser Punkt ist **BSF-Ausbau nach den priorisierten Kernfunktionen** und kein F-11- oder MVP-Restfehler.

Neue Fachfunktionen werden daraus erst nach bewusster Priorisierung umgesetzt; RBAC, RLS, Auditierbarkeit, Datenschutz, Provider-Trennung und Containerfähigkeit bleiben verbindliche Abnahmekriterien.
