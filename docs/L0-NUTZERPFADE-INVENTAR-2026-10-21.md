# L0 – Inventar der Nutzerpfade und Demo-Voraussetzungen

Stand: 2026-10-21 · Basis `main@4f1ddee` · Bezug: Golden-Gate-Lieferplan L0, Tracker `GOLDEN-GATE-EXECUTION-TRACKER.yaml`

**Art des Dokuments:** statisches Inventar aus dem Repository-Stand. Es ist **kein**
Laufzeit-Smoke-Protokoll. Ein Laufzeitnachweis (Anmeldung, Rollen, Daten) wurde nicht
ausgeführt und bleibt als `NOT_VERIFIED` offen, bis jemand mit Demo-Konten die
Preview oder die veröffentlichte App durchläuft.

## 1. Veröffentlichter Stand (Systemstatus 2026-10-21 13:10)

| Punkt                | Befund                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Version              | 1.68.0, Build 2026-10-20 21:10:50                                                          |
| Build-Commit, Branch | vom Hosting nicht bereitgestellt (Build ohne Git); Abgleich mit `main` nicht möglich       |
| GitHub-Abgleich      | in der App „nicht prüfbar", Ursache bisher nicht erfassbar (Diagnose in PR #197)           |
| Release-Tag          | letztes Tag `v1.65.0`; 1.68.0 ist nicht getaggt                                            |
| Nachweisweg          | Version plus Tag statt Commit-Anzeige (Hosting liefert keinen Commit), siehe Tracker QS-03 |

## 2. Vorhandene Routen (`src/routes`)

| Route                                                 | Zweck                                           | Berechtigung                      |
| ----------------------------------------------------- | ----------------------------------------------- | --------------------------------- |
| `/auth`, `/reset-password`                            | Anmeldung, Registrierung, Kennwort zurücksetzen | öffentlich                        |
| `/dashboard`                                          | persönliches Arbeitsdashboard, „Mein AVKK"      | `avkk.view`                       |
| `/verantwortungen`                                    | Verantwortungen, Arbeitspaket-Sicht (BSF-03E)   | `avkk.management.view`            |
| `/meine-kunden`, `/meine-kunden/:id`                  | Kunden mit aktiver Verantwortung                | nicht geprüft                     |
| `/kundenverantwortung`                                | primäre Kundenverantwortung verwalten           | nicht geprüft                     |
| `/projektcontrolling`                                 | Leistungssicht, read-only (BSF-03A)             | `project.controlling.view`        |
| `/leistungsnachweis`                                  | Teamlead-Review und finaler Nachweis (BSF-03B)  | `performance.statement.manage`    |
| `/kiosk`                                              | Wallboard (Demo- und interne Daten)             | `kiosk.view` (technische Rolle)   |
| `/api/status`, `/api/sync`, `/api/public/auth-config` | Status, Synchronisation, Auth-Konfiguration     | `status`/`auth-config` öffentlich |

## 3. Demo-Voraussetzungen (aus `docs/DEMO-USERS.md`)

Der Demo-Pfad braucht fünf Konten (vier Demo-Personen plus Administrator) und fünf
manuelle Einrichtungsschritte (Konten, Anzeigenamen, Rollen, Zuordnung, lokaler
Bestand je Konto). Es gibt keinen Ein-Klick-Demo-Einstieg. Der Demo-Reset ist Teil von
L6 (GG-05).

**Wechselwirkung mit QS-01:** Die Anleitung setzt voraus, dass das erste registrierte
Konto automatisch Systemadministrator wird. Die geplante Bindung des ersten Admins an
eine konfigurierte E-Mail-Adresse ändert diesen Schritt. Anleitung und Tracker müssen
bei Umsetzung von QS-01 gemeinsam angepasst werden.

## 4. Noch nicht verfügbare Funktionen (Golden-Gate-Umfang)

| Paket | Funktion                                     | Stand im Code              |
| ----- | -------------------------------------------- | -------------------------- |
| L2/L3 | Managementcockpit (fünf Rollensichten)       | keine Route, kein Composer |
| L4    | Management-Kiosk auf Cockpit-Daten           | nicht vorhanden            |
| L5    | Kunden-PDF aus autorisiertem Kundensnapshot  | nicht vorhanden            |
| L6    | manueller kanonischer Import, Demo-Reset     | nicht vorhanden            |
| L7    | Reporting 2 (Management- und Kundenberichte) | nicht vorhanden            |

## 5. Vorhandene Lücken im Ablauf (Befunde)

- Build-Commit nicht nachweisbar (siehe 1); gelöst über Tag-Disziplin, nicht über Code.
- Kiosk-Infrastrukturspalte leer bei alten Geräte-Daten: behoben in PR #196, wirkt in
  der veröffentlichten App erst nach Veröffentlichung.
- Fälligkeitsdatum in der geteilten Projektion: behoben in PR #192, in der
  veröffentlichten App **nicht verifiziert**.

## 6. Offene Nachweise für den Laufzeit-Smoke (`NOT_VERIFIED`)

1. Anmeldung und Rollenwechsel mit den Demo-Konten.
2. Pfad Kunde → Projekt → Arbeitspaket → Tätigkeit mit Daten.
3. Fälligkeitsdatum setzen, veröffentlichen, in `/verantwortungen` sichtbar.
4. Leistungsnachweis: Review, Finalisierung.
5. Kiosk: Infrastrukturspalte nach Neuladen der Demo-Daten.
6. Systemstatus: GitHub-Abgleich nach Veröffentlichung von PR #197 mit Fehlergrund.

Veröffentlichung gilt als eigenes Go/No-Go (Lieferplan, Abschnitt 6); dieses Dokument
behauptet weder `PREVIEW_VERIFIED` noch `PUBLISHED_VERIFIED`.
