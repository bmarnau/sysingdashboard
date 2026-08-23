# F-11 Runtime-/Administrator-Abnahme — 2026-08-23

## Zweck

Dieses Dokument ist das fortlaufende, git-gesicherte Arbeitsprotokoll für die verbleibende F-11-Runtime- und Administrator-Abnahme. Es verhindert, dass Prüfschritte nur in einer lokalen oder temporären Umgebung verbleiben.

Verbindliche Regel für diesen Lauf: Ein Prüfschritt gilt erst dann als dauerhaft gesichert, wenn sein Ergebnis in diesem Branch dokumentiert und nachfolgend per Pull Request nachvollziehbar ist. Nicht visuell oder fachlich geprüfte Punkte werden nicht als PASS gewertet.

## Ausgangsbasis

- GitHub-Repository: `bmarnau/sysingdashboard`
- Baseline `main`: `b86cc96bd6b64f81c42084c5e5dca929f3f22e34`
- Baseline enthält Merge von PR #38 `Docs/F-11: laufaktuellen technischen Prüfbericht nachweisen`.
- F-11 bleibt formal `MANUAL VERIFICATION REQUIRED`.
- Technischer Prüfbericht ist nach PR #37 als laufaktueller, reproduzierbarer CI-Nachweis PASS.

## Schritt 1 — GitHub → Lovable Synchronisation

Status: **TECHNISCH PASS**

Nachgewiesen am 2026-08-23:

- Lovable-Projekt `sysingdashboard` / `IT Task Hub` ist veröffentlicht unter `https://sysingdashboard.lovable.app`.
- Lovable-Projektstatus: `completed`.
- Die Lovable-Edit-Historie weist den GitHub-Merge-Commit `b86cc96bd6b64f81c42084c5e5dca929f3f22e34` als `completed` aus.
- Damit ist die aktuelle GitHub-Baseline in Lovable angekommen; es besteht für diesen Prüfschritt kein nur lokaler Zwischenstand.

Abgrenzung: Dieser Nachweis bestätigt Synchronisation und Projektstatus, nicht die visuelle Browserabnahme einzelner Oberflächen.

## Schritt 2 — Backend-Grundstatus

Status: **TECHNISCH PASS**

Nachgewiesen am 2026-08-23 über die verbundene Lovable-Projektinstanz:

- Datenbank-Backend ist aktiviert.
- Backend-Stack: `supabase`.

Abgrenzung: Dieser Nachweis bestätigt den Plattform-/Backend-Grundstatus. Er ersetzt nicht den visuellen F-11-Systemstatus-Retest und keine RBAC-/RLS-Einzelprüfung.

## Schritt 3 — UI-Pfade und Testgrenze aus aktuellem `main`

Status: **TECHNISCH PASS — Prüfanweisung verifiziert**

Aus `src/components/dashboard/header/ServiceMenu.tsx` auf der Baseline wurden die aktuellen Bedienpfade verifiziert. Ausgangspunkt ist jeweils der Dashboard-Button `Einstellungen und Services`.

- Benutzerverwaltung: `Einstellungen und Services` → `Benutzer & Profile…`
- Downloadbereich: `Einstellungen und Services` → `Downloads…`
- Backup: `Einstellungen und Services` → `Backup…`; Anzeige ist an `backup.restore` gebunden.
- Log Viewer: `Einstellungen und Services` → `Log Viewer…`
- Systemstatus: `Einstellungen und Services` → `Systemstatus…`; Anzeige ist an `systemstatus.view` gebunden.
- Backend-/Auth-Administration: `Einstellungen und Services` → `Backend & Auth-Konten…`; Anzeige ist an `users.manage` gebunden.

Der aktuelle Systemstatus-Dialog weist ausdrücklich darauf hin, dass nur sichere Status- und Metadaten und keine Secrets oder Verbindungswerte dargestellt werden. Für die visuelle Abnahme sind insbesondere folgende Bereiche relevant:

- Application: Version, Build-Datum, Runtime-Modus,
- GitHub: kanonische Repository-URL, Branch und optional Commit; fehlt der Hosting-Commit, ist `vom Hosting nicht bereitgestellt` der erwartete neutrale Zustand,
- Lovable: Publish-URL und Deployment-Status,
- Security/Auth: Authentication mode, Auth-Konfiguration, RBAC-Status und geschützter Backendstatus.

Die Playwright-Spezifikation `e2e/specs/service-menu.spec.ts` bestätigt für `systemadministrator`, dass Log Viewer, Systemstatus und Backup im Servicemenü sichtbar sind. Die Spezifikation grenzt sich aber selbst ausdrücklich als Smoke-Prüfung ab: Das Öffnen eines Dialogs ist kein Funktionstest. Die verbleibenden manuellen F-11-Prüfungen werden deshalb nicht durch diesen automatischen Nachweis ersetzt.

## Noch offene F-11-Restschritte

1. Visueller Runtime-Sichttest des Systemstatus nach PR #30/#33.
2. Visueller Namens-Retest in der Benutzerverwaltung nach PR #31.
3. Backup als visueller Administrator-Bedienpfad.
4. Downloadbereich als visueller Administrator-Bedienpfad.
5. Log Viewer als visueller Administrator-Bedienpfad.
6. Abschließende Administrator-Sichtprüfung.
7. Fachliche Entscheidung zu `Role Preview` und anschließende Dokumentationsbereinigung oder gezielte Folgeumsetzung.

## Role Preview — aktueller technischer Befund

Noch kein fachlicher Abschluss.

Die Repository-Suche auf aktuellem `main` zeigt keinen aktuellen Produktcode-Einstieg für `Role Preview`. Treffer liegen in Abnahme-/Statusdokumentation und historischen Planungsartefakten. Deshalb wird der Punkt bis zur fachlichen Entscheidung weiterhin als Produkt-/Dokumentationsdrift geführt und nicht künstlich als PASS bewertet.

## Abschlussstatus dieses Checkpoints

- GitHub-Baseline verifiziert: PASS
- Lovable-Synchronisation verifiziert: PASS
- Supabase-Backend-Grundstatus verifiziert: PASS
- aktuelle UI-Prüfpfade verifiziert: PASS
- automatische Smoke-Testgrenze dokumentiert: PASS
- visuelle Administrator-Restabnahme: OFFEN
- Role Preview: OFFEN
- F-11 gesamt: `MANUAL VERIFICATION REQUIRED`
