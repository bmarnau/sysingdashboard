# BSF-02 — Implementierungsfundament Customer-/Systemhouse-Scope

Stand: 2026-08-25  
Status: zur Abnahme  
Issue: #76  
Design-Baseline: ADR-0030 / PR #77

## Ziel

Dieser Schritt implementiert ausschließlich das providerneutrale Fundament vor der ersten Supabase-DDL. Er schafft noch keine gemeinsame produktive Datenbanktabelle und erweitert keine produktiven Benutzerrechte.

## Enthalten

- `src/lib/customer-data/types.ts`
  - providerneutrale Typen für Customer-Auflösung und gemeinsame Project-/WorkPackage-/Activity-Projektionen,
  - expliziter `systemhouseId`-Kontext,
  - Customer-Auflösung getrennt von Parent-Link-Integrität.
- `src/lib/customer-data/migration.ts`
  - Normalisierung vorhandener Kundennamen ausschließlich für Matching,
  - echte `customerId` nur über explizites Mapping,
  - synthetisches `Project.customerId` aus Import/Export wird nicht als Produktidentität vertraut,
  - bestehende Projekt-/WorkPackage-/Activity-IDs bleiben erhalten,
  - zulässige parentlose Datensätze bleiben erhalten,
  - fehlende Parent-Referenzen werden separat als `missing` markiert,
  - widersprüchliche Customer-Kontexte werden nicht automatisch zusammengeführt.
- RBAC-v2-Vorbereitung
  - `systemhouse` wird kanonischer neuer BSF-Ressourcentyp,
  - historische `tenant`-Scopes bleiben parsebar,
  - `tenant` und `systemhouse` werden nicht miteinander vermischt.
- Security-Layer-Regel
  - `src/lib/customer-data` wird in den bestehenden Supabase-/Privileged-Client-Architekturscan aufgenommen.

## Reale Bestandsfälle

Die bestehende Datenform erlaubt:

- WorkPackages ohne Projekt,
- Activities ohne WorkPackage,
- kundenbezogene Datensätze trotz fehlendem Parent.

Der Migrationsplan erzwingt deshalb keine künstliche lückenlose Parent-Kette. Customer-Auflösung und Parent-Integrität werden separat bewertet. Damit können z. B. `WP-2047` und `A-9006` erhalten werden, statt bei einer späteren gemeinsamen Projektion verloren zu gehen.

## Security-Grenze

Dieser Schritt ist **keine produktive Autorisierungsschicht**.

- RBAC v2 bleibt vorbereitend.
- RLS/Server-Autorisierung bleibt die spätere Sicherheitsgrenze.
- `dashboard.view` wird nicht zu einem globalen Shared-Customer-Read-Recht umgedeutet.
- Kundenverantwortungs- und Projektmanager-Sichtrechte bleiben BSF-03/03A.
- Keine Service-Role-/Secret-Schlüssel.
- Keine Supabase-Abfrage aus UI/Hook oder dem providerneutralen Fachmodul.

## Nicht-Scope

- keine Supabase-Migration,
- keine Systemhouse-Membership-Tabelle,
- keine RLS-Policy,
- kein Customer-UI,
- keine Kundenverantwortung,
- keine PM-/Teamlead-Leistungssicht,
- keine Local-First-Ablösung,
- keine Versionsanhebung.

## Abnahme

Mindestens nachzuweisen:

1. Prettier, ESLint und TypeScript PASS.
2. Unit-Test der Customer-Migrationsplanung PASS.
3. RBAC-v2-Systemhouse-/Tenant-Kompatibilität PASS.
4. Security-Architekturscan PASS.
5. bestehende Import/Export- und Backup/Restore-Tests PASS.
6. Production Build, E2E, Accessibility und Technical Debt PASS.
7. Technical Report & Quality Gate PASS.
8. Keine Supabase-/Auth-/RLS-/DB-Runtimeänderung im Diff.

Nach erfolgreicher Abnahme folgt als eigener kontrollierter BSF-02-Schritt das Systemhouse-Membership-/DDL-/RLS-Fundament.
