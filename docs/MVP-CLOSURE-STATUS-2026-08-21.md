# Sysing Dashboard — MVP-Abschlussstatus

Stand: 2026-08-21  
Dashboard-Version: 1.59.4  
Technischer Referenz-Commit: `603f062c28cac22b0823dd5f2df982a5882272e6`  
Status: **funktional vollständig, formale F-11-Abzeichnung noch nicht vollständig**

## 1. Zweck

Dieses Dokument hält den verifizierten Zwischenstand unmittelbar vor der formalen MVP-Baseline fest. Es ersetzt weder `docs/MVP-ACCEPTANCE-REPORT.md` noch `docs/ROLE-ACCEPTANCE-09C.md`, sondern dokumentiert transparent, welche Abschlussnachweise am 2026-08-21 tatsächlich vorliegen und welche noch fehlen.

GitHub bleibt Source of Truth. Eine Kennzeichnung `MVP 100 % / BASELINE` darf erst erfolgen, wenn die noch offenen manuellen F-11-Rollenläufe vollständig dokumentiert und der anschließende finale Gate-Lauf erfolgreich abgeschlossen ist.

## 2. Technischer Stand

Version 1.59.4 schließt den F-18-Restfix ab:

- `canEdit` ist in ProjectsView, WorkPackagesView, ActivitiesView und BillingView verpflichtend und fail-closed.
- BillingView erhält `canEditActivity`.
- GlobalSearch bleibt für lesende Rollen nutzbar, öffnet Editoren aber nur bei vorhandener Edit-Permission.
- ProjectDialog, WorkPackageDialog und ActivityDialog besitzen zentrale Permission-Render-Gates.
- Die defensiven CRUD-Handler bleiben erhalten.
- RBAC-Matrix und Engineer-`own`-Semantik wurden nicht erweitert oder verändert.

Der technische Abschlussbericht zu v1.59.4 dokumentiert:

- 68 Testdateien,
- 572 grüne Tests,
- 4 vorbestehende `todo`,
- Typecheck 0 Fehler,
- ESLint 0 Fehler / 17 vorbestehende Warnungen,
- Prettier clean,
- Build erfolgreich,
- `docs:check` bestanden,
- `project-status:check` bestanden,
- `rbac:check` bestanden,
- `no-console` bestanden,
- Security: CRITICAL 0 / HIGH 0 / MEDIUM 0.

Diese Werte stammen aus dem dokumentierten F-18-Abschlusslauf. Vor der endgültigen MVP-Baseline ist ein frischer finaler Gate-Lauf erforderlich.

## 3. F-18 — Abschluss

Der manuelle Viewer-Retest mit Alexa wurde nach v1.59.4 vollständig bestanden.

Bestätigt:

1. `+ Neu` ist für Viewer nicht sichtbar.
2. Projekte: kein Neu, Bearbeiten oder Löschen.
3. Arbeitspakete: kein Neu, Bearbeiten oder Löschen.
4. Tätigkeiten: kein Neu, Bearbeiten oder Löschen.
5. Abrechnung: kein Bearbeiten-Stift.
6. Globale Suche navigiert bei Tätigkeiten ohne Edit-Dialog.
7. Projekt- und Arbeitspaket-Suchtreffer verhalten sich entsprechend.
8. Inhalte und Kennzahlen bleiben lesbar.
9. `Mein AVKK` bleibt read-only.

**F-18 ist damit technisch und manuell bestätigt und für den MVP geschlossen.**

## 4. F-11 — tatsächlich vorhandene manuelle Evidenz

### Petra / Projektmanager

Manuell bestätigt:

- erfolgreicher Login,
- persönliche AVKK-Sicht plausibel,
- zwei eigene Verantwortungen sichtbar,
- Benutzerverwaltung nicht aufrufbar.

Noch nicht als vollständiger Rollenlauf dokumentiert:

- vollständiger Drill-down,
- Projektbericht und Abgleich mit Oberfläche.

### Georg / Teamlead / Führungssicht

Manuell bestätigt:

- erfolgreicher Login,
- Management-Cockpit sichtbar,
- alle drei Demo-Projekte enthalten,
- acht AVKK-Sachverhalte enthalten,
- sieben gefährdete und ein unauffälliger Fall plausibel,
- keine personenbezogene Rangliste.

Noch nicht als vollständiger Rollenlauf dokumentiert:

- Managementbericht und Kennzahlenabgleich,
- Detailbearbeitungsgrenze auf fremden AVKK-Daten als kompletter manueller Schritt.

### Alexa / Viewer

Manuell vollständig für den negativen UI-Retest bestätigt:

- keine lokalen CRUD-Aktionen,
- keine Managementsicht,
- keine Benutzerverwaltung,
- Abrechnung read-only,
- globale Suche ohne Editor,
- AVKK read-only.

Die serverseitige Schreibgrenze wird zusätzlich automatisiert/RLS-seitig nachgewiesen.

### Noch offene vollständige Rollenläufe

Für die formale F-11-Abzeichnung fehlen noch vollständig dokumentierte Läufe für:

- Systemingenieur (Alex/Sam), einschließlich persönlichem AVKK-Schreibtest und persönlichem Bericht,
- Administrator/App-Entwickler, einschließlich Benutzerverwaltung, Role Preview, Systemstatus, Backup und Prüfberichten,
- Restpunkte Projektmanager,
- Restpunkte Führung/Managementbericht,
- vollständiges Mehrbenutzerszenario Alex vs. Sam einschließlich Fremdschreibversuch und Role Preview.

## 5. Freigabestatus

### MVP

**Funktionaler Stand:** vollständig.  
**Security-/RBAC-Hardening F-18:** abgeschlossen.  
**Formale Rollenabnahme F-11:** noch nicht vollständig.  
**MVP 100 % / BASELINE:** noch nicht vergeben.

Damit gilt derzeit:

> **MVP = GO WITH FINDINGS / FORMAL SIGN-OFF PENDING**

Die offenen manuellen F-11-Punkte sind keine neu entdeckten technischen Sicherheitslücken. Sie sind fehlende fachliche Abnahmeevidenz.

## 6. Bekannte Post-MVP-/BSF-Punkte

Die bestehenden bekannten Findings und Grenzen bleiben erhalten und dürfen beim MVP-Abschluss nicht entfernt oder als umgesetzt dargestellt werden, darunter insbesondere:

- F-02 Wartbarkeit/Modulgröße,
- F-03 bestehende Lint-Warnungen,
- F-04 Schichtentrennung Azure-UI,
- F-05 Excel Post-MVP,
- F-06 E2E nur Smoke,
- F-07 Logger-Claims-Hardening,
- F-08 manueller AVKK-Cloud-Restore,
- F-09 separater Leistungsnachweis-PDF-Pfad,
- F-10 Kontextindikatoren nicht produktiv erhoben,
- F-13 AVKK-Lesetrennung als offene Produktentscheidung,
- F-14 Local-First-Grenze,
- F-15 Betreiberhoheit/Plattformzugang als BSF-Thema,
- F-17 kein technisch erzwungener Passwortwechsel.

Die BSF-Kundenabrechnungssicht ist in `docs/BSF-KUNDENABRECHNUNG.md` verbindlich geplant und bleibt außerhalb des MVP.

## 7. Nächster verbindlicher Ablauf

1. Fehlende F-11-Rollenläufe manuell vollständig durchführen und dokumentieren.
2. `docs/ROLE-ACCEPTANCE-09C.md` vollständig auf `erfüllt` setzen, sofern alle Prüfschritte bestanden sind.
3. `docs/MVP-ACCEPTANCE-REPORT.md`, `docs/PROJECT-STATUS.yaml` und `SYSING-001` auf den endgültigen MVP-Stand synchronisieren.
4. Frischen finalen Gate-Lauf ausführen: Tests, Typecheck, Lint, Format, Build, Docs, Project Status, RBAC, Security und weitere reguläre Release-Gates.
5. Nur bei grünem Abschlusslauf `MVP = 100 % / BASELINE` setzen und den endgültigen Baseline-Commit dokumentieren.
6. Danach BSF als aktiven Meilenstein starten.

## 8. Abschlussentscheidung dieses Schritts

- F-18: **CLOSED / PASS**
- F-11: **MANUAL VERIFICATION REQUIRED — PARTIAL EVIDENCE AVAILABLE**
- MVP: **NOT YET BASELINED**
- BSF: **PLANNED / NOT ACTIVE**
