# Lovable-Standard für Datenbankänderungen

Stand: 2026-09-15  
Status: **VERBINDLICHER PROMPT-STANDARD**  
Bezug: `docs/DATABASE-SCHEMA-SOURCE-OF-TRUTH.md`, Issue #143 (`DB-SOT-01`)

## Zweck

Dieser Standard gilt für **jeden Lovable-Prompt mit Supabase-/DB-Scope** im Sysing Dashboard.

Ziel ist ein kontrollierter Ablauf, bei dem Lovable operativ mit der verbundenen Supabase-Umgebung arbeitet, während GitHub die Source of Truth für Migrationen, Schema-Snapshot, generierte Typen und DB-Vertragstests bleibt.

## Verbindliche Reihenfolge

Jeder Prompt mit DB-Scope muss strikt nach diesem Ablauf arbeiten:

1. **ANALYSE**
2. **MIGRATION / GIT-ARTEFAKTE VORBEREITEN**
3. **KONTROLLIERTE ANWENDUNG ÜBER LOVABLE → SUPABASE**
4. **TESTS + SECURITY ADVISOR**
5. **SCHEMA-SNAPSHOT + TYPES SYNCHRONISIEREN**
6. **DRIFT-CHECK**
7. **DOKUMENTATION**
8. **ABNAHMEKRITERIEN / STATUS**

Keine Phase darf still übersprungen werden.

## Pflichtblock für künftige Lovable-Prompts

Der folgende Vertrag ist sinngemäß in jeden DB-verändernden Lovable-Prompt aufzunehmen:

```text
DATABASE SOURCE-OF-TRUTH CONTRACT

GitHub ist die Source of Truth für das anwendungs-eigene Datenbankschema.
Lovable ist im MVP der operative Weg zur verbundenen Supabase-Umgebung.

Vor jedem DB-Write:
1. Prüfe Repository/Branch und den Supabase-Projektbezug.
2. Erwarteter Sysingdashboard-Projektbezug: zffimqwnrsuzuozsgnlc.
3. Wenn der Projektkontext fehlt, abweicht oder nicht eindeutig belegbar ist:
   STATUS = BLOCKED_WRONG_SUPABASE_CONTEXT
   KEIN DB-WRITE.

Für jede Schemaänderung müssen zusammen vorliegen:
- versionierte Migration unter supabase/migrations/,
- aktueller Schema-Snapshot supabase/schema/public-schema.sql,
- generierte Typen src/integrations/supabase/types.ts,
- DB-Vertragstest unter supabase/tests/.

Führe keine nicht versionierte Remote-Schemaänderung als Abkürzung aus.
Ändere keine RLS-/RBAC-/Grant-Regel nur, um einen Test grün zu bekommen.
Keine Secrets, Passwörter, Tokens oder Service-Role-Keys in Code, Logs, Promptantworten oder Dokumentation.

Nach kontrollierter Anwendung:
- DB-Vertragstests ausführen,
- offiziellen Supabase Security Advisor ausführen,
- Schema-Snapshot aus dem reproduzierten Schema aktualisieren,
- Supabase TypeScript Types regenerieren,
- Database-Schema-Drift-Check ausführen.

Bei Abweichung zwischen Migrationen, Snapshot, Types oder Live-Vertrag:
STATUS = DATABASE_SCHEMA_DRIFT
NICHT als DONE markieren.

Kein Merge oder Deploy ohne gesonderte Freigabe.
```

## Phase A — Analyse

Lovable muss vor Änderungen dokumentieren:

- aktueller Branch und Commit,
- betroffene Migrationen,
- betroffene Tabellen/Views/Funktionen/Trigger,
- betroffene RLS-Policies und Grants,
- Auswirkungen auf Auth/RBAC/RLS,
- Auswirkungen auf Backup/Restore,
- Auswirkungen auf providerneutrale Fachlogik,
- Auswirkungen auf Docker-/Azure-Portabilität,
- erwartete negative Tests,
- erwarteten Supabase-Projektbezug.

Wenn der korrekte Projektkontext nicht verifiziert werden kann, endet der Lauf hier mit `BLOCKED_WRONG_SUPABASE_CONTEXT`.

## Phase B — Migration und Git-Artefakte

Vor dem produktiven Schema-Write:

- neue Änderung als forward-only Migration unter `supabase/migrations/` erstellen,
- DB-Vertragstest unter `supabase/tests/` erstellen oder anpassen,
- keine produktiven Daten in Migration/Test einbetten,
- synthetische Testdaten verwenden,
- RLS, Policies und Grants explizit behandeln,
- keine zweite Migrationsquelle einführen.

`supabase/schema/public-schema.sql` und `src/integrations/supabase/types.ts` werden nicht manuell passend editiert; sie werden nach dem reproduzierbaren Schemaaufbau generiert.

## Phase C — Kontrollierte Anwendung

Schemaänderungen werden im MVP ausschließlich über den vorgesehenen **Lovable → Supabase**-Weg in der freigegebenen Zielumgebung angewandt.

Vor Ausführung muss Lovable nochmals ausgeben:

```text
TARGET_PROJECT = zffimqwnrsuzuozsgnlc
MIGRATION = <Dateiname>
WRITE_SCOPE = <Objekte>
DESTRUCTIVE_CHANGE = YES|NO
READY_TO_APPLY = YES|NO
```

Bei `TARGET_PROJECT`-Abweichung oder unklarer Zuordnung: kein Write.

Destruktive Änderungen benötigen eine gesonderte explizite Freigabe.

## Phase D — Tests und Security Advisor

Nach Anwendung sind mindestens erforderlich:

- positiver DB-Vertrag,
- negative Cross-Systemhouse-/Cross-Customer-/Permission-Tests, soweit fachlich betroffen,
- RLS-/Grant-Prüfung,
- Funktion-/RPC-Sicherheitsprüfung,
- offizieller Supabase Security Advisor,
- Bewertung jedes neuen Findings gegenüber der dokumentierten Baseline.

Ein neuer ERROR/CRITICAL/HIGH oder ein unbewertetes neues WARN-Finding blockiert DONE.

## Phase E — Schema-Snapshot und Types

Nach der Änderung müssen folgende Artefakte synchronisiert werden:

```text
supabase/schema/public-schema.sql
src/integrations/supabase/types.ts
```

Der Snapshot enthält das anwendungs-eigene `public`-Schema einschließlich Tabellen, Enums, Constraints, Indizes, Views, Funktionen, Trigger, RLS, Policies und Grants.

Er enthält keine Produktivdaten, Sessions oder Secrets.

## Phase F — Drift-Check

Lovable bzw. die nachgelagerte Git/CI-Prüfung muss bestätigen:

```text
MIGRATIONS_REBUILD = PASS
SCHEMA_SNAPSHOT_MATCH = PASS
SUPABASE_TYPES_MATCH = PASS
DB_CONTRACT = PASS
SECURITY_ADVISOR = PASS|BASELINE_ONLY
DATABASE_SCHEMA_DRIFT = NONE
```

Wenn einer der ersten vier Werte nicht PASS ist oder Drift besteht, lautet der Gesamtstatus `NOT_READY`.

## Phase G — Dokumentation

Zu aktualisieren sind je nach Sprint:

- technischer Prüfbericht,
- Sprintabschluss/Closure,
- Entwicklungs-Tagebuch,
- Projektstatus,
- Architektur-/Schema-Dokumentation,
- PR-/Issue-Evidenz.

Die Dokumentation nennt mindestens:

- Migration,
- Schema-Snapshot-Stand,
- Types-Stand,
- DB-Vertragstest,
- Advisor-Ergebnis,
- Drift-Ergebnis,
- Zielprojektbezug,
- Merge-/Deploy-/DB-Write-Status.

## Phase H — Abnahmeformat

Jeder DB-Lauf endet mit diesem Kurzbericht:

```text
DB_CHANGE_STATUS = PASS | BLOCKED | FAIL
TARGET_PROJECT = <project-ref>
MIGRATION = <file>
SCHEMA_SNAPSHOT = PASS | FAIL | NOT_RUN
SUPABASE_TYPES = PASS | FAIL | NOT_RUN
DB_CONTRACT = PASS | FAIL | NOT_RUN
SECURITY_ADVISOR = PASS | BASELINE_ONLY | FAIL | NOT_RUN
DATABASE_SCHEMA_DRIFT = NONE | DETECTED | NOT_RUN
DOCS_SYNC = PASS | FAIL | NOT_RUN
MERGE = NO unless explicitly approved
DEPLOY = NO unless explicitly approved
```

## Stop-Bedingungen

Lovable muss ohne weitere Umsetzung stoppen und `BLOCKED` melden bei:

- falschem oder unklarem Supabase-Projektkontext,
- fehlender versionierter Migration für eine geplante Remote-Schemaänderung,
- verlangter destruktiver Änderung ohne explizite Freigabe,
- fehlendem Nachweis der bestehenden RLS-/Grant-Wirkung,
- Drift zwischen Git-Vertrag und Live-/reproduziertem Schema,
- Versuch, Secrets oder Service-Role-Keys in Repository/Prompt/Dokumentation abzulegen,
- Versuch, Auth/RBAC/RLS zur Vereinfachung zu umgehen.

## Gültigkeit

Dieser Standard gilt ab 2026-09-15 für alle neuen DB-verändernden Lovable-Läufe und wird in BSF-03A und allen Folgesprints mit Supabase-Scope verpflichtend referenziert.
