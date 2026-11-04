# Datenauftrag Kiosk-Konto kiosk@ (Rolle kiosk)

Stand: 2026-11-04. Grundlage: `docs/ADR/0037-kontrollierte-datenauftraege.md`, Bericht `docs/BERICHT-2026-11-04-KIOSK-KONTO.md`, Backlog-Punkt „Anzeigemodus auf Systemadministrator-Konto“, Nachweis EV-0005 (`docs/NACHWEISE.yaml`).
Status: **Freigabe 1 erteilt, Freigabe 2 mit Abweichung von ADR-0037 (Abschnitt 4), Ausführung offen.**

Konten stehen hier nur mit dem Teil vor dem @, wie in `docs/NACHWEISE.yaml`. Alle Adressen liegen in der Domain des Owners. Passwörter, Tokens und andere Zugangsdaten stehen nicht in dieser Datei und dürfen auch nicht nachgetragen werden.

## 1 Ziel

| Punkt       | Festlegung                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Zielzustand | Konto kiosk@ mit genau der Rolle `kiosk`. Das Anzeigegerät zeigt nur Demodaten unter `/kiosk`.                          |
| Abgrenzung  | Die interne Kiosk-Sicht (`/kiosk?mode=internal`) ist nicht Ziel; die Rolle `kiosk` hat kein `project.controlling.view`. |
| Folge       | bm@ (Systemadministrator, heute im Anzeigemodus) wird nach bestandener Prüfung archiviert, nicht gelöscht.              |

## 2 Ausgangslage (Stand 2026-11-04)

| Merkmal              | Wert                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Konto                | kiosk@                                                                                                   |
| User UID             | `35a51562-30b6-403c-adfa-566c575d1244`                                                                   |
| Angelegt             | 2026-11-04, 20:17:02, über die Auth-Verwaltung                                                           |
| E-Mail-Bestätigung   | automatisch bestätigt                                                                                    |
| Erste Anmeldung      | 2026-11-04, gegen 20:33, als Viewer: Normal-Dashboard ohne Beträge, kein Kiosk-Schirm (Screenshot Owner) |
| Rolle                | `viewer`, vergeben durch den Trigger `on_auth_user_created` (`handle_new_user`)                          |
| Fachdaten des Kontos | keine; keine Zuordnungen (Viewer hat keine Bearbeitungsrechte)                                           |

Beobachtung am Anzeigegerät (Screenshot Owner, 2026-11-04, 20:32): Die Seite `/kiosk` zeigt „DEMO-DATEN — KEINE LIVE-DATEN“ und „Kiosk-Demodaten sind auf diesem Gerät nicht geladen.“ Der Kiosk-Datensatz liegt im Browser des Geräts und muss dort geladen werden (Handbuch, Kapitel Info-Kiosk). Siehe KK-07 und KK-08.

Die Rolle `kiosk` ist in der Datenbank vorhanden und muss die einzige Rolle des Kontos sein (Trigger `trg_enforce_kiosk_role_exclusive`). Im Admin-Dialog ist sie absichtlich nicht wählbar. Der vorgesehene Weg ist das Formular „Kiosk-Konto anlegen“ in der Backend-Administration. Es ersetzt die Startrolle `viewer` durch `kiosk` und schreibt den Audit-Eintrag `auth_account.kiosk_create` (Bericht, Abschnitt 2).

## 3 Mailweg

| Punkt            | Festlegung                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| Zustellung       | kiosk@ ist ein Alias auf info@. Rücksetz-Mails und andere Auth-Mails für kiosk@ landen im Postfach info@. |
| Bestätigungsmail | Entfällt. Das Formular legt das Konto mit bestätigter Adresse an (`email_confirm: true`).                 |
| Leser            | nur der Owner                                                                                             |
| Risiko           | R-04 (Bus-Faktor 1): Fällt der Owner aus, kann niemand das Kennwort von kiosk@ zurücksetzen lassen.       |

## 4 Freigaben

| Stufe                     | Inhalt                                                                | Wer                 | Datum              | Status                 |
| ------------------------- | --------------------------------------------------------------------- | ------------------- | ------------------ | ---------------------- |
| Freigabe 1                | Auftragstext und Weg A (Konto löschen, über das Formular neu anlegen) | Owner               | 2026-11-04, abends | erteilt im Chat        |
| Freigabe 2                | „Go“ vor der Ausführung                                               | Owner               | 2026-11-04         | erteilt mit Abweichung |
| Bestätigung zweite Person | Nachträgliche Bestätigung der Abweichung                              | Name/Rolle: _offen_ | Datum: _offen_     | offen                  |

**Abweichung von ADR-0037:** ADR-0037 verlangt zwei getrennte Freigaben, einen read-only Preflight über den Connector-Kanal und eine Zielbindung über einen Live-Fingerprint. Dieser Auftrag weicht davon ab:

- Beide Freigaben erteilt der Owner allein. Eine zweite Person gibt es heute nicht (R-04, Bus-Faktor 1).
- Es gibt keinen SQL-Lauf über den Connector. Beide Schritte laufen über Fachfunktionen der Anwendung und der Auth-Verwaltung mit Audit-Eintrag.
- Begründung: Das betroffene Konto ist ein Testkonto ohne Fachdaten und ohne Zuordnungen; es war nur einmal als Viewer angemeldet. Der Schaden bei einem Fehler ist gering und lässt sich durch erneutes Löschen beheben.
- Die Abweichung muss nachträglich von einer zweiten Person bestätigt werden. Bis dahin steht sie im Tracker und als Hinweis bei R-04 im Risikoregister.

## 5 Schritte

```mermaid
flowchart TD
  V[Vorbedingungen prüfen] --> A["(a) kiosk@ in der Auth-Verwaltung löschen"]
  A --> B["(b) Backend-Administration: Kiosk-Konto anlegen"]
  B --> C["(c) Rolle prüfen, neue User UID eintragen"]
  C --> D["(d) Prüfliste KK-01 bis KK-06 und KK-08 am Anzeigegerät"]
  D -- bestanden --> E["(e) bm@ archivieren, nicht löschen"]
  D -- nicht bestanden --> R[Rollback: kiosk@ entfernen, bm@ bleibt]
```

| Schritt | Handlung                                                                                                                                                                                                                      | Wer   | Prüfung danach                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| V       | Vorbedingungen: Konto mit der UID aus Abschnitt 2 hat keine fachlichen Daten und keine Zuordnungen angelegt; die Anmeldung als Viewer am 2026-11-04 ist bekannt und erlaubt; Backend-Administration ist in der App erreichbar | Owner | Bei Abweichung stoppen, nichts löschen                                                                      |
| (a)     | Konto `35a51562-30b6-403c-adfa-566c575d1244` in der Auth-Verwaltung löschen                                                                                                                                                   | Owner | Konto nicht mehr in der Kontenliste. Der Eintrag `auth.bootstrap` bleibt in `audit_log`                     |
| (b)     | Backend-Administration → „Kiosk-Konto anlegen“: Anzeigename „Info-Kiosk“, E-Mail kiosk@, Kennwort nur im Formular eingeben                                                                                                    | Owner | Meldung „Kiosk-Konto wurde angelegt.“                                                                       |
| (c)     | In der Kontenliste der Backend-Administration Rolle prüfen; neue User UID in Abschnitt 6 eintragen                                                                                                                            | Owner | Genau eine Rolle `kiosk`, keine Rolle `viewer`. Audit-Eintrag `auth_account.kiosk_create` mit der neuen UID |
| (d)     | Prüfliste KK-01 bis KK-06 und KK-08 (Abschnitt 7) am Anzeigegerät; KK-07 nur dokumentieren                                                                                                                                    | Owner | Alle geforderten Punkte bestanden; Ergebnis als neuer Nachweis in `docs/NACHWEISE.yaml`                     |
| (e)     | Erst nach bestandenem (d): bm@ auf Status „archiviert“ setzen, nicht löschen                                                                                                                                                  | Owner | info@ ist aktiver Systemadministrator (bestätigt, siehe Hinweis unten)                                      |

**Hinweis zu (e):** info@ ist aktiver System-Administrator (Benutzerliste und Anzeige oben rechts, Owner, 2026-11-04). bm@ ist damit nicht der letzte aktive Systemadministrator; der Trigger `protect_last_sysadmin_profile` (`supabase/migrations/20260720031101_f91cbc77-7151-4442-bd5d-efd315eb8790.sql:113` ff.) blockiert das Archivieren von bm@ deshalb nicht. Die Angabe „Administrator“ für info@ in EV-0005 beschreibt die Prüferwartung „mit Rechten zum Sehen von Beträgen“, nicht die Rolle; die Rolle von info@ ist System-Administrator.

## 6 Ergebnis

| Feld                                        | Wert                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Neue User UID kiosk@                        | _offen_                                                                    |
| Rolle nach (c)                              | _offen_                                                                    |
| Prüfung (d), Nachweis-ID                    | _offen_                                                                    |
| info@ aktiver Systemadministrator bestätigt | erledigt, 2026-11-04 (Beleg: Benutzerliste und Anzeige oben rechts, Owner) |
| bm@ archiviert am                           | _offen_                                                                    |

## 7 Prüfliste am Anzeigegerät

| ID    | Prüfung                                                                    | Erwartung                                                                                                                        | Ergebnis                          |
| ----- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| KK-01 | Anmeldung am Anzeigegerät mit kiosk@                                       | öffnet automatisch `/kiosk`                                                                                                      | _offen_                           |
| KK-02 | Direktaufruf `/dashboard`, ein Projektdetail und ein Projektbericht        | Umleitung auf `/kiosk`                                                                                                           | _offen_                           |
| KK-03 | `/kiosk?mode=internal`                                                     | keine interne Sicht                                                                                                              | _offen_                           |
| KK-04 | Kennzeichnung der Anzeige                                                  | „DEMO-DATEN — KEINE LIVE-DATEN“                                                                                                  | _offen_                           |
| KK-05 | Beträge, Umsatz-Kachel, Tab Abrechnung, Personennamen, Admin-Bereich       | nicht sichtbar                                                                                                                   | _offen_                           |
| KK-06 | Anzeige nach längerer Zeit ohne Eingabe                                    | keine automatische Abmeldung                                                                                                     | _offen_                           |
| KK-07 | Kiosk-Demodatensatz auf dem Gerät laden                                    | Kiosk zeigt Demowerte statt „Kiosk-Demodaten sind auf diesem Gerät nicht geladen.“                                               | nur dokumentiert, nicht gefordert |
| KK-08 | Kontowechsel am Gerät (Abmelden eines anderen Kontos, Anmelden mit kiosk@) | `/kiosk` öffnet; keine Inhalte oder Rechte des vorherigen Kontos sichtbar; ein bereits geladener Kiosk-Datensatz bleibt erhalten | _offen_                           |

KK-07 hängt von der geplanten Änderung „Kiosk-Demodaten über denselben Ladeweg wie alle Demodaten“ ab (Backlog). Heute lädt ein Konto mit `users.manage` den Datensatz über „Service → Demo-Datensatz…“, das Kiosk-Konto selbst kann es nicht. Bis zur Änderung wird KK-07 nur dokumentiert; ein Ergebnis „nicht geladen“ gilt nicht als Fehler dieses Auftrags.

## 8 Rollback

1. bm@ bleibt unverändert, bis Schritt (d) bestanden ist. Das Anzeigegerät kann bis dahin weiter mit bm@ laufen.
2. Schlägt (b), (c) oder (d) fehl, wird kiosk@ in der Auth-Verwaltung wieder entfernt. Danach entscheidet der Owner über einen neuen Versuch.
3. bm@ wird archiviert, nicht gelöscht. Ein archiviertes Konto lässt sich über den Status wieder aktivieren.
4. Zeilen in `audit_log` werden nie gelöscht, auch nicht die Einträge des gelöschten Kontos.
