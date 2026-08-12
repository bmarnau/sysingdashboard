# Sprint 08B – AVKK in Backup/Restore und JSON-Export, Security-Warnungen bewertet

## Ausgangsbefund (geprüft, nicht angenommen)

- Backup und JSON-Export lesen heute **ausschließlich** den lokalen Browser-Zustand (`collectSnapshot()` in `src/lib/backup/snapshot.ts`, `JsonExportService`). AVKK und Reference Data liegen dagegen in der Cloud-Datenbank — deshalb fehlen sie in beiden Verträgen.
- Manifest 2.0 mit `entries[]`, sha256, Größe, Dateityp ist vorhanden und trägt AVKK ohne Schemaänderung: `storageKey: null`, sprechende `logicalName`-Werte.
- Export-Schema steht auf Version `1.0.0`.
- **Es existiert im gesamten öffentlichen Schema kein einziges DELETE-Recht** für `anon`, `authenticated` oder `service_role` (per Rechteabfrage bestätigt). Ein Hard Delete ist über den Client heute technisch unmöglich.
- `app_settings` enthält aktuell genau zwei Einträge: `idle_timeout_minutes` (5) und `avkk.risk_threshold`. Keine Geheimnisse, keine Tokens, keine internen URLs, keine Personendaten. Schreibrechte sind bereits auf `users.manage` beschränkt, Lesen ist für alle Angemeldeten offen.

## Entschiedene Verträge

1. **AVKK-Restore**: Sicherung und vollständige Prüfung, **kein Rückschreiben in die Datenbank**. Das ist eine bewusst dokumentierte Grenze, damit ein Restore keine produktiven Cloud-Daten überschreibt.
2. **Reference Data**: vollständig mitgesichert **und** je Eintrag versioniert referenziert. Der Restore prüft die Bezüge gegen den zentralen Katalog und meldet Abweichungen.
3. **Verwaiste AVKK-Daten** (Aufgabe lokal nicht mehr vorhanden): Quarantäne — der Restore läuft weiter, die betroffenen Datensätze werden nicht angewendet und im Protokoll einzeln ausgewiesen.

## Umsetzung

### A. Backup

- Neues Modul `src/lib/backup/avkk-payload.ts`: lädt AVKK-Subjekte samt Verantwortung, Kompetenz, Konsequenz sowie Kataloge und Werte, und normalisiert sie zu einem versionierten Nutzdaten-Objekt (`avkkPayloadVersion: 1`) mit stabilen IDs, maschinenlesbaren Keys, Katalogversionen und Zeitstempeln. Labels werden nur als Momentaufnahme mitgeführt, nie als fachliche Identität.
- `collectSnapshot()` wird um dieses Paket erweitert; ohne Cloud-Verbindung bleibt das Feld leer und das Backup weiterhin gültig (klar als Warnung protokolliert).
- `zip.ts` legt zwei zusätzliche Archiveinträge an: `avkk.json` und `reference-data.json`, beide mit `storageKey: null`, `logicalName` `avkk-dataset` bzw. `reference-data`, Prüfsumme, Größe und Zeitstempel. Kein neues Manifestfeld.

### B. Integrität und Restore

- `integrity.ts` erhält eine AVKK-Vorprüfung, die **vor jedem Schreibvorgang** läuft: gültiges JSON, Pflichtfelder, eindeutige IDs, gültiger Subjekttyp, vorhandene Subjekt-Referenz, gültige Katalogbezüge, erwartete Datentypen. Fehler brechen den Restore ab, bevor irgendetwas geschrieben wird.
- `restore.ts` gibt zusätzlich einen AVKK-Abschnitt im Ergebnis zurück: geprüfte Datensätze, Quarantäne-Fälle mit Grund, Katalogabweichungen. Sensible Werte werden nicht protokolliert.
- Altbackups ohne AVKK bleiben unverändert gültig; das Fehlen wird nicht als Fehler gewertet. Ein Neuformat-Archiv, dessen AVKK-Datei laut Manifest existieren müsste, aber fehlt, ist dagegen ein harter Fehler.

### C. JSON-Export

- `json-schema.ts` erhält Schemata für die vier AVKK-Dimensionen plus Reference-Data-Bezug; das Feld ist optional, damit bestehende Importe gültig bleiben. Version steigt auf `1.1.0` (abwärtskompatible Erweiterung).
- `JsonExportService` nimmt das AVKK-Paket auf und wendet vorher die Berechtigung `avkk.view` an; ohne Berechtigung wird der Abschnitt ausgelassen, nicht leer erfunden.

### D. Security-Warnungen – Bewertung

1. **AVKK Subjects Delete** → *accepted, mit Nachweis*: Löschen ist fachlich nicht vorgesehen (Historie, Audit, Nachvollziehbarkeit). Es gibt kein DELETE-Recht und keine DELETE-Regel. Statt Löschen wird der Status `closed` genutzt. Wird als bewusstes Sicherheitsdesign dokumentiert und durch einen Test abgesichert.
2. **Reference Catalog Delete** → *accepted, mit Nachweis*: Reference Data ist historisiert (`is_active`, Gültigkeitszeitraum, Änderungshistorie). Hard Delete ist unerwünscht und mangels Rechten unmöglich. Deaktivierung erfolgt über den vorhandenen Dienst. Test ergänzt.
3. **app_settings lesbar für alle Angemeldeten** → *accepted*: Inhalt geprüft, ausschließlich nicht-sensible Laufzeitkonfiguration. Ergänzend wird eine Regel festgehalten und getestet, dass keine Geheimnisse in `app_settings` abgelegt werden dürfen; Schreiben bleibt auf die Adminrolle beschränkt.

Keine Migration und keine Rechteänderung nötig — die Warnungen beschreiben das gewünschte Verhalten. Falls der Nachlauf des Sicherheitsberichts etwas anderes zeigt, wird das im Abschlussbericht offen benannt.

### E. Tests

Neue Vitest-Suiten: AVKK im Backup, Manifest-Einträge, Integritätsprüfung, Roundtrip (Ausgangsdaten → Backup → Prüfung → Restore → fachlicher Vergleich über A/V/K/K und Status), JSON-Export samt erneutem Einlesen, Altbackup-Kompatibilität. Negativtests: fehlende Datei, falsche Prüfsumme, ungültiges JSON, doppelte ID, ungültiger Subjekttyp, unbekannte Subjekt-ID, fehlendes Pflichtfeld, ungültige Kompetenz-/Konsequenz-ID, fehlende Reference Data, manipuliertes Manifest, falsche Größe. Security-Tests: kein unberechtigter Hard Delete, `app_settings` lesbar/nicht schreibbar, keine Geheimnisse in Backup und Export.

### F. Dokumentation und Gates

`CHANGELOG.md` (1.54.0), Handbuch, Entwicklungstagebuch, `docs/DATA-SCHEMA.md`, Backup- und Export-Dokumentation, ADR-0022 und ADR-0025 ergänzt; neue **ADR-0026** zur Lösch- und Historisierungsstrategie samt Bewertung der drei Warnungen. `PROJECT-STATUS.yaml` auf 08B completed, RISK-AVKK-POLYMORPH aktualisiert. Vollständiger Gate-Lauf: Tests, Typecheck, Lint, no-console, docs:check, project-status:check, Build, Security- und Backup-Integritätsprüfung, Sicherheitsbericht-Nachlauf.

## Ausdrücklich nicht Teil dieses Sprints

Keine Änderung an der abgenommenen Oberfläche „Mein AVKK", keine neue Fachlogik, kein Rückschreiben von AVKK in die Datenbank.
