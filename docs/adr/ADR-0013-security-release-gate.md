# ADR-0013 — Security-Release-Gate mit Findings-Report

- **Status**: Accepted
- **Datum**: 2026-07-13
- **Kontext**: v1.33.0 (Prompt 2A.5)

## Kontext

Prompt 2A.5 fordert eine Sicherheits-, RBAC- und Auth-Test-Suite. Die App hat
zum Zeitpunkt dieses ADRs weder einen produktiven Auth-Layer noch eine
serverseitige RBAC-Middleware. Viele im Prompt geforderte Prüfungen
(abgelaufene Session, manipulierte Claims, falscher Tenant, unpassende
Gruppen) sind daher strukturell nicht testbar — es gibt keinen Testling.

Zwei Auswege sind möglich:

1. Diese Prüfungen als „grüne" Platzhalter-Tests bauen, die faktisch nichts
   prüfen.
2. Die Lücken als **Findings** kodieren, sie mit Severity und
   Release-Wirkung verbinden und in einem Bericht sichtbar halten.

## Entscheidung

Wir wählen Weg (2). Die Suite kombiniert:

- Deterministische Vitest-Tests für tatsächlich vorhandene Logik
  (RBAC v1/v2, Scope, Assignments, Logger-Redaction, Manipulation über
  Zod-Imports und PermissionGate-Rendering).
- **Statische Findings** in `scripts/security/static-findings.json` mit
  fester Struktur (ID, Severity, Location, Reproduktion, Empfehlung,
  `blocksReleasePhase`, `accepted`).
- **Release-Regeln** in `scripts/security/release-rules.mjs`:
  CRITICAL blockt jedes Release, HIGH blockt Auth-/Azure-Produktivierung,
  MEDIUM benötigt dokumentierte Akzeptanz, LOW ist informativ.
- **Bericht** `test-report/security-report.{md,json}`, in CI als Artefakt.
- CI-Step `security:gate` liest die JSON-Fassung und failed bei offenen
  Blockern.

## Konsequenzen

- **Positiv**: Die tatsächliche Lage (kein Auth, kein Server-RBAC, kein
  Claims-Whitelist) wird nicht durch grüne Tests verschleiert. Auth- und
  Azure-Produktivierung sind an ein sichtbares Gate gekoppelt.
- **Positiv**: Neue Findings können ohne Code-Änderung eingepflegt werden;
  sobald Auth existiert, wandern die Kategorien schrittweise aus dem
  statischen Set in reale Vitest-/E2E-Tests.
- **Negativ**: Ein grün laufender Vitest-Job impliziert nicht „sicher".
  Handbuch und Report weisen die Grenzen explizit aus (keine
  Zertifizierungsbehauptung).
- **Trade-off**: Wir verzichten in dieser Iteration bewusst auf Fuzzing,
  echte Session-Manipulation und Provider-spezifische OIDC-Prüfungen —
  Nicht-Ziele sind explizit im Plan festgehalten.

## Alternativen

- **Playwright-only Security-Suite**: verwirft die Möglichkeit, die
  Import-/Assignment-Logik deterministisch mit Vitest zu prüfen.
- **Feste Skip-Tests mit Grund**: liefert weniger Signal als ein
  strukturierter Findings-Report; Skip-Gründe wären in CI schwer
  auszuwerten.
- **Externe Scanner (Gitleaks etc.)** decken andere Klassen ab und sind
  bereits als eigener CI-Step (v1.17.4) im Einsatz — Ergänzung, kein
  Ersatz.
