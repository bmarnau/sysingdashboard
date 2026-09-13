# BSF-03 – Runtime/UI „Meine Kunden“

Stand: 2026-09-13\
Issue: #105\
Ausgangsbasis: GitHub `main` `34e20848f6a49b1c7b96fe4761bb76d928e083d7` (nach Merge PR #127)\
Voraussetzung: BSF-03 DB-/Security-Fundament (P1/P2) gemergt, siehe
`docs/BSF-03-P1-TARGET-VALIDATION-2026-09-13.md`.

## 1. Scope

Erster kundenbezogener Arbeitspfad gemäß `docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md` §10:

`Meine Kunden -> Kunde öffnen -> zulässige Projekte -> Arbeitspakete -> Tätigkeiten`

Nur lesend. **Nicht** enthalten: Verantwortungsverwaltung (Vergabe/Beendigung),
Schreibpfade, Rollen-Preview, Datenbank-/RLS-/Grant-/Migrationsänderungen,
Änderungen an `src/integrations/supabase/client.ts` / `previewAuthStorage.ts`.

## 2. Architektur

```text
Browser (authenticated route)
  -> TanStack Server Function (requireSupabaseAuth, User-JWT)
     -> dashboard.view (has_permission)
     -> Supabase im Benutzerkontext: Grants + RLS
        -> customer_responsibility (eigene aktive Zeilen)
        -> customer (Embed über Composite-FK, nur mit Customer Access >= read)
        -> is_my_customer(...) je Kandidat (autoritative Schnittmenge)
        -> Shared Projection Read (bestehender BSF-02C-Pfad)
```

| Schicht                          | Datei                                                                                    | Rolle                                                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Fachlogik (providerneutral)      | `src/lib/customer-data/my-customers.ts`                                                  | Typen, Port `MyCustomersRepository`, `selectMyCustomers`, `listMyCustomers`, `buildCustomerProjectionTree` |
| Provider (Supabase, User-Client) | `src/integrations/supabase/my-customers-adapter.ts`                                      | Kandidaten, `is_my_customer`, Kundenkopf                                                                   |
| Runtime                          | `src/lib/customer-data-runtime/my-customers.functions.ts`                                | `listMyCustomersFn`, `readMyCustomerDetailFn`                                                              |
| Routes                           | `src/routes/_authenticated/meine-kunden/index.tsx`, `.../$systemhouseId.$customerId.tsx` | Client-Gate über `_authenticated`, beide Scope-IDs in der URL                                              |
| UI                               | `src/components/customers/*`                                                             | Liste, Detailbaum, Seitenrahmen; Zustände Laden/Leer/Fehler/Nicht verfügbar                                |
| Navigation                       | `src/routes/_authenticated/dashboard.tsx`                                                | Link „Meine Kunden“ in der Bereichsleiste (`dashboard.view`, UI-Gating)                                    |

Sicherheitsvertrag (Design §8), wie umgesetzt:

- Identität ausschließlich aus dem validierten Bearer-Token (`context.userId`); keine
  Client-Claims, keine UI-Rolle, kein Rollen-Preview.
- Kein Service-Role-/Admin-Client im Benutzerpfad (statisch getestet, M10).
- Liste = RLS-Kandidaten ∩ `is_my_customer` je Tupel; Bestätigungsfehler → Ausschluss.
- Detail: `is_my_customer` **vor** jedem Datenzugriff; Ablehnung ist datenfrei und
  identisch für fremde, beendete oder unbekannte IDs (keine Existenzaussage).
- Ungültige URL-Parameter (kein UUID) erzeugen keinen Serveraufruf.
- Projektionsdaten laufen über den bestehenden Shared-Projection-Read (RLS bleibt Zeilengrenze).
- Verantwortung erweitert keine Rechte; die UI bietet keine Schreibaktionen.

Bekannte Grenze: pro Kandidat ein `is_my_customer`-RPC (Kandidaten auf 500 begrenzt).
Eine gebündelte DB-Funktion wäre effizienter, hätte aber eine DB-Änderung erfordert
(außerhalb dieses Scopes). Vorschlag für Folgeauftrag.

## 3. Tests

| ID      | Nachweis                                                                                                                                                                               | Datei                                                   | Ergebnis |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| M01–M04 | Auswahl fail-closed, Deduplizierung, nur Anzeigeattribute                                                                                                                              | `src/__tests__/lib/my-customers.test.ts`                | PASS     |
| M05–M06 | Bestätigung je Kandidat, Fehler → Ausschluss                                                                                                                                           | ebd.                                                    | PASS     |
| M07–M08 | Baum Projekt → AP → Tätigkeit, „ohne Zuordnung“                                                                                                                                        | ebd.                                                    | PASS     |
| M09–M12 | Auth-Middleware, keine Service Role, beide Scope-IDs, generische Ablehnung, Adapter read-only                                                                                          | `src/__tests__/security/my-customers-functions.test.ts` | PASS     |
| UI      | Laden/Leer/Fehler/Denied/Ready, Links mit beiden IDs, keine Editier-Steuerelemente, axe ohne Verstöße                                                                                  | `src/__tests__/components/MyCustomersView.test.tsx`     | PASS     |
| Runtime | Angemeldet: Dashboard-Link vorhanden; `/meine-kunden` liefert Liste (Serverfunktion 200); unbekannter Scope und ungültige IDs → „Kunde nicht verfügbar“; abgemeldet → Redirect `/auth` | Playwright-Lauf gegen Dev-Server                        | PASS     |

Die Zeilengrenze selbst (R01–R18) ist unverändert durch
`supabase/tests/bsf-03-customer-responsibility-rls.sql` abgedeckt und war nicht Teil
dieses Laufs.

## 4. Dokumentation

- Handbuch-Topic `meine-kunden` in `src/lib/help-documentation.ts`.
- `CHANGELOG.md` 1.60.0.
- `docs/CURRENT-STATUS.md` verweist auf dieses Dokument.

## 5. Offene Punkte / Vorschläge (nicht umgesetzt)

1. Verantwortungsverwaltung (`customer.responsibility.manage`) als eigener Auftrag.
2. Gebündelte Schnittmengenfunktion in der DB statt RPC je Kandidat.
3. E2E-Spezifikation gegen synthetische Auth: Server Functions laufen über den
   Dev-Server und werden vom bestehenden Supabase-Intercept-Harness nicht erfasst;
   dafür wäre ein eigener Mock-Layer für `_serverFn`-Aufrufe nötig.
4. Read-/Write-Indikator in der Liste (Design §10) erfordert eine zusätzliche
   RLS-konforme Leseoperation auf `customer_access`; bewusst zurückgestellt.
