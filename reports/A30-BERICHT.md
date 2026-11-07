```yaml
id: A30
titel: "Plan: lokale Restore-Probe im Docker-Container (R-14, G03, Minimalprobe S1 bis S4)"
status: erledigt
start: 2026-11-07T05:20+01:00
ende: 2026-11-07T06:35+01:00
branch: docs/2026-11-06-tagesbuendel
pr: 286
commit: 72a85f49 (Tagesbündel)
ci: läuft am Head 72a85f49, Stand im Kommentar zu PR 286
grundlage:
  main: 7dc4699d (PR 287), lesender Worktree
  doku: docs/2026-11-06-tagesbuendel 56c97606 (ADR-0042 Entwurf, NOTFALL-HANDBUCH, PUBLISH-GATE-BERICHT)
  auftrag: origin/ops/queue queue/A30.yaml, Anlage queue/anlagen/RP-02-datenauftrag.txt (unverändert)
lieferung:
  - docs/PLAN-RESTORE-PROBE-LOKAL.md
  - docs/DATENAUFTRAG-RESTORE-PROBE.md
  - reports/A30-BERICHT.md
```

# A30 Plan: lokale Restore-Probe im Docker-Container

## Ergebnis

1. Plan und Datenaufträge liegen als Entwurf vor. Es wurde nichts ausgeführt, kein Datenauftrag, kein Docker, kein Zugriff auf die Produktion.
2. Image-Empfehlung: Supabase CLI lokal (Option A, CLI 2.117.0 wie CI). Nur dieser Stack bringt `auth`, GoTrue, PostgREST, die Rollen `anon`/`authenticated`/`service_role` und `supabase_vault` mit. Ein reines `postgres:17` scheidet aus: keine Anmeldung, keine Rollenabnahme, REST-06 nicht erfüllt. Ob der genaue Tag 17.6.1.147 startet, ist zu belegen. Der Einzelcontainer `supabase/postgres:17.6.1.147` bleibt Rückfall für S3/S4.
3. Auth-Konten: Die 9 Konten werden **neu angelegt, mit den Live-UUIDs** (19 FK auf `auth.users`), mit Probe-Adressen und lokalen Kennwörtern, ohne Produktiv-Hashes. Beim Import muss der Trigger `on_auth_user_created` ruhen, sonst entstehen zusätzliche Zeilen in `audit_log`, `user_roles` und `profiles`.
4. Befund: Alle neun Objektzahlen aus RP-01 (25/302/66/21/41/74/41/41/65) stimmen mit `supabase/schema/public-schema.sql` überein. Das ist ein Indiz, kein Nachweis. RP-02 ist lesend und ohne Geheimnisse. Für einen reproduzierbaren Vergleich fehlen aber der SQL-Text im Wortlaut, die Zielbindung, die Sitzungseinstellungen und `jsonb` in der Prüfsumme (V-01 bis V-04). Ohne V-04 ist `audit_log.payload` nicht geprüft.
5. Aufwand: 14 bis 37 h, erwartet etwa 20 h, davon Owner 6 bis 18 h. Das liegt über dem oberen Ende der G03-Schätzung (8 bis 32 h), weil Import- und Vergleichsskripte neu entstehen müssen. Entscheidungsvorlage E1 bis E7 im Plan, Abschnitt 14.

| Punkt                        | Beobachtung                                                                                                                                                     | Beleg                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Objektzahlen Git = Live      | 25 Tabellen, 302 Spalten, 66 FK, 21 Unique, 41 Check, 74 Indizes, 41 Trigger, 41 Funktionen, 65 Policies, 25 × RLS, Enums 8/4                                   | RP-01 (`queue/A30.yaml`, `eingaenge`); Zählung `supabase/schema/public-schema.sql` @ `7dc4699d` |
| Postgres-Version lokal       | `supabase/config.toml` enthält nur `project_id`, kein `[db] major_version`; die Version folgt der CLI-Vorgabe, zu belegen                                       | `supabase/config.toml` @ `7dc4699d`                                                             |
| Vorhandene Werkzeuge         | `db:schema:rebuild`, `db:schema:snapshot`, `db:schema:check`, CI-Job `db_schema` mit 9 DB-Vertragstests decken S3-Aufbau aus Git ab, nicht Live und nicht Daten | `package.json:20-23`, `.github/workflows/ci.yml:79-162`, `supabase/schema/README.md`            |
| Trigger auf `auth.users`     | `on_auth_user_created` AFTER INSERT, `handle_new_user` schreibt Profil, Rolle und `audit_log`                                                                   | `supabase/migrations/20260717041306_…sql:187`, `public-schema.sql:1434-1486`                    |
| Keine Sequenzen, keine Views | RP-02 Teil I liefert erwartbar 0 Zeilen                                                                                                                         | `public-schema.sql` (0 × `CREATE SEQUENCE`, 0 × `CREATE VIEW`)                                  |
| Muster für Probe-Konten      | `INSERT INTO auth.users` mit festen IDs und `@example.invalid`                                                                                                  | `supabase/tests/bsf-kiosk-01-role-contract.sql:32-44`                                           |
| RP-02 Prüfung                | lesend ja, ohne Geheimnisse ja; 13 Änderungsvorschläge, davon 4 hoch                                                                                            | `docs/PLAN-RESTORE-PROBE-LOKAL.md`, Abschnitt 10                                                |
| Lovable-Export               | Inhalt, Format und Umfang unbekannt; Ablage `C:\dev\restore-probe` unverschlüsselt (zu belegen)                                                                 | Angabe Owner in `queue/A30.yaml`                                                                |

## Offene Fragen

1. E1 bis E7 (Plan, Abschnitt 14): Image, Konten, Datenquelle, RP-02a, Ablage und Löschfrist, Umfang der Rollenabnahme, Freigabe der Skripte.
2. Was enthält der Lovable-Export (Tabellen, `auth`, `audit_log`, Format)? Ohne Schritt S0 ist S4 nicht planbar.
3. Welchen Postgres-Tag startet Supabase CLI 2.117.0? Lässt er sich ohne `supabase link` auf 17.6.1.147 festlegen? Zu belegen, zuerst im CI-Log von „Start local Supabase“.
4. Kann der Connector mehrere SELECT-Anweisungen in einer `READ ONLY`-Transaktion mit gemeinsamem Snapshot ausführen? Zu belegen.
5. Darf die lokale Rolle `postgres` `session_replication_role` setzen? Zu belegen, sonst `DISABLE TRIGGER USER` je Tabelle.
6. Wie lautet die höchste Migrationsversion live (Stoppwert in RP-03 Teil 0)? Vorschlag `20261022090000`, zu bestätigen.
7. RP-01-Auftragstext und Freigabedatum stehen nicht in Git (REST-14). Nachtragen?
8. Risiken: R1 bis R10 im Plan, Abschnitt 12. Am schwersten wiegen R1 (Export unvollständig), R4 (personenbezogene Daten unverschlüsselt lokal) und R6 (Prüfsummen nicht reproduzierbar).
9. Abweichungen vom Auftrag: Der Bericht liegt unter `out/A30-BERICHT.md` und ist für `reports/A30-BERICHT.md` bestimmt. ADR-0042, `NOTFALL-HANDBUCH.md` und `PUBLISH-GATE-BERICHT.md` stammen aus dem Branch `docs/2026-11-06-tagesbuendel`, nicht aus `main`. Tracker, CURRENT-STATUS, ENTWICKLUNGSTAGEBUCH und BACKLOG wurden nicht geändert (nur Lieferdateien). `docs:check`, `docs:project` und CI stehen noch aus.

## Eigene Ideen

- Feste SQL-Datei `supabase/probe/rp02-katalog.sql`, die der Owner dem Connector wörtlich übergibt und die lokal per `psql` gleich läuft. Damit wird RP-02 zu einem wiederholbaren Live-Drift-Check, auch nach der Probe (REST-08, quartalsweise).
- Den Live-Strukturvergleich als manuellen CI-Schritt anlegen: Das Ergebnis von RP-02 (ohne Werte) kommt als Datei ins Repo, und der Job `db_schema` vergleicht es mit dem lokalen Aufbau. Das schließt die Lücke aus `supabase/schema/README.md` („kein Live-Nachweis“).
- Die fehlende Live-Migration `20260913174733` als Platzhalterdatei mit Kommentar und gleicher Wirkung ins Repo holen, sobald RP-02 Teil A ihre Objekte belegt. Das verkleinert R-10.
- Ein Tag `postgres-version` in `supabase/config.toml` oder in `.temp` festschreiben, damit CI und Probe dieselbe Version nutzen (zu belegen).
- Die Probe in zwei Sitzungen teilen: Sitzung 1 S0 bis S3 ohne Daten, Sitzung 2 S4 und Rollenabnahme. S3 lässt sich so schon ohne Export als Teilnachweis führen (Etappen nach Standard Abschnitt 2).
- Die RLS-Sichtprobe je Rolle als SQL-Vertragstest in `supabase/tests` aufnehmen, mit synthetischen Daten. So prüft CI REST-11 dauerhaft und nicht nur in der Probe.
- Gleich bei der ersten Probe die Zeit je Schritt messen. Die Messung ist der erste belastbare RTO-Wert für ADR-0042.

## Abschluss

Hygiene: 0 gemergte Remote-Branches, 5 offene PRs, davon 4 Drafts.

```yaml
Reifegrad: Entwurf (Golden Gate in Arbeit; MVP abgeschlossen, ADR-0038)
Projektstatus: >-
  Publish bleibt No-Go. G03 (R-14) auf dem kritischen Pfad: Plan für die lokale Restore-Probe S1 bis S4
  liegt als Entwurf vor, Ausführung offen. RP-01 ausgeführt, RP-02 freigabebereit mit Änderungsvorschlägen,
  RP-03 Entwurf. EV-0004 weiter "nicht bestanden". S5 bleibt lokal nicht belegbar.
Offene_Fragen:
  - E1 bis E7 der Entscheidungsvorlage (Image, Konten, Datenquelle, RP-02a, Ablage, Rollenabnahme, Skripte)?
  - Inhalt und Format des Lovable-Exports unter C:\dev\restore-probe?
  - Postgres-Tag von Supabase CLI 2.117.0 und Festlegung auf 17.6.1.147 ohne supabase link?
  - Gemeinsamer READ-ONLY-Snapshot im Connector möglich?
  - Höchste Live-Migrationsversion für den Stoppwert in RP-03?
Roadmap:
  Sprints_bis_BSF: "13 / 15 / 17 (grob, unverändert nach A26)"
  Sprints_bis_MVP: 0
  G03_Aufwand_h: "14 bis 37, erwartet ca. 20 (Owner 6 bis 18)"
```
