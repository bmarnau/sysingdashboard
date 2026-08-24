# F-11 / MVP — Abschlusskonsolidierung 2026-08-24

Status: **F-11 CLOSED / PASS · MVP 100 % / BASELINE READY — WIRKSAM MIT MERGE VON PR #60**

## 1. Zweck

Dieses Dokument konsolidiert die seit dem ursprünglichen Sprint-09C-Abnahmebericht entstandene technische und manuelle Evidenz. Es trennt den fachlich abgeschlossenen Befund F-11 vom formalen Baseline-Aktivierungsschritt des Gesamt-MVP.

Die historischen Abnahme- und Planungsdokumente werden nicht rückwirkend umgeschrieben. Für den aktuellen Status gilt `docs/CURRENT-STATUS.md` als Einstiegspunkt.

## 2. Technische Referenz

Ausgangspunkt dieser Konsolidierung ist GitHub `main` nach Merge von PR #39:

- Merge-Commit: `4276f16afc748952f91223a7bed90d8527927d3f`
- PR #39: F-11 Runtime- und Administrator-Restabnahme
- CI #398 / Run `32743583294`: **PASS**
- Security #389: **PASS**
- Static inklusive Prettier, ESLint, TypeScript, RBAC, Docs und Projektmanifest: PASS
- Unit & Components: PASS
- Backend: PASS
- API inklusive Discovery/Smoke/Functional: PASS
- RBAC & Security: PASS
- Import/Export: PASS
- Backup/Restore: PASS
- Production Build: PASS
- Playwright E2E: PASS
- Accessibility: PASS
- Technical Debt: PASS
- laufaktueller Technical Report: PASS
- Quality Gate: PASS

Der aktuelle `main` enthält außerdem das zuvor vollständig abgenommene CSRF-Hardening der TanStack Server Functions aus PR #58.

Der vollständige Konsolidierungsstand dieses PRs wurde zusätzlich geprüft:

- CI #403 / Run `32745266068`: **PASS**
- Security #394: **PASS**
- Prettier, ESLint, TypeScript, RBAC, Docs und Projektmanifest: PASS
- Unit & Components, Backend, API, RBAC & Security, Import/Export, Backup/Restore: PASS
- Production Build, Playwright E2E, Accessibility und Technical Debt: PASS
- Technical Report: PASS
- Quality Gate: PASS

## 3. F-11 — konsolidierte Abnahme

| Bereich               | Ergebnis | Nachweis                                                                                                       |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| Systemingenieur       | PASS     | reale Rollensicht, eigener AVKK-Scope, Schreib-/Persistenztest, Managementsicht gesperrt, persönlicher Bericht |
| Projektmanager        | PASS     | Projektsicht, Drill-down, Bericht, Delegation, Benutzerverwaltung gesperrt                                     |
| Teamleitung           | PASS     | Management-Cockpit, Managementbericht, Delegation, keine Personenrangliste                                     |
| Viewer / Negativrolle | PASS     | keine Fachobjekt-/AVKK-Schreibaktionen, keine Management-/Benutzerverwaltung, serverseitige Schreibgrenze      |
| Mehrbenutzerszenario  | PASS     | Alex/Sam-Scope, Fremdschreibversuch abgewiesen, Projekt-/Teamleitungsfälle geprüft                             |
| Administrator         | PASS     | Benutzerverwaltung, Backup, Downloads, Log Viewer, Systemstatus, finale Servicemenü-Gesamtsicht                |
| Role Preview          | N/A      | kein aktueller Produktbestandteil; fachlich entschieden, keine Impersonation eingeführt                        |

## 4. Administrator-Restabnahme

Die mit PR #39 nach `main` übernommene Evidenz bestätigt:

- Benutzerverwaltung/Namensdarstellung: **VISUELL PASS**
- Backup: **RUNTIME PASS**
- Downloads: **VISUELL PASS**
- Log Viewer: **VISUELL PASS**
- finale Administrator-Gesamtsicht: **VISUELL PASS**
- Systemstatus: **RUNTIME PASS**

Issue #40 zum Backup-Fix ist abgeschlossen. Issue #42 zum Systemstatus-Hardening ist als `completed` geschlossen.

## 5. Systemstatus SYSSTAT-01 bis SYSSTAT-04

Produktiver Betreiber-Re-Test am 2026-08-24:

| Finding    | Erwartung                                                                    | Ergebnis |
| ---------- | ---------------------------------------------------------------------------- | -------- |
| SYSSTAT-01 | fehlende Lovable-Hostingmetadaten neutral statt irreführend rot              | PASS     |
| SYSSTAT-02 | keine Lovable Project ID in normaler Betriebsübersicht                       | PASS     |
| SYSSTAT-03 | Supabase aktive Plattform; optionale Azure-ENV kein globaler Security-Fehler | PASS     |
| SYSSTAT-04 | Azure optional/readiness Count-basiert und neutral                           | PASS     |

Sichtbar waren unter anderem:

- Runtime mode `production`,
- Supabase als MVP-Datenplattform,
- geschützte Backend-Verbindung erreichbar,
- `Runtime ENV (aktive Plattform): configured — 0 missing`,
- Azure als `optional target — 5 not configured`,
- Lovable Deploymentstatus bei fehlender Hostingmetadatenquelle `vom Hosting nicht bereitgestellt`,
- keine Project ID,
- keine Secrets, Tokens, Passwörter oder Verbindungswerte.

## 6. Role Preview — Abschlussentscheidung

Der aktuelle Produktcode enthält keinen Role-Preview-/Impersonation-Pfad. Die realen Rollen-, Negativ-, RBAC- und RLS-Nachweise benötigen keine UI-Simulation.

Daher gilt für den aktuellen MVP:

**Role Preview = N/A — kein Produktbestandteil.**

Diese Bewertung ist kein PASS einer nicht vorhandenen Funktion. Sie ist die fachliche Entscheidung, einen historischen Prüfschritt aus dem aktuellen Produktumfang zu entfernen. Eine spätere sichere Rollen-Vorschau wäre ein eigenständiges Post-MVP-Feature und müsste Darstellung, Identität und Berechtigung strikt trennen.

## 7. Bewusste MVP-Grenzen bleiben erhalten

Der Abschluss von F-11 hebt dokumentierte Architektur- und Produktgrenzen nicht auf. Insbesondere bleiben als bekannte Post-MVP-/BSF-Themen erhalten:

- Modulgröße/Wartbarkeit,
- bestehende Lint-/Technical-Debt-Findings,
- weitere Provider-/Schichtentrennung für Azure,
- Excel als Post-MVP-Ausgabe,
- E2E-Abdeckung über den aktuellen Smoke-/Regressionsumfang hinaus,
- AVKK-Lesetrennung als Produktentscheidung,
- Local-First-Grenzen bei Projekten, Arbeitspaketen und Tätigkeiten,
- Betreiber-/Plattformportabilität und spätere Azure-/Entra-Erweiterung,
- kein technisch erzwungener Passwortwechsel nach administrativer Setzung.

Diese Punkte sind keine offenen F-11-Abnahmehandlungen.

## 8. Abschlussentscheidung F-11

**F-11 ist fachlich, manuell und technisch abgeschlossen.**

Es verbleibt kein manueller F-11-Resttest. Die vorherigen OPEN-/PARTIAL-Aussagen in älteren Sprint-/RC-Dokumenten sind historische Zwischenstände und werden durch die datierten Abschlussnachweise fortgeschrieben.

## 9. MVP-Baseline-Aktivierung

Der Konsolidierungsstand ist mit CI #403 und Security #394 vollständig grün geprüft. Deshalb ist der MVP **100 % / BASELINE READY**.

Diese reine Statusfortschreibung enthält keine Produkt-, Auth-, RBAC-, RLS- oder Datenbankänderung und wird selbst noch einmal durch den finalen Head-Gate-Lauf geprüft.

Für den Abschluss gilt:

- F-11: **CLOSED / PASS**
- Produktiver MVP: **funktional und fachlich abgenommen**
- formale MVP-Baseline: **100 % / BASELINE READY**
- Wirksamkeit: **mit Merge des final vollständig grünen Heads von PR #60 nach `main`**

Der resultierende `main`-Commit wird anschließend als verbindliche MVP-Baseline eindeutig referenziert, ohne danach den Baseline-Code erneut zu verändern.
