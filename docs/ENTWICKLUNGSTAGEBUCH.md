# Entwicklungstagebuch – Sysing Dashboard

Fortschreibbare Projektchronik. Diese Datei ist die **einzige Quelle** für die
Ansicht _Service → Entwicklungstagebuch_ im Dashboard.

Pflegehinweis: Pro Sprint wird unten ein neuer Abschnitt ergänzt — gemeinsam mit
dem zugehörigen `CHANGELOG.md`-Eintrag. Keine Namen von Personen, keine
Zugangsdaten, keine internen Adressen in dieser Datei.

Stand: 2026-08-08 · Dashboard-Version 1.51.0

## Vision

Das Sysing Dashboard ist das Arbeits- und Steuerungswerkzeug für die
Systemingenieurs-Projektabwicklung: Projekte, Arbeitspakete, Tätigkeiten und
Zeiten an einer Stelle, mit belastbaren Auswertungen für Abrechnung und
Leistungsbewertung.

Leitplanken von Anfang an:

- **Nachvollziehbarkeit vor Funktionsumfang.** Jede Änderung ist in CHANGELOG,
  Handbuch und – bei Architekturrelevanz – in einer ADR dokumentiert.
- **Betriebsfähigkeit statt Demo.** Prüfberichte, Qualitätstore und
  Sicherheitsprüfungen laufen automatisiert in der CI.
- **Datenhoheit.** Lokale Arbeitsfähigkeit (Offline), Exporte in offene
  Formate, Azure-Anbindung als Option statt als Zwang.
- **Sicherheit als Standardzustand.** Rollenmodell, serverseitig erzwungene
  Regeln, keine Geheimnisse im Client, Protokollierung ohne sensible Inhalte.

## Managementübersicht

| Frage               | Antwort                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Was ist entstanden? | Ein produktionsnahes Projekt-Dashboard mit Rollenmodell, Backup/Restore, Import/Export, Reporting und integriertem Handbuch. |
| Zeitraum            | Mai 2026 bis August 2026                                                                                                     |
| Aktueller Stand     | Version 1.47.0, alle automatisierten Tests grün, technischer Prüfbericht ohne offene kritische Befunde                       |
| Größte Hürden       | Inbetriebnahme der Anmeldung, vollständiger PDF-Druck, Aufräumen technischer Schulden bei wachsendem Umfang                  |
| Nächster Nutzen     | Mehrsprachigkeit, serverseitige Sitzungsdurchsetzung, Azure-Produktivbetrieb                                                 |

Das Projekt ist von einer einzelnen Auswertungsseite zu einer strukturierten
Anwendung mit Anmeldung, Rechteverwaltung, Prüfpfad und automatisierter
Qualitätssicherung gewachsen. Der Schwerpunkt lag ab Juli 2026 nicht mehr auf
neuen Funktionen, sondern auf Betriebsreife: Tests, Prüfberichte, Sicherheit und
Dokumentation.

## Zeitstrahl: Idee → Prototyp → MVP → Betriebsreife

| Phase         | Zeitraum                  | Versionen | Ergebnis                                                                                      |
| ------------- | ------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| Idee          | 2026-05                   | –         | Dashboard für Systemingenieur als einzelne Auswertungsansicht                                 |
| Prototyp      | 2026-06-05 bis 2026-06-16 | 1.0–1.9   | Persistenz, Druckansicht, Arbeitszeitmodell, Handbuch, Backup                                 |
| MVP           | 2026-06-17 bis 2026-07-02 | 1.10–1.19 | Downloads, JSON-Schnittstelle, Betriebsmodi, Backend-Routen, RBAC, Azure-Bereich              |
| Härtung       | 2026-07-04 bis 2026-07-16 | 1.20–1.38 | Tests, Logger, Store, ADRs, Prüfbericht, Qualitätstore                                        |
| Betriebsreife | 2026-07-17 bis 2026-08-03 | 1.39–1.47 | Anmeldung, Compliance-Bericht, Refactoring, Sitzungs-Timeout, Chronik, Backup-Modularisierung |

## Sprintübersicht

| Version   | Datum                | Schwerpunkt               | Ergebnis                                                                |
| --------- | -------------------- | ------------------------- | ----------------------------------------------------------------------- |
| 1.7.0     | 2026-06-14           | Arbeitszeitmodell         | Engineurprofil übernimmt Modellwerte                                    |
| 1.8.0     | 2026-06-14           | Handbuch                  | Integriertes, suchbares Benutzerhandbuch                                |
| 1.8.1     | 2026-06-15           | Sprache                   | Deutsch als Standard, i18n vorbereitet                                  |
| 1.9.0     | 2026-06-15           | Backup                    | Tägliches ZIP-Backup mit Protokoll                                      |
| 1.9.1     | 2026-06-16           | Doku-Sync                 | `CHANGELOG.md` als Single Source, `docs:check`                          |
| 1.10–1.13 | 2026-06-16 bis 06-19 | Downloadbereich           | PDF/CSV/JSON-Exporte, Vorschau, Aufbewahrungsregeln                     |
| 1.14.0    | 2026-06-20           | JSON-Import               | Vierstufiger Assistent mit Vorschau, Snapshot und Rollback              |
| 1.15–1.16 | 2026-06-22           | Betrieb & Backend         | Betriebsmodi, Secret-Verwaltung, Server-Routen                          |
| 1.17.x    | 2026-06-23 bis 06-27 | Systemstatus & Sicherheit | Statusprüfung, Sicherheitsscan in CI, Env-Validierung                   |
| 1.18.x    | 2026-06-28 bis 07-01 | RBAC v1                   | Sieben Rollen, Rechtematrix, Handbuchkapitel, globale Suche             |
| 1.19.0    | 2026-07-02           | Azure                     | Servicebereich für Azure-Daten                                          |
| 1.20–1.23 | 2026-07-04 bis 07-07 | Qualität                  | Tests, Logger mit IndexedDB, zentraler Store, Barrierefreiheit          |
| 1.24–1.26 | 2026-07-08 bis 07-11 | Architektur               | ADR-Prozess, Performance, Log Viewer                                    |
| 1.27–1.29 | 2026-07-12 bis 07-13 | RBAC v2 & Testinstanz     | Akteurskontext, zentrale Testinstanz, Technical-Debt-Scanner            |
| 1.30–1.34 | 2026-07-13           | Prüfsuiten                | API-Vertragstests, E2E, Correlation-ID, Security-Suite, API-Discovery   |
| 1.35–1.37 | 2026-07-13 bis 07-15 | Betrieb                   | Restore-Tests, Ops-Baselines, zentraler technischer Prüfbericht         |
| 1.38.0    | 2026-07-16           | CI                        | Qualitätstore in 14 Stufen                                              |
| 1.39.0    | 2026-07-17           | Anmeldung                 | Auth über Lovable Cloud, geschützter Bereich, DB-gestützte Rollen       |
| 1.40.x    | 2026-07-18 bis 07-19 | Benutzerverwaltung        | Rollen aus der Oberfläche, robuster App-Start                           |
| 1.41.x    | 2026-07-20 bis 07-25 | Auth-Inbetriebnahme       | Konfigurationsprüfung, Laufzeit-Fallback, kritische Befunde geschlossen |
| 1.42.x    | 2026-07-26 bis 07-28 | Compliance & Regression   | Compliance-Bericht, Open-Redirect-Schutz, Guard-Fehler behoben          |
| 1.43.0    | 2026-07-29           | Prüfbericht 2.0           | Schema 2.0, SHA-256-Integrität, Release-Gate                            |
| 1.44.x    | 2026-07-30 bis 08-01 | Refactoring               | Dashboard und Export modularisiert, Logger-Bereinigung, PDF-Druck       |
| 1.45.0    | 2026-08-02           | Sitzung                   | Automatische Abmeldung bei Inaktivität                                  |
| 1.46.0    | 2026-08-03           | Chronik                   | Entwicklungstagebuch im Servicebereich                                  |
| 1.47.0    | 2026-08-03           | Wartbarkeit               | Backup-/Restore-Service modularisiert (ADR-0021)                        |

## Schwierigkeiten und ihre Lösung

### Anmeldung meldete „noch nicht konfiguriert" (1.41.x)

Nach der Umstellung auf echte Authentifizierung erschien im veröffentlichten
Build hartnäckig der Hinweis, die Anmeldung sei nicht konfiguriert. Ursache war
nicht der Code, sondern die Art des Variablenzugriffs: nur statische Zugriffe
werden beim Bauen ersetzt. Lösung in drei Schritten — statische Zugriffe, eine
Startprüfung der erforderlichen Werte und zusätzlich ein Laufzeit-Fallback, der
die öffentliche Konfiguration vom Server nachlädt.

**Lehre:** Bei Build-Zeit-Ersetzung ist die Schreibweise Teil der Funktion.

### Leerer PDF-Ausdruck des Prüfberichts (1.44.3)

Der Bericht wurde innerhalb eines Dialogs gerendert; dessen Positionierung und
Überlauf schnitten den Ausdruck ab. Lösung: Rendern über ein eigenes Portal
direkt am Dokumentkörper plus eine Druckklasse, die die Anwendungshülle
ausblendet, statt den Berichtscontainer indirekt zu verstecken.

**Lehre:** Drucken ist ein eigener Renderpfad und braucht eine eigene Prüfung
(siehe `docs/PRINT-VERIFICATION.md`).

### Fehlerhafter Guard nach Auth-Umstellung (1.42.2)

Ein Fehler beim Serialisieren des Rücksprungziels legte den geschützten Bereich
lahm. Behoben durch eine geprüfte Hilfsfunktion für interne Sprungziele, die
zugleich offene Weiterleitungen ausschließt.

### Wachsende Dateien (1.44.0)

Die Dashboard-Route war auf über 3200 Zeilen gewachsen. Der Umbau in Teilviews,
Dialoge und Hooks reduzierte sie auf unter 1000 Zeilen, ohne das Verhalten zu
ändern — abgesichert durch die vorhandene Testsuite.

### Abhängigkeiten in der CI (1.17.2)

Die Pipeline scheiterte an unterschiedlichen Abhängigkeitsdateien. Vereinheitlicht
auf einen Paketmanager mit fixierter Sperrdatei.

### Protokolle ohne Geheimnisse (1.42.1, 1.44.2)

Protokolleinträge konnten Verbindungszeichenfolgen enthalten. Die Redaktionsregeln
wurden erweitert und die Konsolennutzung projektweit auf den zentralen Logger
umgestellt, überwacht durch ein CI-Tor.

## Architekturentscheidungen

| ADR  | Entscheidung                                                  |
| ---- | ------------------------------------------------------------- |
| 0001 | TanStack Start als Framework                                  |
| 0002 | Rechteprüfung im Frontend als Spiegel der Serverregeln        |
| 0003 | Lokale Datenhaltung zuerst                                    |
| 0004 | Eigener Publish/Subscribe-Store statt zusätzlicher Bibliothek |
| 0005 | Eigener Logger statt externem Fehlerdienst                    |
| 0006 | Kein virtuelles Scrollen                                      |
| 0007 | RBAC v2 mit Geltungsbereichen und Ressourcen                  |
| 0008 | Zuweisungsarchitektur für Rollen                              |
| 0009 | Zentrale Testinstanz                                          |
| 0010 | Hybrides Vorgehen bei technischen Schulden                    |
| 0011 | Vertragstests für API-Endpunkte                               |
| 0012 | Umfang der E2E-Tests                                          |
| 0013 | Sicherheits-Release-Gate                                      |
| 0014 | API-Discovery per statischer Analyse                          |
| 0015 | Backup- und Restore-Tests                                     |
| 0016 | Betriebs-Baselines                                            |
| 0017 | Technischer Prüfbericht                                       |
| 0018 | Qualitätstore in der CI                                       |
| 0019 | Refactoring-Plan für zu große Module                          |
| 0020 | Providerneutrale Abmeldung bei Inaktivität                    |
| 0021 | Modularisierung des Backup-/Restore-Service                   |

## Offene Punkte und Ausblick

- **Serverseitige Sitzungsdurchsetzung.** Die Abmeldung bei Inaktivität wirkt
  clientseitig; ein bereits entwendetes Zugriffstoken bleibt bis zum Ablauf
  gültig (ADR-0020).
- **E2E-Test der Abmeldung.** Erfordert eine echte Sitzung im Testlauf und ist
  bewusst zurückgestellt.
- **Mehrsprachigkeit.** Vorbereitet, aber nur Deutsch gepflegt.
- **Azure-Produktivbetrieb.** Verbindungen sind im Entwicklungsmodus gesperrt.

## Meilenstein: Abschluss der Infrastrukturphase (1.50.0, 2026-08-07)

**Wichtigste Ergebnisse.** Mit Sprint 06B endet Phase 1 „Technische Plattform".
Erreicht wurden: Supabase-Authentifizierung mit Profilen, Rollentabelle, RLS und
Grants; RBAC in zwei Ebenen mit CI-geprüfter Spiegelung; Backupformat 2.0 mit
manifestbasierter Restore-Zuordnung und Prüfsummen; technischer Prüfbericht nach
Schema 2.0 mit kanonischem Hash, unveränderlicher Historie und Release-Gate;
Project Governance und ein maschinengeprüftes Projektmanifest; CI mit gestaffelten
Qualitätsgates (Lint, Typecheck, Doku, Manifest, Tests, Sicherheit, Tech-Debt, Build).

**Erreichte Architektur.** Fünf klar getrennte Schichten (Routen/UI → Hooks/Facades
→ Services → Persistenz/Repository → Plattform), deren Grenzen automatisiert geprüft
werden. Local-First-Datenhaltung mit user-scoped Schlüsseln, serverseitige Aufrufe
ausschließlich über TanStack-Server-Routes auf dem Cloudflare Worker. Anbieterdetails
sind aus der Fachlogik herausgehalten — Voraussetzung für den späteren Wechsel nach
Docker, Entra ID und Azure. Vollständig beschrieben in `docs/ARCHITECTURE.md`.

**Technische Reife.** Die Plattform ist test- und nachweisgestützt: automatisierte
Suiten für Backup/Restore, API-Vertrag, Sicherheit, RBAC, Barrierefreiheit und
Manifest-Validierung; Prüfbericht und Tech-Debt-Scanner erzeugen bei jedem Lauf
vergleichbare Artefakte. Offene Restpunkte sind benannt statt verschwiegen: die
serverseitige Sitzungsdurchsetzung und der echte Supabase-E2E-Test mit kontrollierter
Testsession bleiben offen (TD-SESSION-SERVER, BACKLOG-TEST-001).

**Übergang zur Fachentwicklungsphase.** Infrastrukturarbeit ist ab Version 1.50.0 nur
noch als Wartung, Fehlerbehebung oder ausdrücklich begründete Voraussetzung eines
Fachsprints zulässig (ADR-0023). Phasen werden im Manifest geführt und vom Validator
geprüft.

**Beginn AVKK.** Phase 2 startet mit dem AVKK-Datenmodell (Sprint 07): fachliche
Erweiterung der Arbeitspakete, Migration mit RLS und Grants, Berücksichtigung in
Import, Export und Backupformat. Erst danach folgt die AVKK-Arbeitsansicht (Sprint 08).

---

## Sprintprotokoll

### Sprint 06B – Governance, Manifest und Abschluss der Plattform (1.49.0 / 1.50.0, 2026-08-06/07)

Ziel: Steuerungsebene über dem Code etablieren und die Infrastrukturphase sauber
abschließen.
Ergebnis: `docs/PROJECT-GOVERNANCE.md`, Projektmanifest mit JSON Schema und
Validator (`bun run project-status:check`, jetzt durch dreizehn Tests abgesichert),
CI-Gate, Layer-Facade für die Store-Hydration (Finding `td-layer-d1e551ce`),
vollständig neu aufgebautes Architekturdokument, Dialog-Referenz im Handbuch
(zehn zuvor undokumentierte Dialoge) und neu erzeugter Prüfbericht. Phasenmodell
nach ADR-0023.
Bewertung: Go für Sprint 07 (AVKK-Datenmodell).

### Sprint 06A – Backupformat 2.0 (1.48.0, 2026-08-05)

Ziel: Zuordnung der Backup-Inhalte vom Dateinamen lösen.
Ergebnis: Manifest 2.0 mit `entries[]` (Storage-Key, Speicheradresse,
SHA-256-Prüfsumme, Größe, Dateityp). Restore arbeitet ausschließlich über das
Manifest; Originalschlüssel werden unmaskiert zurückgeschrieben. Manipulierte
Archive werden vor dem ersten Schreibvorgang abgelehnt. Altformate bleiben über
eine rein lesende Migration einspielbar. ADR-0022.
Bewertung: Go — Voraussetzung für spätere Speicherziele (Objektspeicher,
Mandantenablagen) ist damit geschaffen.

### Sprint 05E – Modularisierung Backup-Service (1.47.0, 2026-08-03)

Ziel: verhaltensneutrales Refactoring des Backup-/Restore-/Import-Service.
Ergebnis: `backup-service.ts` (1083 Zeilen) aufgeteilt in dreizehn Module unter
`src/lib/backup/`; die alte Datei bleibt als Fassade, die öffentliche
Schnittstelle ist unverändert. Secret-Filterung und Rollback sind nun isoliert
prüfbar. Absicherung ausschließlich über die bestehende Regressionssuite.
Bewertung: Go.

### Sprint 05D – Entwicklungstagebuch (1.46.0, 2026-08-03)

Ziel: dauerhaft fortschreibbare Projektchronik im Dashboard.
Ergebnis: diese Datei plus die Ansicht _Service → Entwicklungstagebuch_ mit
eigenem, sicherem Markdown-Renderer ohne zusätzliche Abhängigkeit.
Bewertung: Go für Sprint 05E.

### Sprint 05C – Automatische Abmeldung (1.45.0, 2026-08-02)

Ziel: konfigurierbare Abmeldung bei Inaktivität.
Ergebnis: Überwachung, Vorwarndialog, tabübergreifende Synchronisierung,
Systemeinstellung mit serverseitiger Regel, ADR-0020.
Bewertung: Go, mit dokumentierter E2E-Grenze.

### Sprint 05B – Refactoring-Abschluss und Druck (1.44.3, 2026-08-01)

Ziel: Logger-Bereinigung und vollständiger PDF-Druck.
Ergebnis: Druck über eigenes Portal, Konsolennutzung bereinigt, `typecheck`
als eigener Prüfschritt.

### Sprint 05 – Modularisierung (1.44.0, 2026-07-30)

Ziel: zu große Module aufteilen.
Ergebnis: Dashboard 3281 → 978 Zeilen, Export 807 → 308 Zeilen.

### Sprint 04 – Prüfbericht 2.0 (1.43.0, 2026-07-29)

Ziel: manipulationssicherer, versionierter Prüfbericht.
Ergebnis: Schema 2.0.0, kanonische Hashbildung, unveränderliche Historie,
Release-Gate.

## Sprint 07A – Start der Fachmodellphase (Version 1.51.0)

Mit Abschluss der technischen Plattform (Version 1.50.0) beginnt Phase 2. Der
erste Sprint dieser Phase liefert bewusst **keinen** Code, sondern das
fachliche Fundament: AVKK.

AVKK steht für Aufgabe, Verantwortung, Kompetenz und Konsequenz. Es ist eine
Führungsmethodik, kein Datenmodell mit hübschem Namen. Der entscheidende
Unterschied zu einer Aufgabenliste: Eine Aufgabe kann eindeutig zugewiesen und
trotzdem gefährdet sein, weil Zeit, Material, Budget oder eine Berechtigung
fehlen. Genau diese Aussage — „zugeordnet, aber gefährdet" — war bisher nirgends
abbildbar und ist der wichtigste Frühindikator des Modells.

Bewusst getroffene Entscheidungen:

- AVKK erweitert die bestehenden Objekte (Projekt, Arbeitspaket, Tätigkeit) und
  ersetzt sie nicht. Neu ist lediglich der Aufgabentyp „Maßnahme".
- Kontextindikatoren wie Belastung oder Stimmung sind **nicht** Teil von AVKK.
  Sie kommen später als eigene, getrennt berechtigte Ebene mit
  Aggregationspflicht — sonst hätte die Datenschutzprüfung das gesamte
  Fachmodell blockiert.
- Referenzdaten werden ein allgemeiner Plattformdienst, kein AVKK-Anhängsel.
  Auswahlwerte sollen ohne Softwarerelease pflegbar, versioniert und
  historisiert sein.
- AVKK ist ausdrücklich kein Instrument zur Leistungsüberwachung. Eine
  Kompetenzlücke beschreibt die Aufgabe, nicht die Person.

Offene Punkte für Sprint 07B: Migrationen für Kataloge und AVKK-Tabellen,
RBAC-Permissions und RLS-Policies, Reference-Data-Service mit Cache sowie die
wertegleiche Migration der heutigen Statuswerte.

Dokumentation: `docs/AVKK.md`, `docs/REFERENCE-DATA.md`, ADR-0024.
