# Rollen- und Oberflächenabnahme F-11 — Final 2026-08-24

Sprint 09C · Dashboard v1.59.6 · Status: **ERFÜLLT / F-11 CLOSED**

## 1. Zweck und Rang

Dieses Dokument ist die abschließende Fortschreibung der Rollen- und Oberflächenabnahme. Die ursprüngliche Datei `docs/ROLE-ACCEPTANCE-09C.md` bleibt als historische Prüfhistorie erhalten. Für den aktuellen F-11-Abnahmestand ist diese Finalfassung maßgeblich.

Die Abnahme trennt weiterhin:

- automatisierte und serverseitige Berechtigungsnachweise,
- reale manuelle Rollensichten,
- bewusst nicht zum Produktumfang gehörende Funktionen.

## 2. Automatisierte Sicherheits- und Berechtigungsnachweise

| Nachweis                                        | Ergebnis                       |
| ----------------------------------------------- | ------------------------------ |
| Rollen-/Rechtematrix widerspruchsfrei           | PASS                           |
| Nicht angemeldeter Zugriff auf geschützte Route | PASS — Weiterleitung/Abweisung |
| Datenzugriff ohne Anmeldung                     | PASS — serverseitig abgewiesen |
| Browsermanipulation der Rolle                   | PASS — keine Rechteausweitung  |
| RBAC-Prüfungen                                  | PASS                           |
| RLS-/serverseitige Schreibgrenzen               | PASS                           |
| Backup-/Restore-Regressionssuite                | PASS                           |
| Systemstatus-/Backend-Sicherheitsnachweis       | PASS                           |
| CSRF-Schutz für TanStack Server Functions       | PASS                           |
| Security Workflow                               | PASS                           |

Die laufaktuelle Referenz für den Evidenz-PR #39 ist CI #398 / Run `32743583294` und Security #389; beide sind vollständig bestanden.

## 3. Rollenabnahme

### 3.1 Systemingenieur

| Prüfschritt                                                           | Ergebnis |
| --------------------------------------------------------------------- | -------- |
| Anmeldung und eigene Arbeits-/Projektsicht                            | PASS     |
| `Mein AVKK` mit eigenem Scope                                         | PASS     |
| AVKK-Bewertung im zulässigen Scope speichern und nach Reload erhalten | PASS     |
| Verantwortung ohne Assign-Recht nicht neu zuweisen                    | PASS     |
| Management-Cockpit nicht sichtbar                                     | PASS     |
| persönlicher Bericht PDF/Druck/Word/JSON/CSV                          | PASS     |

### 3.2 Projektmanager

| Prüfschritt                           | Ergebnis |
| ------------------------------------- | -------- |
| Projektsicht und Drill-down           | PASS     |
| AVKK-Lücken und Konsequenzen sichtbar | PASS     |
| Projektbericht konsistent             | PASS     |
| Verantwortung delegieren/neu zuweisen | PASS     |
| Benutzerverwaltung nicht aufrufbar    | PASS     |

### 3.3 Teamleitung / Management

| Prüfschritt                                         | Ergebnis |
| --------------------------------------------------- | -------- |
| Management-Cockpit                                  | PASS     |
| Portfoliolage und Handlungsbedarf                   | PASS     |
| Managementbericht konsistent                        | PASS     |
| Verantwortung delegieren/neu zuweisen               | PASS     |
| keine personenbezogene Rangliste/Leistungsbewertung | PASS     |

### 3.4 Viewer / Negativrolle

| Prüfschritt                                     | Ergebnis |
| ----------------------------------------------- | -------- |
| keine Projekt-/Arbeitspaket-/Tätigkeitsmutation | PASS     |
| AVKK read-only                                  | PASS     |
| Management-Cockpit nicht sichtbar               | PASS     |
| Benutzerverwaltung nicht sichtbar               | PASS     |
| Abrechnung ohne Edit-Aktion                     | PASS     |
| globale Suche navigiert ohne Editor             | PASS     |
| serverseitiger Fremd-/Schreibzugriff abgewiesen | PASS     |

### 3.5 Mehrbenutzerszenario

| Prüfschritt                                            | Ergebnis |
| ------------------------------------------------------ | -------- |
| Alex und Sam mit getrennten persönlichen AVKK-Sichten  | PASS     |
| Fremdschreibversuch Sam → Alex serverseitig abgewiesen | PASS     |
| Petra mit Projektmanager-Sicht und Delegation          | PASS     |
| Georg mit Managementsicht, Bericht und Delegation      | PASS     |
| keine personenbezogene Rangliste                       | PASS     |

### 3.6 Administrator / App-Entwickler

| Prüfschritt                                                 | Ergebnis |
| ----------------------------------------------------------- | -------- |
| Benutzerverwaltung und Rollenpflege                         | PASS     |
| Namensdarstellung ohne technische ID als Personenname       | PASS     |
| Backup-Runtime                                              | PASS     |
| Downloadbereich                                             | PASS     |
| Log Viewer                                                  | PASS     |
| Systemstatus                                                | PASS     |
| finale Administrator-Servicemenü-Gesamtsicht                | PASS     |
| keine unbeabsichtigte Mutation bei Sichttests               | PASS     |
| keine Secrets/Zugangsdaten in den geprüften Statusansichten | PASS     |

## 4. Role Preview

**Ergebnis: N/A — kein aktueller Produktbestandteil.**

Der aktuelle Produktcode enthält keinen Role-Preview-/Impersonation-Pfad. ADR-0007 und ADR-0008 erzeugen keine aktuelle Pflicht für eine solche Funktion. Reale Rollen- und serverseitige Berechtigungstests sind der maßgebliche Nachweis.

Es wird daher keine neue Vorschaufunktion nur zur Erfüllung eines historischen Acceptance-Punkts gebaut. Eine spätere Rollen-Vorschau müsste als Post-MVP-Feature neu entschieden, klar als reine Darstellung gekennzeichnet und strikt von Identität, RBAC und RLS getrennt werden.

Nachweis: `docs/F11-ROLE-PREVIEW-DECISION-2026-08-24.md`.

## 5. Systemstatus — finale Runtime-Abnahme

SYSSTAT-01 bis SYSSTAT-04 sind in der veröffentlichten Referenzumgebung bestanden:

- fehlende Lovable-Hostingmetadaten neutral,
- keine Lovable Project ID in der normalen Betriebsübersicht,
- Supabase als aktive MVP-Plattform mit `configured — 0 missing`,
- Azure als optionaler Zielprovider mit Count-basierter Readiness,
- keine Secrets oder Verbindungswerte sichtbar.

Nachweis: `docs/F11-SYSTEMSTATUS-RUNTIME-RETEST-2026-08-24.md`.

## 6. Bewusste Grenzen

Die folgenden Punkte sind keine offenen F-11-Prüfschritte:

- AVKK-Leseregeln sind im aktuellen MVP rollenbasiert; zusätzliche zeilenbezogene Lesetrennung bleibt Produktentscheidung.
- Delegationsrechte von Projektmanager und Teamleitung werden später auf Projekt-/Führungsscope weiter verfeinert.
- Projekte, Arbeitspakete und Tätigkeiten besitzen weiterhin dokumentierte Local-First-Grenzen.
- Role Preview ist N/A und kein verdeckter Abnahmefehler.

## 7. Formale Abzeichnung

| Rolle / Szenario     | Ergebnis | Datum      |
| -------------------- | -------- | ---------- |
| Systemingenieur      | erfüllt  | 2026-08-21 |
| Projektmanager       | erfüllt  | 2026-08-22 |
| Teamleitung          | erfüllt  | 2026-08-22 |
| Viewer / Negativtest | erfüllt  | 2026-08-22 |
| Mehrbenutzerszenario | erfüllt  | 2026-08-24 |
| Administrator        | erfüllt  | 2026-08-24 |
| Role Preview         | N/A      | 2026-08-24 |

## 8. Abschluss

**F-11 ist vollständig abgenommen und geschlossen.**

Die Freigabe stützt sich nicht auf Role Preview oder eine simulierte Rolle, sondern auf reale Rollenkonten, UI-Negativtests, RBAC-Prüfungen, serverseitige Berechtigungsprüfungen und RLS-Nachweise.
