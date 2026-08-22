# Sysing Dashboard — Operative Sprintplanung MVP → BSF → Integration

Stand: 2026-08-22
Status: operative Planung auf Basis von `docs/ROADMAP-MVP-BSF.md`

## Zweck

Dieses Dokument übersetzt die verbindliche Roadmap in eine konkrete Sprintfolge. Die Roadmap bleibt die fachliche Quelle der Planung; diese Tabelle dient der operativen Durchführung, Aufwandseinschätzung und späteren Wiederaufnahme.

- **Sprint-/Arbeits-Prompts** umfassen Analyse, GitHub-/Codex-Arbeit, Implementierung, Tests, Dokumentation und Abschluss.
- **Lovable-Prompts** werden nur dort eingeplant, wo Preview, UI, Auth-/Runtime-Verhalten oder visuelle Abnahme einen konkreten Mehrwert liefern.
- **Manuelle Überprüfungen** werden in der Durchführung einzeln und nacheinander abgearbeitet.
- Promptzahlen sind rollierende Schätzungen, keine Zusagen.

## Operative Sprintfolge

| Sprint | Schwerpunkt | Sprint-/Arbeits-Prompts | Lovable-Prompts | Geplante manuelle Überprüfungen | Ziel / Gate |
| --- | --- | ---: | ---: | --- | --- |
| **09D** | **F-11 Rollenabschluss** | **1–2** | **0–1** | Petra Delegation; Georg Delegation; anschließend Admin/Role Preview | F-11 vollständig PASS |
| **10** | **MVP Release & Baseline** | **1–2** | **0–1** | Rollen-Smoke; finale Berichte visuell; Preview/Produktivstand; Releasecheck | **MVP BASELINE** |
| **11** | **SYSING-001 im Dashboard** | **1** | **1** | Service-Eintrag öffnen; richtige freigegebene Version; PDF/Word-Abruf; Berechtigung prüfen | SYSING-001 aus Dashboard erreichbar |
| **12** | **BSF Architekturbaseline** | **1** | **0** | Architektur-/Backlog-Review; ADR-Abnahme | verbindlicher BSF-Start |
| **13** | **Kundenmodell** | **1–2** | **0–1** | Kunde sichtbar; stabile ID; Projekt/AP/Tätigkeit korrekt zugeordnet; Persistenz | stabiles Kundenmodell |
| **14** | **Kundenverantwortung** | **2** | **1** | „Meine Kunden“; mehrere Kunden; fremder Kunde negativ; Schreibrechte getrennt von Sichtrechten | RBAC/RLS-Kundensicht PASS |
| **15** | **Zentrale Datenhaltung / Provider** | **2** | **0** | Daten nach Neuanmeldung/Browserwechsel vorhanden; Providerwechselpfad; Offline-/Fehlerfall | Local-First-Grenze geklärt |
| **16** | **Canonical Import Model** | **1** | **0** | partieller Datensatz; fehlende Werte bleiben unbekannt; Idempotenz; Provenienz/Quell-ID | Importvertrag PASS |
| **17** | **SharePoint-Zielbild / Import** | **2** | **0–1** | reale Beispieldaten; Mapping; READ/SYNC; Dublette; fehlendes Feld; kein unkontrolliertes Rückschreiben | SharePoint-Contract |
| **18** | **Betreiberhoheit & Docker** | **1** | **0** | Docker Start/Stop; Backup; Restore; Export; Betrieb ohne Lovable Runtime | F-15 / Portabilität PASS |
| **19** | **Managementcockpit 2** | **1** | **1–2** | Projektmanager; Teamleiter; Engineer; Kundensicht; scoped Delegation | Führungssichten BSF |
| **20** | **Reporting 2** | **1** | **1** | PDF; Word; JSON; CSV; Excel; Kunden-/Projektfilter; visuelles Rendering | Reporting-Baseline BSF |
| **21** | **KI-/Agenten-Labor** | **2** | **0–1** | Mock-Fall; Belegquellen; Human Approval; keine autonome Produktivaktion; Fehlerfall | kontrolliertes KI-Labor |
| **22** | **SYSING-001 BSF-Fassung** | **1** | **0** | DOCX/PDF; Inhaltsverzeichnis; Diagramme; Screenshots; TDF-VREG; keine Informationsverluste | SYSING-001 BSF Release Candidate |
| **23** | **BSF-Abnahme** | **1** | **0–1** | Rollen; RLS/RBAC; Import; Backup/Restore; Docker; Reporting; SYSING-001 | **BSF BASELINE** |
| **24** | **Integration Readiness** | **1** | **0** | Source-of-Truth, Matching, Provenienz, Schreibgrenzen, Audit, Konflikte, Providergrenzen als formales Gate prüfen | GO/NO-GO Integration |
| **25+** | **Graph / Exchange / Automation** | **1–2 je Ausbauschritt** | **0–1 je UI-Schritt** | zunächst Read-only-Datenfluss; Matching; Human Approval; Audit; erst danach Schreibaktionen | kontrollierte Integration |

## Planungsgrößen

| Planung | Größenordnung |
| --- | ---: |
| offene MVP-Arbeits-Prompts 09D–10 | **2–4** |
| BSF-Arbeits-Prompts 11–23 | **ca. 17–18** |
| Lovable-Prompts 09D–23 | **ca. 5–10** |
| manuelle Einzelprüfungen | **ca. 35–50** |
| anschließend Integration-Readiness | **1 eigener Sprint** |

## Verbindliche Übergänge

1. **09D → 10:** keine neue MVP-Funktion mehr; F-11 abschließen und danach Baseline erstellen.
2. **13 → 17:** Kunde und Kundenverantwortung vor Datenintegration; danach zentrale Datenhaltung, Canonical Import Model und SharePoint-Vertrag.
3. **18 → 23:** Betreiberhoheit, Portabilität, Management, Reporting und kontrolliertes KI-Labor führen zur BSF-Baseline.
4. **Nach 23:** erst Integrations-Readiness, danach produktive Graph-/Exchange-Integration.

Die providerneutrale Importkette der Roadmap bleibt verbindlich:

`SOURCE → NORMALIZE → VALIDATE → MATCH → ENRICH → REVIEW → PERSIST → AVKK`
