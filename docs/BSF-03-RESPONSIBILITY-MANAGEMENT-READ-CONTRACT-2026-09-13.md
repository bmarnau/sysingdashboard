# BSF-03 – Verantwortungsverwaltung: Runtime-Read-Vertrag

Stand: 2026-09-13  
Issue: #105  
Status: **IMPLEMENTED / VERIFIED IN LIVE SCHEMA**

## 1. Ausgangslage

Die bestehende RLS war absichtlich zu eng, um einem Teamlead fremde Profile, Rollen oder Memberships direkt lesbar zu machen. Für P5 wurde diese Grenze **nicht** verbreitert.

Vor P5 waren deshalb Name des aktuellen Verantwortlichen und eine systemhausgebundene Kandidatenliste für Teamleads nicht sicher verfügbar.

## 2. Umgesetzter Vertrag

Die Managementsicht verwendet vier öffentliche P5-RPCs:

- `customer_responsibility_management_overview(_systemhouse_id uuid)`,
- `customer_responsibility_management_candidates(_systemhouse_id uuid)`,
- `set_customer_responsibility(_systemhouse_id uuid, _customer_id uuid, _user_id uuid)`,
- `end_customer_responsibility(_systemhouse_id uuid, _customer_id uuid)`.

Die öffentlichen RPCs laufen als `SECURITY INVOKER` und werden ausschließlich im Kontext des angemeldeten Benutzers aufgerufen.

Der notwendige Fremdleseanteil für Kundenkopf, aktuellen Verantwortlichen und Kandidaten liegt in eng begrenzten Funktionen im nicht exponierten Schema `private`. Diese Helper laufen als `SECURITY DEFINER` mit leerem `search_path` und prüfen den Management-Scope explizit.

## 3. Datenminimierung

Die Kandidatenschnittstelle liefert ausschließlich:

- `userId`,
- `displayName`.

Nicht geliefert werden insbesondere:

- E-Mail,
- Telefon,
- MFA-Informationen,
- Profilbild,
- sonstige Benutzerstammdaten.

`viewer` und `customer` sind als Ziel ausgeschlossen. Zulässig sind nur `systemadministrator`, `administrator`, `teamlead`, `projectmanager` und `engineer` mit aktiver Membership im betreffenden Systemhaus.

## 4. Bestehende RLS bleibt erhalten

Keine breite Manager-SELECT-Policy wurde ergänzt auf:

- `profiles`,
- `user_roles`,
- `systemhouse_membership`,
- `customer`.

Damit bleibt die bisherige Self-only-/Customer-Access-Grenze unverändert. Die Verwaltungsberechtigung erzeugt **keinen operativen Kundenzugriff**.

## 5. Management-Scope

`customer.responsibility.manage` bleibt auf folgende Rollen beschränkt:

- `systemadministrator`,
- `administrator`,
- `teamlead`.

Diese Rollen dürfen Kundenverantwortung für alle Kunden des eigenen Systemhauses verwalten, auch wenn sie selbst keinen `customer_access` für den Kunden besitzen. Projekte, Arbeitspakete und Tätigkeiten bleiben dadurch weiterhin unsichtbar, solange der operative Customer-Scope fehlt.

Cross-Systemhouse bleibt DENY.

## 6. Lifecycle

- Zuweisen legt die aktive Responsibility an.
- Wechseln beendet die bisherige Responsibility und legt die neue Responsibility atomar in derselben Transaktion an.
- Ein ungültiges Ziel rollt den gesamten Wechsel zurück.
- Beenden verwendet Lifecycle-Historisierung statt DELETE.
- Gleiches Ziel erneut setzen ist idempotent.
- Bereits beendete Responsibility erneut beenden ist idempotent.
- Der bestehende Unique-Index verhindert zwei gleichzeitig aktive primäre Verantwortliche je Kunde.

## 7. Nachweise

- Migration: `20260913150000_bsf03_p5_responsibility_management`
- SQL-Vertrag: `supabase/tests/bsf-03-p5-responsibility-management.sql` (R19–R31)
- Providerneutraler Fachvertrag: `src/lib/customer-data/customer-responsibility-management.ts`
- Supabase-Adapter: `src/integrations/supabase/customer-responsibility-management-adapter.ts`
- Serverfunktionen: `src/lib/customer-data-runtime/customer-responsibility-management.functions.ts`
- UI: `/kundenverantwortung`
- E2E: `e2e/specs/security/customer-responsibility-management.spec.ts`
- Abschluss: `docs/BSF-03-CLOSURE-2026-09-13.md`

Read-only gegen die Lovable/Supabase-Umgebung verifiziert: öffentliche P5-RPCs sind INVOKER; private Helper sind DEFINER mit leerem `search_path`; `authenticated` besitzt die vorgesehenen Execute-Rechte, `anon`/`PUBLIC` nicht.
