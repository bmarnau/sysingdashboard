# Sysing Dashboard — Lovable-Promptplan BSF-KIOSK-02

Stand: 2026-09-19
Status: K02-L1 VORBEREITET / AUSFÜHRUNG DURCH FEHLENDE LOVABLE-CREDITS BLOCKIERT
Issue: #136
Design: `docs/BSF-KIOSK-02-DESIGN.md`
Implementation Plan: `docs/superpowers/plans/2026-09-14-bsf-kiosk-02-internal-read.md`

## 1. Einsatzregel

KIOSK-02 benötigt Lovable nur für einen gezielten Hybrid-/Großbild-Preview-Pass. Datenvertrag, Server Function, Provider und Security-Scope müssen vorher repository-seitig implementiert und getestet sein.

## 2. Prompt K02-L1 — Hybrid-Preview

```text
SYSING DASHBOARD — BSF-KIOSK-02 / K02-L1 HYBRID PREVIEW

VERBINDLICHE BASIS
- Lies docs/BSF-KIOSK-02-DESIGN.md.
- Lies den Implementation Plan.
- Prüfe Branch, Head und git diff.
- Analysiere zuerst den vorhandenen KIOSK-01-Look und den neuen Hybridmodus.

HARTE GRENZEN
- Keine DB-/Migration-/RLS-/Grant-/Function-Änderung.
- Keine neue Permission.
- Keine Auth-/Idle-Logout-Änderung im Lovable-Pass; der repository-seitig implementierte Vertrag muss bereits gelten: technische `kiosk`-Session nur Demo mit `kiosk.view`, normale Leitungs-Session für `mode=internal` mit serverseitigem `project.controlling.view`.
- Keine direkte Supabase-Logik in Kiosk-Komponenten.
- Keine zweite Aggregationslogik.
- Keine Demo-Werte als Ersatz für ausgefallene interne Quellen.
- Keine Personennamen/Engineer-IDs/Eurobeträge.
- Kein client.ts-Hack.
- Kein previewAuthStorage.ts.
- Kein Merge. Kein Deploy.

ANALYSE
Prüfe mindestens:
- mode=demo bleibt visuell korrekt,
- mode=internal/hybrid ist klar gekennzeichnet,
- Projekte/AP/Tätigkeiten tragen INTERN,
- Verfügbarkeit/Infrastruktur/Support tragen DEMO,
- unavailable ist sichtbar von demo und internal unterscheidbar,
- Datenstand und Zeitraum sind lesbar,
- 1920x1080 und 1366x768 funktionieren,
- kein Overflow/Clipping im Kernlayout.

UMSETZUNG
Nur reine UI-/Accessibility-Verbesserungen an vorhandenen Kiosk-Komponenten.

TEST
- Kiosk Component Tests,
- Kiosk A11y,
- Kiosk Demo E2E,
- Kiosk Internal E2E,
- Kiosk Security E2E,
- TypeScript,
- ESLint,
- Prettier.

ABNAHMEKRITERIEN
- Quelle jeder Domäne aus Distanz verständlich,
- Hybridhinweis dauerhaft sichtbar,
- unavailable nie als demo oder live fehlinterpretiert,
- Demo-Regression bleibt grün,
- keine Architektur-/Securitydrift.

ABSCHLUSSBERICHT
- HEAD
- ANALYSEERGEBNIS
- DATEIEN_GEAENDERT
- DB_RLS_AUTH_GEAENDERT JA/NEIN
- PROVIDERLOGIK_GEAENDERT JA/NEIN
- CLIENT_TS_GEAENDERT JA/NEIN
- PREVIEW_AUTH_STORAGE_VORHANDEN JA/NEIN
- TESTS
- PREVIEW 1920x1080 / 1366x768
- DRIFT_FINDINGS
- COMMIT
- MERGE = NEIN
- DEPLOY = NEIN
```

## 3. Abbruchregeln

Lovable meldet BLOCKED statt den Scope zu erweitern, wenn es scheinbar benötigt:

- eine neue DB-Migration,
- eine neue Permission,
- Service Role,
- eine externe Datenquelle,
- eine neue Management-KPI-Semantik,
- eine Auth-/Idle-Sonderbehandlung,
- direkte Supabase-Abfragen in Kiosk-UI,
- personenbezogene Leistungsdaten.

## 4. Credit-Regel

Ein Lovable-Lauf reicht im Normalfall. Weitere UI-Pässe nur bei reproduzierbarem Layout-/Accessibility-Befund.
