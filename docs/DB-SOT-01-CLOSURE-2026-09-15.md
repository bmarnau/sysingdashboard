# DB-SOT-01 — Implementierungs- und Abnahmenachweis

Stand: 2026-09-15  
Status: **LOKALE GIT-/CI-BASELINE IMPLEMENTIERT**  
Tracking: Issue #143  
Bezug: `docs/DATABASE-SCHEMA-SOURCE-OF-TRUTH.md`

## Ziel

DB-SOT-01 macht das anwendungs-eigene Supabase-Schema aus Git reproduzierbar, reviewbar und drift-geschützt. GitHub bleibt die Source of Truth; Remote-Schemaänderungen im MVP laufen weiterhin kontrolliert über Lovable -> Supabase.

## Implementierte Artefakte

Dauerhaft im Repository vorhanden sind:

- `supabase/migrations/` — kanonische Migrationshistorie,
- `supabase/schema/public-schema.sql` — maschinenlesbarer kanonischer `public`-Schema-Snapshot,
- `src/integrations/supabase/types.ts` — aus derselben lokalen Datenbank generierte TypeScript-Typen,
- `supabase/tests/bsf-kiosk-01-role-contract.sql` — ausführbarer KIOSK-DB-Vertrag,
- `scripts/database-schema/normalize-generated-text.mjs` — minimale technische Normalisierung,
- `scripts/database-schema/check-drift.mjs` — fail-closed Schema-/Type-Driftvergleich,
- `src/__tests__/ci/database-schema-drift.test.ts` — CI-/Script-Vertrag,
- `.github/workflows/ci.yml` — permanenter Job `Database Schema Drift`,
- `supabase/schema/README.md` — Generierungs- und Betriebsregeln.

Temporäre Generatorartefakte sind in `.gitignore` ausgeschlossen:

- `supabase/schema/public-schema.generated.sql`,
- `src/integrations/supabase/types.generated.ts`.

## TDD-Nachweis

Der CI-/Script-Vertrag wurde zuerst als failing Test eingeführt. Der RED-Lauf schlug erwartungsgemäß fehl, weil Scripts und Drift-Job noch nicht existierten. Erst danach wurden die Implementierung und der CI-Job ergänzt.

## Clean-DB-Rebuild

Der neue CI-Job startet eine disposable lokale Supabase-Instanz und baut die Datenbank ohne Seed-Daten ausschließlich aus `supabase/migrations/` neu auf.

Der erste Rebuild war technisch erfolgreich und deckte anschließend einen bestehenden Fixture-Befund im KIOSK-Vertrag auf: Der erste synthetische Benutzer einer komplett leeren Datenbank wird durch `handle_new_user()` korrekt zum ersten `systemadministrator`. Das bisherige Fixture versuchte diese Rolle beim Neutralisieren der Testkonten zu entfernen und traf dadurch erwartungsgemäß den Last-Sysadmin-Schutz.

Korrektur:

- ein eigener synthetischer Guard-Sysadmin wird innerhalb der Testtransaktion zuerst angelegt,
- die eigentlichen KIOSK-Testkonten werden danach neutralisiert,
- der Last-Sysadmin-Schutz bleibt unverändert aktiv,
- der Test endet weiterhin vollständig mit `ROLLBACK`,
- keine RLS-/RBAC-/Grant-Regel wurde abgeschwächt.

Danach ist der KIOSK-DB-Vertrag auf einer vollständig leeren, aus Migrationen rekonstruierten Datenbank PASS.

## Kanonische Baseline

Schema und Types wurden nicht manuell geschrieben. Sie wurden aus demselben erfolgreich rekonstruierten lokalen DB-Zustand generiert und als erste kanonische Baseline übernommen.

Bytegenauer Nachweis der übernommenen Git-Blobs:

```text
public-schema.sql  930996ebdc4a5989c11f87b7dfdbefc3e0bd53c5
types.ts           9bf56bc62711cf324eff059a256a4c8748faff86
```

Diese Blob-Hashes entsprechen exakt den zuvor aus dem CI-Artefakt heruntergeladenen generierten Dateien.

## Dauerhafter CI-Vertrag

Der permanente Job `Database Schema Drift` führt aus:

1. Supabase CLI `2.117.0` installieren,
2. lokale Supabase-Instanz starten,
3. alle Migrationen von leerem Zustand anwenden,
4. KIOSK-DB-Vertrag ausführen,
5. Schema neu generieren,
6. Types neu generieren,
7. Generatorartefakte als kurzlebige CI-Evidenz hochladen,
8. kanonische und generierte Dateien normalisiert vergleichen,
9. lokale Supabase-Instanz ohne Backup stoppen.

Der Job ist ein harter Vorgänger von `14 · Technical Report & Quality Gate`.

Erfolg erfordert:

```text
DATABASE_SCHEMA_DRIFT: NONE
DATABASE_TYPES_DRIFT: NONE
```

CI überschreibt die kanonischen Dateien nicht.

## Bootstrap-Sicherheitsmaßnahme

Da der GitHub-Connector die großen lokal heruntergeladenen CI-Artefakte nicht direkt als Datei in das Repository übertragen konnte, wurde für die **einmalige initiale Baseline** ein strikt auf `feat/bsf-kiosk-01-demo-pilot` begrenzter GitHub-Actions-Workflow mit `contents: write` verwendet.

Dieser Workflow durfte nur bei fehlendem `supabase/schema/public-schema.sql` arbeiten, erzeugte die beiden kanonischen Dateien erneut aus dem Migration-Rebuild und commitete nur:

- `supabase/schema/public-schema.sql`,
- `src/integrations/supabase/types.ts`.

Der Workflow wurde unmittelbar nach erfolgreicher Übernahme wieder gelöscht. Im dauerhaften Repository-Zustand existiert **kein automatischer CI-Schreibpfad** für den Schema-Snapshot.

## Sicherheitsgrenzen

- keine Verbindung zur produktiven Sysingdashboard-Supabase-Instanz,
- kein Service-Role-Key,
- keine produktiven Benutzer- oder Fachdaten,
- keine Lovable-Ausführung,
- keine direkte Remote-Migration,
- kein Merge,
- kein Deploy.

## Was DB-SOT-01 jetzt beweist

Die lokale Git-/CI-Baseline beweist:

- die vollständige Git-Migrationskette ist von leerem Zustand reproduzierbar,
- der kanonische Snapshot entspricht dem rekonstruierten `public`-Schema,
- die committed Supabase-Types entsprechen demselben Schema,
- der KIOSK-DB-Vertrag ist auf dem Clean-DB-Aufbau ausführbar,
- Drift blockiert den finalen CI-Quality-Gate-Pfad.

## Was DB-SOT-01 noch nicht beweist

Nicht behauptet wird, dass die reale Sysingdashboard-Supabase-Instanz bereits identisch mit diesem Git-Sollstand ist.

Für KIOSK-01 FINAL PASS bleibt separat erforderlich:

1. den korrekten Lovable/Supabase-Zielkontext `zffimqwnrsuzuozsgnlc` bzw. eindeutig davon abgeleitetes Staging verifizieren,
2. die KIOSK-Migrationen dort kontrolliert über den freigegebenen Lovable-Weg anwenden,
3. DB-Vertrag/RLS/Grants read-only bzw. transaktional prüfen,
4. offiziellen Security Advisor auf diesem korrekten Kontext ausführen,
5. keine unbewertete Abweichung zwischen Remote-Zustand und Git-Vertrag zulassen.

DB-SOT-01 ersetzt diese Remote-Abnahme nicht; es stellt dafür erstmals eine belastbare Git-Sollbasis bereit.

## Abschlussstatus

**DB-SOT-01 lokale Implementierung: PASS**, sobald der frische Exact-Head-Lauf nach dieser Dokumentationssynchronisierung Security, `Database Schema Drift` und `14 · Technical Report & Quality Gate` vollständig grün bestätigt.

KIOSK-01 bleibt unabhängig davon bis zur kontrollierten Remote-Abnahme **FINAL ACCEPTANCE PENDING**.
