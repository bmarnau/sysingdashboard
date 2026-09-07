# Sysing Dashboard — Lovable-Promptplanung Snapshot

Stand: 2026-09-06
Status: historischer Planungs-Snapshot
Basis: aktuelle operative Sprintplanung im Repository

## Zweck

Dieses Dokument hält die am 2026-09-06 erwartete Anzahl gezielter Lovable-Prompts je Sprint fest. Es dient ausdrücklich als Vergleichsbasis, damit später geprüft werden kann, ob die geplante Arbeitsweise und der erwartete Lovable-Aufwand tatsächlich eingehalten werden konnten.

Der Snapshot wird nachträglich nicht an tatsächliche Verbräuche angepasst. Tatsächliche Werte werden später separat ergänzt bzw. in einer Auswertung gegen diesen Stand verglichen.

## Zählregel

Als **Lovable-Prompt** zählt ein gezielter Arbeitslauf mit eigenem fachlichen Auftrag an Lovable, insbesondere für:

- DB-/RLS-/Grant-/Function-Änderungen gemäß Database Change Governance,
- UI-/Preview-Arbeit,
- Rollen-/Berechtigungs-Preview,
- plattformspezifische Lovable-Prüfungen.

Reine ChatGPT-, GitHub-, Codex-, lokale Analyse-, Dokumentations- oder CI-Arbeit zählt nicht als Lovable-Prompt.

Die Werte sind Planungsbereiche, keine Verbrauchsgarantie. Ziel ist nicht, Prompts auszuschöpfen, sondern Lovable nur dann einzusetzen, wenn es technisch oder für Preview/UI sinnvoll bzw. governance-seitig erforderlich ist.

## Geplanter Lovable-Aufwand

<!-- prettier-ignore -->
| Reihenfolge | Sprint | Kurzinhalt | Geplante Lovable-Prompts | Tatsächlich | Abweichung / Kommentar |
|---:|---|---|---:|---:|---|
| 1 | BSF-02C Abschluss | B2 integrieren, PR #111 auf RPC umstellen, Gesamtabnahme | 0–1 | offen | |
| 2 | BSF-03 | „Meine Kunden“, Kundenverantwortung, RBAC/RLS | 1–2 | offen | |
| 3 | BSF-03D | Arbeitspaket-Kategorien / Stammdaten | 1–2 | offen | |
| 4 | BSF-03A | Projektmanager-Controlling, read-only | 2–3 | offen | |
| 5 | BSF-03B | Leistungsnachweis Teamlead, Finalisierung | 2–3 | offen | |
| 6 | BSF-03E | Vertretungs- und Personensicht | 1–2 | offen | |
| 7 | BSF-03C | Kunden-PDF / Kundenpaket | 1–2 | offen | |
| 8 | BSF-DOC-01 | Dokumentation konsolidieren | 0 | offen | |
| 9 | BSF-DOC-02 | SYSING-001 im TDF fortschreiben | 0 | offen | |
| 10 | BSF-DOC-03 | SYSING-001 im Board erreichbar machen | 1–2 | offen | |
| 11 | BSF-04 | zentrale/synchronisierte Datenstrategie | 2–3 | offen | |
| 12 | BSF-04A | Vorlagen + wiederkehrende Tätigkeiten/AP | 2–3 | offen | |

## Gesamtschätzung

Für den Weg vom Stand 2026-09-06 bis einschließlich BSF-04A werden insgesamt etwa **13–23 Lovable-Prompts** erwartet.

Der größte geplante Lovable-Anteil liegt bei:

- BSF-03A — Controlling / Rollen-Preview,
- BSF-03B — Leistungsnachweis / Finalisierung,
- BSF-04 — Datenstrategie / persistente Plattformgrenzen,
- BSF-04A — Templates / wiederkehrende Instanziierung.

Dokumentation, Architektur, GitHub-Arbeit, Tests und möglichst viele Codekorrekturen sollen weiterhin außerhalb von Lovable durchgeführt werden. Lovable wird vor allem dort eingesetzt, wo DB-Governance, UI/Preview oder plattformspezifische Tests dies sinnvoll bzw. notwendig machen.

## Verbindlicher roter Faden zum Zeitpunkt dieses Snapshots

`BSF-02C → BSF-03 → BSF-03D → BSF-03A → BSF-03B → BSF-03E → BSF-03C → BSF-DOC-01 → BSF-DOC-02 → BSF-DOC-03 → BSF-04 → BSF-04A → BSF-05 ff.`

## Spätere Auswertung

Nach Abschluss der hier aufgeführten Sprints soll mindestens geprüft werden:

1. Wie viele Lovable-Prompts wurden tatsächlich je Sprint benötigt?
2. Welche Sprints lagen unter, innerhalb oder über der Planung?
3. Welche zusätzlichen Prompts waren echte fachliche Notwendigkeit und welche entstanden durch Korrekturschleifen?
4. Konnten DB-/RLS-/Function-Änderungen weiterhin sauber in einzelne, klar abgegrenzte Lovable-Läufe geschnitten werden?
5. Welche Arbeiten ließen sich sinnvoll mit ChatGPT, GitHub, Codex oder lokalen Tests statt Lovable erledigen?
6. Sollte die Promptplanung für spätere BSF-Sprints angepasst werden?

## Grundsatz

Weniger Lovable-Prompts als geplant sind kein Problem und kein Qualitätsmangel. Entscheidend bleiben nachvollziehbare, sichere, testbare und dokumentierte Änderungen mit sauberem GitHub-PR- und Abnahmeweg.
