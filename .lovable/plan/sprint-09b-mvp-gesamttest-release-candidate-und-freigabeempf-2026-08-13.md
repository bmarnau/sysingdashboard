# Sprint 09B – MVP-Gesamttest, Release Candidate und Freigabeempfehlung

Ziel: v1.56.0 als Release Candidate belastbar abnehmen und eine begründete Entscheidung
GO / GO WITH FINDINGS / NO-GO liefern. Kein neuer Funktionsumfang, außer ein eindeutiger
MVP-Blocker erzwingt eine eng begrenzte Korrektur.

## Wichtige Vorab-Feststellung (aus der Datenbankstruktur)

Die AVKK-Tabellen (`avkk_subject`, `avkk_competence`, `avkk_consequence`) haben bewusst
**keine DELETE-Berechtigung** — Löschen ist durch Historisierung ersetzt (ADR-0026).
Folge für die Demodaten in der Cloud: Ein Cleanup kann AVKK-Demofälle **nicht hart löschen**,
sondern nur stilllegen (Status/„superseded"). Das ist kein Fehler, aber eine Abnahmefrage:
Der Sprint bewertet und dokumentiert diese Grenze ausdrücklich, statt sie zu umgehen.
Sollte ein rückstandsfreies Entfernen für die Abnahme zwingend sein, wird das als Finding
mit Zielmaßnahme (Sprint 09C) erfasst — keine Aufweichung der Löschregeln.

## Umfang

### 1. Bestandsaufnahme und Release-Candidate-Scope
- Doku (MVP-PLAN, PROJECT-STATUS, GOVERNANCE, DATA-SCHEMA, AVKK*, REFERENCE-DATA,
  SYSING-001, ADR-Index, technischer Prüfbericht, Handbuch, CHANGELOG) gegen den realen Code prüfen.
- Neuer Abschnitt „Release-Candidate-Scope" in `docs/MVP-PLAN.md`: verbindliche Liste
  UMGESETZT / POST-MVP / BEKANNTE GRENZE. Microsoft Graph, E-Mail, Entra, Azure SQL/Table,
  SharePoint, KI/Agenten, Kontextindikatoren, Excel bleiben klar POST-MVP.

### 2. Restpunkt A – Legacy-PDF-Pfad
Analyse von `src/lib/pdf-export.ts` und seiner drei Abhängigkeiten
(`useExportDialog`, `PdfPreviewDialog`, `DownloadCenterDialog`).
Entscheidungsregel wie vorgegeben: Nur wenn die Migration klein und verhaltensneutral ist,
wird sie in 09B konsolidiert; andernfalls Finding für 09C. Erwartung nach erster Sichtung:
eher Finding, da der Leistungsnachweis eigene Deckblatt- und Gruppierungslogik trägt.
Die Analyse und Begründung wird schriftlich festgehalten — keine stillschweigende Vertagung.

### 3. Restpunkt B – Vollständiger AVKK-Demodatensatz (Cloud)
- Erweiterung von `src/lib/demo-data/` um AVKK-Fälle A–G (unkritisch, gefährdet, kritisch,
  überfällig, Kompetenz-/Voraussetzungslücke, hohe Kundenkonsequenz, hohe Terminwirkung),
  konsistent an die bestehenden `demo-`-Projekte und -Arbeitspakete gekoppelt.
- Cloud-Seed über die bestehenden AVKK-Services, also **mit** RLS und Rechteprüfung des
  angemeldeten Admins — kein Service-Role-Bypass, keine direkten Datenbank-Inserts an der
  Anwendungslogik vorbei.
- Eigenschaften: versioniert (`DEMO_DATASET_VERSION`), idempotent, kennzeichnend (`demo-`),
  fiktive Namen, keine Secrets, kein Überschreiben/Löschen produktiver Daten.
- Cleanup wird getestet: lokal vollständig entfernbar, in der Cloud stillgelegt (siehe oben).
- `docs/DEMO-DATA.md` beschreibt Erzeugung, Version, Inhalt, Grenzen und Rücksetzung.

### 4. Automatisierte Gates
Vollständiger Lauf: Tests, Typecheck, ESLint, Prettier, Build, `docs:check`,
`project-status:check`, `rbac:check`, `lint:no-console`, Security-Gates, Tech-Debt,
API-Discovery, Ops-Checks, `ci:gate`. Der aus 09A bekannte Lint-Rückstand wird exakt
gezählt und nach Datei/Ursprung/MVP-Relevanz aufgeschlüsselt. Reine Formatierungsfehler in
Bestandsdateien werden bereinigt; alles mit Regressionsrisiko wird Finding. Keine Behauptung
„grün", wenn der Lauf nicht grün ist.

### 5. Rollen- und UI-Abnahme im Sandbox-Browser (Playwright)
Durchläufe je Rolle (Systemingenieur, Projektmanager, Geschäftsführer/Management, Admin)
mit Screenshots als Nachweis: Navigation, Servicemenü, Dialoge, Filter, Suche, Tabellen,
Empty/Loading/Fehlerzustände, Bestätigungsdialoge, Light/Dark, Desktop/Tablet/Smartphone,
Tastaturbedienung und Fokusführung. Auth/Session: Login, falsches Passwort, Logout, Reload,
Session-Wiederherstellung, Inaktivitätslogout, direkte URL, gesperrter Benutzer.
Was technisch nicht durchführbar ist, wird als „manual verification required" ausgewiesen —
nicht als bestanden.

### 6. RBAC und RLS getrennt nachweisen
UI-Verbergen zählt nicht als Nachweis. Datenbankseitige Prüfung der Policies für
`avkk.view`, `avkk.management.view`, Schreibrechte, Reference Data, Reporting/Export und
administrative Aktionen. Role Preview wird ausdrücklich gegengeprüft: Darstellung ändert
sich, realer Datenzugriff nicht.

### 7. AVKK-Management-Gesamttest und Performance
Kennzahlen, Filter, Handlungsbedarf, Verantwortungsstatus, Kompetenzdimensionen,
Konsequenzen, Verteilungen, Drill-down und JSON-Bericht werden gegen **vorab berechnete
Erwartungswerte** aus dem Demodatensatz geprüft — keine Black-Box-Kennzahlen, keine
personenbezogenen Rankings. Zusätzlich Messung von `listDossiers()` (Ladezeit, Anzahl
Abrufe, sichtbare Verzögerung). Keine vorsorgliche serverseitige Verdichtung.

### 8. Reporting- und Dokumentabnahme (visuell)
Alle drei AVKK-Berichte, der Leistungsnachweis und SYSING-001 in PDF, Druck, JSON, CSV und
Word. Geprüft werden Berechtigungen, Datenumfang, Filter, Metadaten, Dateinamen, Umlaute,
lange/leere/große Inhalte, Fehlerfälle und Template-Fallback (Default, konfigurierter
Provider, fehlende externe Vorlage, keine Windows-Pfade in der Fachlogik).
Jede PDF-/Word-Ausgabe wird seitenweise in Bilder gewandelt und visuell kontrolliert
(Deckblatt, Kopf-/Fußzeile, Seitenzahlen, Tabellen, Umbrüche, Überlagerungen, Abschnitte).
Eine erzeugte Datei allein gilt nicht als bestanden.

### 9. Backup/Restore und Export-Konsistenz
End-to-End inklusive Manifest 2.0, Prüfsummen, Größen, Dateitypen, fehlende/verwaiste
Dateien, doppelte Keys, beschädigte Prüfsumme, Altformat, AVKK und Reference Data.
Die bekannte Grenze „AVKK wird geprüft, aber nicht automatisch zurückgeschrieben" wird als
ausdrückliche MVP-Entscheidung bewertet (akzeptabel oder Blocker) und begründet.
Konsistenzabgleich derselben Demofälle über UI ↔ Management ↔ JSON ↔ CSV ↔ PDF ↔ Word ↔ Backup.

### 10. ADR-Gesamtreview
Alle ADRs (inkl. der beiden Verzeichnisse `docs/ADR/` und `docs/adr/`) auf Status,
Widersprüche, überholte und fehlende Entscheidungen prüfen. Ergebnis als Übersicht im
ADR-Index. ADRs werden nur ergänzt, wenn eine wesentliche Entscheidung ohne Nachweis ist —
Kandidaten: Demodaten-Strategie und MVP-Restore-Vertrag.

### 11. SYSING-001 finalisieren
Jede Aussage gegen den Release Candidate klassifizieren (UMGESETZT / POST-MVP / BEKANNTE
GRENZE), Version anheben und die finale PDF- sowie Word-Fassung über die neue
Reporting-Schicht erzeugen und visuell prüfen.

### 12. Abnahmebericht, Entscheidung, Doku-Synchronisation
- `docs/MVP-ACCEPTANCE-REPORT.md` mit allen geforderten Abschnitten, Findings nach
  CRITICAL/HIGH/MEDIUM/LOW, je Finding: Beschreibung, Auswirkung, Entscheidung,
  Zielmaßnahme, Zielsprint.
- Technischer Prüfbericht gegen den RC neu erzeugen — bekannte Findings bleiben sichtbar.
- Freigabeentscheidung streng nach den Regeln aus Abschnitt 22 des Auftrags.
- Aktualisierung von CHANGELOG.md (v1.57.0), PROJECT-STATUS.yaml, MVP-PLAN.md,
  Entwicklungstagebuch, Handbuch und ADR-Index. Der Projektstatus wird nur dann auf
  Release Candidate gesetzt, wenn die Abnahme das trägt.
- Falls blockierende oder vor dem MVP zu behebende Findings entstehen: Vorschlag eines eng
  abgegrenzten Sprint 09C (nur Findings + Regressionstests), keine neue Entwicklung in 09B.

## Kritische Anmerkung

Zwei Punkte dieses Auftrags stehen in Spannung zueinander und werden bewusst so gelöst:
Der geforderte Cloud-Demodatensatz erzeugt echte Zeilen und Audit-Einträge in der
produktiven Datenbank, die wegen der Historisierungsregel nicht rückstandsfrei entfernbar
sind. Der Seed läuft daher ausschließlich als bewusst ausgelöste Admin-Aktion mit
Bestätigung, streng unter `demo-`-Kennzeichnung, und die verbleibende Spur wird im
Abnahmebericht offen als bekannte Grenze ausgewiesen.
