# BSF-02B — Systemhouse-Membership-/Customer-Access-DDL und RLS (Umsetzung)

Stand: 2026-08-25
Issue: #86
Status: **umgesetzt, PR-Review offen**
Grundlage: ADR-0029, ADR-0030, ADR-0031
Supabase Project Ref: `zffimqwnrsuzuozsgnlc`

## 1. Ziel

BSF-02B schafft die serverseitig durchsetzbare Scope-Grenze für gemeinsame
Systemhaus- und Kundendaten. Die fachliche Kundenverantwortung (BSF-03) wird
dabei ausdrücklich nicht vorweggenommen.

Trennung:

```text
auth.users                -> providerspezifische Auth-Identität (Supabase)
public.profiles           -> anwendungsseitige Benutzerrepräsentation
systemhouse_membership    -> technische Zugehörigkeit zu einem Systemhaus
customer_access           -> technischer Zugriff auf einen Customer-Datenraum
customer_responsibility   -> fachliche Beziehung, erst BSF-03
```

Fachliche Customer-Identität bleibt `(systemhouseId, customerId)`.
`systemhouseId` ist providerneutral und wird nicht mit Supabase Project Ref,
Lovable Project ID, Entra oder Azure Tenant ID gleichgesetzt.

## 2. Migration

Eine atomare Migration, real angewendet auf `zffimqwnrsuzuozsgnlc`.
Interne Reihenfolge fail-closed:

1. `systemhouse`, `customer` — Constraints, RLS sofort aktiv, keine
   `anon`/`authenticated`-Rechte
2. `systemhouse_membership`, `customer_access` — FKs, Composite-FK, Checks,
   Indizes, RLS sofort aktiv
3. Autorisierungshelfer und deren EXECUTE-Grants
4. self-only SELECT-Policies, danach Scope-Policies, erst danach die
   `authenticated`-SELECT-Grants

Zu keinem Zwischenzeitpunkt stand eine neue Tabelle permissiv offen.

## 3. Tabellen und Constraints

### public.systemhouse

`id uuid PK`, `name text NOT NULL`, `status text NOT NULL DEFAULT 'active'`,
`created_at`, `updated_at`.

- `systemhouse_status_check`: `active | inactive`
- keine Slug-/Name-Identität, UUID ist stabile Identität

### public.customer

`id uuid PK`, `systemhouse_id uuid NOT NULL`, `name`, `status`, Zeitstempel.

- FK `systemhouse_id -> systemhouse(id) ON DELETE RESTRICT`
- `customer_status_check`: `active | inactive`
- `customer_id_systemhouse_unique UNIQUE (id, systemhouse_id)` als Grundlage
  des Composite-FK
- Index `customer_systemhouse_idx (systemhouse_id)`
- keine UNIQUE-Regel auf `customer.name`

### public.systemhouse_membership

`id`, `systemhouse_id`, `user_id`, `status`, `valid_from`, `valid_to`, Zeitstempel.

- FK `systemhouse_id -> systemhouse(id) ON DELETE RESTRICT`
- FK `user_id -> profiles(id) ON DELETE CASCADE` (L.2, kein FK auf `auth.users`)
- `UNIQUE (systemhouse_id, user_id)`
- `status`-CHECK `active | inactive`
- Zeitfenster-CHECK `valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from`
  (reiner Zeilen-CHECK, kein Trigger)
- Index `systemhouse_membership_user_idx (user_id)`

### public.customer_access

`id`, `systemhouse_id`, `customer_id`, `user_id`, `access_level`, `status`,
`valid_from`, `valid_to`, Zeitstempel.

- Composite-FK `(customer_id, systemhouse_id) -> customer(id, systemhouse_id) ON DELETE CASCADE`
- FK `user_id -> profiles(id) ON DELETE CASCADE`
- `UNIQUE (systemhouse_id, customer_id, user_id)` (Triple, nicht `(customer_id, user_id)`)
- `access_level`-CHECK `read | write`
- `status`-CHECK `active | inactive`
- Zeitfenster-CHECK wie oben
- Indizes `customer_access_user_idx (user_id)`,
  `customer_access_scope_idx (systemhouse_id, customer_id)`
- kein FK auf `systemhouse_membership`: Grants dürfen persistieren, während
  eine Membership deaktiviert ist; die Wirksamkeit verhindert der Helper.

`updated_at` nutzt die bestehende `public.set_updated_at()`; es wurde keine
zweite Implementierung erzeugt.

## 4. Autorisierungshelfer

Beide `LANGUAGE sql`, `STABLE`, **SECURITY INVOKER**, `SET search_path = public`.
SECURITY DEFINER war nicht erforderlich: die self-only Policies auf
`systemhouse_membership` und `customer_access` erlauben dem Aufrufer genau die
eigenen Zeilen, deshalb entsteht keine RLS-Rekursion.

- `has_active_systemhouse_membership(_user_id, _systemhouse_id)`
  prüft `is_account_active`, exakte `user_id`, exakte `systemhouse_id`,
  `status = 'active'`, `valid_from <= now()` oder NULL, `valid_to > now()` oder NULL.
- `has_customer_access(_user_id, _systemhouse_id, _customer_id, _required_level)`
  prüft zusätzlich exakten Customer-Scope, aktiven Grant, gültiges Zeitfenster
  und `access_level`. `write` erfüllt `read`; `read` erfüllt `write` nicht.
  Ungültiger Level, NULL-Argumente und fehlende Zeilen ergeben `false`.

Kein Bypass über `has_role`, `has_any_role`, `has_permission`,
Systemadministrator oder `dashboard.view`.

`public.is_account_active(uuid)` wurde unverändert wiederverwendet.

## 5. Grants

Function-Grants für beide Helper: `REVOKE EXECUTE` von `PUBLIC` und `anon`,
`GRANT EXECUTE` an `authenticated` und `service_role`.

Table-Grants (kein Legacy-Muster):

| Rolle           | systemhouse | customer | systemhouse_membership | customer_access |
| --------------- | ----------- | -------- | ---------------------- | --------------- |
| `anon`          | keine       | keine    | keine                  | keine           |
| `PUBLIC`        | keine       | keine    | keine                  | keine           |
| `authenticated` | SELECT      | SELECT   | SELECT                 | SELECT          |
| `service_role`  | ALL         | ALL      | ALL                    | ALL             |

Kein Browser-INSERT/UPDATE/DELETE. Keine Service Role im Client.

## 6. RLS

RLS ist auf allen vier Tabellen aktiv, deny-by-default, ausschließlich
SELECT-Policies `TO authenticated`:

- `membership_select_own`: `user_id = auth.uid()`
- `customer_access_select_own`: `user_id = auth.uid()`
- `systemhouse_select_member`: `has_active_systemhouse_membership(auth.uid(), id)`
- `customer_select_scoped`: `has_customer_access(auth.uid(), systemhouse_id, id, 'read')`

Membership allein, `dashboard.view` allein, eine globale Rolle allein oder die
Kenntnis einer Customer-ID erzeugen keinen Customer-Zugriff.

## 7. DB-/RLS-Testmatrix

Real gegen `zffimqwnrsuzuozsgnlc` ausgeführt, mit echtem Rollenwechsel
(`role` + `request.jwt.claims`) und isolierten Testdaten. Alle Testdaten und
Hilfsobjekte wurden anschließend restlos entfernt (verifiziert: 0 Restzeilen).

| #   | Test                                                                    | Ergebnis                             |
| --- | ----------------------------------------------------------------------- | ------------------------------------ |
| 01  | anon sieht keine neuen Fachdaten (alle vier Tabellen)                   | PASS (permission denied)             |
| 02  | authenticated ohne Membership sieht keinen Customer                     | PASS (0)                             |
| 03  | Membership ohne Grant sieht keinen Customer                             | PASS (0)                             |
| 04  | aktive Membership + read Grant: Customer READ                           | PASS (1)                             |
| 05  | aktive Membership + write Grant: Customer READ                          | PASS (1)                             |
| 06  | read Grant: WRITE DENY                                                  | PASS (permission denied)             |
| 07  | Cross-Systemhouse                                                       | PASS (0)                             |
| 08  | Cross-Customer                                                          | PASS (0)                             |
| 09  | erratene Customer-ID liefert keine Fremddaten                           | PASS (0)                             |
| 10  | inactive Membership                                                     | PASS (0)                             |
| 11  | Membership `valid_from` Zukunft                                         | PASS (0)                             |
| 12  | Membership abgelaufen                                                   | PASS (0)                             |
| 13  | inactive Customer Grant                                                 | PASS (0)                             |
| 14  | Customer Grant `valid_from` Zukunft                                     | PASS (0)                             |
| 15  | Customer Grant abgelaufen                                               | PASS (0)                             |
| 16  | Customer Grant ohne aktive Membership                                   | PASS (0)                             |
| 17  | authenticated INSERT/UPDATE/DELETE auf `systemhouse_membership`         | PASS (permission denied)             |
| 18  | authenticated INSERT/UPDATE/DELETE auf `customer_access`                | PASS (permission denied)             |
| 19  | Cross-Systemhouse-Kombination scheitert am Composite-FK                 | PASS (`customer_access_customer_fk`) |
| 20  | globale Rolle (`systemadministrator`) allein                            | PASS (0)                             |
| 21  | `profiles.status != 'active'` trotz Membership + Grant                  | PASS (0)                             |
| 22  | write Grant erfüllt `read`                                              | PASS (true)                          |
| 23  | read Grant erfüllt `write` nicht                                        | PASS (false)                         |
| 24  | Profil gelöscht: Membership/Grant kaskadieren, Systemhaus/Kunde bleiben | PASS (0/0/2/3)                       |
| 25  | Lovable-Preview-Overlay-Dateien unverändert                             | PASS                                 |

Zusätzlich geprüft: ungültiger `_required_level` und NULL ergeben `false`;
Membership- und Customer-Access-SELECT liefern ausschließlich eigene Zeilen.

## 8. Advisor / Security Linter

Vorher und nachher identisch: 2 Befunde vom Typ
„Signed-In Users Can Execute SECURITY DEFINER Function" für die
Legacy-Funktionen `avkk_can_write` und `avkk_people_directory`.

BSF-02B erzeugt **keine** neuen Befunde; beide neuen Helper sind
SECURITY INVOKER. Die Legacy-Warnungen werden nicht im Rahmen von BSF-02B
behandelt.

## 9. Restrisiken und offene Punkte

- Es existieren noch keine Verwaltungswege (Server-Funktionen/UI), um
  Systemhäuser, Kunden, Memberships und Grants zu pflegen. Bis dahin ist die
  Pflege ausschließlich serverseitig über `service_role` möglich.
- Es sind noch keine produktiven Daten vorhanden; die Wirksamkeit im
  Realbetrieb wird erst mit BSF-03 fachlich gefüllt.
- Bestandstabellen (AVKK, Reference Data) tragen weiterhin breitere
  Legacy-Grants; deren Angleichung ist nicht Teil von BSF-02B.
- Die zwei Legacy-Advisor-Warnungen bleiben offen.
