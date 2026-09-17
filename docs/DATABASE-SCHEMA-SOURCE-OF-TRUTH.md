# Datenbankschema als Git-Source-of-Truth

Stand: 2026-09-15  
Status: **IMPLEMENTIERT / VERBINDLICHER ARCHITEKTUR- UND GOVERNANCE-VERTRAG**  
Tracking: Issue #143 (`DB-SOT-01`)

## 1. Ziel

Für das Sysing Dashboard gilt verbindlich:

> **GitHub ist die Source of Truth für Code, Dokumentation und das anwendungs-eigene Datenbankschema.**

Die laufende Supabase-Datenbank darf kein Wissen enthalten, das nicht aus dem Repository nachvollziehbar, rekonstruierbar und testbar ist.

Lovable bleibt im MVP der operative Weg zur verbundenen Supabase-Umgebung. Diese Betriebsregel ändert nicht die Eigentümerschaft am Schema: Migrationen und Schema-Artefakte liegen vollständig im Git-Repository.

## 2. Vier-Artefakte-Regel

Jede anwendungs-eigene Schemaänderung benötigt vier synchronisierte Artefakte:

1. **Migration** unter `supabase/migrations/`
2. **aktueller maschinenlesbarer Schema-Snapshot** unter `supabase/schema/public-schema.sql`
3. **generierte Supabase-TypeScript-Typen** unter `src/integrations/supabase/types.ts`
4. **DB-Vertragstest** unter `supabase/tests/`

Eine Schemaänderung ist nicht DONE, solange eines dieser Artefakte fehlt oder gegen die anderen driftet.

## 3. Autorität der Artefakte

Die Artefakte erfüllen unterschiedliche Aufgaben:

- `supabase/migrations/` ist der **kanonische Änderungsvertrag** und muss eine leere lokale Supabase-Datenbank reproduzierbar auf den erwarteten Stand bringen.
- `supabase/schema/public-schema.sql` ist der **kanonische Snapshot des aktuellen Anwendungsschemas** und dient Review, Wiederherstellung, Drift-Erkennung und Portabilitätsnachweis.
- `src/integrations/supabase/types.ts` ist die **generierte Client-Typprojektion** des rekonstruierten Schemas; sie darf nicht manuell als Ersatz für Migrationen gepflegt werden.
- `supabase/tests/` enthält die **ausführbaren Sicherheits- und Fachverträge** für RLS, Policies, Grants, Funktionen und relevante Constraints.

Bei Widerspruch gilt: Nicht still angleichen. Der Widerspruch ist `DATABASE_SCHEMA_DRIFT` oder `DATABASE_TYPES_DRIFT` und muss aufgeklärt werden.

## 4. Scope des Schema-Snapshots

Der Snapshot enthält alle **anwendungs-eigenen** DB-Objekte, zunächst im Schema `public`:

- Tabellen und Spalten,
- Enums und benutzerdefinierte Typen,
- Primär- und Fremdschlüssel,
- Constraints,
- Indizes,
- Views,
- Funktionen/RPCs,
- Trigger,
- RLS-Aktivierung,
- RLS-Policies,
- explizite Grants und Revoke-Regeln, soweit sie zum Anwendungsschema gehören.

### Bewusst ausgeschlossen

Nicht in `public-schema.sql` gehören:

- Produktivdaten oder Seed-Inhalte,
- Auth-Benutzer oder Sessions,
- Passwörter,
- API-Keys, Tokens oder Service-Role-Keys,
- Supabase-interne Plattformdefinitionen in `auth`, `storage`, `realtime`, Systemkatalogen oder Extension-Interna,
- volatile Betriebsmetadaten.

Supabase-interne Schemas werden durch die Plattform bereitgestellt. **Eigene projektbezogene Änderungen** an solchen Schemas, z. B. eigene Trigger/Policies in `auth` oder `storage`, müssen dagegen separat als Migration versioniert und getestet werden.

## 5. Verbindlicher Änderungsfluss

Für jede DB-verändernde Arbeit gilt ab DB-SOT-01:

1. **Kontext prüfen**
   - Repository/Branch bestimmen.
   - erwarteter Supabase-Projektbezug: `zffimqwnrsuzuozsgnlc`.
   - falscher oder nicht eindeutig belegter Projektkontext => `BLOCKED`, kein DB-Write.
2. **Analysieren**
   - bestehende Migrationen, Schema-Snapshot, Typen und Vertragstests prüfen.
   - Auswirkungen auf RLS/RBAC, Grants, Docker-/Azure-Portabilität und Backup/Restore bestimmen.
3. **Migration versionieren**
   - Änderung als neue additive/forward-only Migration im Feature-Branch festhalten.
   - keine manuelle produktive Remote-Änderung ohne entsprechende Migration.
4. **Lokal rekonstruieren**
   - saubere lokale Supabase-Instanz aus allen Migrationen aufbauen.
   - Schema-Snapshot aus dieser rekonstruierten Instanz erzeugen.
   - TypeScript-Typen aus derselben Instanz erzeugen.
5. **DB-Vertrag testen**
   - positive und negative RLS-/Grant-/Permission-Fälle ausführen.
6. **Über Lovable anwenden**
   - die versionierte Migration ausschließlich über den vorgesehenen Lovable/Supabase-Weg in der freigegebenen Zielumgebung anwenden.
7. **Remote verifizieren**
   - Vertragstest soweit vorgesehen real ausführen.
   - offiziellen Supabase Security Advisor ausführen.
   - Live-Objekte read-only gegen den erwarteten Git-Vertrag prüfen.
8. **Drift-Guard**
   - Migrationen -> saubere lokale Supabase-DB -> generierter Snapshot/Typen.
   - generierte Artefakte müssen normalisiert-identisch zu den committed Artefakten sein.
9. **Dokumentieren**
   - technischer Prüfbericht, Sprintabschluss und PR nennen Migration, Snapshot, Types, Tests und Advisor-Status.

## 6. Implementierter lokaler Referenzlauf

Die dauerhafte CI verwendet die offizielle Action `supabase/setup-cli@v1` mit fest gesetzter Supabase-CLI-Version `2.117.0`. Die CLI wird bewusst **nicht** als zusätzliche npm-/Bun-Abhängigkeit des Anwendungspakets geführt; dadurch bleibt `bun.lock` von der Datenbank-Toolchain unberührt.

Die in `package.json` versionierten Befehle sind:

```bash
bun run db:schema:rebuild
bun run db:schema:snapshot
bun run db:types:generate
bun run db:schema:check
```

Sie entsprechen:

```text
supabase db reset --local --no-seed
supabase db dump --local --schema public -f supabase/schema/public-schema.generated.sql
supabase gen types --lang typescript --local --schema public > src/integrations/supabase/types.generated.ts
node scripts/database-schema/check-drift.mjs
```

Für einen manuellen lokalen Referenzlauf muss eine kompatible Supabase CLI verfügbar sein; der CI-Nachweis verwendet verbindlich `2.117.0`.

Der Drift-Check normalisiert ausschließlich technisch irrelevante Unterschiede:

- CRLF/CR -> LF,
- nachgestellte Leerzeichen/Tabs,
- leere Zeilen am Dateiende,
- genau eine abschließende Newline.

Er entfernt **keine** SQL-Statements, Policies, Grants, Trigger, Funktionen, Kommentare mit Projektbedeutung oder Objektdefinitionen.

Verglichen werden:

```text
supabase/schema/public-schema.generated.sql  <->  supabase/schema/public-schema.sql
src/integrations/supabase/types.generated.ts <->  src/integrations/supabase/types.ts
```

Temporäre `*.generated.*`-Dateien sind in `.gitignore` ausgeschlossen und werden nicht committed.

## 7. Implementierter CI-Drift-Guard

Der Job `Database Schema Drift` in `.github/workflows/ci.yml` ist ein hartes Gate und führt auf einer disposable lokalen Supabase-Instanz aus:

1. Checkout des PR-/Commit-Stands.
2. Installation Supabase CLI `2.117.0`.
3. `supabase start`.
4. vollständiger Neuaufbau mit `db reset --local --no-seed` aus **allen** Git-Migrationen.
5. Ausführung des KIOSK-DB-Vertrags `supabase/tests/bsf-kiosk-01-role-contract.sql` mit ROLLBACK-Testdaten.
6. Neugenerierung von `public-schema.generated.sql`.
7. Neugenerierung von `types.generated.ts`.
8. Upload der generierten Dateien als kurzlebige CI-Evidenz.
9. fail-closed Vergleich durch `db:schema:check`.
10. `supabase stop --no-backup` als Always-Cleanup.

Erfolgsmarker:

```text
DATABASE_SCHEMA_DRIFT: NONE
DATABASE_TYPES_DRIFT: NONE
```

Bei echter Abweichung endet der Job non-zero. Der finale Job `14 · Technical Report & Quality Gate` hängt von `db_schema` ab und kann bei Schema-/Type-Drift nicht grün werden.

CI repariert den committed Snapshot oder die Expected Types **niemals automatisch**.

## 8. Baseline-Erzeugung 2026-09-15

Die erste kanonische Baseline wurde aus einer vollständig neu aufgebauten lokalen Supabase-Datenbank erzeugt. Vor der Übernahme waren erfolgreich:

- vollständiger Migration-Rebuild aus leerem Zustand,
- KIOSK-Rollen-/Permission-Vertrag,
- Schema-Generierung,
- Type-Generierung.

Der erste Clean-DB-Lauf deckte dabei einen Testfixture-Fehler auf: Das erste synthetische `auth.users`-Konto wird durch den bestehenden Bootstrap-Vertrag korrekt zum ersten `systemadministrator`. Der KIOSK-Vertrag wurde deshalb um einen ausschließlich innerhalb der ROLLBACK-Transaktion existierenden synthetischen Guard-Sysadmin ergänzt. RLS/RBAC oder der Last-Sysadmin-Schutz wurden nicht abgeschwächt.

Der kanonische Snapshot und die kanonischen Types wurden anschließend **direkt aus demselben generierten CI-Stand** übernommen. Die Git-Blob-Hashes wurden gegen das heruntergeladene CI-Artefakt bytegenau geprüft.

Ein einmaliger, ausschließlich auf den Feature-Branch begrenzter Bootstrap-Workflow wurde nur für die technische Übernahme der großen generierten Dateien verwendet und danach wieder aus dem Repository entfernt. Der dauerhafte Zustand besitzt keinen CI-Schreibpfad für Schema-Snapshots.

## 9. Lovable-/Supabase-Betriebsregel

Für den MVP gilt:

```text
GitHub
  |  versionierte Migration
  v
Lovable
  |  kontrollierte Anwendung
  v
Supabase
  |  read-only Verifikation
  v
Git-Drift-/Abnahmenachweis
```

Direkte parallele produktive Schemaänderungen außerhalb des vorgesehenen Lovable/Supabase-Wegs werden vermieden.

Lovable darf keine nicht versionierte Remote-Änderung als Abkürzung durchführen. Falls eine Analyse unerwarteten Live-Drift entdeckt, lautet das Ergebnis `BLOCKED / DRIFT DETECTED`; zuerst wird die Abweichung nachvollziehbar gemacht und in Git überführt oder zurückgenommen.

## 10. Verhältnis zum Goldenen Datensatz

DB-SOT-01 und GDS-01 haben unterschiedliche Aufgaben:

- **DB-SOT-01** beweist die technische Struktur und Sicherheitsverträge der Datenbank.
- **GDS-01** beweist die fachliche Semantik mit synthetischen Referenzdaten und Expected Results.

Beide zusammen bilden die Referenzbasis für spätere Providervergleiche Supabase <-> Azure SQL.

## 11. Übergangsregel für KIOSK-01

Die **lokale Git-Baseline von DB-SOT-01 ist etabliert**. Damit ist vor BSF-03A technisch nachweisbar, dass der aktuelle Feature-Branch das erwartete Anwendungsschema aus seinen Migrationen reproduzieren kann.

Das ersetzt ausdrücklich **nicht** die noch offene reale KIOSK-01-Abnahme im korrekten Lovable/Supabase-Kontext. Vor KIOSK-01 FINAL PASS bleiben erforderlich:

- Zielprojekt `zffimqwnrsuzuozsgnlc` bzw. eindeutig davon abgeleitete kontrollierte Staging-Umgebung verifizieren,
- KIOSK-Migrationen dort über den freigegebenen Lovable-Weg anwenden,
- DB-Vertrag/RLS/Grants prüfen,
- offiziellen Security Advisor ausführen,
- Remote-/Git-Parität belegen.

Der aktuell anderweitig verfügbare Supabase-Connector ist kein Ersatz für diesen Nachweis.

## 12. Definition of Done für künftige Schemaänderungen

Eine Schemaänderung ist erst DONE, wenn:

- [ ] Zielprojekt und Branch eindeutig belegt sind,
- [ ] Migration versioniert ist,
- [ ] Migrationen eine saubere lokale Supabase-DB vollständig rekonstruieren,
- [ ] `supabase/schema/public-schema.sql` aktuell ist,
- [ ] `src/integrations/supabase/types.ts` aktuell und generiert ist,
- [ ] DB-Vertragstest PASS ist,
- [ ] RLS/Policies/Grants geprüft sind,
- [ ] lokaler CI-Drift-Guard PASS ist,
- [ ] Remote-Anwendung über den freigegebenen Lovable-Weg nachvollzogen ist,
- [ ] Security Advisor auf dem korrekten Zielkontext ohne unbewertete neue Findings ist,
- [ ] kein Secret/Produktivdatensatz in Git gelangt ist,
- [ ] technischer Prüfbericht und Sprintabschluss synchronisiert sind.

## 13. Grundsatz

> **Eine laufende Supabase-Datenbank ist eine Instanz des in Git versionierten Datenbankvertrags — nicht dessen alleinige Quelle.**
