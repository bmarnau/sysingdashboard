# BSF-KIOSK-01 — Abschluss- und Abnahmenachweis

Stand: 2026-09-16  
Status: **IMPLEMENTATION COMPLETE / TARGET MIGRATION APPLIED / FINAL ACCEPTANCE PENDING**  
Issue: #135  
Pull Request: #141  
Branch: `feat/bsf-kiosk-01-demo-pilot`

## 1. Ziel und Scope

BSF-KIOSK-01 liefert einen frühen, intern nutzbaren Info-Kiosk-Demo-Piloten, ohne spätere Integrationen oder produktive Fremddaten vorwegzunehmen.

Umgesetzt sind insbesondere:

- dedizierte Route `/kiosk`,
- großflächige read-only Kiosk-Darstellung,
- austauschbare `KioskDataProvider`-Grenze,
- lokaler, versionierter, synthetischer Demo-Datensatz,
- validierter JSON-Demoimport mit `schemaVersion = sysing.kiosk.demo.v1`,
- explizite Zustände für Demo, leer, unbekannt, nicht geladen und Fehler,
- sichtbare Kennzeichnung `DEMO-DATEN — KEINE LIVE-DATEN`,
- dediziertes Supabase-Kiosk-Konto,
- technische Rolle `kiosk` mit ausschließlich `kiosk.view`,
- serverseitig erzwungene Rollenexklusivität,
- Beschränkung des Kiosk-Kontos auf `/kiosk`,
- Idle-Logout-Ausnahme nur für die Rolle `kiosk` auf `/kiosk`,
- fortbestehende Auth-/Token-, Aktiv-/Sperr- und manuelle Logout-Prüfungen,
- periodischer Session-Watchdog mit fail-closed Verhalten,
- schmale administrative Provisionierung eines Kiosk-Kontos im Bereich `Backend & Auth-Konten`,
- keine eingebetteten Zugangsdaten, keine MFA-Umgehung und keine produktive externe Integration.

Nicht Teil von BSF-KIOSK-01 sind produktiver Microsoft Graph, SharePoint, Exchange, PRTG, MCP, Agenten/NAVIS oder ein eigener Kiosk-Fachdatenbestand.

## 2. Sicherheits- und Betriebsvertrag

Der Kiosk ist keine anonyme oder privilegierte Umgehung der normalen Anwendungssicherheit.

Verbindlich gelten:

- Das Kiosk-Konto wird regulär authentifiziert.
- Die Rolle `kiosk` ist technisch exklusiv und erhält nur `kiosk.view`.
- Generische Rollenvergabe darf `kiosk` nicht als normale Fachrolle zuweisen.
- Kiosk-Sitzungen werden periodisch auf gültige Authentifizierung und aktiven Kontostatus geprüft.
- Bei ungültiger oder deaktivierter Sitzung erfolgt Logout; bei nicht bestätigbarer Sicherheitslage werden Kioskdaten fail-closed ausgeblendet.
- Das Kiosk-Konto darf den Demo-Datensatz nicht selbst erzeugen, importieren oder verändern.
- Die administrative Kiosk-Provisionierung verwendet ausschließlich die geschützte Serverfunktion; Passwörter werden weder geloggt noch dokumentiert noch in der UI angezeigt.
- Datenbankänderungen werden ausschließlich über versionierte, forward-only Migrationen abgebildet.
- Die zentrale Permission-Funktion `public.has_permission(uuid,text)` bleibt `SECURITY INVOKER`; KIOSK-01 darf diesen bestehenden Sicherheitsvertrag nicht auf `SECURITY DEFINER` zurücksetzen.
- Der allgemeine produktive Import bleibt BSF-05A vorbehalten; KIOSK-01 besitzt nur den schmalen synthetischen Demoimport.

## 3. TDD- und Fehlerkorrektur-Evidenz

### 3.1 Administrative Kiosk-Provisionierung

Im Review wurde festgestellt, dass die geschützte serverseitige Provisionierung bereits vorhanden war, die vorgesehene schmale Admin-UI jedoch fehlte.

TDD-Nachweis:

1. RED-Commit `2f7d033a572c7289a9226281b14681a7f50441aa` — `test(kiosk): define admin provisioning UI contract`
2. GREEN-Commit `ed0a388f212267ceb3070ea1f37ce6ca4ca3c695` — `feat(kiosk): add admin provisioning form`
3. Formatkorrektur `8a672ef9260a1a467be1884724e82813b4e98c1b` — ausschließlich Prettier-Anpassung
4. Unit-/Component-, Security- und Full-CI-Gates anschließend PASS.

Die UI ruft ausschließlich `createKioskAuthAccount` auf. RBAC-, RLS-, Migrations- und Routinglogik wurden durch diesen UI-Fix nicht erweitert.

### 3.2 Kiosk-Rollenmatrix / Redirect

Der frühere Playwright-Fehler im Rollenmatrix-Test war ein Synchronisationsproblem des Tests: Der clientseitige Redirect `/dashboard` → `/kiosk` war korrekt, wurde im betroffenen Test aber unmittelbar nach `page.goto()` ausgewertet.

Minimaler Fix:

- Commit `92c74108381f0d92fd8a9365845c36d20d3c9bb9`
- nur Testwartebedingung auf den bereits vorhandenen Redirect ergänzt,
- keine Produkt-, Auth-, RBAC- oder Routinglogik verändert.

Der vollständige Playwright-Lauf auf dem zugehörigen Implementierungs-Head ist PASS.

### 3.3 Demo-JSON und Runtime-Baseline

Der versionierte Referenzdatensatz `docs/examples/kiosk-demo-dataset-v1.json` und die eingebaute Default-Demoquelle waren zwischenzeitlich semantisch auseinander gelaufen. Ein permanenter Vertragstest wurde ergänzt und die Runtime-Baseline exakt an den Referenzdatensatz angeglichen. Damit ist die Referenzdatei zugleich Vertrag, Default-Demodatensatz und Testfixture.

### 3.4 Security-Invoker-Regressionsschutz und DB-SOT

Bei der formalen Endabnahme am 2026-09-16 wurde ein sicherheitsrelevanter Migrationsdrift entdeckt, bevor die Kiosk-Migrationen auf die verbundene Supabase-Instanz angewendet wurden:

- Die verbundene Vor-Kiosk-Datenbank führte `public.has_permission(uuid,text)` als `SECURITY INVOKER` (`prosecdef=false`).
- Die ursprüngliche Kiosk-Migration `20260914062100_bsf_kiosk_01_permission_and_exclusivity.sql` hätte dieselbe Funktion unbeabsichtigt wieder als `SECURITY DEFINER` angelegt.
- Bei unveränderten Execute-Rechten für `authenticated` hätte dies voraussichtlich einen zusätzlichen Advisor-Fund vom bekannten Typ `0029_authenticated_security_definer_function_executable` erzeugt.

Die Korrektur wurde testgetrieben und forward-only umgesetzt:

1. RED-Commit `193d0e51cdfaa3cb8dddec4c357f472f2b553cf0` — `test(kiosk): guard permission security invoker`
2. Der DB-Vertrag schlug reproduzierbar mit `FAIL T00: has_permission ist unerwartet SECURITY DEFINER` fehl.
3. Eine zwischenzeitliche direkte Änderung der historischen Kiosk-Migration wurde nicht als Endzustand beibehalten. Die historische Migration wurde wiederhergestellt.
4. Forward-only Fix: `supabase/migrations/20260916052000_bsf_kiosk_01_preserve_permission_security_invoker.sql` setzt ausschließlich `public.has_permission(uuid,text)` auf `SECURITY INVOKER` zurück.
5. Der vollständige lokale Supabase-Rebuild aus allen Migrationen und der Kiosk-DB-Vertrag T00–T05 sind anschließend PASS.
6. Die aus dem Rebuild generierten Supabase-Types blieben bitidentisch; es war keine Types-Änderung erforderlich.
7. Der kanonische Schema-Snapshot wurde ausschließlich aus dem lokalen Rebuild synchronisiert. Der Netto-Schema-Diff besteht aus genau einer geänderten Funktionsdeklaration: `SECURITY DEFINER` entfällt bei `public.has_permission`.

Für die deterministische Snapshot-Synchronisierung wurde einmalig ein branchgebundener GitHub-Workflow verwendet. Er prüfte vor dem Commit die erwarteten Git-Blob-Hashes, den Kiosk-DB-Vertrag, `db:schema:check` und `git diff --check`. Der Workflow wurde unmittelbar danach wieder aus dem Branch entfernt.

### 3.5 Bootstrap-Viewer bei realer Kiosk-Provisionierung

Im anschließenden Endreview wurde ein zweiter realer Betriebsfehler vor der ersten Kiosk-Kontoanlage auf der Zielumgebung gefunden: `auth.admin.createUser()` löst den vorhandenen Trigger `on_auth_user_created` aus und vergibt synchron die Bootstrap-Rolle `viewer`. Die bisherige direkte Zuweisung von `kiosk` wäre dadurch am neuen Exklusivitäts-Trigger mit `KIOSK_ROLE_MUST_BE_EXCLUSIVE` gescheitert. Der SQL-Vertrag hatte diesen Produktionspfad zuvor verdeckt, weil er die Bootstrap-Rolle im Test ausdrücklich entfernte.

Die Korrektur wurde testgetrieben und fail-closed umgesetzt:

1. RED-Commit `128e59e157411326a194a3625eb2852f3c720008` ergänzt `should_removeBootstrapViewer_beforeAssigningKioskRole`; CI #793 scheiterte erwartungsgemäß in `3+4 · Unit & Components`.
2. GREEN-Commit `2e9eaf126618296d5514c02aabea6e81aed1b16d` prüft nach dem Profil-Upsert, dass exakt eine Bootstrap-Rolle vorhanden ist und diese `viewer` lautet.
3. Nur diese erwartete `viewer`-Rolle wird entfernt; erst danach wird `kiosk` eingetragen.
4. Fehlende, zusätzliche oder abweichende Rollen brechen die Provisionierung ab. Der bestehende Kompensationspfad löscht dann den bereits erzeugten Auth-User.
5. Security #788 und die vollständige CI #794 auf dem GREEN-Head sind PASS.

Damit entfernt der Provisionierungsweg niemals stillschweigend beliebige Rollen und hält den Kiosk-Rollenvertrag technisch exklusiv.

## 4. GitHub-Evidenz

### 4.1 Vollständig grüner Implementierungsstand vor dem Security-Invoker-Fix

Geprüfter Implementierungs-Head:

`20835703399a27139e5be3c719c5c4d87d33439f`

GitHub Actions auf exakt diesem Head:

- Security #762 / Run `34835834010`: **PASS**
- CI #768 / Run `34835833874`: **PASS**
- Static / Prettier / ESLint / TypeScript / RBAC-Matrix / Docs / Projektmanifest: **PASS**
- Unit & Components: **PASS**
- Backend: **PASS**
- API: **PASS**
- RBAC & Security: **PASS**
- Import/Export: **PASS**
- Backup/Restore: **PASS**
- Production Build: **PASS**
- Playwright E2E: **PASS**
- Accessibility: **PASS**
- Technical Debt: **PASS**
- Technical Report & Quality Gate: **PASS**

### 4.2 Security-Fix- und DB-SOT-Evidenz

Auf dem nachfolgenden Security-/SOT-Stand wurden zusätzlich nachgewiesen:

- Security-Workflow auf Head `55028268412746a664b8857406164aec12274b2a`: **PASS** — Security #785 / Run `35059401819`.
- lokaler Supabase-Rebuild aus allen versionierten Migrationen: **PASS**.
- Kiosk-DB-Vertrag einschließlich T00 `SECURITY INVOKER`: **PASS**.
- deterministisch generierter Schema-Snapshot: Git-Blob `3d21e4d3358167ff3ec73d7adf6ad55bfcf91857`.
- deterministisch generierte Supabase-Types: Git-Blob `9bf56bc62711cf324eff059a256a4c8748faff86`; identisch zum kanonischen Types-Stand.
- `db:schema:check` nach Snapshot-Synchronisierung: **PASS**.
- temporärer Snapshot-Sync-Workflow: **PASS** — Run `35059183994`; anschließend aus dem Branch entfernt.

### 4.3 Aktueller code-tragender Exact Head

Aktueller Code-Head vor dieser Dokumentationsfortschreibung:

`2e9eaf126618296d5514c02aabea6e81aed1b16d`

GitHub Actions auf exakt diesem Stand:

- Security #788 / Run `35062168459`: **PASS**.
- CI #794 / Run `35062168406`: **PASS**.
- Static inklusive Prettier, ESLint, TypeScript, RBAC-Matrix, No-Console, Docs und Projektmanifest: **PASS**.
- Database Schema Drift mit vollständigem lokalem Migration-Rebuild, Kiosk-DB-Vertrag T00–T05, Snapshot/Types und Driftcheck: **PASS**.
- Unit & Components: **118 Testdateien / 824 Tests PASS / 4 TODO**.
- Backend, API, RBAC & Security, Import/Export, Backup/Restore, Production Build, Playwright E2E, Accessibility, Technical Debt sowie Technical Report & Quality Gate: **PASS**.

Der erneute GitHub-Nachweis für den nachfolgenden reinen Dokumentations-Head wird als operative PR-Evidenz festgehalten, ohne dieses Dokument rekursiv für jede neue Dokumentations-SHA erneut umzuschreiben.

## 5. Lovable branch-genauer Runtime-/Visual-Nachweis

Der Implementierungs-Head `20835703399a27139e5be3c719c5c4d87d33439f` wurde read-only in einem temporären Worktree geprüft. Das Lovable-Projekt, GitHub und die Datenbank wurden dabei nicht verändert.

Ergebnis:

- `prettier --check .`: **PASS**
- `tsc --noEmit`: **PASS**
- `e2e/specs/kiosk.spec.ts` mit Chromium: **PASS (2/2)**
- Full-HD-Prüfung 1920×1080: **PASS**
- sichtbarer Titel `Info-Kiosk`: **PASS**
- permanente Kennzeichnung `DEMO-DATEN — KEINE LIVE-DATEN`: **PASS**
- sichtbarer manueller Logout: **PASS**
- horizontaler Overflow: **KEINER** (`scrollWidth = clientWidth = 1920`)
- Runtime-Console-/Page-Errors: **KEINE**

Der temporäre Worktree wurde anschließend entfernt. Die Prüfung verwendete ausschließlich die synthetische E2E-Supabase-Grenze und keine produktiven Zugangsdaten.

Visueller Hinweis, nicht blockernd: Der `not_loaded`-Leerzustand besitzt auf Full-HD viel freie Fläche. Für KIOSK-01 wird dies nicht vor dem aktuellen Exact-Head-Preview pauschal verändert; eine reine visuelle Nachschärfung wird nur nach tatsächlichem Zielbildvergleich entschieden.

Der aktuelle Feature-Branch `feat/bsf-kiosk-01-demo-pilot` ist inzwischen im Lovable-Branch-Picker sichtbar und wird als mit GitHub synchron angezeigt. Der branch-genaue Runtime-/Visual-Preview des aktuellen Exact Head einschließlich realem Login-/Provisionierungspfad bleibt als nächster Lovable-Abnahmeschritt offen. Der aktuell veröffentlichte Stand enthält `/kiosk` noch nicht.

## 6. Supabase-Zielmigration und Security Advisor

Bekannte SEC-01-Baseline des verbundenen Sysingdashboard-Supabase-Projekts vor der Kiosk-Migration:

- 2 WARN-Findings vom Typ `0029_authenticated_security_definer_function_executable`,
- `public.avkk_can_write(_subject uuid)`,
- `public.avkk_people_directory()`.

Der offizielle Supabase Security Advisor auf dieser Vor-Kiosk-Baseline war PASS: ERROR 0, CRITICAL 0, exakt die zwei bekannten WARN und keine neuen Kiosk-Findings.

Nach ausdrücklicher Freigabe wurde am 2026-09-16 der vollständige Kiosk-Migrationssatz kontrolliert auf der mit Lovable verbundenen Sysingdashboard-Zieldatenbank angewendet. Die zusammengehörigen Schritte wurden ohne Zwischenstopp ausgeführt:

1. `20260914062000_bsf_kiosk_01_add_role.sql`
2. `20260914062100_bsf_kiosk_01_permission_and_exclusivity.sql`
3. `20260916052000_bsf_kiosk_01_preserve_permission_security_invoker.sql`

Der unmittelbare read-only Nachcheck auf der Zielumgebung bestätigte:

- Rolle `kiosk` vorhanden: **JA**,
- `public.enforce_kiosk_role_exclusive()` vorhanden: **JA**,
- Exklusivitäts-Trigger auf `public.user_roles` vorhanden: **JA**,
- `public.has_permission(uuid,text)` weiterhin `SECURITY INVOKER` (`prosecdef=false`): **JA**.

Damit ist die kontrollierte Zielmigration ausgeführt und der zuvor identifizierte SECURITY-DEFINER-Drift auf dem Ziel nicht eingetreten.

**Noch offen ist ausschließlich der offizielle Post-Migration-Security-Advisor auf genau dieser migrierten Zielumgebung.** Der aktuell direkt verfügbare Supabase-Connector verweist nicht auf die maßgebliche Sysingdashboard-Zielinstanz und wird deshalb nicht ersatzweise für diesen Nachweis verwendet. Erwartung für FINAL PASS: keine ERROR / CRITICAL und keine neuen WARN gegenüber der dokumentierten SEC-01-Baseline.

## 7. Daten- und Secret-Hygiene

- Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys wurden in Code, Tests oder Dokumentation aufgenommen.
- E2E- und Demo-Daten sind synthetisch.
- Der Kiosk-Demo-Datensatz ist lokal, versioniert, erneut ladbar, validiert importierbar und vollständig entfernbar.
- Kein produktiver externer Datenprovider wurde angeschlossen.
- Die einzige freigegebene Remote-Datenbankänderung dieses Abschlussabschnitts war die kontrollierte Anwendung des versionierten Kiosk-Migrationssatzes auf die Zielumgebung.
- Während Migration, Nachprüfung und Dokumentation wurden keine Zugangsdaten oder Secret-Werte offengelegt oder protokolliert.

## 8. Abnahmematrix

- Kiosk-Route und read-only UI: **PASS** — Produktcode, Unit/Component und E2E.
- Demo-/Providergrenze: **PASS** — `KioskDataProvider`, Demo-Service und Tests.
- JSON-Demoimport / Last-good / fail-closed: **PASS** — Vertrags- und Servicetests.
- Referenz-JSON = Default-Demoquelle: **PASS** — permanenter Vertragstest.
- Rolle `kiosk` / `kiosk.view`: **PASS im Code-/Migrationsvertrag und Zielmigration**.
- Rollenexklusivität: **PASS im DB-/Vertragstest und Zielnachweis**.
- `has_permission` bleibt `SECURITY INVOKER`: **PASS im T00-DB-Vertrag, lokalen Rebuild und Zielnachweis**.
- DB-SOT / generierter Schema-Snapshot: **PASS**.
- Kiosk-Routenbeschränkung: **PASS** — Route Policy und E2E.
- Session-Watchdog / fail-closed: **PASS** — Unit/Component und Security-Suite.
- Admin-Provisionierung: **PASS** — UI-TDD plus Bootstrap-Viewer RED→GREEN-Korrektur.
- GitHub Security Workflow aktueller Code-Head: **PASS** — Security #788.
- Vollständige GitHub CI aktueller Code-Head: **PASS** — CI #794.
- Database Schema Drift / kompletter Migration-Rebuild / Kiosk-Vertrag: **PASS**.
- Playwright E2E: **PASS**.
- Accessibility: **PASS**.
- Technical Debt: **PASS**.
- Technical Report / Quality Gate: **PASS**.
- Frühere branch-genaue Lovable Runtime-/Visual-Prüfung: **PASS**.
- Kontrollierte Zielmigration: **PASS / AUSGEFÜHRT**.
- Offizieller Advisor auf Vor-Kiosk-Baseline: **PASS / SEC-01 unverändert**.
- Kiosk-spezifischer Post-Migration-Advisor: **PENDING**.
- Aktueller Lovable-Exact-Head-Preview einschließlich Login/Provisionierung: **PENDING**.
- Merge: **NICHT AUSGEFÜHRT** — separate Freigabe erforderlich.
- Deploy: **NICHT AUSGEFÜHRT** — separate Freigabe erforderlich.

## 9. Freigabestatus

**BSF-KIOSK-01 wird mit diesem Dokument noch nicht als FINAL PASS oder DONE bezeichnet.**

Aktueller Zustand:

- Implementierung: vollständig,
- Security-Invoker-Regressionsschutz: implementiert, lokal und auf der Zielumgebung nachgewiesen,
- Bootstrap-Viewer-Provisionierungsfehler: testgetrieben behoben,
- DB-SOT-Snapshot: synchronisiert,
- GitHub Exact-Head-Codegates: Security #788 und CI #794 PASS,
- kontrollierte Kiosk-Zielmigration: ausgeführt und read-only nachgeprüft,
- Kiosk-spezifischer Post-Migration-Advisor: ausstehend,
- aktueller Lovable-Exact-Head-Preview: ausstehend,
- PR #141: bleibt Draft,
- Merge: nicht ausgeführt,
- Deploy: nicht ausgeführt.

### Letzte Freigabeschritte

1. Offiziellen Supabase Security Advisor auf der migrierten Sysingdashboard-Zielumgebung read-only ausführen.
2. Erwartung: keine ERROR / CRITICAL und keine neuen WARN gegenüber der dokumentierten SEC-01-Baseline.
3. Den aktuellen Feature-Branch in Lovable auf die maßgebliche Exact Head SHA prüfen und den Preview für `/kiosk`, Login-Redirect, Admin-Provisionierung, Demo-Daten, Logout, Full-HD und Runtime-Fehlerfreiheit abnehmen.
4. Den reinen Dokumentations-Head erneut durch die Required GitHub Checks führen und die finalen Run-IDs im PR festhalten.
5. Erst danach FINAL-PASS-/DONE-Entscheidung; Merge und Publish/Deploy bleiben separate Freigaben.

Bis zu diesen Nachweisen bleibt KIOSK-01 technisch implementiert, vollständig gegatet und zielmigriert, aber formal `FINAL ACCEPTANCE PENDING`.
