# Sprint 09B – Teil 2: MVP-Gesamtabnahme und Freigabeentscheidung

Kein neuer Feature-Sprint. Ziel ist ein belastbarer Abnahmebericht mit Entscheidung GO / GO WITH FINDINGS / NO-GO für den Release Candidate auf Basis v1.57.0.

## Vorgehen in Etappen

### Etappe 1 – Ist-Aufnahme und Release Candidate
- Repository gegen den 09B-Auftrag abgleichen (Anforderung / Status / Nachweis / offen / MVP-Relevanz). Status wird aus Code und Testlauf belegt, nicht aus Dokumentation abgeleitet.
- Release Candidate eindeutig festschreiben: Version, Commit, Datum, Testumgebung, Demo-Dataset-Version, Migrationsstand.
- MVP-Scope-Tabelle: UMGESETZT nur bei nachgewiesener Funktion; Graph, E-Mail, Entra, Azure SQL/Table, SharePoint, KI/Agenten, produktive Kontextindikatoren und Excel bleiben POST-MVP.

### Etappe 2 – Vollständiger Quality-Gate-Lauf
Ausgeführt und roh protokolliert: Tests, Typecheck, kompletter ESLint-Lauf, Prettier-Check, Build, docs:check, project-status:check, rbac:check, no-console, Security-Gates, Architecture/Layer-Gates, Tech-Debt, technischer Prüfbericht. Lint wird mit Gesamtzahl, betroffenen Dateien, Bestands- vs. Neuverstößen und MVP-Relevanz ausgewiesen. Kein „grün“ ohne grünen Lauf.

### Etappe 3 – Demo-Datensatz und Betriebsregel
- Seed, wiederholter Seed (Idempotenz), Dossier-Aufbau, Stilllegung, RLS-Konformität und Schlüsselverwendung verifizieren; Abdeckung der geforderten Szenarien (im Plan, gefährdet, kritisch, überfällig, Wissen/Zeit/Material/Berechtigung/Information fehlt, Unterstützung teilweise, hohe Kunden- bzw. Terminwirkung) mit erwarteten Kennzahlen dokumentieren.
- Betriebsregel „Demo-Seed niemals auf Produktivinstanzen“ prüfbar sichtbar machen: `docs/DEMO-DATA.md`, Betriebs-/Deployment-Doku, Abnahmebericht und eine unmissverständliche Warnung im Demo-Dialog vor dem Einspielen. Keine Hard-Delete-Funktion.

### Etappe 4 – Funktionale Gesamtabnahme
- Rollensichten (Systemingenieur, Projektmanager, Geschäftsführer, Admin/Role Preview) plus Negativtest ohne Berechtigung; Role Preview ändert nur Darstellung.
- AVKK-Management: Kennzahlen, Filter, Handlungsbedarf, Konsequenzen, Verteilungen, Drill-down und JSON-Bericht gegen erwartete Demo-Werte; Konsistenzkette Kachel → Filter → Zeilenmenge → Drill-down.
- Auth/Session, RBAC und RLS getrennt bewerten; direkte Datenzugriffe zählen, UI-Verbergen nicht.
- `listDossiers()`-Performance mit vollem Demo-Datensatz messen; ohne reproduzierbares Problem als akzeptiertes Post-MVP-Scalability-Finding, sonst Finding für 09C. Keine vorsorgliche View/RPC.
- Reporting-Gesamtabnahme (persönlich, Projekt, Management, Leistungsnachweis, SYSING-001) in PDF, Druck, JSON, CSV, Word; Excel bleibt geplant.
- Backup/Restore inkl. Manifest 2.0, Prüfsummen, Fehlerfälle, Legacy-Backup, AVKK und Reference Data. Die AVKK-Restore-Grenze wird ausdrücklich als ACCEPTED FOR MVP oder MVP BLOCKER entschieden und begründet.
- Cross-Format-Konsistenz ausgewählter Fälle über Daten, UI, Management, JSON, CSV, PDF, Word, Backup.
- Nicht automatisiert prüfbare Punkte werden als MANUAL VERIFICATION REQUIRED markiert, nicht als bestanden.

### Etappe 5 – Alter PDF-Pfad
`src/lib/pdf-export.ts` (Leistungsnachweis) wird gegen die zentrale Reporting-Schicht bewertet. Migration nur, wenn klein, risikoarm, verhaltensneutral und testbar; sonst Finding mit Zielsprint. Der Bericht hält fest, ob nach 09B mehrere PDF-Layoutpfade existieren.

### Etappe 6 – ADR-Gesamtreview
Alle ADRs auf Aktualität, Status, Widersprüche, superseded/deprecated, offene Entscheidungen und Architekturentscheidungen ohne ADR prüfen. Ergebnis mit Zahlen (geprüft/accepted/superseded/deprecated/neu/offen). Neue ADRs nur bei tatsächlich fehlender Entscheidung. TemplateProvider-Kette, Docker-Portabilität und spätere Azure-/Entra-Fähigkeit werden dabei mitgeprüft.

### Etappe 7 – SYSING-001 finalisieren
Living Document gegen den Release Candidate aktualisieren, mit klarer Kennzeichnung UMGESETZT / IN ERPROBUNG / GEPLANT-POST-MVP / MÖGLICHE ERWEITERUNG / BEKANNTE GRENZE. Neu aufgenommen werden das Zukunftsbild und die Informationsflüsse: Legacy-SharePoint als Quelle operativer Arbeitsobjekte (AVKK existiert dort nicht), SharePoint-Strategie zunächst READ/SYNC, Microsoft Graph mit Mail-Ingestion über TaskCandidate und Benutzerprüfung, E-Mail-Ausgang mit Entwurf und Freigabe, KI-Copilot als READ/PROPOSE, providerneutrales Agent Lab auf Mock-Daten ohne EXECUTE-Rechte sowie die Reifegradstufen 0–5 als Lernmodell, nicht als beschlossene Roadmap. Zusätzlich der Abschnitt Informationshoheit als Zielbild. Ausgabe als TDF-konforme PDF- und Word-Fassung mit visueller Prüfung und synchroner Version.

### Etappe 8 – Berichte und Abschluss
- Technischen Prüfbericht neu gegen den Release Candidate erzeugen, ohne Findings auszublenden.
- `docs/MVP-ACCEPTANCE-REPORT.md` neu anlegen mit allen geforderten Abschnitten, Findings (ID, Schweregrad, Beschreibung, Auswirkung, Entscheidung, Verantwortung, Zielsprint) und Freigabeentscheidung nach der Freigaberegel.
- Doku synchronisieren: CHANGELOG, PROJECT-STATUS.yaml, MVP-PLAN, DEMO-DATA, SYSING-001, technischer Prüfbericht, ADR-Index, Entwicklungstagebuch, Handbuch/Betriebsdoku. Versionsanhebung nur releaseprozesskonform.
- Falls Blocker oder Vor-MVP-Findings bestehen: 09C-Scope ausschließlich aus 09B-Findings vorschlagen, aber nicht umsetzen.
- Abschlussbericht im geforderten Format inklusive verbindlichem MVP-Status, Reifegradschätzung, offenen Themen, Risiken, Restaufwandsprognose und MVP-Prognose.

## Technische Hinweise
- Änderungen am Produktcode bleiben auf nachgewiesene MVP-Blocker und kleine, risikoarme Konsolidierungen beschränkt; alles andere wird als Finding erfasst.
- Bereits bestätigt: `docs/MVP-ACCEPTANCE-REPORT.md` fehlt und wird neu erstellt; `src/lib/pdf-export.ts` existiert weiterhin parallel und wird über `useExportDialog`, `PdfPreviewDialog` und `DownloadCenterDialog` genutzt — die Doppelpfad-Bewertung ist also real und nicht hypothetisch.
- Die 472 grünen Tests aus 09B-Teil 1 werden nicht übernommen, sondern durch einen frischen Vollauf ersetzt.
