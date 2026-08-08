# Sysing Dashboard — Project Governance

Stand: 2026-08-08 · Gültig ab Version 1.49.0 · Verbindlich für alle Beitragenden
(Mensch und KI-Agent).

Dieses Dokument ist die **oberste Regelquelle** des Projekts. Es beschreibt, wie
entwickelt, geprüft, dokumentiert und freigegeben wird. Bei Widerspruch gilt:
Governance > ADR > Architektur > Handbuch > Kommentar im Code.

---

## 1. Vision

Das Sysing Dashboard führt Tätigkeiten, Arbeitspakete, Projekte, Zeiten,
Verantwortlichkeiten und Berichte in einer zentralen, verlässlichen und sicher
betreibbaren Anwendung zusammen.

Zielbild:

- persönliches Arbeitsdashboard mit belastbaren Auswertungen,
- mehrbenutzerfähig über RBAC und RLS,
- autonom betreibbar (Docker) ohne unersetzbare Laufzeitabhängigkeit zu einer
  einzelnen Plattform,
- erweiterbar um AVKK-Fachlogik, Reference Data, Reports, Microsoft 365 und
  KI-Agenten — jeweils als klar abgegrenzte Ausbaustufe.

Die maßgebliche, maschinenlesbare Fassung von Vision, Roadmap und Status ist
[`docs/PROJECT-STATUS.yaml`](./PROJECT-STATUS.yaml). Die MVP-Zieldefinition,
Abnahmestrategie und aktuelle Planungslogik sind in
[`docs/MVP-PLAN.md`](./MVP-PLAN.md) festgelegt.

---

## 2. Entwicklungsprinzipien

1. **Analyse vor Umsetzung.** Kein Sprint ohne benannten Ist-Zustand mit Beleg
   (Dateizeile, Testausgabe, Reportbefund). Vermutungen werden als Vermutung
   gekennzeichnet.
2. **Kleiner Schnitt.** Ein Sprint hat ein Thema. Refactoring und Fachlogik
   werden nicht vermischt.
3. **Verhalten unverändert bei Refactoring.** Strukturänderungen sind nur dann
   abgeschlossen, wenn die bestehenden Tests unverändert grün sind.
4. **Rückwärtskompatibilität ist Vertrag.** Formate (Backup, Export, Manifest)
   werden versioniert, nie stillschweigend gebrochen.
5. **Kein toter Code.** Nicht genutzte Module werden entfernt oder als bewusst
   archiviert gekennzeichnet (`archive/`).
6. **Nachweis statt Erfolgsmeldung.** Jede Abschlussmeldung nennt Zahlen:
   Testanzahl, Findings vorher/nachher, Version, Reportstand.
7. **MVP-Fortschritt sichtbar halten.** Nach jedem Sprint-Prompt wird zusätzlich
   ein kompakter Status zu Reifegrad, Weg zum MVP, offenen Themen, Risiken und
   geschätzter Zahl verbleibender Prompts erstellt.

---

## 3. Architekturprinzipien

| ID                    | Regel                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `source-of-truth`     | GitHub ist die maßgebliche Quelle für Code, Dokumentation und Versionsstand.                                |
| `supabase-mvp`        | Supabase ist die führende Daten- und Authentifizierungsplattform des MVP.                                   |
| `provider-separation` | Fachlogik, Authentifizierung, Datenzugriff und providerspezifische Implementierungen sind getrennt.         |
| `portable-runtime`    | Keine unersetzbare Laufzeitabhängigkeit zu einer einzelnen Hostingplattform.                                |
| `container-ready`     | Die Anwendung muss langfristig als Docker-Container autonom betreibbar sein.                                |
| `security-by-design`  | Änderungen sind sicher, testbar, dokumentiert sowie RBAC- und RLS-konform.                                  |
| `no-secrets`          | Keine produktiven Schlüssel, Tokens, Passwörter oder Service-Role-Keys in Code, Prompts oder Dokumentation. |
| `layered-access`      | UI greift nie direkt auf Persistenz- oder Providerinterna zu (siehe Abschnitt 4).                           |

---

## 4. Trennung Fachlogik / Infrastruktur

Verbindliches Schichtenmodell (Details und Diagramm:
[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)):

```text
Präsentation      src/routes, src/components
Facade/Hooks      src/hooks, src/lib/store/useDashboardStore
Fachlogik         src/lib/*-service.ts, src/lib/backup/, src/lib/rbac/
Infrastruktur     src/lib/store/dashboard-persistence.ts, src/integrations/supabase/, src/lib/azure/
```

Harte Regeln:

- `src/routes` und `src/components` importieren nicht direkt die Persistenzschicht.
- Fachlogik kennt keine React-Imports.
- Infrastruktur kennt keine Fachbegriffe der UI.
- Provider-spezifische Details bleiben außerhalb der Fachlogik.

---

## 5. Ablauf: Analyse → Umsetzung → Test → Dokumentation

1. **Analyse** — Ist-Zustand belegen, Zielbild formulieren, Nicht-Ziele benennen,
   Risiken benennen. Ergebnis: Sprintplan.
2. **Umsetzung** — kleinstmöglicher Schnitt, Verhalten erhalten, keine
   Sammeländerungen ohne Bezug zum Sprintziel.
3. **Test** — neue Regeln bekommen einen Test. Bestehende Suiten müssen grün
   bleiben. Manuelle Verifikation wird schriftlich dokumentiert.
4. **Dokumentation** — CHANGELOG, Handbuch, Entwicklungstagebuch,
   `PROJECT-STATUS.yaml`, bei Entscheidungen zusätzlich ein ADR.
5. **MVP-Status** — Reifegrad und verbleibender Weg zum MVP werden nach jedem
   Sprintabschluss neu eingeschätzt und kompakt berichtet.

Kein Schritt darf übersprungen werden. Dokumentation ist Teil der Umsetzung,
nicht Nacharbeit.

---

## 6. Definition of Done

Ein Sprint gilt erst als abgeschlossen, wenn alle Punkte erfüllt und belegt sind:

- [ ] Akzeptanzkriterien des Sprints erfüllt
- [ ] `bun run test` grün (Anzahl im Abschlussbericht genannt)
- [ ] `bun run typecheck` grün
- [ ] `bun run lint` und `bun run lint:no-console` grün
- [ ] Build grün
- [ ] `bun run docs:check` ohne unbegründete Warnung
- [ ] `bun run project-status:check` grün
- [ ] `CHANGELOG.md` mit neuer Version ergänzt
- [ ] Handbuch aktualisiert, sofern betroffen
- [ ] `docs/ENTWICKLUNGSTAGEBUCH.md` fortgeschrieben
- [ ] `docs/PROJECT-STATUS.yaml` aktualisiert und validiert
- [ ] Technischer Prüfbericht neu erzeugt
- [ ] Go-/No-Go für den Folgesprint schriftlich dokumentiert
- [ ] Kompakter MVP-Statusbericht gemäß Abschnitt 11b erstellt

---

## 7. Dokumentationsstrategie

- **Eine Quelle je Aussage.** Versionsstand steht ausschließlich in
  `CHANGELOG.md`; Projekt- und Roadmapstand steht in `PROJECT-STATUS.yaml`.
- **Doku-Sync-Pflicht.** Neue oder geänderte Funktionen werden dokumentiert.
- **Entscheidungen gehören in ein ADR**, nicht in Codekommentare.
- **Dokumentation beschreibt den Ist-Zustand.** Geplantes wird ausdrücklich als
  „geplant" markiert.
- **MVP-Planung** wird in `docs/MVP-PLAN.md` geführt und bei wesentlichen
  Roadmap- oder Abnahmeänderungen aktualisiert.

---

## 8. Qualitätsregeln

| Regel                                                      | Prüfung                        |
| ---------------------------------------------------------- | ------------------------------ |
| Kein `console.*` in Produktivcode                          | `bun run lint:no-console`      |
| Typen vollständig                                          | `bun run typecheck`            |
| Keine Layer-Verletzungen                                   | Tech-Debt-/Architekturprüfung  |
| RBAC-Matrix Frontend = Backend                             | `bun run rbac:check`           |
| Dokumentation synchron                                     | `bun run docs:check`           |
| Projektmanifest gültig                                     | `bun run project-status:check` |
| Endpunkte inventarisiert und getestet                      | `bun run api:gate`             |

Findings werden nicht stillschweigend ignoriert. Ein akzeptiertes Finding
braucht Begründung, Ticket und Verfallsdatum.

---

## 9. Sicherheitsregeln

1. Keine Secrets in Code, Doku, Prompts, Logs oder Tests.
2. Serverseitige Endpunkte validieren jede Eingabe und vertrauen dem Browser nicht.
3. Frontend-RBAC ist Bedienkomfort, keine Sicherheitsgrenze. Durchsetzung erfolgt
   über RLS und serverseitige Prüfungen.
4. Jede neue Tabelle: RLS aktiviert, Policies definiert, Grants gesetzt.
5. Logs werden redigiert.
6. Sicherheitsbefunde der Stufe `critical` blockieren jedes Release.

---

## 10. Versionierungsstrategie

Semantische Versionierung `MAJOR.MINOR.PATCH` für das Dashboard. Jeder
Sprintabschluss erzeugt mindestens eine neue MINOR-Version. Backup-, Prüfbericht-
und Projektmanifest-Schemata werden unabhängig versioniert.

---

## 11. Sprint-Governance

**Startbedingungen**: vorheriger Sprint abgeschlossen und verifiziert;
CHANGELOG, Tagebuch, Prüfbericht und `PROJECT-STATUS.yaml` aktuell.

**Sprintstruktur**: Ziel → Teilaufgaben → Nicht-Bestandteil →
Abnahmekriterien → Abschlussbericht → MVP-Status.

**Abschlussbericht**: neue/geänderte Dokumente, Ergebnis je Teilaufgabe,
Testergebnisse mit Zahlen, Versionsnummer, Prüfbericht, verbleibende Risiken und
Go-/No-Go für den Folgesprint.

### 11a. Phasenmodell

Phase 1 „Technische Plattform" ist mit v1.50.0 abgeschlossen. Phase 2 entwickelt
AVKK, Reference Data, operative Arbeitsansicht, Kontextindikatoren,
Management-Cockpit und Reporting bis zur MVP-Abnahme. Microsoft Graph, Entra ID
und Azure-Datenplattformen sind nicht Bestandteil des MVP.

### 11b. Verbindlicher MVP-Status nach jedem Sprint-Prompt

Nach jedem Sprintabschluss ist folgender kompakter Managementstatus Pflicht:

```text
Projektphase:
Aktueller Reifegrad: <Schätzung in %>
MVP-Ziel: vollständig funktionsfähiges Sysing Dashboard auf Supabase ohne Azure/MS Graph
Dieser Sprint: abgeschlossen | teilweise | blockiert
Wesentliche Fortschritte:
- ...
Offene MVP-Themen:
- ...
Kritische Risiken:
- ...
Geschätzte verbleibende Prompts bis MVP: <Zahl oder Bandbreite>
Nächster Sprint: <ID und Titel>
MVP-Prognose: im Plan | gefährdet | blockiert
```

Der Prozentwert ist eine begründete Managementschätzung, keine mathematisch
exakte Metrik. Ausgangspunkt nach Sprint 07A: ca. 65–70 % und etwa sechs größere
Prompts bis zur MVP-Abnahme.

### 11c. MVP-Abnahme

Die integrierte MVP-Abnahme erfolgt in Sprint 09B. Sie umfasst insbesondere alle
UI-Komponenten, Auth/Session, AVKK, Kontextindikatoren, RBAC/RLS, PDF/Druck,
Exporte, Corporate Document Templates, Backup/Restore und fachliche
Report-Plausibilität. Ergebnis ist `docs/MVP-ACCEPTANCE-REPORT.md` mit
GO, GO WITH FINDINGS oder NO-GO und konkreten Empfehlungen. Details stehen in
`docs/MVP-PLAN.md`.

---

## 12. Rollen der Projektdokumente

| Dokument | Rolle |
| --- | --- |
| `docs/PROJECT-GOVERNANCE.md` | Oberste Regelquelle |
| `docs/PROJECT-STATUS.yaml` | Maschinenlesbare Single Source of Truth für Status und Roadmap |
| `docs/MVP-PLAN.md` | MVP-Ziel, Restweg, Gesamttest und Freigaberegeln |
| `CHANGELOG.md` | Version und Änderungshistorie |
| `docs/ARCHITECTURE.md` | Ist- und Zielarchitektur |
| `docs/ADR/` | Architekturentscheidungen |
| `docs/ENTWICKLUNGSTAGEBUCH.md` | Projektchronik |
| `test-report/technical-test-report.*` | Technischer Prüf- und Freigabenachweis |

---

## 13. Änderung dieser Governance

Änderungen an diesem Dokument erfordern bei der nächsten regulären
Sprintversion einen CHANGELOG-Eintrag und — sofern eine Architektur- oder
Qualitätsregel betroffen ist — ein ADR.
