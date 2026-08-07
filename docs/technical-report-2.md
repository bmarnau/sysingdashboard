# Technical Report 2.0

Sprint 04 (v1.43.0). Der zentrale Prüfbericht ist ab Schema `2.0.0` verbindliches
Nachweis-, Steuerungs- und Freigabeinstrument.

## Neue Felder im Report

| Feld                                             | Zweck                                                      |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `id`                                             | UUID pro Lauf, kollisionsfrei                              |
| `version`                                        | monoton wachsend aus `history/index.json`                  |
| `parentReportId`                                 | Verweis auf jüngsten Historie-Eintrag                      |
| `integrity.value`                                | SHA-256 über kanonisch serialisierten Auszug               |
| `integrity.fields`                               | Whitelist der einfließenden Felder                         |
| `releaseStage.proposed`                          | automatisch vorgeschlagene Freigabestufe                   |
| `releaseStage.effective`                         | tatsächliche Stufe (nach Override)                         |
| `releaseStage.overridden`                        | Abweichung inkl. Ticket, Aktor, Zeitstempel                |
| `sections`                                       | deklarative Bereiche (auth, rls, docker, azure-readiness…) |
| `diff.securityRegressions`                       | hervorgehobene Sicherheitsregressionen                     |
| `diff.severityChanged/gateChanged/statusChanged` | strukturierter Vergleich                                   |

## Historie

- Snapshot pro Lauf unter `test-report/history/<zeitstempel>-<id>.json` (read-only).
- Index unter `test-report/history/index.json` (append-only).
- Freigegebene Berichte werden zusätzlich unter `history/released/` gespiegelt.
- Löschung nur über `scripts/technical-report/archive.mjs` (folgt bei Bedarf).

## Integrität

Verifikation:

```bash
node scripts/technical-report/verify.mjs test-report/technical-test-report.json
```

Der Hash geht ausschließlich über die in `INTEGRITY_FIELDS` gelisteten Felder
(siehe `scripts/technical-report/canonical.mjs`). Zeitstempel, Report-ID,
Historie-Metadaten und UI-Zustände sind ausgeklammert — zwei inhaltlich
identische Läufe liefern denselben Hash.

## Freigabestufen

`development` → `internal-test` → `pilot` → `production` (siehe
`scripts/technical-report/release-gate.mjs`).

Vorschlagsregel (Kurzfassung):

- offener Critical oder Gate-Blocker → `development`
- Auth-Nachweis fehlt → `development`
- offene HIGH oder gate-relevante Findings → `internal-test`
- RLS-Nachweis fehlt → `internal-test`
- Restore-Test oder Pflichtdoku fehlt → `pilot`
- sonst → `production`

Manuelle Abweichung:

```bash
node scripts/technical-report/override.mjs \
  --stage=pilot --reason="…" --ticket=SPRINT-05-XY --by=engineering-lead
```

Der Override-Aufruf schreibt `test-report/release-override.json` und eine
JSONL-Auditzeile in `test-report/release-override.audit.log`. Der nächste
Report-Lauf übernimmt die Stufe in `releaseStage.overridden`.

## Deklarative Nachweise

Bereiche ohne eigenen Scanner (Auth-E2E, RLS, Supabase, Docker, Azure-Readiness,
Docs) werden über `scripts/technical-report/manual-sections.json` gepflegt.
Änderungen sind versioniert und gehen in den Integritäts-Hash ein.
