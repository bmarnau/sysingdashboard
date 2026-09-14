# Sysing Dashboard — Lovable-Promptplan BSF-KIOSK-01

Stand: 2026-09-14
Status: PLANUNG / NICHT AUSGEFUEHRT
Issue: #135
Design: `docs/BSF-KIOSK-01-DESIGN.md`
Implementation Plan: `docs/superpowers/plans/2026-09-14-bsf-kiosk-01-demo-pilot.md`

## 1. Zweck

Lovable wird in BSF-KIOSK-01 bewusst fuer den sichtbaren UI-/Preview-Anteil genutzt. Architektur, Datenvertrag,
Security-Grenzen und Testvertrag werden vorher festgelegt und duerfen durch Lovable nicht neu erfunden
werden.

## 2. Harte Grenzen fuer jeden KIOSK-01-Prompt

Jeder Prompt enthaelt verbindlich:

- zuerst analysieren,
- dann minimal im freigegebenen Scope umsetzen,
- anschliessend testen,
- dokumentieren,
- mit expliziten Abnahmekriterien und Abschlussbericht enden,
- keine DB-/RLS-/Grant-/Function-Aenderung,
- keine neue Rolle oder Permission,
- keine Service Role,
- keine produktiven Secrets,
- keine externe Datenquelle,
- keine direkte Supabase-/Graph-/SharePoint-/Exchange-/PRTG-/MCP-Kopplung in der Kiosk-UI,
- `src/integrations/supabase/client.ts` nicht fuer Kiosk-Zwecke aendern,
- `previewAuthStorage.ts` weder anlegen noch wieder einfuehren,
- vorhandenen Idle-Logout nicht umgehen,
- `src/routeTree.gen.ts` nicht manuell bearbeiten,
- kein Merge und kein Deploy.

## 3. Voraussetzungen vor dem ersten Lovable-Lauf

Lovable startet erst, wenn auf dem Arbeitsbranch vorhanden und getestet sind:

```text
src/lib/kiosk/kiosk-contract.ts
src/lib/kiosk/demo-kiosk-scenarios.ts
src/lib/kiosk/demo-kiosk-provider.ts
src/hooks/useKioskSnapshot.ts
src/routes/_authenticated/kiosk.tsx
```

Damit arbeitet Lovable gegen einen festgelegten Vertrag statt gegen eine freie Aufgabenbeschreibung.

## 4. Prompt K01-L1 — Grossbild-UI implementieren und pruefen

```text
SYSING DASHBOARD — BSF-KIOSK-01 / K01-L1

Arbeite ausschliesslich am Info-Kiosk Demo-Pilot aus Issue #135.

VERBINDLICHE BASIS
- Lies zuerst docs/BSF-KIOSK-01-DESIGN.md.
- Lies danach docs/superpowers/plans/2026-09-14-bsf-kiosk-01-demo-pilot.md.
- Pruefe den aktuellen Git-Branch und den exakten Head.
- Analysiere die bestehenden UI-Komponenten und die aktuelle Dashboard-Designsprache.
- Das Management-Wallboard-Konzept aus PR #124 ist nur visuelle Referenz, keine Runtime- oder Datenquelle.

HARTE ARCHITEKTURGRENZEN
- Die Kiosk-UI konsumiert nur KioskDataProvider/useKioskSnapshot.
- Keine DB-, Migration-, RLS-, Grant- oder Function-Aenderung.
- Keine neue Rolle oder Permission; dashboard.view bleibt die einzige UI-Permission.
- Keine Service Role und keine Secrets.
- Keine externe Datenquelle und kein API-Connector.
- Keine direkte Supabase-, Graph-, SharePoint-, Exchange-, PRTG-, MCP- oder Agentenlogik in Kiosk-Komponenten.
- src/integrations/supabase/client.ts nicht aendern.
- previewAuthStorage.ts nicht anlegen oder wieder einfuehren.
- Idle-Logout nicht deaktivieren und nicht durch Timer/Events kuenstlich aktiv halten.
- src/routeTree.gen.ts nicht manuell editieren.
- Kein Merge. Kein Deploy.

PHASE A — ANALYSE
1. Pruefe KioskView, KioskDomainCard, Route /kiosk und vorhandene UI-Primitives.
2. Pruefe, ob die sechs Domaenen klar und auf 1920x1080 schnell erfassbar sind.
3. Pruefe default, empty, unknown und error.
4. Pruefe, ob DEMO-DATEN — KEINE LIVE-DATEN dauerhaft sichtbar ist.
5. Melde jede notwendige Architektur- oder Security-Aenderung als BLOCKED, statt sie selbst einzufuehren.

PHASE B — UMSETZUNG
Nur wenn Phase A keinen Architekturblocker zeigt:
1. Verbessere ausschliesslich die Kiosk-Praesentationskomponenten.
2. Ziel: klarer Grossbildaufbau mit Header, 3x2-Domaenenraster und Statusfuss.
3. Verwende bestehende Design-Tokens und bestehende UI-Bausteine.
4. Keine zweite Designbibliothek.
5. Farbe nie als einzige Statusinformation; immer Text/Icon plus Accessible Name.
6. Keine schreibenden Buttons oder Dialoge.
7. Der Dashboard-Rueckweg darf sichtbar bleiben, soll den Wallboard-Fokus aber nicht dominieren.

PHASE C — TEST
Fuehre mindestens aus:
- gezielte Kiosk-Component-Tests,
- Accessibility-Test,
- Kiosk-E2E fuer default/empty/unknown/error,
- TypeScript,
- ESLint,
- Prettier-Check fuer geaenderte Dateien.

Pruefe Preview mindestens in:
- 1920x1080,
- 1366x768.

PHASE D — DOKUMENTATION
Dokumentiere nur tatsaechliche UI-/Preview-Aenderungen. Keine Statusdatei auf DONE setzen, solange die komplette Repository-CI noch nicht belegt ist.

ABNAHMEKRITERIEN
- sechs Domaenen sichtbar,
- Demo-Hinweis permanent sichtbar,
- default/empty/unknown/error eindeutig unterscheidbar,
- kein horizontaler Kernlayout-Overflow bei 1920x1080 und 1366x768,
- keine DB/Auth/RBAC/Provider-Drift,
- targeted Tests PASS.

ABSCHLUSSBERICHT
Liefere zwingend:
- ANALYSEERGEBNIS
- DATEIEN_GEAENDERT
- FACHLOGIK_GEAENDERT JA/NEIN
- DB_RLS_AUTH_GEAENDERT JA/NEIN
- CLIENT_TS_GEAENDERT JA/NEIN
- PREVIEW_AUTH_STORAGE_VORHANDEN JA/NEIN
- TESTS mit exakten Ergebnissen
- PREVIEW 1920x1080 / 1366x768
- OFFENE_PUNKTE
- COMMIT
- MERGE = NEIN
- DEPLOY = NEIN
```

## 5. Prompt K01-L2 — kontrollierter Preview-/Accessibility-Finalpass

Diesen Prompt nur verwenden, wenn K01-L1 fachlich sauber war und ein weiterer sichtbarer Feinschliff wirklich
noetig ist.

```text
SYSING DASHBOARD — BSF-KIOSK-01 / K01-L2 FINAL UI PASS

ZIEL
Fuehre einen eng begrenzten finalen UI-/Accessibility-Pass fuer den bereits funktionierenden Demo-Kiosk durch.

ZUERST ANALYSIEREN
- aktuellen Branch/Head pruefen,
- git diff pruefen,
- alle bisherigen Kiosk-Tests lesen,
- keine neue Funktion erfinden.

ERLAUBT
- Abstaende, Typografie, Kartenhoehen, responsive Grid-Regeln,
- lesbare Statusdarstellung,
- Fokus-/Kontrast-/ARIA-Korrekturen,
- sichtbarer Demo-/Datenstand-Hinweis,
- reine Kiosk-Komponenten.

VERBOTEN
- Datenvertrag aendern,
- Providerlogik aendern,
- Refresh-Logik aendern,
- Auth/Idle/RBAC aendern,
- DB/RLS/Migrationen,
- neue Abhaengigkeiten ohne zwingenden Grund,
- client.ts,
- previewAuthStorage.ts,
- externe Provider,
- Merge/Deploy.

TESTEN
- Kiosk Component Tests,
- A11y,
- Kiosk E2E,
- TypeScript,
- ESLint,
- Prettier.

MANUELLE PREVIEW
- 1920x1080 default,
- 1920x1080 unknown,
- 1366x768 default,
- error state.

DOKUMENTIEREN
Nur reale Aenderungen dokumentieren. DONE erst nach spaeterer vollstaendiger GitHub-CI.

ABSCHLUSSBERICHT
- HEAD
- DATEIEN_GEAENDERT
- UI-AENDERUNGEN
- ARCHITEKTURDRIFT = JA/NEIN
- DB_RLS_AUTH_GEAENDERT = JA/NEIN
- TESTS
- PREVIEW
- OFFENE_PUNKTE
- COMMIT
- MERGE = NEIN
- DEPLOY = NEIN
```

## 6. Prompt K01-L3 — Abschluss-/Driftpruefung, keine freie Entwicklung

K01-L3 ist nur fuer den letzten Check vorgesehen. Er soll keine neue Funktion implementieren.

```text
SYSING DASHBOARD — BSF-KIOSK-01 / K01-L3 ABSCHLUSSPRUEFUNG

Arbeite read-only, ausser eine eindeutig reproduzierte KIOSK-01-Regression erfordert einen minimalen Fix.

1. Pruefe exakten Head und git diff.
2. Pruefe, dass nur KIOSK-01-Scope enthalten ist.
3. Pruefe insbesondere:
   - keine Migration,
   - keine DB/RLS/Grant/Function-Aenderung,
   - keine neue Permission/Rolle,
   - kein client.ts-Kiosk-Hack,
   - kein previewAuthStorage.ts,
   - kein externer Connector,
   - Idle-Logout unveraendert.
4. Pruefe default/empty/unknown/error.
5. Pruefe Demo-Hinweis und Datenstand.
6. Fuehre targeted Tests erneut aus.
7. Fuehre keine kosmetische Aenderung ohne reproduzierten Befund aus.
8. Dokumentiere Befunde und liefere Abschlussbericht.
9. Kein Merge. Kein Deploy.

ABSCHLUSSBERICHT
- HEAD
- SCOPE_PASS JA/NEIN
- DRIFT_FINDINGS
- TESTS
- PREVIEW
- DATEIEN_GEAENDERT
- COMMIT
- READY_FOR_FULL_CI JA/NEIN
- MERGE = NEIN
- DEPLOY = NEIN
```

## 7. Credit-Regel

K01-L1 hat den hoechsten Nutzen. K01-L2 wird nur bei sichtbarem Restbedarf verwendet. K01-L3 ist ein kurzer
Drift-/Preview-Check und kein Vorwand, Credits zu verbrauchen.

Wenn K01-L1 bereits alle visuellen und Accessibility-Kriterien erfuellt, wird K01-L2 uebersprungen.

## 8. Abbruchregeln

Lovable stoppt und meldet BLOCKED statt eigenmaechtig zu erweitern, wenn fuer das Ziel scheinbar noetig waere:

- eine Auth-Ausnahme,
- eine neue Permission,
- eine Datenbankmigration,
- eine produktive Datenquelle,
- ein Service-Account,
- eine externe Abhaengigkeit,
- eine Aenderung des KioskDataProvider-Vertrags,
- eine Umgehung des Idle-Logout.
