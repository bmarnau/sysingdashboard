# BSF-03 – Runtime/UI „Meine Kunden"

Stand: 2026-09-13\
Issue: #105\
Ausgangsbasis: GitHub `main` `34e20848f6a49b1c7b96fe4761bb76d928e083d7` (nach Merge PR #127)\
Voraussetzung: BSF-03 DB-/Security-Fundament (P1/P2) gemergt, siehe
`docs/BSF-03-P1-TARGET-VALIDATION-2026-09-13.md`.

## 1. Scope

Erster kundenbezogener Arbeitspfad gemäß `docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md` §10:

`Meine Kunden -> Kunde öffnen -> zulässige Projekte -> Arbeitspakete -> Tätigkeiten`

Die Ansicht ist nur lesend. Enthalten sind der eigene Verantwortungsstatus, der
Zeitpunkt der Verantwortung sowie der wirksame Kundenzugriff als Anzeige
„Nur Lesen" / „Schreibzugriff". Der Zugriffsindikator erzeugt selbst keine
Schreibberechtigung.

**Nicht** enthalten: Verantwortungsverwaltung (Vergabe/Änderung/Beendigung),
Schreibpfade, ein Management-Read auf fremde Verantwortlichkeiten,
Datenbank-/RLS-/Grant-/Migrationsänderungen oder Änderungen an
`src/integrations/supabase/client.ts` / `previewAuthStorage.ts`.

## 2. Architektur

```text
Browser (authenticated route)
  -> TanStack Server Function (requireSupabaseAuth, User-JWT)
     -> dashboard.view (has_permission)
     -> Supabase im Benutzerkontext: Grants + RLS
        -> customer_responsibility (eigene aktive Zeilen)
        -> customer_access (eigener aktiver Read-/Write-Zugriff)
        -> customer (nur im zulässigen Scope)
        -> is_my_customer(...) je Kandidat (autoritative Schnittmenge)
        -> Shared Projection Read (bestehender BSF-02C-Pfad)
```

| Schicht | Datei | Rolle |
| --- | --- | --- |
| Fachlogik (providerneutral) | `src/lib/customer-data/my-customers.ts` | Typen, Port `MyCustomersRepository`, fail-closed Auswahl, wirksamer Zugriff, Projektionsbaum |
| Provider (Supabase, User-Client) | `src/integrations/supabase/my-customers-adapter.ts` | eigene Responsibilities, eigener Customer Access, `is_my_customer`, Kundenkopf |
| Runtime | `src/lib/customer-data-runtime/my-customers.functions.ts` | `listMyCustomersFn`, `readMyCustomerDetailFn` |
| Routes | `src/routes/_authenticated/meine-kunden/index.tsx`, `.../$systemhouseId.$customerId.tsx` | geschützte Liste und Detailroute mit beiden Scope-IDs |
| UI | `src/components/customers/*` | Liste, Badges, Detailbaum, Laden/Leer/Fehler/Nicht verfügbar |
| Navigation | `src/routes/_authenticated/dashboard.tsx` | Link „Meine Kunden" in der Bereichsleiste (`dashboard.view`) |

Sicherheitsvertrag, wie umgesetzt:

- Identität ausschließlich aus dem validierten Bearer-Token (`context.userId`); keine
  clientseitig vorgetäuschte Rolle erzeugt Serverrechte.
- Kein Service-Role-/Admin-Client im Benutzerpfad.
- Sichtbarkeit = aktive Responsibility ∩ aktive Systemhouse-Membership ∩ aktiver
  Customer Access >= read ∩ `dashboard.view`.
- Responsibility allein öffnet keine Kundendaten; Customer Access allein erzeugt
  keinen Eintrag unter „Meine Kunden".
- Liste = RLS-Kandidaten ∩ `is_my_customer` je Tupel; Bestätigungsfehler → Ausschluss.
- Detail: `is_my_customer` vor jedem Datenzugriff; Ablehnung ist datenfrei und
  identisch für fremde, beendete oder unbekannte IDs (keine Existenzaussage).
- Ungültige URL-Parameter erzeugen keinen fachlichen Datenzugriff.
- Projektionsdaten laufen ausschließlich über den bestehenden Shared-Projection-Read.
- Verantwortung erweitert keine Rechte; die UI bietet keine Schreibaktionen.

Bekannte technische Grenze: pro Kandidat ein `is_my_customer`-RPC (Kandidaten auf
500 begrenzt). Eine gebündelte DB-Funktion wäre effizienter, ist aber für P3/P4
nicht erforderlich und würde eine eigene DB-/Security-Änderung darstellen.

## 3. Tests und Abnahmenachweis

| ID / Bereich | Nachweis | Datei / Lauf | Ergebnis |
| --- | --- | --- | --- |
| M01–M08 | fail-closed Auswahl, Deduplizierung, Zugriff, Projekt → AP → Tätigkeit | `src/__tests__/lib/my-customers.test.ts` | PASS |
| M09–M13 | Auth-Middleware, keine Service Role, Scope-IDs, generische Ablehnung, read-only Adapter | `src/__tests__/security/my-customers-functions.test.ts` | PASS |
| UI / A11y | Laden/Leer/Fehler/Denied/Ready, Badges, Links, keine Editier-Steuerelemente, axe | `src/__tests__/components/MyCustomersView.test.tsx` | PASS |
| E2E 1–12 | read/write, Access ohne Responsibility, Responsibility ohne Access, IDOR, Cross-Systemhouse, ended Responsibility, Membership, Viewer, Client-Rollenmanipulation, Empty/Error | `e2e/specs/security/my-customers-visibility.spec.ts` | PASS |
| E2E Harness | synthetische `_serverFn`-Grenze bildet ausschließlich die bereits serverseitig getroffene Entscheidung ab; keine Produktlogik / kein Auth-Bypass | `e2e/fixtures/my-customers-e2e.ts` | PASS |
| Playwright gesamt | 15 neue BSF-03-Fälle; gesamte lokale Chromium-Suite | Lovable P4 | 69/69 PASS |
| Vitest | Unit-/Komponenten-/Security-Suite | Lovable P4 | 696 PASS, 4 todo |
| Build / statische Gates | TypeScript, ESLint, Prettier, Build, docs, RBAC, No-Console | Lovable P4 | PASS |
| Security / A11y / Debt | Security-Scan, Accessibility, Technical Debt / Quality Gate | Lovable P4 | PASS / 0 Blocker |

Die Datenbank-Zeilengrenze selbst (R01–R18 sowie T0–T12) ist unverändert durch
`supabase/tests/bsf-03-customer-responsibility-rls.sql` und den P1/P2-Nachweis
aus PR #127 abgedeckt. P3/P4 verändern DB, RLS, Grants und Functions nicht.

Der verbindliche finale Abnahmenachweis für die Integration ist zusätzlich die
vollständig grüne GitHub-Exact-Head-CI des Draft-PR #128.

## 4. Dokumentation und Version

- Handbuch-Topic `meine-kunden` in `src/lib/help-documentation.ts`.
- `CHANGELOG.md`: Dashboard-Version **1.60.0**, inklusive E2E-Nachweis.
- `docs/PROJECT-STATUS.yaml`: Dashboard-Version **1.60.0**.
- `docs/CURRENT-STATUS.md` verweist auf dieses Dokument.
- Kein zusätzlicher Patch-Versionssprung für P4: P4 vervollständigt Test- und
  Integrationsnachweise derselben noch nicht gemergten Runtime-Funktion 1.60.0.

## 5. Offene Punkte / Folgeauftrag

1. **BSF-03 P5 – Kundenverantwortung verwalten**: Anzeige, Zuweisen/Ändern und
   Beenden im Kundendetail für `customer.responsibility.manage`; Historie bleibt erhalten.
2. Dafür ist ein eigener, minimaler Manager-Read-Vertrag für zulässige Kandidaten
   desselben Systemhauses erforderlich. Die bestehenden Self-only-Regeln auf
   `profiles`, `user_roles` und `systemhouse_membership` werden nicht verbreitert.
3. Optional später: gebündelte `is_my_customer`-Auswertung zur Performanceoptimierung;
   kein Funktions- oder Security-Blocker für P3/P4.

## 6. P3/P4-Abgrenzung

P3/P4 schließen ausschließlich die lesende Arbeitsansicht „Meine Kunden" ab.
BSF-03 insgesamt ist damit noch **nicht DONE**. Die fachliche Kette wird erst nach
P5 vollständig: Verantwortung anzeigen → zuweisen/übertragen/beenden → Wirkung in
„Meine Kunden" nachweisen.
