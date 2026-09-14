# BSF-KIOSK-01 — Abschluss- und Abnahmenachweis

Stand: 2026-09-14  
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
- explizite Zustände für Demo, leer, unbekannt, nicht geladen und Fehler,
- sichtbare Kennzeichnung `DEMO-DATEN — KEINE LIVE-DATEN`,
- dediziertes Supabase-Kiosk-Konto,
- technische Rolle `kiosk` mit ausschließlich `kiosk.view`,
- serverseitig erzwungene Rollenexklusivität,
- Beschränkung des Kiosk-Kontos auf `/kiosk`,
- Idle-Logout-Ausnahme nur für die Rolle `kiosk` auf `/kiosk`,
- fortbestehende Auth-/Token-, Aktiv-/Sperr- und manuelle Logout-Prüfungen,
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
- Das Kiosk-Konto darf den Demo-Datensatz nicht selbst erzeugen oder verändern.
- Die administrative Kiosk-Provisionierung verwendet ausschließlich die geschützte Serverfunktion; Passwörter werden weder geloggt noch dokumentiert noch in der UI angezeigt.
- Datenbankänderungen werden ausschließlich über versionierte Migrationen abgebildet.

## 3. TDD- und Fehlerkorrektur-Evidenz

### 3.1 Administrative Kiosk-Provisionierung

Im Review wurde festgestellt, dass die geschützte serverseitige Provisionierung bereits vorhanden war, die vorgesehene schmale Admin-UI jedoch fehlte.

TDD-Nachweis:

1. RED-Commit `2f7d033a572c7289a9226281b14681a7f50441aa` — `test(kiosk): define admin provisioning UI contract`
2. Security auf diesem Head: PASS
3. CI: erwarteter Fehler im Gate `Unit & Components`
4. GREEN-Commit `ed0a388f212267ceb3070ea1f37ce6ca4ca3c695` — `feat(kiosk): add admin provisioning form`
5. Formatkorrektur `8a672ef9260a1a467be1884724e82813b4e98c1b` — ausschließlich Prettier-Anpassung
6. Unit-/Component-Gate auf `8a672ef...`: PASS

Die UI ruft ausschließlich `createKioskAuthAccount` auf. RBAC-, RLS-, Migrations- und Routinglogik wurden durch diesen UI-Fix nicht erweitert.

### 3.2 Kiosk-Rollenmatrix / Redirect

Der vorherige Playwright-Fehler im Rollenmatrix-Test war ein Synchronisationsproblem des Tests: Der clientseitige Redirect `/dashboard` → `/kiosk` war korrekt, wurde im betroffenen Test aber unmittelbar nach `page.goto()` ausgewertet.

Minimaler Fix:

- Commit `92c74108381f0d92fd8a9365845c36d20d3c9bb9`
- nur Testwartebedingung auf den bereits vorhandenen Redirect ergänzt,
- keine Produkt-, Auth-, RBAC- oder Routinglogik geändert.

Der vollständige Playwright-Lauf auf dem geprüften Implementierungs-Head ist anschließend PASS.

## 4. GitHub Exact-Head-Evidenz

Geprüfter Implementierungs-Head:

`8a672ef9260a1a467be1884724e82813b4e98c1b`

GitHub Actions auf exakt diesem Head:

- Security #760 / Run `34834928220`: **PASS**
- CI #766 / Run `34834928314`: **PASS**
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

Damit ist die GitHub-seitige Implementierungs- und Regressionsprüfung für den genannten Head vollständig grün.

Dokumentationsänderungen nach diesem Implementierungs-Head müssen vor einer Freigabe erneut auf ihrem eigenen Exact Head durch die Required Checks laufen.

## 5. Supabase Security Advisor

Bekannte, bereits zuvor akzeptierte SEC-01-Baseline des korrekten Sysingdashboard-Supabase-Projekts:

- 2 WARN-Findings vom Typ `0029_authenticated_security_definer_function_executable`,
- `public.avkk_can_write(_subject uuid)`,
- `public.avkk_people_directory()`.

Der offizielle, read-only Advisor-Lauf für den finalen BSF-KIOSK-01-Vergleich konnte am 2026-09-14 wegen des Lovable-Creditlimits nicht erneut ausgeführt werden.

Deshalb gilt weiterhin:

- ERROR/CRITICAL/WARN-Vergleich gegen die SEC-01-Baseline: **PENDING**,
- Aussage „keine neuen BSF-KIOSK-01-Advisor-Findings“: **noch nicht final nachgewiesen**,
- kein Ersatz durch ein anderes oder nicht eindeutig verbundenes Supabase-Projekt.

Der Advisor-Lauf ist der erste vorgesehene Lovable-Schritt nach Wiederverfügbarkeit der Credits.

## 6. Daten- und Secret-Hygiene

- Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys wurden in Code, Tests oder Dokumentation aufgenommen.
- E2E- und Demo-Daten sind synthetisch.
- Der Kiosk-Demo-Datensatz ist lokal, versioniert, erneut ladbar und vollständig entfernbar.
- Kein produktiver externer Datenprovider wurde angeschlossen.
- Während der GitHub-Abnahmearbeiten wurde keine Datenbank direkt verändert.
- Die im PR enthaltenen Kiosk-Datenbankänderungen liegen als versionierte Supabase-Migrationen vor.

## 7. Abnahmematrix

- Kiosk-Route und read-only UI: **PASS** — Produktcode, Unit/Component und E2E.
- Demo-/Providergrenze: **PASS** — `KioskDataProvider`, Demo-Service und Tests.
- Rolle `kiosk` / `kiosk.view`: **PASS** — Migration und RBAC-/Security-Tests.
- Rollenexklusivität: **PASS** — DB-Trigger und Vertragstests.
- Kiosk-Routenbeschränkung: **PASS** — Route Policy und E2E.
- Session-Watchdog / fail-closed: **PASS** — Unit/Component und Security-Suite.
- Admin-Provisionierung: **PASS** — RED→GREEN-TDD und Unit/Component.
- GitHub Security Workflow: **PASS** — Security #760 auf `8a672ef...`.
- Vollständige GitHub CI: **PASS** — CI #766 auf `8a672ef...`.
- Playwright E2E: **PASS** — Job `11 · E2E (Playwright)`.
- Accessibility: **PASS** — Job `12 · Accessibility`.
- Technical Debt: **PASS** — Job `13 · Technical Debt`.
- Technical Report / Quality Gate: **PASS** — Job `14 · Technical Report & Quality Gate`.
- Offizieller Supabase Advisor: **PENDING** — nach Lovable-Creditreset.
- Gezielter Runtime-/Preview-Retest, sofern noch erforderlich: **PENDING** — Lovable-Referenzumgebung.
- Merge: **NICHT AUSGEFÜHRT** — separate Freigabe erforderlich.
- Deploy: **NICHT AUSGEFÜHRT** — separate Freigabe erforderlich.

## 8. Freigabestatus

**BSF-KIOSK-01 wird mit diesem Dokument noch nicht als FINAL PASS oder DONE bezeichnet.**

Aktueller Zustand:

- Implementierung: vollständig und GitHub-seitig grün nachgewiesen,
- Dokumentation: Abschlussnachweis erstellt; laufende Statusflächen werden fortgeschrieben,
- offizieller Supabase-Advisor-Vergleich: ausstehend,
- PR #141: bleibt Draft,
- Merge: nicht ausgeführt,
- Deploy: nicht ausgeführt.

Nach positivem Advisor-Vergleich und ggf. erforderlichem Runtime-/Preview-Retest kann die formale Endabnahme erfolgen. Erst danach darf BSF-KIOSK-01 auf DONE gesetzt und der Übergang zu BSF-03A formal vollzogen werden.
