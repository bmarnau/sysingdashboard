# BSF-02C Phase B2 – Transaktionale Shared-Projection-Publish-RPC

Stand: 2026-09-06
Issue: #88
ADR: `docs/ADR/0032-bsf-02c-shared-projection.md`

## 1. Ausgangsproblem

Der vorbereitete BSF-02C-Runtime-Adapter publizierte einen vollständigen Shared-Projection-Snapshot über mehrere getrennte Data-API-Aufrufe. Grants und RLS sicherten jeden Einzelaufruf ab, bildeten Project-/WorkPackage-/Activity-Upserts und Soft-Withdraws aber nicht zu einer gemeinsamen Datenbanktransaktion zusammen.

Damit bestand eine Atomicity Gap: Ein früher erfolgreicher Project-Write hätte bestehen bleiben können, obwohl ein späterer WorkPackage- oder Activity-Schritt desselben fachlichen Publish-Vorgangs fehlschlägt. Phase B2 schließt ausschließlich diese Lücke.

## 2. Additive Migration

Migration:

`supabase/migrations/20260904041745_5bfaeb5b-147b-4f8d-a6e3-4705c6233a15.sql`

Die bereits angewendete Phase-A-Migration wurde nicht verändert. Bestehende Tabellen, Table-Grants, RLS-Policies, Identity-Guards und FK-/Unique-Constraints wurden nicht gelockert.

## 3. Function Contract

Funktion:

`public.bsf02c_publish_shared_projection_snapshot(uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[])`

Parameter:

- `p_systemhouse_id uuid`
- `p_customer_id uuid`
- `p_mode text` (`structure` oder `activities`)
- `p_snapshot_complete boolean`
- `p_projects jsonb`
- `p_work_packages jsonb`
- `p_activities jsonb`
- `p_observed_project_source_ids text[]`
- `p_observed_work_package_source_ids text[]`
- `p_observed_activity_source_ids text[]`

`snapshot_complete` muss `true` sein. Actor und `published_by` werden ausschließlich aus `auth.uid()` abgeleitet. Interne Parent-Projection-UUIDs werden nicht als vertrauenswürdige Client-Eingaben akzeptiert.

## 4. Security Boundary

Die Funktion ist `SECURITY INVOKER`; `search_path` ist auf `public` fixiert.

Function-EXECUTE:

- `PUBLIC`: entzogen
- `anon`: entzogen
- `authenticated`: gezielt gewährt

Der normale Runtime-Pfad bleibt:

Browser → authentifizierte Server Function → derselbe User-JWT → Supabase RPC → bestehende Table-Grants + RLS.

Es wird keine Service Role im normalen Publish-Pfad verwendet. RLS bleibt eine aktive Security Boundary.

## 5. Betriebsarten

### `structure`

Erforderlich:

- `auth.uid()` vorhanden
- aktives Konto
- aktive Systemhouse-Membership
- Customer Access `write` im exakt adressierten `(systemhouse_id, customer_id)`-Scope
- `dashboard.view`
- `project.edit`
- bei enthaltenen Activities zusätzlich `activity.edit`

Erlaubt sind Project-/WorkPackage-Upserts, eigene Activity-Upserts und publisher-eigene Reconciliation.

### `activities`

Erforderlich:

- authentifizierter Actor
- aktives Konto
- aktive Membership
- Customer Access `write`
- `dashboard.view`
- `activity.edit`

Project-/WorkPackage-Payload sowie Project-/WorkPackage-Reconciliation werden fail-closed abgewiesen. Der Modus erlaubt ausschließlich eigene Activities.

## 6. Parent-Auflösung

Parent-Referenzen werden serverseitig über `source_id` aufgelöst:

- WorkPackage → Project
- Activity → WorkPackage

Die Auflösung ist auf exakt denselben `(systemhouse_id, customer_id)`-Scope begrenzt und berücksichtigt nur aktive Parent-Projections. Fehlende, fremde oder nicht sichtbare Parents führen zu einem Fehler.

## 7. Publisher- und Engineer-Bindung

`published_by` wird ausschließlich aus `auth.uid()` gesetzt.

Für Activities gilt zusätzlich:

- persistierter `engineer_id = auth.uid()`
- abweichende `engineer_id` im JSON → DENY
- fremde Publisher-Projections dürfen weder überschrieben noch withdrawn werden

Die bestehenden Identity-Guards aus Phase A bleiben wirksam.

## 8. Reconciliation und Soft Withdraw

Reconciliation verwendet keine Hard Deletes.

Soft Withdraw erfolgt nur für aktive Zeilen, die:

- zum gleichen Systemhouse/Customer gehören,
- `published_by = auth.uid()` besitzen,
- in der vollständigen jeweiligen `observed_*_source_ids`-Menge nicht mehr vorkommen.

Dabei werden `is_active=false` und `withdrawn_at` gesetzt. Fremde Publisher bleiben unberührt. Skipped/unresolved Sources müssen weiterhin in den observed-Mengen geführt werden.

## 9. Source Revision und Hash

Vertrag:

- neue Source → `source_revision = 1`
- gleicher `source_hash` → Revision unverändert
- geänderter `source_hash` → Revision exakt `+1`
- Reaktivierung → `is_active=true`, `withdrawn_at=NULL`

## 10. Reproduzierbares Testartefakt T31–T51

Persistentes Artefakt:

`supabase/tests/bsf-02c-transactional-publish-rpc.sql`

Eigenschaften:

- äußerer `BEGIN` / `ROLLBACK`
- fail-fast Assertions
- ausschließlich synthetische `bsf02c-b2-*@example.invalid`-Identitäten
- B2-spezifische Test-UUIDs und Source-IDs
- JWT-/Rollen-Simulation über `SET LOCAL ROLE authenticated` und `request.jwt.claims`
- keine dauerhaften Testdaten

Matrix:

- T31 exakte Function-Signatur
- T32 `SECURITY INVOKER` + fixierter `search_path`
- T33 PUBLIC EXECUTE DENY
- T34 anon EXECUTE DENY
- T35 authenticated EXECUTE ALLOW + RLS-/Grant-Regression-Guards
- T36 `auth.uid() IS NULL` DENY
- T37 fehlende Membership DENY
- T38 fehlender Customer-Write-Zugriff DENY
- T39 `structure` ohne `project.edit` DENY
- T40 `activities` mit Struktur-Payload/-Reconciliation DENY; unvollständiger Snapshot DENY
- T41 eigener Engineer-Activity-Publish gegen zulässigen Parent PASS
- T42 fremde `engineer_id` DENY
- T43 fehlender/unzulässiger Parent DENY
- T44 Cross-Customer DENY
- T45 Cross-Systemhouse DENY
- T46 beobachtete Source bleibt aktiv
- T47 fehlende eigene Source wird soft-withdrawn
- T48 fremder Publisher bleibt unverändert / Übernahmeversuch DENY
- T49 gleicher Hash → Revision stabil
- T50 geänderter Hash → Revision +1
- T51 vollständiger Atomic-Rollback-Nachweis

### T51 – Atomizitätsnachweis

T51 ruft die RPC einmal mit einem Payload auf, der zuerst einen gültigen neuen Project-Write enthält und danach einen absichtlich ungültigen WorkPackage-Schritt mit nicht auflösbarem Parent ausführt.

Der erwartete Fehler wird in einem PL/pgSQL-Exception-Subblock abgefangen. Direkt danach, noch vor dem äußeren Test-`ROLLBACK`, wird geprüft, dass weder der frühe Project-Write noch ein WorkPackage-Teilwrite existiert.

Ergebnis am 2026-09-06: PASS. Der frühe Project-Write wurde bereits durch den fehlgeschlagenen RPC-Aufruf zurückgerollt und verschwand nicht erst durch den äußeren Test-`ROLLBACK`.

### T31-Testhärtung

`pg_get_function_identity_arguments()` rendert in diesem Projekt Parameternamen zusammen mit den Typen. Die zunächst angelegte types-only-Stringprüfung war deshalb ein reiner Testharness-Fehler. Das persistente Artefakt prüft die exakte Signatur nun robust über:

`to_regprocedure('public.bsf02c_publish_shared_projection_snapshot(uuid,uuid,text,boolean,jsonb,jsonb,jsonb,text[],text[],text[])')`

Nach dieser Korrektur wurde die **gespeicherte Branch-Fassung** des Testartefakts erneut als ein kompletter SQL-Batch ausgeführt. Für den SQL-API-Runner wurden ausschließlich die psql-Metakommandos `\set` und `\echo` ausgelassen. Alle echten SQL-Statements von `BEGIN` bis `ROLLBACK` liefen unverändert und ohne Fehler bis zum regulären Rollback.

## 11. Rollback und Residuen

Nach dem finalen gespeicherten T31–T51-Lauf wurde der äußere `ROLLBACK` regulär ausgeführt.

Separate read-only Nachprüfung: jeweils 0 Residuen für

- `auth.users` mit `bsf02c-b2-%@example.invalid`
- Test-Profiles
- Test-User-Rollen
- Test-Systemhäuser
- Test-Kunden
- Test-Memberships
- Test-Customer-Access-Zuordnungen
- Project-Projections `BSF02C-B2-%`
- WorkPackage-Projections `BSF02C-B2-%`
- Activity-Projections `BSF02C-B2-%`

## 12. Generierte Supabase-Typen

`src/integrations/supabase/types.ts` enthält den RPC-Typ mit den zehn Parametern und `Returns: Json` korrekt. Gegen den Pre-Implementation-Stand besteht ausschließlich der notwendige RPC-Eintrag; keine Vollregenerierung oder formatterartige Nebenänderung ist erforderlich.

## 13. Security Advisor / Sicherheitsnachprüfung

Ein erneuter offizieller Supabase-Security-Advisor-Aufruf konnte am 2026-09-06 über den verfügbaren Connector wegen fehlender Advisor-Berechtigung nicht ausgeführt werden.

Als zusätzliche read-only Sicherheitsnachprüfung wurde live bestätigt:

- B2-Funktion ist nicht `SECURITY DEFINER`
- `anon` besitzt kein EXECUTE auf der B2-RPC
- keine DELETE-/ALL-Policy auf den drei Shared-Projection-Tabellen
- RLS bleibt auf allen drei Tabellen aktiv
- die bekannte SEC-01-Baseline umfasst weiterhin genau die beiden ausführbaren `SECURITY DEFINER`-Funktionen `avkk_can_write` und `avkk_people_directory`
- keine neue BSF-02C-bezogene Definer-/anon-Exposition festgestellt

Die bekannten SEC-01-Findings liegen außerhalb dieses Scope und wurden nicht verändert.

## 14. Referenzen und finaler Work Delta

- Pre-Implementation-Head: `0ef5aeb959c9947cc3e951c3036a79582ce324d7`
- B2-Migrationsstand / Lovable Edit: `ccdc9e8858c579f5f8273997a9847eb88a68bb65` / `edt-f3d15052-9f77-4635-a1dd-9814d8aa54bc`
- Testartefakt-Commit: `d2a4a7814cbe31361dd730a5b7bbb7ce68c34372`
- isolierter Integrationsbranch: `bsf/02c-phase-b2-transaction-rpc`
- T31-Harness-Korrektur: `24e7cc583a8f83fd792a08f87666a0f0764dd503`

Der finale fachliche B2-Delta gegen `0ef5aeb...` umfasst genau vier Dateien:

1. `supabase/migrations/20260904041745_5bfaeb5b-147b-4f8d-a6e3-4705c6233a15.sql`
2. `src/integrations/supabase/types.ts` – ausschließlich der notwendige RPC-Eintrag
3. `supabase/tests/bsf-02c-transactional-publish-rpc.sql`
4. `docs/BSF-02C-PHASE-B2-TRANSACTION-RPC.md`

Die Lovable-Preview/Auth-Overlays `src/integrations/supabase/client.ts` und `src/integrations/supabase/previewAuthStorage.ts` sind nicht Teil dieses Deltas.

## 15. Restrisiko / formaler Restpunkt

Die fachliche, RLS-bezogene und transaktionale Abnahme T31–T51 einschließlich des T51-Atomizitätsnachweises ist vollständig bestanden. Das persistente Testartefakt ist korrigiert und in seiner gespeicherten Fassung erfolgreich reproduziert worden; Residuen sind 0.

Offen bleibt ausschließlich der **offizielle Supabase-Security-Advisor-Rerun**, weil der derzeit verfügbare Connector dafür keine Berechtigung besitzt. Die separate strukturelle Live-Nachprüfung zeigt keine neue BSF-02C-Sicherheitsexposition.

Nach dem verbindlichen Abnahmekriterium dieser Phase wird deshalb noch nicht `READY FOR PR` erklärt, bis der offizielle Advisor-Lauf verfügbar und ohne neue BSF-02C-Warnung abgeschlossen ist.
