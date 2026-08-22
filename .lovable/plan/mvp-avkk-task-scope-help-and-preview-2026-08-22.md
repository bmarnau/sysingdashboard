# Lovable-Prompt — AVKK-Aufgabenscope, Preview und Hilfe konsistent prüfen

Stand: 2026-08-22

## Prompt

Arbeite im bestehenden Projekt **Sysing Dashboard** ausschließlich auf Basis des nach Merge aktuellen GitHub-`main`.

## Ziel

Die fachlich verbindliche Trennung muss in Funktion, Darstellung und Dokumentation vollständig konsistent sein:

```text
Projekt
  └── Arbeitspaket  ← AVKK / Verantwortung / Delegation
        └── Tätigkeit  ← geleistete Arbeit / Zeit / Abrechnung / Arbeitsnachweis
```

Ein Projekt kann zusätzlich selbst AVKK und Verantwortung tragen.

**Tätigkeiten sind im produktiven MVP keine delegierbaren AVKK-Aufgaben.** Sie bleiben vollständig als Arbeits-/Leistungsnachweise im Dashboard, im Projektcockpit und in der Zeiterfassung erhalten.

## Verbindliche Grundlage

Der GitHub-`main` enthält nach Merge:

- `MVP_AVKK_TASK_SUBJECT_TYPES = ["project", "workpackage"]`;
- `tasksFromLocalData()` erzeugt nur Projekte und Arbeitspakete;
- `activity` bleibt aus Migrations-/Kompatibilitätsgründen ein historisch zulässiger AVKK-Subject-Typ;
- keine destruktive Datenbankänderung nur für diese fachliche Korrektur.

## Vorgehen

1. **Analysieren**
   - Prüfe den aktuellen GitHub-`main` und die genannten Dateien.
   - Suche alle UI-, Hilfe-, Handbuch-, Reporting- und Abnahmetexte, die noch behaupten, Tätigkeiten seien AVKK-Aufgaben oder delegierbar.
   - Ermittle Auswirkungen auf Demo-Kennzahlen und Berichte aus dem tatsächlichen Code/Teststand; keine Zahlen raten.

2. **Funktion prüfen**
   - „Mein AVKK“ zeigt als Aufgaben nur Projekte und Arbeitspakete.
   - AVKK Management zeigt als Aufgaben nur Projekte und Arbeitspakete.
   - Eine Tätigkeit wie `demo-act-3` darf nicht als AVKK-Aufgabe geöffnet oder mit Verantwortung versehen werden.
   - Projektcockpit zeigt die zugehörigen Tätigkeiten weiterhin als Arbeitsnachweise.
   - Tätigkeits-Erfassung, Zeit und Abrechnung bleiben unverändert funktionsfähig.

3. **Kontextsensitive Hilfe aktualisieren**
   - Direkt im AVKK-Kontext verständlich erklären:
     - Projekt/Arbeitspaket = steuerbare Aufgabe;
     - Verantwortung kann durch berechtigte Führungsrollen zugeordnet/delegiert werden;
     - Tätigkeit = dokumentiert tatsächlich geleistete Arbeit und wird nicht delegiert.
   - Keine technische Implementierungsdetailsprache für normale Benutzer verwenden.

4. **Allgemeine Hilfe und Benutzerhandbuch aktualisieren**
   - Kapitel „Mein AVKK — persönlicher Arbeitsplatz“ korrigieren: Aufgabenliste enthält Projekte und Arbeitspakete, nicht Tätigkeiten.
   - Kapitel „AVKK — Führungs- und Steuerungsmodell“ korrigieren: AVKK steuert Projekte und Arbeitspakete; Tätigkeiten dokumentieren die Ausführung.
   - Delegation beschreiben:
     - Projekt-/Teamleitung mit entsprechender Berechtigung kann Verantwortung zuordnen;
     - Personen werden als **Vorname Nachname** angezeigt;
     - Engineer kann keine Verantwortung zuweisen;
     - Viewer bleibt read-only.
   - Projektcockpit-Hilfe klarstellen: Tätigkeiten sind dort weiterhin sichtbar, weil sie Arbeitsnachweise des Arbeitspakets sind.
   - Suchbegriffe/Keywords für „Delegation“, „Verantwortung“, „Tätigkeit“, „Arbeitsnachweis“, „Arbeitspaket“ ergänzen, damit die Hilfe auffindbar ist.

5. **Reporting und Demo-Werte prüfen**
   - Alle AVKK-KPIs und SYSING-101/102/103 anhand des neuen Scopes neu berechnen.
   - Alte Gesamtwerte, die Projekte + Arbeitspakete + Tätigkeiten zählten, nicht beibehalten, wenn sie fachlich nicht mehr stimmen.
   - Nur Werte ändern, die sich aus Code/Test/Demodaten tatsächlich ergeben.
   - Keine personenbezogenen Ranglisten oder Scores einführen.

6. **Tests**
   - vorhandene Unit-/Integration-/Reporting-Tests ausführen;
   - falls alte Tests Tätigkeiten als AVKK-Aufgaben erwarten, fachlich korrekt aktualisieren;
   - sicherstellen, dass Tätigkeitsfunktionen außerhalb AVKK nicht regressieren;
   - Typecheck, Lint, Prettier, Build und relevante E2E-/Security-Gates ausführen.

7. **Dokumentation / Abschluss**
   - F-11-Abnahmedokumentation so korrigieren, dass Drill-down und AVKK-Scope nicht mehr Tätigkeiten als AVKK-Aufgaben beschreiben.
   - Den manuellen Status nicht vorwegnehmen.
   - Kein `MVP 100 %`, keine `BASELINE`, solange Delegations-, Admin- und Role-Preview-Abnahmen noch offen sind.

## Nicht tun

- Tätigkeiten nicht aus Projektcockpit, Zeiterfassung oder Abrechnung entfernen;
- bestehende AVKK-Activity-Daten nicht destruktiv löschen;
- DB-Constraint für `activity` nicht ohne eigene Migration-/Datenbereinigung ändern;
- `measure` nicht unbemerkt zum MVP-Scope hinzufügen;
- keine neuen personenbezogenen Bewertungsmechanismen;
- keine Secrets/Service-Role-Keys ausgeben.

## Abschlussbericht

- GitHub-`main`-Commit
- AVKK-Aufgabentypen in UI: Projekt + Arbeitspaket: PASS/FAIL
- Tätigkeit aus AVKK-Aufgabenliste entfernt: PASS/FAIL
- Tätigkeit im Projektcockpit weiter vorhanden: PASS/FAIL
- kontextsensitive Hilfe aktualisiert: PASS/FAIL
- allgemeine Hilfe/Handbuch aktualisiert: PASS/FAIL
- Reporting-KPIs neu geprüft: PASS/FAIL + tatsächliche Werte
- SYSING-101/102/103 geprüft: PASS/FAIL
- Tests/Typecheck/Lint/Prettier/Build/Security: PASS/FAIL
- noch offene manuelle F-11-Schritte ausdrücklich nennen

## Abnahmekriterium

**Fachmodell, UI, Reporting und Hilfe sind konsistent auf Projekt + Arbeitspaket als AVKK-Aufgaben ausgerichtet; Tätigkeiten bleiben Arbeitsnachweise.**
