# Datenaufträge Restore-Probe RP-01 bis RP-03 (nur lesen)

Stand: 2026-11-07, 07:10 +01:00. Grundlage: `docs/ADR/0037-kontrollierte-datenauftraege.md`, Plan `docs/PLAN-RESTORE-PROBE-LOKAL.md`, `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md` (REST-04, REST-06, REST-22), Nachweis EV-0004 (`docs/NACHWEISE.yaml`), Risiko R-14, Gate G03, Auftrag A30.
Status: **RP-01 ausgeführt (2026-11-06). RP-02 ausgeführt (Owner, 2026-11-07 04:44 bis 04:45 UTC = 05:44 bis 05:45 +01:00), Ergebnis in der Anlage `queue/anlagen/RP-02-ergebnis-2026-11-07.md`. RP-03 Entwurf, keine Freigabe.**

Alle drei Aufträge sind rein lesend (nur SELECT). Der Owner führt sie über den Lovable-Connector aus; Claude Code führt keinen Datenauftrag aus. E-Mail-Adressen, Passwort-Hashes, Tokens, Werte aus `app_settings` und andere Zugangsdaten stehen nicht in dieser Datei, nicht in den Ergebnissen und dürfen auch nicht nachgetragen werden.

## 1 Zweck

Die lokale Restore-Probe (S1 bis S4, Plan Abschnitt 9) braucht drei Dinge aus der Live-Datenbank, ohne sie zu verändern: eine Bestandsaufnahme (RP-01), einen prüfbaren Strukturvergleich (RP-02) und Prüfwerte zum Exportzeitpunkt samt Auth-Metadaten (RP-03). Die Daten selbst kommen aus Lovable „Export data“ (Plan Abschnitt 6).

## 2 RP-01 Bestandsaufnahme (ausgeführt)

| Punkt      | Wert                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| Ausführung | Owner, 2026-11-06, 19:21 bis 19:23 +01:00 (18:21 bis 18:23 UTC), Lovable-Connector, nur SELECT            |
| Beleg      | Ergebnis im Feld `eingaenge` von `queue/A30.yaml` (Branch `ops/queue`); Auftragstext nicht in Git (Lücke) |
| Freigaben  | durch den Owner im Chat; Datum der Freigabe nicht in Git                                                  |

Ergebnis (Zusammenfassung):

```yaml
rp01:
  zeitpunkt: 2026-11-06T19:21+01:00
  postgres: { version: "17.6", lovable_anzeige: "17.6.1.147", region: Europa (Irland) }
  erweiterungen:
    pg_stat_statements: "1.11"
    pgcrypto: "1.3"
    plpgsql: "1.0"
    supabase_vault: "0.3.1"
    uuid-ossp: "1.1"
  schema_public:
    tabellen: 25
    spalten: 302
    fremdschluessel: 66
    unique: 21
    check: 41
    indizes: 74
    trigger: 41
    funktionen: 41
    policies: 65
    rls: { aktiv: 25, force: 0 }
    enums: { app_role: 8, user_status: 4 }
  zeilen:
    profiles: 9
    user_roles: 9
    auth.users: 9
    audit_log: 336
    shared_activity_projection: 47
    shared_work_package_projection: 20
    shared_project_projection: 5
  storage: { buckets: 0, objekte: 0 }
  groesse: 0,27 GB von 2 GB
  migrationen:
    live_eintraege: 30
    statements_null: 10 # Connector nannte faelschlich 11
    statements_null_versionen:
      [
        20260913150000,
        20260913174733,
        20260914062000,
        20260914062100,
        20260916052000,
        20260916072000,
        20260921095742,
        20260922185458,
        20260927050827,
        20260929053733,
      ]
    repo_dateien: 33
    nur_im_repo:
      - 20260913213000_bsf03d_workpackage_category_reference_data
      - 20260917182000_bsf03a_project_controlling
      - 20260917190000_bsf03a_preserve_permission_security_invoker
      - 20261022120000_db_fk_reference_value_history_systemhouse # laut Kopfkommentar live ein No-Op
    nur_live:
      - 20260913174733 bsf03d_reference_data_systemhouse_scope # keine Datei im Repo
  export:
    weg: Lovable More, Database, Manage, Settings, Export data
    ausgeloest: 2026-11-06 abends (Owner)
    ablage: C:\dev\restore-probe (nicht in Git, nicht in OneDrive)
    inhalt_format_umfang: zu belegen
```

Abgleich mit Git (Claude Code, A30): Alle Objektzahlen in `public` stimmen mit `supabase/schema/public-schema.sql` auf main `7dc4699d` überein (Plan Abschnitt 3). Folge aus der Migrationshistorie: Das Schema für die Probe darf nicht allein aus `supabase/migrations` als gleich gelten; Gleichheit ist über RP-02 zu belegen.

## 3 RP-02 Strukturvergleich (ausgeführt)

| Punkt      | Wert                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ausführung | Owner, 2026-11-07, 04:44 bis 04:45 UTC (05:44 bis 05:45 +01:00), Lovable-Connector, nur SELECT; Fassung unverändert (nicht RP-02a)                                |
| Ergebnis   | Alle Teile A bis J2 vollständig (Teil K der Anlage); drei Abfragen scheiterten im ersten Versuch an SQL-Fehlern und liefen korrigiert erneut, Wortlaut in Teil K  |
| Beleg      | Anlage `queue/anlagen/RP-02-ergebnis-2026-11-07.md` (Branch `ops/queue`, 873 Zeilen); keine E-Mail-Adressen, Hashes, Tokens oder `app_settings`-Werte laut Anlage |
| Prüfwerte  | J2: Zeilenzahl und md5 je Tabelle, `now()` = 2026-11-07 04:45:08 UTC; Soll-Werte und Abnahmekriterien im Plan, Abschnitt 15                                       |
| Auswertung | Auftrag A38 (Tabellenrechte `anon`, QS-01 Migration C, Soll für die Probe) und Plan Abschnitt 15.2 (Vorabvergleich mit dem Git-Snapshot)                          |
| Freigaben  | durch den Owner; Datum der Freigaben nicht in Git                                                                                                                 |

Kernaussagen (Zählwerte, keine Rohdaten):

```yaml
rp02:
  zeitpunkt: 2026-11-07T05:44+01:00
  j2_zeitpunkt: 2026-11-07T05:45:08+01:00
  teil_a: alle Objekte A1 bis A10 live vorhanden
  spalten: 302
  constraints: 153
  indizes: 74
  funktionen: { anzahl: 41, security_definer: 15, md5: Anlage Teil E }
  funktionsrechte:
    {
      zeilen: 109,
      anon_und_public: [bsf02c_projection_identity_guard, customer_responsibility_identity_guard],
    }
  trigger: 41
  policies: { anzahl: 65, rollen: [authenticated] }
  tabellenrechte: { zeilen: 59, anon_tabellen: 9, rls_aktiv: 25, force_rls: 0 }
  sequenzen: 0
  j2: { tabellen: 25, zeilen_gesamt: 728, leer: 5 }
  zeilen_gleich_rp01: [audit_log 336, profiles 9, user_roles 9]
```

Auftragstext: Quelle `queue/anlagen/RP-02-datenauftrag.txt` (Branch `ops/queue`), wörtlich übernommen. Prüfung und Änderungsvorschläge V-01 bis V-13: Plan Abschnitt 10; Folgen der unveränderten Fassung: Plan Abschnitt 15.6.

```text
Datenauftrag RP-02 (nur lesen) nach ADR-0037, Projekt SysIng Dashboard.
Zweck: Fehlende Teile von RP-01 fuer die lokale Restore-Probe (R-14, G03): Schema in kleinen Stuecken,
gezielte Pruefung von vier Repo-Migrationen ohne Gegenstueck in der Live-Tabelle, Pruefsummen.
Schreibe nichts. Verwende ausschliesslich SELECT. Brich ab, falls eine Anweisung schreiben wuerde.
Gib keine E-Mail-Adressen, Passwort-Hashes, Tokens oder Werte aus app_settings aus.
Liefere jeden Teil als eigene Tabelle in kompakter Form (eine Zeile je Objekt, keine Freitextbloecke).
Wenn ein Teil mehr als 120 Zeilen hat, gib ihn in Bloecken zu je 120 Zeilen aus und nenne die Blocknummer.
Kuerze nichts stillschweigend. Meldet die Anzeige eine Kuerzung, nenne das wortlich und gib den Rest als naechsten Block aus.

A. Gezielte Pruefung (je Zeile: Objekt, vorhanden ja/nein, Befund in einem Satz)
 A1 public.reference_catalog.scope_type (Typ, NOT NULL, Default).
 A2 public.reference_value.systemhouse_id (Typ).
 A3 Indizes reference_value_global_key_unique, reference_value_systemhouse_key_unique,
    reference_value_systemhouse_idx, reference_value_history_systemhouse_idx (pg_get_indexdef).
 A4 Funktionen public.reference_value_validate_scope und public.reference_value_track_change
    (vorhanden, prosecdef, md5 von pg_get_functiondef).
 A5 Trigger reference_value_validate_scope auf public.reference_value.
 A6 Policies reference_value_read, reference_value_insert, reference_value_update auf reference_value und
    reference_value_history_read auf reference_value_history (Befehl, Rollen).
 A7 public.shared_work_package_projection: Spalten category_key (text, null) und category_observed
    (boolean, NOT NULL, Default false); Index shared_work_package_projection_active_category_idx
    (pg_get_indexdef).
 A8 Funktion public.has_permission(uuid, text): prosecdef (soll false sein = SECURITY INVOKER), Rechte
    (EXECUTE fuer PUBLIC, anon, authenticated, service_role), md5 von pg_get_functiondef.
 A9 Funktion public.bsf02c_publish_shared_projection_snapshot: vorhanden, Argumente, prosecdef,
    Rechte, md5 von pg_get_functiondef.
 A10 Constraint reference_value_history_systemhouse_fk auf public.reference_value_history
     (pg_get_constraintdef, validiert ja/nein).

B. Spalten je Tabelle in public: Tabelle, Spaltenposition, Spalte, Typ, nullable, Default.
   Je Block 120 Zeilen, sortiert nach Tabelle und Position.

C. Constraints in public: Tabelle, Name, Typ, pg_get_constraintdef, validiert.

D. Indizes in public: Tabelle, Name, pg_get_indexdef.

E. Funktionen in public: Name, Argumente, Sprache, prosecdef, Rechte (aclexplode vereinfacht:
   Rolle, EXECUTE ja/nein), md5(pg_get_functiondef). Keine Funktionskoerper.

F. Trigger in public (tgisinternal = false): Tabelle, Name, Zeitpunkt, Ereignis, Funktion, aktiviert.

G. Policies in public: Tabelle, Name, Befehl, Rollen, md5(qual), md5(with_check), Laenge von qual und with_check.

H. Rechte auf Tabellen in public fuer anon, authenticated und service_role
   (Tabelle, Rolle, SELECT/INSERT/UPDATE/DELETE ja/nein). RLS und FORCE RLS je Tabelle.

I. Sequenzen und Identitaetsspalten in public: Name, aktueller Wert (last_value), Zyklus.

J. Pruefsummen in zwei Schritten.
 J1 Ausschlussliste: Liste alle Spalten in public (Tabelle, Spalte, Typ), deren Name email, hash, password,
    token, secret oder phone enthaelt, sowie alle Spalten vom Typ json oder jsonb, sowie
    app_settings.value. Nur Namen und Typen, keine Werte.
 J2 Pro Tabelle in public: md5(coalesce(jsonb_agg(to_jsonb(t) - <Ausschlussliste der Tabelle> ORDER BY
    <Primaerschluessel>)::text, 'LEER')). Nenne je Tabelle die ausgeschlossenen Spalten. Bei Tabellen
    ohne Primaerschluessel sortiere nach allen verbleibenden Spalten. Gib zusaetzlich die Zeilenzahl aus.
    Nenne den Zeitpunkt (now()) und weise darauf hin, dass die Abfragen keinen gemeinsamen Snapshot haben.

K. Bericht: je Teil Status (vollstaendig, teilweise, nicht ausgefuehrt), Fehlermeldungen im Wortlaut,
   Zahl der ausgegebenen Zeilen. Nichts schreiben, keine Dateien, keine Migrationen.
```

Prüfergebnis in Kurzform (vor der Ausführung): lesend ja, ohne Geheimnisse ja, für den Strukturvergleich weitgehend vollständig. Vor der Ausführung sollten mindestens V-01 (SQL-Text im Wortlaut), V-02 (Zielbindung), V-03 (Sitzungseinstellungen) und V-04 (`jsonb` in die Prüfsumme) übernommen werden, sonst ist der Vergleich mit der lokalen Probe nicht reproduzierbar und `audit_log` nicht vollständig prüfbar. Die Anlage bleibt unverändert; eine geänderte Fassung heißt RP-02a und braucht eine eigene Freigabe 1. Nachtrag 2026-11-07: RP-02 lief unverändert; die offenen Punkte (V-01 bis V-04, dazu TRUNCATE/REFERENCES/TRIGGER, `pg_default_acl`, Schema `private`) sollten in einem lesenden Ergänzungsauftrag RP-02b oder in RP-03 nachgeholt werden (Plan Abschnitt 15.6).

## 4 RP-03 Prüfwerte zum Exportzeitpunkt (Entwurf)

Zweck: Prüfwerte für S4 aus demselben Zeitfenster wie der Datenexport und Metadaten der Auth-Konten, damit die Probe die 9 Konten mit den Live-UUIDs ohne Hashes neu anlegen kann (Plan Abschnitt 8). Variante V1 (empfohlen) liefert nur Prüfwerte; Variante V2 (Teil E) liefert Zeilen und ist nur auszuführen, wenn S0 eine Lücke im Lovable-Export zeigt.

Vorbedingung: Der Owner löst unmittelbar vor RP-03 einen neuen Export aus (oder bestätigt, dass seit dem Export vom 2026-11-06 niemand angemeldet war). Zwischen Export und RP-03 darf sich niemand anmelden; jede Anmeldung schreibt `audit_log`.

```text
Datenauftrag RP-03 (nur lesen) nach ADR-0037, Projekt SysIng Dashboard. ENTWURF, nicht freigegeben.
Zweck: Pruefwerte fuer die lokale Restore-Probe (R-14, G03) zum Zeitpunkt des Datenexports und
Metadaten der Auth-Konten ohne E-Mail-Adressen und ohne Passwort-Hashes.
Schreibe nichts. Verwende ausschliesslich SELECT. Brich ab, falls eine Anweisung schreiben wuerde.
Fuehre alle Teile, wenn moeglich, in einer Transaktion BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY aus
und nenne, ob das gelungen ist. Gib je Teil die verwendete SQL-Anweisung im Wortlaut aus.
Gib keine E-Mail-Adressen, Telefonnummern, Namen, Passwort-Hashes, Tokens, Schluessel oder Werte aus
app_settings aus. Liefere jeden Teil als eigene Tabelle, eine Zeile je Objekt. Bloecke zu je 120 Zeilen,
Blocknummer nennen. Kuerze nichts stillschweigend.

0. Zielbindung: Lovable-Projekt-ID wie im Connector angezeigt, current_database(), current_user,
   version(), now(), current_setting fuer TimeZone, DateStyle, IntervalStyle, extra_float_digits,
   lc_collate; hoechste version in supabase_migrations.schema_migrations; Zeilenzahl public.profiles.
   Stoppe und berichte, wenn profiles nicht 9 Zeilen hat oder die hoechste Version nicht
   20261022090000 ist (Abweichung nennen, nichts weiter ausfuehren).

A. Zeilenzahl je Tabelle in public (25 Tabellen erwartet) und in auth.users und auth.identities.

B. Juengster Zeitstempel je Tabelle in public: max(created_at) und max(updated_at), soweit die Spalten
   vorhanden sind; sonst "keine Spalte".

C. Auth-Konten (9 erwartet), sortiert nach id COLLATE "C": id, aud, role, created_at,
   email_confirmed_at IS NOT NULL, last_sign_in_at IS NOT NULL, banned_until, deleted_at, is_anonymous,
   is_sso_user, Schluesselnamen von raw_app_meta_data und raw_user_meta_data (nur Namen, keine Werte).
   Dazu je id: Anzahl Zeilen in auth.identities je provider. Dazu je id: role aus public.user_roles und
   status aus public.profiles. Keine E-Mail-Adresse, kein Name, kein encrypted_password.

D. Pruefsumme je Tabelle in public, sortiert nach Tabellenname:
   md5(coalesce(jsonb_agg(to_jsonb(t) - <Ausschluss> ORDER BY <Primaerschluessel> COLLATE "C")::text, 'LEER')).
   Ausschluss: Spalten, deren Name email, hash, password, token, secret oder phone enthaelt, und
   app_settings.value. jsonb-Spalten bleiben in der Pruefsumme. Nenne je Tabelle die ausgeschlossenen
   Spalten und die Zeilenzahl. Zusaetzlich fuer audit_log: min(created_at), max(created_at),
   md5 der nach id sortierten id-Liste.

E. Nur auf ausdrueckliche Anweisung des Owners (Variante V2, sonst "nicht ausgefuehrt" berichten):
   Zeilen je Tabelle als JSON Lines (eine Zeile je Datensatz, to_jsonb(t) - <Ausschluss aus D>,
   zusaetzlich ohne first_name, last_name, display_name in profiles), Bloecke zu je 50 Zeilen,
   je Block md5 des Blocktextes. Tabellenliste und Reihenfolge nennt der Owner.

F. Bericht: je Teil Status (vollstaendig, teilweise, nicht ausgefuehrt), Zahl der ausgegebenen Zeilen,
   Fehlermeldungen im Wortlaut, Hinweis ob ein gemeinsamer Snapshot bestand.
   Nichts schreiben, keine Dateien, keine Migrationen.
```

Offen im Entwurf:

- Ob Passwort-Hashes über den Connector technisch lesbar wären, ist zu belegen. Der Entwurf schließt sie aus; die Konten werden in der Probe mit denselben UUIDs, Probe-Adressen und lokalen Kennwörtern neu angelegt (Plan Abschnitt 8, Entscheidung E2).
- Ob der Connector mehrere Anweisungen in einer Transaktion ausführt, ist zu belegen.
- Die Stoppwerte in Teil 0 (9 Profile, höchste Version `20261022090000`) sind aus RP-01 und dem Repo abgeleitet; die höchste Live-Version ist vor Freigabe aus RP-01 oder RP-02a zu bestätigen.
- Teil E bringt personenbezogene Daten in den Connector-Verlauf. Er sollte nur ausgeführt werden, wenn der Lovable-Export die betroffene Tabelle nicht enthält.

## 5 Freigaben

| Auftrag | Stufe      | Inhalt                       | Wer   | Datum      | Status                                   |
| ------- | ---------- | ---------------------------- | ----- | ---------- | ---------------------------------------- |
| RP-01   | Freigabe 1 | Auftragstext                 | Owner | 2026-11-06 | erteilt im Chat                          |
| RP-01   | Freigabe 2 | „Go“                         | Owner | 2026-11-06 | erteilt, ausgeführt                      |
| RP-02   | Freigabe 1 | Auftragstext (unverändert)   | Owner | 2026-11-07 | erteilt, Datum der Freigabe nicht in Git |
| RP-02   | Freigabe 2 | „Go“                         | Owner | 2026-11-07 | erteilt, ausgeführt 04:44 bis 04:45 UTC  |
| RP-03   | Freigabe 1 | Auftragstext, Variante V1/V2 | Owner | _offen_    | offen                                    |
| RP-03   | Freigabe 2 | „Go“                         | Owner | _offen_    | offen                                    |

Eine zweite Person gibt es heute nicht (R-04). Weil die Aufträge nur lesen, ist der Schaden bei einem Fehler gering; die Abweichung „beide Freigaben durch den Owner“ ist wie beim Kiosk-Konto im Tracker zu vermerken.

## 6 Rückbau

Entfällt: Die Aufträge schreiben nichts. Prüfung nach der Ausführung: Zeilenzahl `audit_log` vor und nach dem Auftrag unverändert (Teil A oder D vorher und nachher), keine neue Migration.

## 7 Bericht und Ablage

- Das Ergebnis von RP-02 liegt als Anlage `queue/anlagen/RP-02-ergebnis-2026-11-07.md` auf Branch `ops/queue`; eine Übernahme nach `docs/probe/` ist offen.
- Ergebnisse von RP-02 und RP-03 legt der Owner als Textdatei unter `C:\dev\restore-probe\auftraege\` ab, mit Datum und SHA-256. Ergebnisse ohne Werte (Katalog, Prüfsummen, Zählungen) dürfen nach Sichtung durch Claude Code in Git (Vorschlag `docs/probe/RP-02-ERGEBNIS-<Datum>.md`).
- Ergebnisse mit Daten (Teil E) dürfen nie in Git, OneDrive oder den Tracker.
- Fehler im Wortlaut, Zeitpunkt (+01:00) und Status je Teil gehören in den Bericht und in den Tracker (`fortschritt`).
