# ADR-0026: Löschstrategie, AVKK im Backup und bewertete Sicherheitswarnungen

- **Status**: Accepted
- **Datum**: 2026-08-12
- **Sprint**: 08B

## Kontext

Mit Sprint 08B werden AVKK-Führungsdaten und Reference Data Teil von Backup,
Restore und JSON-Export. Damit stellen sich zwei Fragen verbindlich:

1. Was passiert beim Restore mit Daten, die in der Datenbank liegen, deren
   Bezugsobjekte (Aufgaben) aber lokal gehalten werden?
2. Warum melden die Sicherheitsprüfungen fehlende `DELETE`-Regeln für AVKK-
   und Katalogtabellen?

## Entscheidung

### 1. Kein Hard Delete — Historisierung statt Löschung

AVKK-Datensätze und Katalogwerte werden **nie gelöscht**. Fachliche
Beendigung erfolgt über `superseded_at`, `valid_to` bzw. `is_active = false`.
Dementsprechend gibt es weder `DELETE`-Policies noch `DELETE`-Grants; das
Recht existiert für keine Rolle, auch nicht für Administratoren. Löschen ist
damit nicht "vergessen", sondern ausgeschlossen — Voraussetzung für
Nachvollziehbarkeit (Audit-Log, `reference_value_history`).

### 2. Restore prüft AVKK, schreibt es aber nicht zurück

`restoreFromZip()` liest `avkk.json` und `reference-data.json`, prüft sie
vollständig (Prüfsumme, Manifest-Eintrag, Pflichtfelder, ID-Eindeutigkeit,
Subjektbezüge, Katalogwerte, Katalogversionen) und **bricht vor jedem
Schreibvorgang ab**, wenn etwas nicht stimmt. Bei Erfolg entsteht ein
Prüfbericht (`RestoreResult.avkk`), aber kein Datenbankschreibvorgang.

Begründung: Der Restore ist eine reine Client-Operation auf `localStorage`.
Ein Rückschreiben in die Datenbank wäre nicht transaktional zum lokalen Teil,
würde fremde Mandanten- und Benutzer-IDs einschleppen und die Audit-Kette
verfälschen. Ein DB-Restore gehört auf die Datenbankebene, nicht in den
Browser.

### 3. Quarantäne statt stillem Import

AVKK-Datensätze, deren Aufgabenobjekt im lokalen Bestand fehlt, werden als
`quarantine[]` ausgewiesen (mit Grund) und im Restore-Protokoll als Warnung
geführt. Wird kein lokaler Bestand übergeben, meldet der Bericht ausdrücklich,
dass der Aufgabenbezug **nicht geprüft werden konnte** — die Lücke wird nicht
als "in Ordnung" dargestellt.

### 4. Katalogstand ist Teil des Nachweises

`avkk.json` führt `catalogRefs[]` mit Katalogschlüssel und -version. Weicht
der Archivstand ab, ist das eine Warnung (Daten bleiben lesbar); fehlt ein
referenzierter Katalog ganz, ist es ein Fehler. Unbekannte Katalogwerte in
AVKK-Datensätzen sind immer ein Fehler.

## Bewertete Sicherheitswarnungen

| Warnung | Bewertung | Begründung |
| --- | --- | --- |
| `avkk_subject` ohne DELETE-Policy | accepted | Löschen ist fachlich ausgeschlossen (Punkt 1). Kein Grant, keine Policy — konsistent. |
| `reference_catalog`/`reference_value` ohne DELETE-Policy | accepted | Katalogwerte werden deaktiviert (`is_active = false`, `valid_to`), nie entfernt. |
| `app_settings` für alle angemeldeten Benutzer lesbar | accepted | Inhalt ist reine Laufzeitkonfiguration (`idle_timeout_minutes`, `avkk.risk_threshold`), die jede angemeldete Sitzung zur Darstellung benötigt. Schreiben bleibt auf Administratoren beschränkt und wird auditiert. Es dürfen dort **keine** Secrets abgelegt werden. |

## Konsequenzen

Positiv:

- Backups sind fachlich vollständig; AVKK ist nicht mehr blinder Fleck.
- Beschädigte oder manipulierte AVKK-Daten werden erkannt, bevor irgendetwas
  geschrieben wird.
- Löschstrategie ist einheitlich und begründet statt implizit.

Negativ:

- Ein AVKK-Restore in die Datenbank ist bewusst **nicht** möglich; nach
  Datenverlust in der Cloud braucht es eine Datenbankwiederherstellung.
- Das Archiv wächst um den vollständigen Katalogstand.

## Verifikation

`src/__tests__/backup/avkk-backup.test.ts` deckt Roundtrip, Quarantäne,
unbekannte Katalogwerte, fehlenden Katalogstand, Kompatibilität zu Archiven
ohne AVKK sowie die Einzelprüfungen von `validateAvkkPayload()` ab.
