---
id: A39
titel: Restore-Probe lokal im Docker-Container ausführen (S1 bis S4, EV-0004)
status: teilweise erledigt (S1 bis S3 belegt, S4 Rollenabnahme offen)
start: 2026-11-07T07:40+01:00
ende: 2026-11-07T09:05+01:00
branch: docs/2026-11-06-tagesbuendel (nur Protokollentwurf EV-0009)
pr: 286 (Draft)
commit: fd83f100
ci: entfällt (lokale Probe); docs:check grün
---

# A39 – Bericht: Restore-Probe lokal

## Ergebnis

Der Lovable-Export vom 2026-11-06 (pg_dump 18.6, Custom-Format, Datenbank 17.6) lässt sich lokal vollständig wiederherstellen. Struktur, Policies, Funktionen, Rechte und Daten von `public` und `private` stimmen mit dem Live-Stand aus RP-02 (2026-11-07 05:45 +01:00) überein:

- **J2:** 25 von 25 Tabellen mit gleicher Zeilenzahl und gleichem md5. Der Datenstand von Export und RP-02 ist damit gleich.
- **Auth:** `auth.users` enthält 9 Platzhalter mit den Live-UUIDs, Probe-Adressen und 0 Passwort-Hashes (E2, E6).
- **Fremdschlüssel:** 66 von 66 FK wurden nach dem Import ohne Fehler angelegt und validiert, also 0 Waisen.

Für einen fehlerfreien Restore braucht es drei Handgriffe, die bisher nirgends stehen (Befunde B1 bis B3).

Offen sind:

- S4 Rollenabnahme: vor der Ausführung wegen Speichermangels abgebrochen.
- Die Prüfung der in J2 ausgeschlossenen Spalten (`audit_log.payload`, jsonb, *_hash, email, phone).
- Drei Stichproben je Kerntabelle.

## Abweichung E1: Einzelcontainer statt Supabase CLI

E1 sieht die Supabase CLI vor und den Einzelcontainer `supabase/postgres:17.6.1.147` als Rückfall mit Begründung. Den Rückfall habe ich aus drei Gründen genommen:

1. **Ports:** Die CLI veröffentlicht ihre Dienste (DB, API, Studio) als Host-Ports. Eine Bindung nur an localhost ist für die installierte Version nicht belegt. Der Auftrag verlangt „DB-Container nur auf localhost“. Die Probe-Container hatten **keine** veröffentlichten Ports (`docker port` leer, jeweils geprüft). Der Client lief im internen Docker-Netz `rp-net` (`--internal`).
2. **Parallele Stacks:** Auf dem Rechner laufen zwei fremde CLI-Stacks anderer Projekte, mit Containern in Neustart-Schleifen. Die Standardports wären belegt gewesen.
3. **Plattenplatz:** Auf C: waren zuletzt 0,2 GB frei. Ein vollständiger CLI-Stack war nicht ladbar.

Folge: Ohne GoTrue und PostgREST gibt es keine Anmeldung. Die Rollenabnahme über die App (S4) ist damit ausgeschlossen. Geplant war stattdessen die Prüfung auf Datenbankebene (Plan, Abschnitt 4, Option C).

## Stufen, Messwerte, Aufwand

Die Nummern S1 bis S4 folgen dem Auftrag. Plan-Abschnitt 15.3 nennt die Stufen S3 (Struktur) und S4 (Daten), die Zuordnung steht jeweils in Klammern.

| Stufe                                    | Vorgehen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Ergebnis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Laufzeit Skript                                                                                                       | Aufwand Sitzung (Schätzung)              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Vorprüfung                               | ZIP-Datei (SHA-256 ECCD49C5…) entpackt; dabei entstand `work/sysingdashboard_261106.backup` (664586 Bytes, SHA-256 F3474885…); dann `pg_restore --list`                                                                                                                                                                                                                                                                                                                                                                        | 1020 TOC-Einträge. TABLE DATA: auth 27, public 25, storage 8, realtime 2, drizzle 1, supabase_migrations 1, vault 1. 4 Erweiterungen, 6 Event-Trigger, 28 DEFAULT ACL. Der Export enthält Auth-Daten, darunter Hashes und Tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | –                                                                                                                     | 0,3 h                                    |
| S1 Struktur aus Migrationen (Plan S3 W1) | Container ohne Ports; 33 Migrationen von `main` be712548 der Reihe nach mit `ON_ERROR_STOP`; dann RP-02 B bis H lokal                                                                                                                                                                                                                                                                                                                                                                                                         | 33/33 ohne Fehler, PostgreSQL 17.6. Spalten 302/302, Constraints 153/153, Indizes 74/74, Trigger 41/41, Policies 65/65 (md5 gleich), RLS 25/25, FORCE 0, anon-Rechte auf denselben 9 Tabellen. Abweichungen: genau die 4 bekannten Funktions-md5 aus `20260913150000` (A38) und 1 zusätzliche EXECUTE-Zeile für `authenticated` auf `reference_value_validate_scope` (110 statt 109). Beides hatte Plan 15.3 für W1 erwartet.                                                                                                                                                                                                                                                                                                    | 69 s                                                                                                                  | 0,4 h (inkl. Fehler Pfadumwandlung, B4) |
| S2 Restore aus dem Dump (Plan S4 Import) | Zweiter Container, Datenverzeichnis nur im RAM (tmpfs), Client `postgres:18` (pg_restore 18.6) im internen Netz. Ablauf: Auswahl per TOC-Liste (454 von 1013 Einträgen), Rolle `sandbox_exec` vorab angelegt, Default-Privilegien des Images in `public` entzogen, dann pre-data, data mit `--disable-triggers`, Platzhalter in `auth.users`, post-data, ACL                                                                                                                                                                           | 3. Lauf: 0 Fehler, 0 Warnungen. Lauf 1 mit `-n public -n private`: 48 Fehler (46 pre-data, 2 post-data) im Wortlaut zusammengefasst: 25× `role "sandbox_exec" does not exist`, 21× `schema "private" does not exist`, 2× `role "sandbox_exec" does not exist` (post-data). Lauf 2 ohne Rechte-Vorschritt: fehlerfrei, aber anon und authenticated hatten Vollrechte auf allen Tabellen und Funktionen (B3).                                                                                                                                                                                                                                                                                                       | Lauf 3: 257 s gesamt (Start 86, pre 70, data 19, Platzhalter 5, post 36, ACL 41; langsam wegen Speichermangel)        | 0,6 h                                    |
| S2 Vergleich mit live (Plan S3 W2)        | RP-02 B bis H gegen die Wiederherstellung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Spalten, Indizes, Trigger und Policies gleich, Funktionen 41/41 md5 gleich, EXECUTE 109 = live, Tabellenrechte wie live (anon 9 Tabellen), RLS 25/25. 2 Constraint-Namen weichen nur in der Darstellung ab: Die Anlage kürzt sie mit „…“.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Sekunden                                                                                                              | 0,2 h                                    |
| S3 Daten J2 (Plan S4)                    | `j2-local.sql` mit Ausschlussliste J1, Sortierung nach Primärschlüssel, `TimeZone = 'UTC'`                                                                                                                                                                                                                                                                                                                                                                                                                                    | 25/25 gleich (u. a. audit_log 336, profiles 9, user_roles 9). Datenstand Export 2026-11-06 17:27:58 UTC gleich RP-02 2026-11-07 04:45:08 UTC                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Sekunden                                                                                                              | 0,1 h                                    |
| S4 Rollenabnahme                         | geplant: `has_permission` und Policies mit den 9 Platzhalter-UUIDs je Rolle (`SET ROLE authenticated`, `request.jwt.claims`)                                                                                                                                                                                                                                                                                                                                                                                                 | **Nicht ausgeführt.** Der Owner bat um Aufräumen wegen Speichermangel (C: 0,2 GB frei, RAM 1,2 GB frei). Der Container wurde entfernt, bevor S4 lief. Die App-Anmeldung ist ohne Auth-Dienst ohnehin nicht möglich (Grenze E1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | –                                                                                                                     | –                                        |

Gesamtaufwand der Sitzung: etwa 1,6 h (Schätzung). Ein erneuter Lauf von S2 mit Vergleich dauert mit den Skripten etwa 5 Minuten, sobald genug Speicher frei ist.

## Abnahme nach Plan-Abschnitt 15.3

| Kriterium                                                                         | Stand                                                                                                                                           |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| S3: Zählwerte = 15.1, B bis H gleich oder einzeln bewertet                        | erfüllt (W1 und W2); Belege in den lokalen Protokollen                                                                                          |
| S3: Funktions-md5 41/41 bei W2; bei W1 nur die 4 bekannten                        | erfüllt                                                                                                                                         |
| S3: Tabellen- und EXECUTE-Rechte gleich der Anlage                                | W2 erfüllt (erst mit Vorschritt B3); W1 mit der erwarteten Abweichung `reference_value_validate_scope`                                          |
| S3: Version 17                                                                    | erfüllt (17.6)                                                                                                                                  |
| S4: J2 25/25                                                                      | erfüllt                                                                                                                                         |
| S4: jsonb-, hash-, email- und phone-Spalten (u. a. `audit_log.payload`)           | **offen** (RP-02b oder RP-03 Teil D fehlt); „audit_log vollständig“ ist nur für Zeilenzahl und die übrigen Spalten belegt                         |
| S4: `auth.users` = 9 mit Live-UUIDs, Herkunft                                     | erfüllt; Herkunft: neu angelegt aus den FK-Spalten, nicht aus dem Dump (E2)                                                                     |
| Plan 9: 0 verwaiste FK, keine zusätzliche audit_log-Zeile durch den Import        | erfüllt (66/66 FK angelegt und validiert; audit_log 336 nach dem Import, Trigger beim Import aus)                                               |
| Plan 9: 3 Stichproben je Kerntabelle feldweise                                    | **offen**                                                                                                                                       |
| Rollenabnahme                                                                     | **offen** (S4)                                                                                                                                  |

Die Probe ist damit **nicht vollständig bestanden**. G03 und EV-0004 bleiben offen, bis S4, die Stichproben und die Prüfung der ausgeschlossenen Spalten vorliegen.

## Befunde

- **B1 – `pg_restore -n` legt das Schema nicht an.** Mit `-n private` wird der TOC-Eintrag `SCHEMA - private` nicht ausgewählt. Folge: 21 Fehler, alle 7 Funktionen in `private` fehlen. Lösung: Auswahl per TOC-Liste (`-l` filtern, `-L`), einschließlich `SCHEMA - private` und `ACL - SCHEMA private`. Das muss in Notfallhandbuch N3.
- **B2 – Rolle `sandbox_exec`.** Der Export vergibt Rechte an die Lovable-eigene Rolle `sandbox_exec` (27 Fehler ohne sie). Lokal habe ich sie vorab als `NOLOGIN` angelegt. Zweck und Rechte der Rolle in Lovable Cloud sind nicht dokumentiert. Das gehört als Frage in den Lovable-Support-Thread (R-10).
- **B3 – Default-Privilegien des Supabase-Images.** Das Image vergibt in `public` für `postgres` und `supabase_admin` per `ALTER DEFAULT PRIVILEGES` alle Rechte an anon, authenticated und service_role. Die GRANTs im Dump fügen nur hinzu und entziehen nichts. Ohne Vorschritt ist der wiederhergestellte Stand deshalb **offener als live**: anon hätte Vollrechte auf allen 25 Tabellen und EXECUTE auf allen 41 Funktionen. Das gilt auch für eine Wiederherstellung in ein neues Supabase-Projekt (Notfall N3). Vorschritt: Default-Privilegien in `public` entziehen, danach die ACL- und DEFAULT-ACL-Einträge des Dumps einspielen. Diese liegen in keiner `--section` und brauchen einen eigenen Lauf. Anschließend G24 (RLS-Invariante) prüfen. Schwere 3 für den Notfallweg.
- **B4 – Git Bash wandelt Pfade um.** `docker exec … -f /migrations/x.sql` wurde zu `C:/Program Files/Git/migrations/…`. Abhilfe: `MSYS_NO_PATHCONV=1`. Das betrifft auch Anleitungen im Notfallhandbuch, die unter Windows mit Git Bash laufen.
- **B5 – Versionen.** Der Dump stammt aus pg_dump 18.6, die Datenbank ist 17.6. `pg_restore` 17 kann das Archiv nicht lesen, nötig ist ein 18er-Client. In N3 aufnehmen.
- **B6 – Auth-Daten im Export.** Der Lovable-Export enthält 27 auth-Tabellen mit Daten, darunter Passwort-Hashes, Sessions, Refresh-Tokens und MFA. Die Probe hat sie bewusst nicht wiederhergestellt (E2). Bei einem echten Notfall-Restore braucht es dafür eine eigene Entscheidung (Konten übernehmen oder neu anlegen).
- **B7 – `search_path` beim Vergleich.** Die Policy-md5 aus `pg_policies` hängen vom `search_path` der abfragenden Rolle ab. `supabase_admin` hat zusätzlich `auth`, dadurch wichen 58 Policies scheinbar ab. Der Vergleich muss als `postgres` laufen (wie RP-02). Im Datenauftrag RP-03 festschreiben.
- **B8 – TOC-Zählung.** Der Archivkopf nennt 1020 Einträge, `pg_restore -l` von pg_restore 18 listet 1013 nummerierte Zeilen. Die Ursache ist nicht geklärt. Kein Einfluss auf das Ergebnis, aber im Protokoll offen geführt.
- **B9 – PR 282:** gh zeigt MERGED (über PR 283), nicht geschlossen. Siehe A40-Nachtrag.

## Sicherheit und Datenschutz (E2, E5)

- Export und alle daraus entstandenen Dateien liegen nur unter `C:\dev\restore-probe` und sind EFS-verschlüsselt. Geprüft mit `cipher`: ZIP-Datei, `work\` und alle 13 Dateien darin mit „E“. Das Verzeichnis `C:\dev\restore-probe` selbst ist nicht verschlüsselt. Es enthält aber nur die verschlüsselte ZIP-Datei und `work\`.
- Das Datenverzeichnis der Restore-Datenbank lag nur im Arbeitsspeicher (tmpfs) und ist mit dem Container gelöscht.
- Im Scratchpad der Sitzung liegen nur Skripte und Katalogausgaben ohne Zeileninhalte, keine Daten.
- Passwörter der Probe-Container waren zufällig, nur als Umgebungsvariable gesetzt und sind nicht gespeichert.
- **Löschfrist (E5):** Der Export muss spätestens am **2026-11-21** gelöscht sein (14 Tage nach diesem Protokoll). Die Löschung ist im Protokoll EV-0009 zu vermerken. Heute nicht gelöscht, weil S4 und die Stichproben noch auf denselben Export angewiesen sind.

## Aufräumen

- Container `rp-s1` und `rp-s2` sowie das Netz `rp-net` sind entfernt. Die Container hatten keine Volumes, es bleibt kein Container mit dem Label `restore-probe=a39`.
- Das Image `postgres:17` ist entfernt. `postgres:18` und `supabase/postgres:17.6.1.147` bleiben für S4.
- Der Docker-Build-Cache wurde geleert (2,3 GB in der Docker-VM).
- Hinweis: Freier Platz in der Docker-VM kommt erst nach Komprimieren der VHDX auf C: an (Docker Desktop, Owner-Schritt).
- Die Worktrees `wt-main`, `wt-a40b` und drei Altlasten der Vorsitzung (`wt-a15`, `wt-docs`, `wt-ops-queue`) sind entfernt.

## Offene Fragen

1. Soll S4 (Rollenprüfung auf Datenbankebene) nachgeholt werden, sobald Speicher frei ist? Die Skripte liegen bereit, Dauer etwa 30 min.
2. Wer liefert die Prüfwerte für die ausgeschlossenen Spalten (RP-02b oder RP-03 Teil D)? Ohne sie bleibt `audit_log.payload` unbelegt.
3. Wie soll ein echter Notfall-Restore mit den Auth-Daten des Exports umgehen: übernehmen oder neu anlegen (B6)?
4. `sandbox_exec`: Frage an den Lovable-Support aufnehmen (B2)?
5. Dürfen die zwei fremden Supabase-Stacks auf dem Rechner gestoppt werden? Sie laufen in Neustart-Schleifen und binden RAM.

## Eigene Ideen

- **Restore-Skript ins Repo:** `scripts/restore-probe/` mit den Schritten TOC-Auswahl, Rollen-Vorschritt, Default-Privilegien, vier `pg_restore`-Läufen, Platzhaltern und Vergleich. Ohne Daten, nur Skripte. Damit wird N3 ausführbar statt beschreibend, und die Probe lässt sich vor jedem Publish in wenigen Minuten wiederholen.
- **Vergleichsprüfung als Vertrag:** `cmp.mjs` gegen eine maschinenlesbare RP-02-Ausgabe (CSV statt Markdown) laufen lassen. Die Kürzungen mit „…“ in der Anlage kosten Prüfzeit.
- **G24 automatisch nach jedem Restore** prüfen. B3 zeigt, dass ein Restore die RLS-Invariante unbemerkt aufweichen kann.
- **QS-01 Migration C′** (anon ohne Rechte) würde B3 entschärfen: Dann gäbe es live keine Rohrechte mehr, die ein Restore erraten müsste. Zusätzlich sollte sie `REVOKE` explizit setzen statt sich auf Default-Privilegien zu verlassen.

Hygiene: 0 gemergte Remote-Branches, 5 offene PRs, davon 4 Drafts.

```yaml
Reifegrad: Restore-Weg technisch belegt (Struktur und Daten), Rollenabnahme offen
Projektstatus: Golden Gate läuft; Publish No-Go (R-07); G03/EV-0004 offen, EV-0009 als Entwurf
Offene_Fragen:
  - S4 nachholen nach Speicherfreigabe
  - Prüfwerte für jsonb-, hash-, email- und phone-Spalten (RP-02b/RP-03)
  - Auth-Daten im Notfall-Restore (B6)
  - Rolle sandbox_exec (B2)
  - Fremde Supabase-Stacks stoppen
Roadmap:
  Sprints_bis_BSF: 2
  Sprints_bis_MVP: 4
