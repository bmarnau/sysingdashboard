## Ziel

Managementübersicht als eigenständiges, für Entscheider verständliches Dokument bereitstellen, Doku-Version/lastUpdated sichtbar machen und Handbuch-Check (Check 9) abschließen.

## Ist-Stand (nach Prüfung)

- `SystemStatusDialog` zeigt bereits `DOCUMENTATION_VERSION` und `Last documentation update`, listet aber „Management overview: not configured".
- Handbuch (`src/lib/help-documentation.ts`) enthält bereits alle geforderten Kapitel: Azure-Servicebereich, Offline-Betrieb, Import/Export, Konflikthandling, RBAC, ENV-Validierung, Systemstatus, Sicherheitsprinzipien, Azure-Ausfall.
- Keine Management-Übersicht vorhanden (`docs/` enthält nur CONTRIBUTING.md, GITHUB.md).
- Keine Secrets in bestehender Doku (Stichprobenprüfung ok).

## Änderungen

### 1. Neu: `docs/MANAGEMENT_OVERVIEW.md`
Kompakte, nicht-technische Darstellung mit folgender Gliederung (kurze Absätze, keine Codeschnipsel, keine Secrets):
1. Zielbild — Lokales Dashboard, optionale Azure-Anbindung
2. Sicherheitsarchitektur (Least Privilege, keine Klartext-Secrets, RBAC, Security-Scan in CI)
3. ENV-Validierung — Fail-Fast in Produktion
4. Kein Production-Start ohne notwendige ENV-Variablen
5. DEV-Betrieb ohne Azure-ENV (blockierter Azure-Zugriff)
6. Kein automatischer Sync — nur manuelle Auslösung
7. Lokaler Betrieb bleibt führend — Azure ist Spiegel
8. Rollenmodell (7 Rollen, RBAC-Matrix, kein Admin-Lockout)
9. Export-/Import-Prozess (JSON-Schema, Vorschau, Backup vor Import)
10. Konflikthandling (Dublettenprüfung, Snapshot, Rollback)
11. Systemstatus (Sektionen: Application, GitHub, Lovable, Azure, Security, Data, Documentation)
12. Roadmap Entra ID (geplante Auth-Integration)
13. Roadmap Key Vault (secretManager → keyVault Fassade)
14. Risiken und Gegenmaßnahmen (Tabelle: Risiko → Maßnahme)

Kopf enthält `Stand: YYYY-MM-DD` und `Dashboard-Version: x.y.z`.

### 2. `src/lib/help-documentation.ts`
- Neues `HelpTopic` `management-overview` (Kategorie „Betrieb"), Kurzfassung + Verweis auf `docs/MANAGEMENT_OVERVIEW.md` (relative Pfad-Erwähnung, kein Link-Rendering nötig). Rolle: alle Lese-Rollen.
- `DOCUMENTATION_VERSION` auf `1.5.0` anheben (größerer Doku-Zuwachs).
- `lastUpdated` neuer/geänderter Kapitel auf heutiges Datum.

### 3. `src/components/SystemStatusDialog.tsx`
- Zeile 367: „Management overview" → `available — docs/MANAGEMENT_OVERVIEW.md` mit `ok`.

### 4. `CHANGELOG.md`
- Neuer Eintrag `## 1.18.3 - 2026-07-01` mit Bullets:
  - Managementübersicht `docs/MANAGEMENT_OVERVIEW.md` ergänzt (14 Sektionen, für Entscheider).
  - Handbuch-Kapitel „Managementübersicht" verlinkt.
  - Systemstatus zeigt Managementübersicht als vorhanden an.
  - Doku-Version 1.5.0.

### 5. Verifikation
- `bun run docs:check` (Konsistenz Version/CHANGELOG/Doku).
- Sichtprüfung SystemStatusDialog + Handbuch-Dropdown.
- Grep auf verbotene Secret-Muster in `docs/MANAGEMENT_OVERVIEW.md`.

## Nicht enthalten
- Keine funktionalen Code-Änderungen an Azure/RBAC/Import-Export.
- Kein Übersetzen ins Englische (Management-Doku bleibt Deutsch, konsistent zum Handbuch).

## Kritisches Feedback / Alternative
Alternativ könnte die Managementübersicht komplett als HelpTopic im UI leben (kein separates `.md`). Empfehlung: **beides** — MD-Datei als versionierbare Single Source of Truth (für Repo-Review durch Entscheider ohne App-Start), HelpTopic als Kurzfassung im Handbuch. So bleibt der Systemstatus-Check trivial (Datei existiert) und Entscheider haben einen Renderpfad ohne Dashboard.
