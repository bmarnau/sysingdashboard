# BSF-03 – Verantwortungsverwaltung: fehlender Runtime-Read-Vertrag

Stand: 2026-09-13\
Issue: #105\
Status: **BLOCKED_RUNTIME_READ_CONTRACT** (Analyse, keine Implementierung)

## 1. Auftrag

UI „Kunde öffnen → Karte Verantwortung“ mit Anzeige des aktuellen Verantwortlichen,
Zuweisen/Ändern/Beenden für Inhaber von `customer.responsibility.manage`, ohne neue
Migration, RLS-Policy, Grants oder SECURITY-DEFINER-RPC.

## 2. Befund (Live-Zustand, read-only geprüft)

| Bedarf der UI | Vorhandener Read-Vertrag im User-Kontext | Ausreichend |
| --- | --- | --- |
| Name des aktuellen Verantwortlichen | `profiles`: `profiles_self_select` (nur eigene Zeile) + `profiles_admins_select_all` (nur systemadministrator/administrator). Teamlead sieht fremde Namen nicht. | NEIN für teamlead |
| Kandidatenliste (Rolle ∈ SA/Admin/Teamlead/PM/Engineer, aktiv) | `user_roles`: `user_roles_read_own` + `user_roles_read_admins`. `is_eligible_responsibility_holder()` ist SECURITY INVOKER und liefert für fremde Personen unter Teamlead-RLS stets `false`. | NEIN für teamlead |
| Kandidaten nur aus demselben Systemhouse | `systemhouse_membership`: ausschließlich `membership_select_own`. Keine Rolle kann fremde Memberships lesen; `has_active_systemhouse_membership()` ist SECURITY INVOKER. | NEIN für alle Rollen |
| Aktuelle Responsibility je Kunde | `customer_responsibility`: `managers read scoped responsibility` (`can_manage_customer_responsibility`) + `own responsibility readable`. | JA (nur `user_id`, kein Name) |
| Zuweisen / Beenden | INSERT-/UPDATE-Policies + `customer_responsibility_target_guard` (SECURITY DEFINER, DB-Autorität). | JA |

Einzig `public.avkk_people_directory()` (SECURITY DEFINER) liefert fremde Namen/Rollen
für Inhaber von `avkk.responsibility.assign`. Sie ist fachlich an AVKK gebunden, filtert
nicht nach Systemhouse und darf laut Design §9 nicht für die Kundenverantwortung
zweckentfremdet werden.

## 3. Konsequenz

- Eine sichere Kandidatenliste ohne Cross-Systemhouse-Angebote ist mit heutigen Rechten
  für **keine** Rolle möglich (Membership fremder Personen nicht lesbar).
- Teamleads könnten weder den aktuellen Verantwortlichen namentlich anzeigen noch
  Kandidaten auswählen; nur UUID-Eingabe wäre möglich – UX-seitig unzulässig.
- Mutationen (Zuweisen/Beenden) wären technisch möglich, aber ohne sichere Auswahl nicht
  produktreif. Kein Workaround über Service Role oder improvisierte DEFINER-RPC.

## 4. Vorschlag für den fehlenden Vertrag (separater DB-/Security-Auftrag)

Eine eng begrenzte, datensparsame Funktion
`customer_responsibility_candidates(_systemhouse_id uuid)`:

- SECURITY DEFINER, `search_path = ''`, EXECUTE nur `authenticated`;
- Ausführung nur bei `can_manage_customer_responsibility(auth.uid(), _systemhouse_id)`;
- Rückgabe nur `id, display_name, role, status` für Personen mit aktiver Membership im
  angefragten Systemhouse und `is_eligible_responsibility_holder(id)`;
- Ergänzend `customer_responsibility_holder_name(_systemhouse_id, _customer_id)` oder
  Erweiterung obiger Funktion um `include_current`, damit der aktuelle Verantwortliche
  namentlich lesbar ist.
- Negativtests R19–R24: fremdes Systemhouse leer, viewer/customer nie enthalten,
  ohne Manage-Recht leer, keine E-Mail-/Telefon-/MFA-Daten.

Alternativ (weniger empfohlen): zusätzliche, eng gefasste SELECT-Policies auf
`systemhouse_membership`/`profiles` für Manager desselben Systemhouses – erweitert
Fremdleserechte breiter als nötig.
