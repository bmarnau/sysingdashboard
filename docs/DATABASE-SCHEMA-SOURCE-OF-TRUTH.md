# Datenbankschema als Git-Source-of-Truth

Stand: 2026-09-15  
Status: **VERBINDLICHER ARCHITEKTUR- UND GOVERNANCE-VERTRAG**  
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

Bei Widerspruch gilt: Nicht still angleichen. Der Widerspruch ist `DATABASE_SCHEMA_DRIFT` und muss aufgeklärt werden.

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
   - generierte Artefakte müssen byte-/normalisiert-identisch zu den committed Artefakten sein.
9. **Dokumentieren**
   - technischer Prüfbericht, Sprintabschluss und PR nennen Migration, Snapshot, Types, Tests und Advisor-Status.

## 6. Reproduzierbarer lokaler Referenzlauf

Für DB-SOT-01 wird die Supabase CLI als gepinnte Dev-Abhängigkeit verwendet. Für die Implementierung ist Version `2.117.0` vorgesehen; vor Einführung wird `supabase --version` gegen den Lockfile-Stand geprüft.

Referenzablauf:

```bash
bunx supabase start
bunx supabase db reset --local --no-seed
bunx supabase db dump --local --schema public -f supabase/schema/public-schema.generated.sql
bunx supabase gen types --lang typescript --local --schema public > src/integrations/supabase/types.generated.ts
```

Danach normalisiert der projektinterne Drift-Check ausschließlich technisch irrelevante Zeilenenden/Generator-Metadaten und vergleicht:

```text
public-schema.generated.sql  <->  public-schema.sql
types.generated.ts           <->  types.ts
```

Temporäre `*.generated.*`-Dateien werden nicht committed.

## 7. CI-Drift-Guard

Der CI-Job `Database Schema Drift` muss mindestens prüfen:

1. Supabase CLI-Version entspricht dem gepinnten Lockfile.
2. Lokale Supabase-Instanz startet erfolgreich.
3. Alle Migrationen lassen sich von leerem Zustand vollständig anwenden.
4. `public-schema.sql` entspricht dem daraus generierten Schema.
5. `types.ts` entspricht den daraus generierten Typen.
6. relevante DB-Vertragstests sind PASS.
7. bei Abweichung: harter Fehler `DATABASE_SCHEMA_DRIFT`.

CI darf den committed Snapshot oder die Expected Types nicht automatisch reparieren.

## 8. Lovable-/Supabase-Betriebsregel

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

## 9. Verhältnis zum Goldenen Datensatz

DB-SOT-01 und GDS-01 haben unterschiedliche Aufgaben:

- **DB-SOT-01** beweist die technische Struktur und Sicherheitsverträge der Datenbank.
- **GDS-01** beweist die fachliche Semantik mit synthetischen Referenzdaten und Expected Results.

Beide zusammen bilden die Referenzbasis für spätere Providervergleiche Supabase <-> Azure SQL.

## 10. Übergangsregel für KIOSK-01

KIOSK-01 wurde begonnen, bevor DB-SOT-01 festgeschrieben wurde. Seine Migrationen und Typen liegen bereits im Feature-Branch; die reale Anwendung im korrekten Sysingdashboard-Supabase-Kontext ist noch offen.

KIOSK-01 wird nicht rückwirkend fachlich erweitert. Bei seiner finalen DB-Abnahme wird jedoch die DB-SOT-01-Baseline erzeugt, soweit der korrekte Lovable/Supabase-Kontext verfügbar ist. Spätestens **vor der nächsten neuen DB-verändernden Änderung in BSF-03A** muss der Snapshot-/Drift-Guard etabliert sein.

## 11. Definition of Done für künftige Schemaänderungen

Eine Schemaänderung ist erst DONE, wenn:

- [ ] Zielprojekt und Branch eindeutig belegt sind,
- [ ] Migration versioniert ist,
- [ ] Migrationen eine saubere lokale Supabase-DB vollständig rekonstruieren,
- [ ] `supabase/schema/public-schema.sql` aktuell ist,
- [ ] `src/integrations/supabase/types.ts` aktuell und generiert ist,
- [ ] DB-Vertragstest PASS ist,
- [ ] RLS/Policies/Grants geprüft sind,
- [ ] Security Advisor ohne unbewertete neue Findings ist,
- [ ] CI-Drift-Guard PASS ist,
- [ ] kein Secret/Produktivdatensatz in Git gelangt ist,
- [ ] technischer Prüfbericht und Sprintabschluss synchronisiert sind.

## 12. Grundsatz

> **Eine laufende Supabase-Datenbank ist eine Instanz des in Git versionierten Datenbankvertrags — nicht dessen alleinige Quelle.**
