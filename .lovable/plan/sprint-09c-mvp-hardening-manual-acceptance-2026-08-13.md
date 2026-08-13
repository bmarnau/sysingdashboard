# Sprint 09C – MVP Hardening & Manual Acceptance

Kein Feature-Sprint. Ziel: die beiden offenen Abnahmepunkte F-11 und F-12 belastbar schließen (oder exakt benennen, was fehlt), Findings nachvollziehbar zuordnen, Nachweise erneuern, finale Freigabeempfehlung.

## Vorabbefund (verifiziert)

- Release Candidate laut CHANGELOG: **v1.58.1** (2026-08-13).
- `docs/MVP-ACCEPTANCE-REPORT.md` führt F-02 (high), F-11 (medium, MANUAL VERIFICATION REQUIRED) und F-12 (low) genau so, wie im Auftrag beschrieben.
- SYSING-001 existiert als Markdown-Quelle (`docs/SYSING-001_..._V0.2.0.md`) und als abgenommene PDF; ein Skript zur Erzeugung existiert nicht — PDF wurde bisher ad hoc erzeugt.
- **Wichtige Einschränkung:** In der Prüfumgebung ist aktuell **keine angemeldete Sitzung** vorhanden (Auth-Status „signed_out"). Ohne Anmeldung über die Lovable-Vorschau sind die rollenbezogenen Sichten hinter dem Login nicht automatisiert erreichbar.

## Etappe 1 – Ist-Stand verifizieren

Version, Commit, Testumgebung, Demo-Dataset-Version und Migrationsstand aus Code und Reports belegen, nicht aus 09B übernehmen. Vollständiger Gate-Lauf als Basiswert (Tests, Typecheck, ESLint, Prettier, Build, docs:check, project-status:check, rbac:check, no-console, Security, Architecture, Tech-Debt) mit Rohzahlen.

## Etappe 2 – F-11 manuelle Rollenabnahme

Durchführung mit dem definierten Systemhaus-Demo-Datensatz über die laufende Anwendung, Rolle für Rolle: Systemingenieur, Projektmanager, Geschäftsführer, Admin/Role Preview, Negativtest. Geprüft werden die im Auftrag genannten Schritte inklusive Drill-down, Handlungsbedarf, Reportzugriff sowie die Trennung von UI-Schutz und tatsächlichem Datenzugriff.

Bedingung: Dafür wird eine angemeldete Sitzung je Rolle benötigt. Ohne verfügbare Anmeldung wird kein Schritt als PASSED geführt, sondern als MANUAL VERIFICATION REQUIRED mit konkreter Prüfanleitung. Automatisierte Tests ersetzen die Abnahme nicht.

Ergebnis wird in den bestehenden Checklisten (`docs/AVKK-MANUAL-ACCEPTANCE.md`, `docs/AVKK-MANAGEMENT-MANUAL-ACCEPTANCE.md`) plus einer neuen Rollenabnahme-Checkliste dokumentiert, jeweils mit Datum, Release Candidate, Commit, Umgebung, Dataset-Version, Rolle, Schritt, erwartetem und tatsächlichem Ergebnis, Status und Finding-ID.

F-11 wird nur geschlossen, wenn alle wesentlichen Rollenpfade tatsächlich geprüft wurden; sonst bleibt es offen mit exakter Restliste.

## Etappe 3 – F-12 SYSING-001 Word

Word-Fassung aus **derselben** Markdown-Quelle wie die PDF erzeugen, über den vorhandenen produktiven Word-Renderer bzw. ein Erzeugungsskript, das beide Formate aus der einen Quelle ableitet. Keine zweite gepflegte Dokumentquelle. Anschließend jede Seite in Bilder wandeln und visuell prüfen: Titel, Überschriftenhierarchie, Tabellen (insbesondere Spalte „Stufe"), ASCII-/Informationsflussdiagramme in Monospace, Umlaute, Listen, Kopf-/Fußzeile, Seitenzahlen, Umbrüche, keine abgeschnittenen oder überlappenden Inhalte. Ist die visuelle Prüfung nicht durchführbar: Status MANUAL VISUAL VERIFICATION REQUIRED, nicht PASSED.

Zusätzlich Synchronitätsabgleich Source ↔ PDF ↔ Word über die im Auftrag gelisteten Themen und die fünf Statusklassifikationen.

## Etappe 4 – Finding-Konsistenz

Mapping-Tabelle Tech-Debt-Finding → MVP-relevant ja/nein → Acceptance-Finding-ID bzw. Begründung. Low-Befunde werden nicht in den MVP-Bericht kopiert, aber gruppiert nachgewiesen. Jedes High-/Medium-/Low-Acceptance-Finding erneut bewerten: vorhanden, geschlossen, blockierend, accepted, Zielmaßnahme, Ziel-Sprint. F-02 wird nur neu bewertet, nicht refaktoriert — erwartetes Ergebnis ACCEPTED FOR MVP mit Backlog-Eintrag.

Backup-/Restore-Entscheidung (AVKK ACCEPTED FOR MVP) bleibt unverändert und wird im Bericht klar erklärt; vollständige Restore-Automatisierung im Backlog sicherstellen. Demo-Daten-Betriebsgrenze in DemoDataDialog, `docs/DEMO-DATA.md`, Betriebsdoku und Abnahmebericht auf Vorhandensein prüfen.

## Etappe 5 – Regression und Doku

Nach den kleinen Änderungen: vollständige Testsuite, Typecheck, ESLint, Prettier, Build, docs:check, project-status:check, rbac:check, no-console; Security-/Architecture-/Tech-Debt-Gates nur bei Eingriffen in diese Pfade. Kein neuer Tech-Debt.

Aktualisiert werden: `docs/MVP-ACCEPTANCE-REPORT.md` (F-11/F-12-Status, Mapping, Rollenabnahme, SYSING-001-Status), CHANGELOG, `docs/PROJECT-STATUS.yaml`, MVP-PLAN, DEMO-DATA, SYSING-001, Entwicklungstagebuch, Benutzer-/Betriebsdoku, technischer Prüfbericht nur bei release-relevanter Änderung — ohne veraltete Versions-/Commit-Referenzen.

## Etappe 6 – Freigabeentscheidung

Abschlussausgabe im geforderten Format mit GO / GO WITH FINDINGS / NO-GO, Reifegrad, verbleibenden Prompts, nächstem Schritt und maximal acht Begründungspunkten.

## Technische Hinweise

- Änderungen am Produktcode nur bei nachgewiesenen MVP-Blockern; alles andere wird Finding.
- Für die Word-Erzeugung wird ein wiederverwendbares Skript bevorzugt, damit PDF und Word künftig aus einer Quelle entstehen.
- Die 09B-Zahlen werden durch einen frischen Lauf ersetzt, nicht übernommen.
