# BSF-02C Phase B2 – Transaktionale Shared-Projection-Publish-RPC

Stand: 2026-09-06
Issue: #88
ADR: `docs/ADR/0032-bsf-02c-shared-projection.md`

## 1. Ausgangsproblem

Der in BSF-02C Phase B vorbereitete Runtime-Adapter publiziert einen vollständigen Shared-Projection-Snapshot über mehrere getrennte Data-API-Aufrufe: Project-Upsert, WorkPackage-Upsert, Activity-Upsert sowie die jeweiligen Soft-Withdraw-Schritte. Grants und RLS sichern jeden Einzelaufruf ab, bilden diese Aufrufe aber nicht zu einer gemeinsamen Datenbanktransaktion zusammen.

Damit bestand eine Atomicity Gap: Ein früher erfolgreicher Project-Write hätte bestehen bleiben können, obwohl ein späterer WorkPackage- oder Activity-Schritt desselben fachlichen Publish-Vorgangs fehlschlägt.

Phase B2 schließt ausschließlich diese Lücke.

## 2. Additive Migration

Die Implementierung erfolgt über die additive Migration:

`supabase/migrations/20260904041745_5bfaeb5b-147b-4f8d-a6e3-4705c6233a15.sql`

Die bereits angewendete Phase-A-Migration wurde nicht verändert. Bestehende Tabellen, Table-Grants, RLS-Policies und Identity-/FK-Constraints wurden nicht gelockert.

## 3. Function Contract

Funktion:

`public.bsf02c_publish_shared_projection_snapshot(uuid, uuid, text, boolean, jsonb, jsonb, jsonb, text[], text[], text[])`

Fachliche Parameter:

- `p_systemhouse_id uuid`
- `p_customer_id uuid`
- `p_mode text` mit `structure` oder `activities`
- `p_snapshot_complete boolean`
- `p_projects jsonb`
- `p_work_packages jsonb`
- `p_activities jsonb`
- `p_observed_project_source_ids text[]`
- `p_observed_work_package_source_ids text[]`
- `p_observed_activity_source_ids text[]`

`snapshot_complete` muss `true` sein. Der Actor und `published_by` werden nicht als vertrauenswürdige Clientparameter akzeptiert, sondern aus `auth.uid()` abgeleitet. Interne Parent-Projection-UUIDs werden ebenfalls nicht vom Client übernommen.

## 4. Security Boundary

Die Funktion ist `SECURITY INVOKER` und läuft damit mit den Rechten des aufrufenden Benutzers. `search_path` ist auf `public` fixiert.

Function-EXECUTE:

- `PUBLIC`: entzogen
- `anon`: entzogen
- `authenticated`: gezielt gewährt

Der normale Runtime-Pfad bleibt:

Browser → authentifizierte Server Function → derselbe User-JWT → Supabase RPC → bestehende Table-Grants + RLS.

Es wird keine Service Role im normalen Publish-Pfad verwendet. Die vorhandene RLS bleibt eine aktive Security Boundary.

## 5. Betriebsarten

### `structure`

Erforderlich sind:

- authentifizierter Actor (`auth.uid()`)
- aktives Konto
- aktive Systemhouse-Membership
- Customer Access `write` im exakt adressierten `(systemhouse_id, customer_id)`-Scope
- `dashboard.view`
- `project.edit`
- bei enthaltenen Activities zusätzlich `activity.edit`

Erlaubt sind Project-/WorkPackage-Upserts, eigene Activity-Upserts und publisher-eigene Reconciliation.

### `activities`

Erforderlich sind:

- authentifizierter Actor
- aktives Konto
- aktive Membership
- Customer Access `write`
- `dashboard.view`
- `activity.edit`

Project-/WorkPackage-Payload und Project-/WorkPackage-Reconciliation werden fail-closed abgewiesen. Dieser Modus erlaubt ausschließlich eigene Activities.

## 6. Parent-Auflösung

Parent-Referenzen werden serverseitig anhand der fachlichen `source_id` aufgelöst.

- WorkPackage → Project
- Activity → WorkPackage

Die Auflösung ist auf exakt denselben `(systemhouse_id, customer_id)`-Scope begrenzt und berücksichtigt nur aktive Parent-Projections. Ein fehlender, fremder oder nicht sichtbarer Parent führt zu einem Fehler; es wird keine Parent-ID geraten oder aus einem fremden Scope übernommen.

## 7. Publisher- und Engineer-Bindung

`published_by` wird ausschließlich aus `auth.uid()` gesetzt.

Für Activities gilt zusätzlich:

- persistierter `engineer_id = auth.uid()`
- ein im JSON angegebener abweichender `engineer_id` wird abgewiesen
- fremde Publisher-Projections dürfen weder überschrieben noch withdrawn werden

Die bestehenden Identity-Guards der Phase-A-Tabellen bleiben wirksam.

## 8. Reconciliation und Soft Withdraw

Reconciliation löscht keine Zeilen hart.

Soft Withdraw erfolgt nur für Zeilen, die:

- zum gleichen Systemhouse und Customer gehören,
- `published_by = auth.uid()` besitzen,
- aktuell aktiv sind,
- in der vollständigen jeweiligen `observed_*_source_ids`-Menge nicht mehr enthalten sind.

Dabei werden `is_active=false` und `withdrawn_at` gesetzt. Fremde Publisher bleiben unberührt. Skipped/unresolved Sources müssen weiterhin in den observed-Mengen geführt werden und werden deshalb nicht allein wegen fehlender Publizierbarkeit zurückgezogen.

## 9. Source Revision und Hash

Der bestehende Vertrag bleibt erhalten:

- neue Source → `source_revision = 1`
- gleicher `source_hash` → Revision unverändert
- geänderter `source_hash` → Revision exakt `+1`
- Reaktivierung setzt `is_active=true` und `withdrawn_at=NULL`

## 10. Reproduzierbares Testartefakt T31–T51

Persistentes Testartefakt:

`supabase/tests/bsf-02c-transactional-publish-rpc.sql`

Eigenschaften:

- äußerer `BEGIN` / `ROLLBACK`
- fail-fast Assertions
- ausschließlich synthetische `bsf02c-b2-*@example.invalid`-Identitäten
- feste B2-spezifische Test-UUIDs und Source-IDs
- JWT-/Rollen-Simulation mit `SET LOCAL ROLE authenticated` und `request.jwt.claims`
- keine dauerhaften Testdaten

Die Matrix deckt T31–T51 ab:

- T31 exakte Function-Signatur
- T32 `SECURITY INVOKER` und fixierter `search_path`
- T33 PUBLIC EXECUTE DENY
- T34 anon EXECUTE DENY
- T35 authenticated EXECUTE ALLOW sowie RLS-/Grant-Regression-Guards
- T36 `auth.uid() IS NULL` DENY
- T37 fehlende Membership DENY
- T38 fehlender Customer-Write-Zugriff DENY
- T39 `structure` ohne `project.edit` DENY
- T40 `activities` mit Struktur-Payload/-Reconciliation DENY
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

T51 ruft die RPC genau einmal mit einem Payload auf, der zuerst einen gültigen neuen Project-Write enthält und danach einen absichtlich ungültigen WorkPackage-Schritt mit nicht auflösbarem Parent ausführt.

Der erwartete RPC-Fehler wird in einem PL/pgSQL-Exception-Subblock abgefangen. Direkt danach, noch vor dem äußeren Test-`ROLLBACK`, wird geprüft, dass weder der frühe Project-Write noch ein WorkPackage-Teilwrite existiert.

Am 2026-09-06 wurde diese Matrix real gegen den verbundenen Supabase-Kontext ausgeführt. Der fail-fast Batch erreichte den regulären äußeren `ROLLBACK`; T31–T51 waren PASS. T51 bestätigte dabei ausdrücklich, dass der frühe Project-Write bereits durch den fehlgeschlagenen RPC-Aufruf zurückgerollt worden war und nicht erst durch den äußeren Test-`ROLLBACK` verschwand.

Hinweis zur T31-Testhärtung: `pg_get_function_identity_arguments()` rendert in diesem Projekt die Parameternamen zusammen mit den Typen. Eine types-only-Stringprüfung wäre daher ein Harness-Fehler. Für die reale Abnahme wurde die exakte Signatur robust über `to_regprocedure('public.bsf02c_publish_shared_projection_snapshot(uuid,uuid,text,boolean,jsonb,jsonb,jsonb,text[],text[],text[])')` verifiziert. Das persistente Artefakt ist entsprechend auf diese robuste Prüfung zu bringen.

## 11. Rollback und Residuen

Nach dem realen T31–T51-Lauf wurde der äußere Test-`ROLLBACK` regulär ausgeführt.

Eine separate read-only Nachprüfung ergab jeweils 0 Residuen für:

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

`src/integrations/supabase/types.ts` enthält den RPC-Typ mit den zehn Parametern und `Returns: Json` bereits korrekt. Gegen den Pre-Implementation-Stand besteht hierfür nur der notwendige RPC-Eintrag; keine Vollregenerierung oder formatterartige Nebenänderung ist erforderlich.

## 13. Security Advisor / Sicherheitsnachprüfung

Ein erneuter offizieller Supabase-Advisor-Aufruf konnte am 2026-09-06 über den verfügbaren Connector wegen fehlender Advisor-Berechtigung nicht ausgeführt werden.

Die Live-Datenbank wurde deshalb zusätzlich read-only gegen die relevanten Advisor-Verträge geprüft:

- B2-Funktion ist nicht `SECURITY DEFINER`
- anon besitzt kein EXECUTE auf der B2-RPC
- keine DELETE-/ALL-Policy auf den drei Shared-Projection-Tabellen
- RLS bleibt auf allen drei Tabellen aktiv
- die bekannte SEC-01-Baseline umfasst weiterhin genau die beiden ausführbaren `SECURITY DEFINER`-Funktionen `avkk_can_write` und `avkk_people_directory`
- keine neue BSF-02C-bezogene Definer-/anon-Exposition wurde festgestellt

Die bekannten SEC-01-Findings liegen außerhalb des BSF-02C-Scope und wurden nicht verändert.

## 14. Referenzen und Work Delta

- Pre-Implementation-Head: `0ef5aeb959c9947cc3e951c3036a79582ce324d7`
- B2-Migrationsstand / Lovable Edit: `ccdc9e8858c579f5f8273997a9847eb88a68bb65` / `edt-f3d15052-9f77-4635-a1dd-9814d8aa54bc`
- Testartefakt-Commit: `d2a4a7814cbe31361dd730a5b7bbb7ce68c34372`
- isolierter Integrationsbranch: `bsf/02c-phase-b2-transaction-rpc`

Der fachliche B2-Delta darf ausschließlich aus folgenden Dateien bestehen:

1. `supabase/migrations/20260904041745_5bfaeb5b-147b-4f8d-a6e3-4705c6233a15.sql`
2. `src/integrations/supabase/types.ts` – ausschließlich der notwendige RPC-Eintrag
3. `supabase/tests/bsf-02c-transactional-publish-rpc.sql`
4. `docs/BSF-02C-PHASE-B2-TRANSACTION-RPC.md`

Die Lovable-Preview/Auth-Overlays `src/integrations/supabase/client.ts` und `src/integrations/supabase/previewAuthStorage.ts` gehören nicht zum B2-Produktdelta.

## 15. Restrisiken / formaler Restpunkt

Die fachliche und transaktionale Live-Abnahme T31–T51 einschließlich T51 ist erfolgreich. Für einen vollständig reproduzierbaren Repository-Nachweis muss die persistente T31-Assertion noch auf die bereits real verwendete robuste `to_regprocedure(...)`-Prüfung korrigiert und das so korrigierte Artefakt nochmals als exakter gespeicherter Batch ausgeführt werden.

Zusätzlich bleibt ein offizieller Supabase-Advisor-Rerun offen, solange der verwendete Connector dafür keine Berechtigung besitzt. Die durchgeführte strukturelle Live-Nachprüfung zeigt jedoch keine neue BSF-02C-Sicherheitsexposition.

Bis diese beiden formalen Nachweise geschlossen sind, ist der Branch technisch weitgehend abgenommen, aber noch nicht als vollständig `READY FOR PR` zu kennzeichnen.
