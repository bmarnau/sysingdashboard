# Sysing Dashboard

Das Sysing Dashboard ist ein Arbeits-, Reporting- und Management-Dashboard für
IT-Systemhäuser. Es verbindet persönliche Arbeitsorganisation, Projekte,
Arbeitspakete, Zeiten, Kundenverantwortung, AVKK und revisionsgebundene
Leistungsnachweise in einer rollen- und mandantengeschützten Anwendung.

Aktueller Entwicklungskandidat: **SysIng Dashboard 1.69.0**. **BSF-03E** mit
Personen-, Einzelaktions- und operativer Arbeitspaket-Sicht ist nach vollständiger
P5-Gesamtabnahme auf `main` abgeschlossen. Nächster geplanter Fachsprint ist
**BSF-07**; der zuletzt veröffentlichte GitHub-Release bleibt `v1.65.0`.
Aktuell läuft die Golden-Gate-Testphase mit Demodaten; Stand und Plan stehen in
`docs/CURRENT-STATUS.md` und `docs/GOLDEN-GATE-EXECUTION-TRACKER.yaml`.

## Funktionsumfang

- persönliches Dashboard mit Projekten, Arbeitspaketen, Tätigkeiten und Zeiten,
- Supabase-Anmeldung sowie serverseitige RBAC-/RLS-Prüfungen,
- Kunden-, Projektcontrolling- und Leistungsnachweis-Sichten,
- AVKK-Arbeitsplatz und Verantwortungsmanagement für berechtigte Rollen,
- operative AP-Arbeitssicht mit Gruppierung, Sortierung und Filtern,
- Info-Kiosk mit klar getrennten Demo-, internen und nicht verfügbaren Quellen,
- Backup/Restore, JSON-/CSV-/PDF-Export und integriertes Benutzerhandbuch,
- technische Prüfberichte, Security-Gates und dokumentierte Architekturentscheide.

## Architektur und Datenhaltung

GitHub ist die Source of Truth für Code, Dokumentation und versionierte
Supabase-Migrationen. Supabase ist die führende Authentifizierungs- und
Datenplattform des Mehrbenutzer-MVP; Lovable verwaltet die verbundene
Laufzeitumgebung. Fachlogik und Provideradapter bleiben getrennt, damit Docker,
Microsoft Entra ID und weitere Datenprovider später ergänzt werden können.

Einige persönliche bzw. noch nicht zentralisierte Module verwenden weiterhin
benutzerbezogenen Browser-Speicher. `localStorage` ist daher weder die alleinige
Datenquelle der Anwendung noch eine Autorisierungsgrenze. Der vollständige
Datenhaltungsumbau ist als BSF-04 geplant.

## Lokale Entwicklung

Voraussetzungen:

- [Bun](https://bun.sh) (entsprechend `bun.lock`; auch in der CI verwendet),
- Node.js 22 für die ergänzenden Node-Skripte,
- eine lokale `.env` nach dem Muster von `.env.example`, wenn Anmeldung und
  Supabase-gestützte Funktionen ausgeführt werden sollen.

```bash
git clone https://github.com/bmarnau/sysingdashboard.git
cd sysingdashboard
bun install --frozen-lockfile
bun run dev
```

Der Entwicklungsserver ist anschließend standardmäßig unter
`http://localhost:3000` erreichbar. In die Clientvariablen gehören nur
Publishable-/Anon-Werte; Service-Role-Keys dürfen niemals als `VITE_*` gesetzt
oder committed werden.

## Wichtige Prüfungen

| Befehl                         | Zweck                                      |
| ------------------------------ | ------------------------------------------ |
| `bun run test`                 | Vitest-Regressionen                        |
| `bun run typecheck`            | TypeScript-Prüfung                         |
| `bun run lint`                 | ESLint                                     |
| `bun run docs:check`           | Handbuch-/Changelog-Synchronität           |
| `bun run project-status:check` | Projektmanifest gegen Schema und Changelog |
| `bun run security:check`       | statischer Security-Report                 |
| `bun run build`                | Production-Build                           |

Die vollständige GitHub-CI ergänzt unter anderem Datenbank-Rebuild und
Schema-Drift, API-, Security-, Import-/Export-, Backup-, E2E-, Accessibility-,
Technical-Debt- und Quality-Gates.

## Projektstruktur

```text
src/
  components/            UI und Fachkomponenten
  hooks/                 sessiongebundene React-Hooks
  lib/                   providerneutrale Fachlogik und Services
  routes/                TanStack-Start-Routen und Server-Endpunkte
supabase/
  migrations/            kanonische Datenbankmigrationen
  tests/                 SQL-Vertrags- und RLS-Regressionen
e2e/                     Playwright-Abnahmen
docs/                    Status, Architektur, ADRs und Nachweise
scripts/                 Qualitäts-, Doku- und Projektstatus-Gates
```

## Maßgebliche Dokumentation

- [`docs/CURRENT-STATUS.md`](./docs/CURRENT-STATUS.md) — aktueller verbindlicher Stand
- [`docs/BSF-CURRENT-PRIORITIES.md`](./docs/BSF-CURRENT-PRIORITIES.md) — operativer Wiederanlaufpunkt
- [`docs/PROJECT-STATUS.yaml`](./docs/PROJECT-STATUS.yaml) — maschinenprüfbares Projektmanifest
- [`docs/SPRINT-PLAN-MVP-BSF.md`](./docs/SPRINT-PLAN-MVP-BSF.md) — Sprintfolge und Gates
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Ist-/Zielarchitektur
- [`docs/DATABASE-CHANGE-GOVERNANCE.md`](./docs/DATABASE-CHANGE-GOVERNANCE.md) — kontrollierter Datenbankpfad
- [`docs/ADR/`](./docs/ADR/) — Architekturentscheidungen
- [`docs/ENTWICKLUNGSTAGEBUCH.md`](./docs/ENTWICKLUNGSTAGEBUCH.md) — Projektchronik
- [`CHANGELOG.md`](./CHANGELOG.md) — Dashboard-Version und Änderungshistorie

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](./LICENSE).
