# Datenbankschema-Snapshot

`public-schema.sql` ist der versionierte, maschinenlesbare Snapshot des aus den Git-Migrationen rekonstruierten anwendungseigenen Supabase-Schemas `public`.

## Verbindlicher Umfang

Der Snapshot wird ausschließlich aus einer frischen lokalen Supabase-Instanz erzeugt, nachdem alle Dateien aus `supabase/migrations/` angewendet wurden. Er bildet die anwendungseigenen Objekte des Schemas `public` ab, insbesondere Tabellen und Spalten, Enums und Datentypen, Constraints und Indizes, Views, Funktionen/RPCs, Trigger, RLS-Konfiguration und Policies sowie Grants, soweit sie vom Supabase-/PostgreSQL-Dump ausgegeben werden.

Nicht Bestandteil dieses Snapshots sind Produktivdaten, Auth-Benutzer, Sessions, Secrets sowie Supabase-plattformverwaltete Schemas wie `auth`, `storage`, `realtime` oder PostgreSQL-Systemkataloge.

## Erzeugung und Drift-Prüfung

Die lokalen Befehle sind in `package.json` versioniert:

```bash
bun run db:schema:rebuild
bun run db:schema:snapshot
bun run db:types:generate
bun run db:schema:check
```

`db:schema:snapshot` schreibt bewusst nach `public-schema.generated.sql`. `db:types:generate` schreibt entsprechend nach `src/integrations/supabase/types.generated.ts`. Diese temporären Dateien werden nicht committed. `db:schema:check` vergleicht sie fail-closed mit den kanonischen Dateien:

- `supabase/schema/public-schema.sql`
- `src/integrations/supabase/types.ts`

Der Vergleich normalisiert nur Zeilenenden, nachgestellte Leerzeichen und die abschließende Leerzeile. Fachlich oder strukturell unterschiedliche SQL-/TypeScript-Inhalte führen zu `DATABASE_SCHEMA_DRIFT` beziehungsweise `DATABASE_TYPES_DRIFT` und Exit-Code 1. Der Checker überschreibt die kanonischen Dateien niemals automatisch.

## CI-Vertrag

Der Job `Database Schema Drift` startet eine lokale Supabase-Instanz mit gepinnter CLI-Version, rekonstruiert die Datenbank ausschließlich aus den Git-Migrationen, führt den DB-Vertragstest aus, erzeugt Schema und Typen neu und vergleicht sie mit Git. Nur ein driftfreier Zustand darf das zentrale Quality Gate passieren.

Der lokale Drift-Nachweis belegt die Reproduzierbarkeit des Git-Sollschemas. Er ist **kein** Nachweis, dass die produktive Supabase-Instanz aktuell identisch ist. Der Remote-/Live-Abgleich bleibt ein eigener, kontrollierter Schritt über Lovable gemäß `docs/LOVABLE-DATABASE-CHANGE-STANDARD.md`.
