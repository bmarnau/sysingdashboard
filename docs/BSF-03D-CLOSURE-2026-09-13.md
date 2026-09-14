# BSF-03D — Abschlussbericht Arbeitspaket-Kategorien (Issue #103)

Stand: 2026-09-14
Version: 1.62.0
Ergebnis: **PARTIAL — ARCHITEKTURKORREKTUR ABGESCHLOSSEN, GITHUB-CI AUSSTEHEND**

Der am 13.09.2026 dokumentierte technische FINAL PASS wurde durch den
Whole-Branch-Review am 14.09.2026 wieder geöffnet. Ursache war nicht die
Fachfunktion, sondern ein Architekturdrift: Mit BSF-03D war Drizzle als zweites
Migrationssystem in den Branch gelangt. ARCH-DRIZZLE-01 entfernt diesen Drift
und stellt die verbindliche Supabase-Migrationsarchitektur wieder her. Ein
neuer FINAL PASS wird erst nach erfolgreicher GitHub-CI auf dem exakten
korrigierten Head-SHA erteilt.

## 1. Fachscope

Arbeitspaket-Kategorien als editierbare, systemhausweite Stammdaten:

- `workpackage.category`, Scope `systemhouse`, keine Seed-Werte.
- `WorkPackage.categoryKey?: string | null`; Default/Legacy = keine Kategorie;
  maximal eine primäre Kategorie.
- Stabile Key-Identität; Deaktivieren statt Hard Delete.
- Tags unabhängig; keine Ableitung von `billable`, `priority` oder `status`.
- Auswahl durch AP-berechtigte Nutzer; Verwaltung nur mit
  `referencedata.manage` plus aktiver Systemhaus-Membership.
- Viewer Write DENY und Cross-Systemhouse DENY durch serverseitigen Vertrag.
- JSON-Schema 1.2.0; Import/Export/Backup/Restore rückwärtskompatibel und
  fail-safe für unknown/inactive Kategorien.

Nicht im Scope: Shared Projection, BSF-02C-RPC und BSF-03 P5.

## 2. Architekturkorrektur ARCH-DRIZZLE-01

### Ausgangsbefund

Im Whole-Branch-Review wurden `drizzle.config.ts`, `drizzle/*`, `drizzle-kit`
und `drizzle-orm` gefunden. Dies widersprach dem bereits dokumentierten
Architekturvertrag: Supabase/Postgres ist führend; Repo-Migrationen liegen in
`supabase/migrations/`; Lovable-spezifische Migrationslaufzeiten dürfen keine
unersetzbare Abhängigkeit bilden.

### Zielstand

Kanonische Migration:

`supabase/migrations/20260913213000_bsf03d_workpackage_category_reference_data.sql`

Der SQL-Inhalt wurde beim Verschieben nicht verändert. Der alte und neue Pfad
besitzen identisch den Blob:

`c5dad976ee5cd9e94b29f2eb94c1026fdf3c3693`

Entfernt wurden:

- `drizzle.config.ts`
- `drizzle/schema.ts`
- `drizzle/migrations/0000_bsf03d_reference_data_systemhouse_scope.sql`
- `drizzle/migrations/meta/0000_snapshot.json`
- `drizzle/migrations/meta/_journal.json`
- `drizzle-kit`
- `drizzle-orm`

`package.json` und `bun.lock` wurden exakt auf die nachweislich unveränderten
Vor-Drizzle-Blobs des Elternstands `9135a672…` zurückgeführt. Kein anderes
Migrationsframework wurde eingeführt. Die produktive Datenbank wurde durch
diese Repo-Korrektur nicht verändert.

## 3. TDD / Commitfolge der Architekturkorrektur

| Schritt                            | Referenz                                   |
| ---------------------------------- | ------------------------------------------ |
| Vor-Drizzle-Paketgraph             | `9135a672346a4e310abaaf1e90a488dd89127d8c` |
| Drizzle-Einführung                 | `8a75038b9025c5abc47a7221e320b1e8744d021b` |
| Vor ARCH-DRIZZLE-01                | `833f61f5ec3e22c84617e3c0bc4698bab12eb2e0` |
| Separater Architektur-Vertragstest | `c95fe9ae4cbee1623b69295bb15a70272c1a962c` |
| Architekturfix                     | `1090897aa8edd024829e9ff904ea7175aae41f34` |

Der Testcommit wurde vor dem Fix angelegt. Auf seinem Ausgangsstand waren die
Vertragsbedingungen objektiv verletzt: Drizzle-Dateien und -Pakete existierten,
der kanonische Supabase-Migrationspfad noch nicht. Der Runtime-GREEN-Nachweis
wird über den Pull-Request-CI-Lauf erbracht.

## 4. Live-DB- und Security-Nachweis aus Paket V

Der bereits ausgeführte Live-Nachweis bleibt gültig, weil ARCH-DRIZZLE-01 nur
den Repo-Migrationspfad und Paketgraph korrigiert und keine DB-Änderung
vornimmt:

- `supabase/tests/bsf03d-workpackage-category.sql`
- eine Transaktion `BEGIN … ROLLBACK`
- T01–T16 = **16/16 PASS**
- synthetische Daten nach Rollback = 0
- Live-Schema-Vertrag = PASS
- DB dauerhaft geändert = **NEIN**
- Supabase Security Advisor: ERROR 0, CRITICAL 0, WARN 2 nur bekannte
  SEC-01-Baseline (`avkk_can_write`, `avkk_people_directory`)
- neue BSF-03D-Findings = 0

## 5. Vorherige Paket-Q-Gates

Vor dem Architekturreview bestanden bereits Typecheck, Lint/No-Console,
Format, komplette Vitest-Suite, A11y, Security, Technical Debt, Docs,
Projektstatus, Perf, Build, Kategorie-E2E 4/4, Chromium-E2E 77/77,
API-/Security-Gates, technischer Prüfbericht und `ci:gate`.

Wegen Änderung von Migrationspfad und Paketgraph werden diese Ergebnisse nicht
als finaler Nachweis übernommen. Der PR muss die offiziellen GitHub-Gates auf
dem korrigierten Head erneut bestehen.

## 6. Auth-/Governance-Vertrag

Der historisch abgenommene Supabase-Auth-Client-Vertrag ist
`425fbed6cecbf5900a0eda17c735f90221d31d8d`.

Erster eindeutig nachvollziehbarer Broker-Cleanup dieser Session:
`072991129822835f6f5551db766132413523f67d`.

Zielzustand:

- `src/integrations/supabase/previewAuthStorage.ts` nicht vorhanden,
- kein `previewAuthStorage` / `brokeredPreviewStorage` in `client.ts`,
- Storage = `typeof window !== "undefined" ? localStorage : undefined`,
- `supabase-client-contract.test.ts` = 3/3 PASS.

`b619596` wird nicht als definitive erste Entfernung dokumentiert.

## 7. E2E-Realität

Das Kategorie-E2E prüft UI-Gating mit Data-API-Route-Mocking. Viewer Write DENY
und Cross-Systemhouse DENY sind durch das transaktionale Live-SQL-Artefakt
belegt. UI-Gating ist UX, nicht Sicherheitsgrenze.

## 8. Aktueller Status / Restrisiken

1. GitHub-CI nach ARCH-DRIZZLE-01 ist noch ausstehend.
2. Historisch existiert für das sehr frühe Paket 1 kein separater RED-Commit;
   für ARCH-DRIZZLE-01 existiert dagegen ein separater Testcommit vor dem Fix.
3. Der Preview-Auth-Broker kann durch künftige Lovable-Turns wieder injiziert
   werden; der Contract-Test schützt den Releasepfad.
4. Bestehende Technical-Debt-Trendwerte sind nicht BSF-03D-verursacht.

## 9. Freigabestatus

| Nachweis                                   | Ergebnis             |
| ------------------------------------------ | -------------------- |
| Fachfunktion BSF-03D                       | PASS                 |
| Live-DB T01–T16                            | 16/16 PASS, ROLLBACK |
| Security Advisor Delta                     | PASS                 |
| ARCH-DRIZZLE-01 statischer Zielstand       | PASS                 |
| Drizzle im korrigierten Branch             | 0                    |
| Kanonische Supabase-Migration              | PASS                 |
| GitHub-CI / Security auf korrigiertem Head | **AUSSTEHEND**       |
| Merge                                      | NEIN                 |
| Deploy                                     | NEIN                 |
| Gesamtstatus                               | **PARTIAL**          |

Issue #103 bleibt offen. Merge oder Deployment sind nicht Bestandteil dieses
Zwischenabschlusses.
