# BSF-KIOSK-01 — Abschluss- und Abnahmenachweis

Stand: 2026-09-16  
Status: **IMPLEMENTATION COMPLETE / FINAL ACCEPTANCE PENDING**  
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

- Die verbundene Vor-Kiosk-Datenbank führt `public.has_permission(uuid,text)` als `SECURITY INVOKER` (`prosecdef=false`).
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

Für die deterministische Snapshot-Synchronisierung wurde einmalig ein branchgebundener GitHub-Workflow verwendet. Er prüfte vor dem Commit die erwarteten Git-Blob-Hashes, den Kiosk-DB-Vertrag, `db:schema:check` und `git diff --check`. Der Workflow wurde unmittelbar danach wieder aus dem Branch entfernt. Im endgültigen Netto-Diff gegenüber dem zuvor grünen Kiosk-Head verbleiben ausschließlich:

- der T00-Regressionsschutz,
- die forward-only Korrekturmigration,
- der daraus generierte kanonische Schema-Snapshot.

Während dieser Arbeiten wurde keine Remote-/Live-Datenbank verändert.

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

Der erneute vollständige CI-/Security-Nachweis wird nach dieser Dokumentationssynchronisierung auf dem finalen Exact Head ausgeführt. Die zugehörigen finalen Run-IDs werden im PR #141 als operative Freigabeevidenz festgehalten, ohne dieses Dokument rekursiv für jede neue Dokumentations-SHA erneut umzuschreiben.

## 5. Lovable branch-genauer Runtime-/Visual-Nachweis

Nach Wiederverfügbarkeit der Lovable-Credits wurde der Implementierungs-Head `20835703399a27139e5be3c719c5c4d87d33439f` read-only in einem temporären Worktree geprüft. Das Lovable-Projekt, GitHub und die Datenbank wurden dabei nicht verändert.

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

Visueller Hinweis, nicht blockernd: Der `not_loaded`-Leerzustand besitzt auf Full-HD viel freie Fläche. Für KIOSK-01 wird dies nicht mehr gestalterisch verändert; eine Verdichtung kann bei KIOSK-02 geprüft werden.

## 6. Supabase Security Advisor

Bekannte SEC-01-Baseline des verbundenen Sysingdashboard-Supabase-Projekts:

- 2 WARN-Findings vom Typ `0029_authenticated_security_definer_function_executable`,
- `public.avkk_can_write(_subject uuid)`,
- `public.avkk_people_directory()`.

Am 2026-09-16 wurde der offizielle Supabase Security Advisor über das korrekt verbundene Lovable-Projekt erneut read-only ausgeführt.

Ergebnis auf der aktuell verbundenen Instanz:

- `SECURITY_ADVISOR=PASS`,
- ERROR: 0,
- CRITICAL: 0,
- WARN: 2,
- ausschließlich Typ `0029_authenticated_security_definer_function_executable`,
- ausschließlich `public.avkk_can_write(_subject uuid)` und `public.avkk_people_directory()`,
- `SEC01_BASELINE_UNVERAENDERT=JA`,
- `NEUE_BSF_KIOSK_01_FINDINGS=KEINE`,
- DB geändert: **NEIN**,
- Code geändert: **NEIN**,
- Deploy: **NEIN**.

### Wichtige Abnahmegrenze

Die aktuell mit Lovable verbundene Supabase-Instanz enthält BSF-KIOSK-01 **noch nicht**:

- keine Rolle `kiosk` im `app_role`-Enum,
- kein `kiosk.view`,
- keine Kiosk-Rollenexklusivitätsfunktion bzw. kein zugehöriger Trigger,
- keine Kiosk-Migrationen vom 2026-09-14/16.

Der Advisor-Lauf ist deshalb ein gültiger Live-Baseline-Nachweis, aber **kein Kiosk-spezifischer Post-Migration-Advisor-Nachweis**. Ein belastbarer finaler Security-Nachweis für die neuen Datenbankobjekte erfordert eine kontrollierte Ziel- oder Staging-Umgebung, auf der die Kiosk-Migrationen tatsächlich vollständig angewendet sind.

Wegen des forward-only Security-Fixes müssen bei einer späteren kontrollierten Migration alle ausstehenden Kiosk-Migrationen einschließlich `20260916052000_bsf_kiosk_01_preserve_permission_security_invoker.sql` als zusammengehöriger Stand angewendet werden. Eine Zielumgebung darf nicht zwischen der ursprünglichen Kiosk-Migration und der Korrekturmigration stehen bleiben.

Dieser Schritt ist eine reale Datenbankänderung bzw. Deployment-Aktion und wird nicht ohne gesonderte Freigabe ausgeführt.

## 7. Daten- und Secret-Hygiene

- Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys wurden in Code, Tests oder Dokumentation aufgenommen.
- E2E- und Demo-Daten sind synthetisch.
- Der Kiosk-Demo-Datensatz ist lokal, versioniert, erneut ladbar, validiert importierbar und vollständig entfernbar.
- Kein produktiver externer Datenprovider wurde angeschlossen.
- Während der GitHub- und Lovable-Abnahmearbeiten wurde keine Remote-/Live-Datenbank verändert.
- Die im PR enthaltenen Kiosk-Datenbankänderungen liegen als versionierte Supabase-Migrationen vor.

## 8. Abnahmematrix

- Kiosk-Route und read-only UI: **PASS** — Produktcode, Unit/Component und E2E.
- Demo-/Providergrenze: **PASS** — `KioskDataProvider`, Demo-Service und Tests.
- JSON-Demoimport / Last-good / fail-closed: **PASS** — Vertrags- und Servicetests.
- Referenz-JSON = Default-Demoquelle: **PASS** — permanenter Vertragstest.
- Rolle `kiosk` / `kiosk.view`: **PASS im Code-/Migrationsvertrag**.
- Rollenexklusivität: **PASS im DB-/Vertragstest**.
- `has_permission` bleibt `SECURITY INVOKER`: **PASS im T00-DB-Vertrag und lokalen Rebuild**.
- DB-SOT / generierter Schema-Snapshot: **PASS**.
- Kiosk-Routenbeschränkung: **PASS** — Route Policy und E2E.
- Session-Watchdog / fail-closed: **PASS** — Unit/Component und Security-Suite.
- Admin-Provisionierung: **PASS** — RED→GREEN-TDD und Unit/Component.
- GitHub Security Workflow für Security-/SOT-Stand: **PASS** — Security #785.
- Vollständige GitHub CI vor Security-Fix: **PASS** — CI #768.
- Vollständige GitHub CI nach Security-Fix und Dok-Sync: **PENDING finaler Exact-Head-Lauf**.
- Playwright E2E: **PASS**.
- Accessibility: **PASS**.
- Technical Debt: **PASS**.
- Technical Report / Quality Gate: **PASS**.
- Branch-genauer Lovable Runtime-/Visual-Retest: **PASS**.
- Offizieller Advisor auf aktueller Live-Baseline: **PASS / SEC-01 unverändert**.
- Kiosk-spezifischer Advisor nach angewandten Migrationen: **BLOCKED / PENDING kontrollierte Migration**.
- Merge: **NICHT AUSGEFÜHRT** — separate Freigabe erforderlich.
- Deploy / reale DB-Migration: **NICHT AUSGEFÜHRT** — separate Freigabe erforderlich.

## 9. Freigabestatus

**BSF-KIOSK-01 wird mit diesem Dokument noch nicht als FINAL PASS oder DONE bezeichnet.**

Aktueller Zustand:

- Implementierung: vollständig,
- Security-Invoker-Regressionsschutz: implementiert und lokal nachgewiesen,
- DB-SOT-Snapshot: synchronisiert,
- branch-genauer Runtime-/Visual-Check: PASS,
- aktuelle Supabase-Live-Baseline: Advisor PASS / SEC-01 unverändert,
- Kiosk-spezifischer Post-Migration-Advisor: ausstehend,
- PR #141: bleibt Draft,
- Merge: nicht ausgeführt,
- Deploy / DB-Migration: nicht ausgeführt.

### Letzter Freigabeschritt

1. Finalen GitHub Exact-Head-CI-/Security-Lauf nach dieser Dokumentationssynchronisierung vollständig grün nachweisen.
2. Kiosk-Migrationen in einer kontrollierten Ziel- oder Staging-Umgebung vollständig anwenden — **nur nach gesonderter Freigabe**.
3. Offiziellen Supabase Security Advisor erneut read-only ausführen.
4. Erwartung: keine ERROR / CRITICAL und keine neuen WARN gegenüber der dokumentierten SEC-01-Baseline.
5. Erst danach FINAL-PASS-/DONE-Entscheidung und Übergang zu BSF-03A.

Bis zu dieser kontrollierten Migration bleibt KIOSK-01 technisch implementiert und vollständig getestet, aber formal `FINAL ACCEPTANCE PENDING`.
