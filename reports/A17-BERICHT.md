---
id: A17
titel: "Datenauftrag Kiosk-Konto korrigieren (Weg B) und Kiosk-Befunde analysieren"
status: erledigt
start: 2026-11-06T05:58+01:00
ende: 2026-11-06T06:25+01:00
branch: docs/2026-11-06-tagesbuendel
pr: "286 (Draft, Tagesbündel)"
commit: "ff8c6c71"
ci: "läuft (Head ff8c6c71)"
---

# Bericht A17

## Ergebnis

F1 bestätigt: `audit_log.actor_id` ohne `ON DELETE` (`supabase/migrations/20260717041306_18b7bd99-4d78-4233-a222-0e42881146d2.sql:133`), `handle_new_user` schreibt `auth.bootstrap` mit `actor_id = NEW.id` (`supabase/migrations/20260720031101_f91cbc77-7151-4442-bd5d-efd315eb8790.sql:43-50`). Weg A ist ohne Eingriff in `audit_log` nicht ausführbar.
F2: F-KK-01 ist eine Rechteablehnung (`PROJECT_CONTROLLING_DENIED`), kein technischer Fehler; „INTERNE DATEN“ stammt aus dem URL-Parameter (`src/components/kiosk/KioskView.tsx:57-64`). Vorschlag Umleitung, etwa 2 bis 2,5 h.
F3: bm@ hat sehr wahrscheinlich Rolle `kiosk`; die Benutzerliste kann `kiosk` nicht anzeigen und zeigt „System-Administrator“ (`src/components/UserManagementDialog.tsx:517-525`). Schritt (e) ist nicht blockiert.
F4: Die Ortsangabe des Planers (`auth-accounts.functions.ts:172`) betrifft „Konto löschen“; die Rückabwicklung von „Kiosk-Konto anlegen“ steht in `src/lib/admin/auth-accounts.server.ts:256`, scheitert an `audit_log` und wird verschluckt.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Datenauftrag | auf Weg B umgestellt: anzeige@ (Alias auf info@) über „Kiosk-Konto anlegen“, kiosk@ und bm@ archivieren; Annahme „auth.bootstrap bleibt nach dem Löschen“ gestrichen; neue UID offen | `docs/DATENAUFTRAG-KIOSK-KONTO.md` |
| Freigaben | Freigabe 1 und 2 für Weg B als offen eingetragen (die Freigaben vom 04.11. galten Weg A) | Abschnitt 4 |
| Rollback | Löschen ist auch im Rollback nicht möglich; Archivieren statt Löschen, halb angelegtes Konto als eigener Fall | Abschnitt 8 |
| Prüfliste | KK-02, KK-04, KK-05 „bestanden (Beobachtung Owner)“; KK-03 Abweichung F-KK-01; KK-06 läuft; KK-01, KK-08 ohne Beleg; KK-07 dokumentiert | Abschnitt 7 |
| Nachweis | EV-0006 als Entwurf, Status offen | `docs/NACHWEISE.yaml` |
| Backlog | F-KK-01, Benutzerliste ohne `kiosk`, Rückabwicklung, „Konto löschen“ allgemein, E2E-Starttests (A16) | `docs/BACKLOG.md` |

## Offene Fragen, Risiken, Abweichungen

- Abweichung: Die Freigaben für Weg B habe ich nicht als erteilt übernommen. Der Auftrag beschreibt Weg B, eine Owner-Freigabe dafür ist nicht belegt.
- Alternative, nicht beauftragt: Die Rolle von kiosk@ per Datenauftrag (ADR-0037) direkt auf `kiosk` setzen, ohne neues Konto. Die Exklusivitätsprüfung lässt das zu. Entscheidung beim Owner.
- Frage: Mit welchem Konto wurden die Beobachtungen vom 05.11. gemacht (kiosk@ hatte laut Doku Rolle `viewer`, die Beobachtungen setzen Rolle `kiosk` voraus)? Vermutlich bm@.
- Risiko: Die Funktion „Konto löschen“ der Backend-Administration kann für kein Konto gelingen (`audit_log`).
- Nicht ermittelbar ohne Live-Zugriff: ob „still linked to data“ von `audit_log` stammt; ob die Live-Datenbank dem Migrationsstand entspricht.
- Korrektur der Analyse: Pfad `src/lib/users-supabase-service.ts` (nicht `src/lib/users/`).

Hygiene: 0 gemergte Remote-Branches, 13 offene PRs, davon 12 Drafts.

```yaml
Reifegrad: Kiosk-Konto über Weg B vorbereitet, Freigaben offen
Projektstatus: Publish No-Go (R-07, R-14); Kiosk-Datenauftrag wartet auf Freigabe
Offene_Fragen:
  - Freigabe Weg B oder Alternative Rollenwechsel kiosk@ per Datenauftrag?
  - Konto der Beobachtungen vom 05.11.?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```

## Anhang: Analyse F1 bis F4 (Dateien und Zeilen)


Stand: 2026-11-06, Repository `C:\dev\sysingdashboard`, Branch `docs/2026-11-06-tagesbuendel` (= origin/main 34f20a3 + Doku). Nur Lesezugriff. Alle Pfade relativ zum Repo. Grundlage ist nur der Repo-Stand. Ob die Live-Datenbank genau diese Migrationen trägt, lässt sich von hier aus nicht feststellen.

---

## F1 – Befund Löschen (audit_log-FK und handle_new_user)

**Antwort:** Bestätigt. `audit_log.actor_id` verweist ohne `ON DELETE` auf `auth.users(id)` (Standard NO ACTION). Die aktuelle Fassung von `handle_new_user` schreibt beim Anlegen jedes Auth-Kontos `auth.bootstrap` mit `actor_id = NEW.id`. Keine spätere Migration ändert den FK oder den Trigger. Jedes nach dem 20.07. angelegte Konto lässt sich deshalb nicht hart löschen, solange die Zeile in audit_log besteht. Weg A („löschen und neu anlegen“) geht nicht ohne Eingriff in audit_log oder dessen FK.

| Punkt | Beobachtung | Beleg (Datei:Zeile) |
|---|---|---|
| FK audit_log | `actor_id UUID REFERENCES auth.users(id),` ohne ON DELETE | `supabase/migrations/20260717041306_18b7bd99-4d78-4233-a222-0e42881146d2.sql:133` |
| handle_new_user (aktuell) | `INSERT INTO public.audit_log (action, target, actor_id, actor_role, payload) VALUES ('auth.bootstrap', NEW.id::text, NEW.id, …)` | `supabase/migrations/20260720031101_f91cbc77-7151-4442-bd5d-efd315eb8790.sql:3` (Funktion), `:43–50` (Insert) |
| Trigger | `on_auth_user_created AFTER INSERT ON auth.users` | `…20260717041306_….sql:187–189` |
| Spätere Änderungen | Keine weitere `CREATE OR REPLACE FUNCTION public.handle_new_user`. Nur `REVOKE`. Kein `DROP CONSTRAINT`/`ON DELETE SET NULL` auf audit_log. Die einzigen `DROP CONSTRAINT` betreffen reference_value/avkk | `…20260721034352_….sql:6`, `…20260717041344_….sql:5`; `20260913213000_…sql:88`, `20260922185458_…sql:26,35,43,54` |
| profiles | `id … REFERENCES auth.users(id) ON DELETE CASCADE`, blockiert nicht | `…20260717041306_….sql:21` |
| user_roles.user_id | `ON DELETE CASCADE`, blockiert nicht | `…20260717041306_….sql:48` |
| user_roles.granted_by | `REFERENCES auth.users(id)` ohne ON DELETE. `handle_new_user` setzt `granted_by = NEW.id` auf die eigene Zeile (wird mitkaskadiert). Es blockiert nur, wenn das Konto anderen Nutzern Rollen erteilt hat | `…20260717041306_….sql:51`; `…20260720031101_….sql:39–41` |
| Weitere FKs ohne ON DELETE auf auth.users | `app_settings.updated_by`; `created_by`/`updated_by` in reference_catalog, reference_value, avkk_*; `changed_by`, `finalized_by`, `requested_by` (performance_statement). Sie blockieren nur, wenn das Konto dort geschrieben hat. Für kiosk@ ist das unwahrscheinlich, aber nicht ermittelbar | `20260802033452_…sql:6`; `20260809025207_…sql:105,106,202,203,227,228,250,271,272,301,302`; `20260921095742_…sql:77,143,254` |
| FKs auf profiles | `systemhouse_membership`/`customer_access`: CASCADE. `avkk_responsibility.person_id`, `published_by`, `engineer_id`: RESTRICT. `customer_responsibility.user_id`: NO ACTION. Sie blockieren über die Kaskade auth.users→profiles, wenn Einträge bestehen | `20260825090229_…sql:62–63,93–94`; `20260809025207_…sql:220`; `20260902031900_…sql:29,67,109,116`; `20260908032151_…sql:8` |
| Kaskade user_roles → Trigger | Beim Löschen feuern `protect_last_sysadmin_roles` (nur bei Rolle systemadministrator) und `audit_user_roles_change` (`actor = auth.uid()`, `target` als Text, kein FK-Problem) | `…20260720031101_….sql:73–111`, `:156–188` |

**Folgerung:** Die Meldung „still linked to data“ passt zur FK-Verletzung durch die `auth.bootstrap`-Zeile. Dass sie die Ursache ist, belegt das Repo, nicht das Live-Protokoll. Wer Weg A gehen will, braucht entweder eine Migration (FK auf `ON DELETE SET NULL`, das ändert `actor_id` historischer Zeilen) oder das Löschen der audit_log-Zeile. Letzteres verbietet CLAUDE.md. Ohne Eingriff in audit_log geht nur Folgendes:
- Rolle von kiosk@ per Datenauftrag (ADR-0037) direkt auf `kiosk` umstellen: `UPDATE user_roles SET role='kiosk' WHERE user_id=<kiosk@>`. Die Exklusivitätsprüfung lässt das zu, weil bei UPDATE derselben Zeile kein Konflikt entsteht (`20260916072000_…sql:21–27`).
- Oder ein neues Konto mit anderer Adresse über „Kiosk-Konto anlegen“ einrichten und kiosk@ archivieren statt löschen.

Dieselbe Sperre trifft die App-Funktion „Konto löschen“ (`src/lib/admin/auth-accounts.functions.ts:172–173`) für alle Konten. Sie meldet dann nur „Konto konnte nicht gelöscht werden.“

---

## F2 – F-KK-01: `/kiosk?mode=internal` mit Rolle kiosk

**Antwort:** Der Server lehnt die Anfrage ab, weil das Recht fehlt. Ein technischer Fehler ist es nicht. Die Rolle kiosk hat nur `kiosk.view`. Die Routenwache lässt Kiosk-Konten auf `/kiosk` aber unabhängig vom Parameter `mode` durch. Die Seite baut deshalb den internen Provider, die Server-Funktion wirft `PROJECT_CONTROLLING_DENIED`, und der Fehler landet ungefiltert als Ladefehler in der Oberfläche. Die Kennzeichnung „INTERNE DATEN“ kommt aus dem URL-Parameter, weil ohne Snapshot `requestedMode` gilt.

| Punkt | Beobachtung | Beleg (Datei:Zeile) |
|---|---|---|
| Rechte kiosk (DB, letzte Fassung) | `(ur.role = 'kiosk' AND _perm = 'kiosk.view')`, kein `project.controlling.view`. Spätere Neudefinition von `has_permission` gibt es nicht | `supabase/migrations/20260921095742_bsf03b_performance_statement.sql:9–58`, Zeile 56 |
| Rechte kiosk (Client) | `kiosk: ["kiosk.view"]` | `src/lib/rbac/permissions.ts:213` |
| Routenwache | Prüft `kiosk.view`. `project.controlling.view` nur bei `mode=internal` | `src/routes/_authenticated/route.tsx:101–106`, `:115–130` |
| Session-Policy | Mit `hasKioskView` gilt `redirectTo: pathname === "/kiosk" ? null : "/kiosk"`. `mode` wird nicht ausgewertet | `src/lib/kiosk/kiosk-session-policy.ts:20–25` |
| Route | `mode` aus der URL (`z.enum(["demo","internal"])`). Bei `internal` wird `createInternalReadKioskDataProvider` gebaut, ohne Blick auf `kioskSessionPolicy.kioskMode` | `src/routes/_authenticated/kiosk.tsx:12`, `:26–34`, `:44` |
| Provider | `readInternal(...)` steht außerhalb von try/catch. Eine Ablehnung lässt `getSnapshot()` scheitern | `src/lib/kiosk/internal-kiosk-provider.ts:82–84` |
| Server-Funktion | `requireProjectControllingAccess` läuft vor jedem try. Bei `has_permission = false` wirft sie `PROJECT_CONTROLLING_DENIED`. Nur ein RPC-Fehler ergäbe `…AUTHORIZATION_FAILED` | `src/lib/kiosk-runtime/internal-kiosk.functions.ts:88`; `src/lib/project-controlling-runtime/project-controlling.functions.ts:14,16,141–159` |
| Hook | Ein Fehler ohne früheren Snapshot ergibt `status: "error", snapshot: null` | `src/hooks/useKioskSnapshot.ts:38–54` |
| Kennzeichnung | `mode = state.snapshot?.mode ?? requestedMode`. Ohne Snapshot ist das „internal“, also „INTERNE DATEN“ | `src/components/kiosk/KioskView.tsx:57–65` |
| Fehlermeldung | `state.status === "error"` zeigt „Kiosk-Daten konnten nicht geladen werden“ | `src/components/kiosk/KioskView.tsx:155–161` |

**Folgerung und Empfehlung:** Die Rolle kiosk soll in der Demo-Anzeige bleiben. Dazu zwei Varianten:
- **Variante 1 (bevorzugt):** Die Policy leitet `/kiosk?mode=internal` für Konten mit `kiosk.view` auf `/kiosk` um. Dafür erhält `kiosk-session-policy.ts:20–25` eine Bedingung auf `internalModeRequested`. Die Routenwache berechnet `internalModeRequested` schon vorher (`route.tsx:115–116`). Eine Schleife entsteht nicht, weil `/kiosk` ohne Parameter `demo` bedeutet.
- **Variante 2:** `kiosk.tsx` arbeitet mit `effectiveMode = kioskSessionPolicy.kioskMode ? "demo" : mode`.

Zusätzlich sollte `KioskView` die Kennzeichnung bei `status === "error"` nicht aus `requestedMode` ableiten.

Aufwand: Code 0,5 h, Tests (`src/__tests__/lib/kiosk-session-policy.test.ts`, `KioskView.test.tsx`) 1 h, Doku (CHANGELOG, Hilfe, Tracker) 0,5–1 h. **Gesamt rund 2–2,5 h.** Eine eigene klare Meldung statt Umleitung kostet etwa gleich viel.

---

## F3 – Rollenwiderspruch bm@ (Kontenliste „kiosk“ / Benutzerliste „System-Administrator (Info-Kiosk)“)

**Antwort:** Beide Listen lesen dieselbe Tabelle `public.user_roles` mit derselben Regel „zuletzt gelesene Zeile gewinnt“. Die Kontenliste zeigt den Rohwert (`kiosk`). Die Benutzerliste zeigt die Rolle für Nutzer mit `roles.manage` als `<select>`, dem die Option „kiosk“ fehlt. Der Browser zeigt dann die erste Option, „System-Administrator“. „Info-Kiosk“ ist der Anzeigename (`profiles.display_name`), Standardwert des Dialogs „Kiosk-Konto anlegen“. Ein Anzeigemodus-Flag ist es nicht. Daraus folgt: bm@ hat in der Datenbank wahrscheinlich die Rolle kiosk und ist kein Systemadministrator. Das ist eine Folgerung aus dem Code und live nicht geprüft.

| Punkt | Beobachtung | Beleg (Datei:Zeile) |
|---|---|---|
| Kontenliste: Quelle | `admin.auth.admin.listUsers` plus `user_roles.select("user_id, role")` (Service-Rolle). `roleById.set(...)`, letzte Zeile gewinnt | `src/lib/admin/auth-accounts.server.ts:149–183`, Zeilen 153, 163, 166–168 |
| Kontenliste: Anzeige | Rohwert `{a.role ?? "—"}` | `src/components/BackendAdminDialog.tsx:327` |
| Benutzerliste: Quelle | `profiles.select("*")` plus `user_roles.select("user_id, role")` (Nutzer-Client, RLS). Letzte gewinnt, ohne Rolle gilt `"viewer"` | `src/lib/users-supabase-service.ts:58–73` (Kommentar 68, Default 72); `src/hooks/useCurrentUser.ts:125–147` |
| Benutzerliste: Anzeige | `<select value={u.role}>` mit Optionen `ALL_ROLES.filter((r) => r !== "kiosk")`. Bei `u.role === "kiosk"` passt keine Option, angezeigt wird die erste | `src/components/UserManagementDialog.tsx:514–530` |
| Erste Option | `ALL_ROLES[0] = "systemadministrator"`, Label „System-Administrator“ | `src/lib/user-management.ts:45–46`, `:64–65` |
| Badge-Pfad (ohne roles.manage) | Zeigt korrekt `ROLE_LABEL[u.role]`, also „Kiosk“ | `src/components/UserManagementDialog.tsx:531–536`, `src/lib/user-management.ts:53` |
| „Info-Kiosk“ | Standard-Anzeigename beim Kiosk-Anlegen (Client und Server) | `src/components/BackendAdminDialog.tsx:64`; `src/lib/admin/auth-accounts.functions.ts:238`; `src/lib/admin/auth-accounts.server.ts:215–219` |
| Mehrfachrollen ausgeschlossen | `enforce_kiosk_role_exclusive`: kiosk und eine weitere Rolle können nicht gleichzeitig bestehen (BEFORE INSERT/UPDATE, serialisiert) | `supabase/migrations/20260914062100_bsf_kiosk_01_permission_and_exclusivity.sql:54–91`; `20260916072000_bsf_kiosk_01_serialize_role_exclusivity.sql:4–45` |
| protect_last_sysadmin_profile | BEFORE UPDATE OF status auf profiles. Greift nur, wenn das Ziel die Rolle systemadministrator hat und kein anderer aktiver Sysadmin bleibt. Dann `last_sysadmin_locked` | `supabase/migrations/20260720031101_f91cbc77-7151-4442-bd5d-efd315eb8790.sql:113–154` |
| protect_last_sysadmin_roles | BEFORE UPDATE/DELETE auf user_roles, nur für Rolle systemadministrator | `…20260720031101_….sql:73–111` |
| Annahme im Datenauftrag | „bm@ (Systemadministrator, heute im Anzeigemodus)“ | `docs/DATENAUFTRAG-KIOSK-KONTO.md:14`, `:75–77`; `docs/BERICHT-2026-11-04-KIOSK-KONTO.md:5`, `:37` |

**Folgerung:**
- **Auswirkung auf (e):** Das Archivieren von bm@ blockiert der Trigger nicht. Ist bm@ kiosk, kehrt die Funktion sofort zurück (`:126–129`). Ist bm@ doch Sysadmin, gibt es mit info@ einen weiteren aktiven Sysadmin.
- **Prämisse fraglich:** Die Annahme des Datenauftrags (Restrisiko „Anzeigemodus auf Sysadmin-Konto“) ist wahrscheinlich falsch. Dann läuft das Anzeigegerät schon heute mit einem kiosk-Konto, und kiosk@ wäre ein zweites. Das passt zu F-KK-01: ein kiosk-Konto mit `mode=internal`.
- **Risiko in der Oberfläche:** Wer in der Benutzerliste das Feld bei bm@ auf eine andere Rolle umstellt, löst `setUserRole` aus. Das löscht alle Rollen und setzt die neue (`users-supabase-service.ts:139–142`). Wer die Anzeige glaubt, stuft unbeabsichtigt um.
- Vor (e) sollte eine Lese-Abfrage `SELECT role FROM user_roles WHERE user_id = <bm@>` die Rolle belegen.

---

## F4 – deleteUser im Rollback von „Kiosk-Konto anlegen“

**Antwort:** Die Ortsangabe stimmt nicht: `auth-accounts.functions.ts:172` gehört zur normalen Funktion „Konto löschen“ (`deleteAuthAccount`). Der Rollback steht in `auth-accounts.server.ts:256`. Er scheitert nach F1 ebenfalls, weil `handle_new_user` bei `createUser` schon `auth.bootstrap` mit `actor_id = userId` geschrieben hat. Der Fehler wird verschluckt: supabase-js gibt `{ error }` zurück und wirft nicht, also greift `.catch()` nie, und das Ergebnis wird nicht ausgewertet. Übrig bleibt ein halb angelegtes Konto. Der Nutzer sieht nur die ursprüngliche Fehlermeldung.

| Punkt | Beobachtung | Beleg (Datei:Zeile) |
|---|---|---|
| Ablauf | `createUser` (Trigger legt Profil, viewer-Rolle und auth.bootstrap an), dann Profil-Upsert, Prüfung der Bootstraprolle, Löschen von viewer, Insert kiosk | `src/lib/admin/auth-accounts.server.ts:203–252` |
| Rollback | `await admin.auth.admin.deleteUser(userId).catch(() => undefined); throw error;`. Das Ergebnis `{ error }` wird nicht geprüft | `src/lib/admin/auth-accounts.server.ts:255–258` |
| Bekanntes Verhalten supabase-js | Eigener Kommentar: „supabase-js wirft bei Datenbankfehlern nicht, sondern liefert `{ error }`“ | `src/lib/admin/auth-accounts.server.ts:69–70` |
| Ursache des Scheiterns | auth.bootstrap-Zeile mit FK ohne ON DELETE | F1: `…20260720031101_….sql:43–50`, `…20260717041306_….sql:133` |
| Restzustand je Abbruchstelle | Abbruch vor Zeile 238: Auth-Konto, Profil (aktiv) und viewer bleiben. Abbruch nach Zeile 238 (`roleError`, z. B. Exklusivitätskonflikt): Auth-Konto und Profil **ohne Rolle** | `auth-accounts.server.ts:221, 231, 235, 244, 252` |
| Anzeige des Restzustands | Kontenliste zeigt Rolle „—“ (`role: null`). Benutzerliste zeigt „Viewer“ (Default) – ein weiterer Widerspruch | `auth-accounts.server.ts:179`; `BackendAdminDialog.tsx:327`; `users-supabase-service.ts:72` |
| Was der Nutzer sieht | Fehlertext der ursprünglichen Ausnahme, z. B. „Kiosk-Rolle konnte nicht zugewiesen werden.“, als Formularfehler und Toast. Kein Hinweis auf den fehlgeschlagenen Rollback | `BackendAdminDialog.tsx:146–152` |
| Audit | `auth_account.kiosk_create` wird nur bei Erfolg geschrieben. Den fehlgeschlagenen Rollback protokolliert niemand (nur auth.bootstrap und user_roles.delete aus Triggern) | `auth-accounts.functions.ts:257–260` |
| Wiederholung | Erneutes Anlegen mit derselben Adresse scheitert vermutlich an `createUser` (Adresse existiert) und meldet „Kiosk-Konto konnte nicht angelegt werden.“ Das Verhalten des Anbieters ist im Repo nicht belegt | `auth-accounts.server.ts:210–211` |
| deleteAuthAccount (`functions.ts:172`) | Prüft `error` und wirft „Konto konnte nicht gelöscht werden.“. Ein Fehlschlag ist sichtbar, aber ohne Ursache | `src/lib/admin/auth-accounts.functions.ts:172–173` |

**Folgerung:** Der Rollback ist bei der heutigen Datenbank wirkungslos, und der Ausfall bleibt still. Die Kompensation muss anders gebaut werden, etwa so:
- die Rollen-/Profilschritte in eine RPC mit Transaktion legen,
- oder bei Fehlschlag das Profil auf `archived` setzen, die Rollen entfernen und den Fehlschlag ins Audit schreiben,
- und `{ error }` von `deleteUser` auswerten und melden.

Eine Löschung, die nur die Rollen der App entfernt, lässt immer die `auth.bootstrap`-Zeile zurück.

---

## Offene Fragen

1. Hat bm@ in `user_roles` live die Rolle `kiosk` oder `systemadministrator`? Mit einer Lese-Abfrage klären, bevor Schritt (e) läuft (F3).
2. Wurde bm@ über „Kiosk-Konto anlegen“ erzeugt (Audit `auth_account.kiosk_create`, Ziel = UID bm@)? Aus dem Repo nicht ermittelbar.
3. Kam die Meldung „still linked to data“ live wirklich von `audit_log_actor_id_fkey` oder von einem anderen FK (granted_by, RESTRICT auf profiles)? Belegen lässt sich das nur mit der Postgres-Fehlermeldung (F1).
4. Entspricht der Live-Stand von `handle_new_user` und `audit_log` den Repo-Migrationen? Lovable kann direkt anwenden. Nicht ermittelbar.
5. Entscheidung zu Weg A: Statt löschen und neu anlegen die Rolle von kiosk@ per Datenauftrag auf `kiosk` umstellen (kein Eingriff in audit_log)? Oder den FK per Migration auf `ON DELETE SET NULL` ändern (ADR nötig, ändert historische `actor_id`)?
6. Soll die Benutzerliste die Rolle kiosk als nicht änderbares Badge zeigen statt als irreführendes Auswahlfeld (F3)? Und soll der Rollback in `createKioskAccount` überarbeitet werden (F4)? Beides gehört in den Backlog.
