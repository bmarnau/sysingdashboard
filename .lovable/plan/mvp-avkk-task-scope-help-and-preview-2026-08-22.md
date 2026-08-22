# Lovable-Abnahmeplan — AVKK-Aufgabenscope, Preview und Hilfe konsistent prüfen

Stand: 2026-08-22

## Ausführungszeitpunkt

Diesen Plan **erst ausführen, nachdem**

1. der aktuelle Scope-Fix auf `main` gemergt ist und
2. die zugehörige AVKK-Hilfe/Fachdokumentation (PR #21 bzw. deren Nachfolger) ebenfalls auf `main` liegt.

Lovable dient hier primär der **Preview- und Konsistenzprüfung**. Bereits korrekt
versionierte GitHub-Texte nicht neu formulieren und keine parallele
Facharchitektur erzeugen.

## Ziel

Die fachlich verbindliche Trennung muss in Funktion, Darstellung und Dokumentation vollständig konsistent sein:

```text
Projekt              ← AVKK / Verantwortung / Delegation
  └── Arbeitspaket    ← AVKK / Verantwortung / Delegation
        └── Tätigkeit ← geleistete Arbeit / Zeit / Abrechnung / Arbeitsnachweis
```

**Tätigkeiten sind im produktiven MVP keine delegierbaren AVKK-Aufgaben.** Sie bleiben vollständig als Arbeits-/Leistungsnachweise im Dashboard, im Projektcockpit, in Kundensichten, Leistungsnachweisen, Abrechnung und Zeiterfassung erhalten.

Wichtig: **Keine AVKK-Aufgabe bedeutet ausdrücklich nicht „nicht editierbar“.**

- Projektmanager behalten `activity.edit` und dürfen Tätigkeiten im vorgesehenen Scope bearbeiten.
- Teamleiter behalten `activity.edit` und dürfen Tätigkeiten im vorgesehenen Scope bearbeiten.
- Engineers behalten `activity.edit` im vorgesehenen eigenen Scope.
- Diese Tätigkeitsrechte sind fachlich unabhängig vom AVKK-Delegationsrecht.

## AVKK-Erklärung

Sysing bleibt **AVKK**, nicht ZAVKK. Die Hilfe muss den auf `main` versionierten Fachstand verwenden:

- Aufgabe: klar, konkret und gemeinsam nachvollziehbar;
- Verantwortung: persönliche Verantwortungsübernahme / „Ich fühle mich verantwortlich“ als Führungsfrage; **kein** gemessener Personenwert;
- Kompetenz: Kompetenzen **und Ressourcen**;
- Konsequenz: negative Folgen der Nichterfüllung zuerst für andere Mitwirkende, den Kunden und mich selbst.

Keine Mitarbeiter-Rankings, Verantwortungsgefühl-Scores oder automatisierte Leistungsbewertungen.

## Verbindliche Grundlage

Der GitHub-`main` enthält nach den Merges:

- `MVP_AVKK_TASK_SUBJECT_TYPES = ["project", "workpackage"]`;
- `tasksFromLocalData()` erzeugt nur Projekte und Arbeitspakete;
- `activity` bleibt aus Migrations-/Kompatibilitätsgründen technisch zulässiger AVKK-Subject-Typ;
- keine destruktive Datenbankänderung nur für diese fachliche Korrektur;
- bestehende RBAC-Rechte `activity.edit` für Teamlead, Projectmanager und Engineer bleiben unverändert;
- App-Erklärung, kontextsensitive Hilfe, Benutzerhandbuch und `docs/AVKK.md` verwenden denselben Fachstand.

## Vorgehen

1. **Analysieren**
   - aktuellen GitHub-`main` und Commit feststellen;
   - genannte Scope- und Hilfedateien gegen den GitHub-Stand prüfen;
   - keine Änderungen vornehmen, wenn Preview und GitHub bereits konsistent sind;
   - alle UI-/Reporting-/Abnahmestellen ermitteln, die noch Tätigkeiten als AVKK-Aufgaben zählen oder darstellen.

2. **Funktion prüfen**
   - „Mein AVKK“ zeigt als Aufgaben nur Projekte und Arbeitspakete;
   - AVKK Management zeigt als Aufgaben nur Projekte und Arbeitspakete;
   - Tätigkeiten können nicht als neue delegierbare AVKK-Aufgabe geöffnet oder mit Verantwortung versehen werden;
   - Projektcockpit zeigt Tätigkeiten weiterhin als Arbeits-/Leistungsnachweise;
   - Tätigkeits-Erfassung, Zeit und Abrechnung bleiben funktionsfähig;
   - Projektmanager und Teamleiter können Tätigkeiten weiterhin bearbeiten;
   - Engineers können Tätigkeiten im vorgesehenen eigenen Scope weiterhin bearbeiten;
   - Viewer/Customer erhalten dadurch keine neuen Bearbeitungsrechte.

3. **Erklärung/Hilfe prüfen**
   - `AVKK verstehen` verwendet Verantwortung als Verantwortungsübernahme/Führungsfrage und nicht als Personen-Score;
   - Kompetenz nennt Kompetenzen und Ressourcen;
   - Konsequenz nennt Mitwirkende, Kunde und eigene Folgen;
   - Benutzerhandbuch und kontextsensitive Hilfe verwenden dieselbe Bedeutung;
   - Projekte/Arbeitspakete werden als AVKK-Aufgaben beschrieben, Tätigkeiten als Arbeits-/Leistungsnachweise.

4. **Reporting und Demo-Werte prüfen**
   - AVKK-KPIs und SYSING-101/102/103 aus dem neuen Scope tatsächlich neu berechnen;
   - alte AVKK-Gesamtwerte mit Tätigkeiten nicht beibehalten, wenn fachlich falsch;
   - Kunden-/Leistungs-/Abrechnungswerte auf Basis von Tätigkeiten dürfen nicht verschwinden oder verfälscht werden;
   - keine Zahlen raten und keine personenbezogenen Rankings erzeugen.

5. **Tests**
   - relevante Unit-/Integration-/Reporting-Tests;
   - RBAC gezielt: `activity.edit` für Projectmanager/Teamlead unverändert, Engineer im vorgesehenen eigenen Scope, Viewer/Customer ohne neues Edit-Recht;
   - Kundensicht, Leistungsnachweis und Abrechnung mit Tätigkeitsdaten;
   - TypeScript, Lint, Prettier, Build und relevante E2E-/Security-Gates.

6. **Dokumentieren**
   - nur tatsächlich gefundene Restabweichungen korrigieren;
   - keine neue Migration und keine neue Fachdimension erzeugen;
   - F-11-/MVP-Status nicht vorwegnehmen, solange manuelle Rollenabnahmen offen sind.

## Nicht tun

- Tätigkeiten nicht aus Projektcockpit, Zeiterfassung, Kundensicht, Leistungsnachweis oder Abrechnung entfernen;
- `activity.edit` für Projektmanager, Teamleiter oder Engineers nicht reduzieren;
- bestehende AVKK-Activity-Daten nicht destruktiv löschen;
- DB-Constraint für `activity` nicht ohne eigene Migration-/Datenbereinigung ändern;
- `measure` nicht unbemerkt zum MVP-Scope hinzufügen;
- Sysing nicht zu ZAVKK erweitern;
- keine personenbezogenen Bewertungsmechanismen;
- keine Secrets/Service-Role-Keys ausgeben;
- keine Produktionsveröffentlichung.

## Abschlussbericht

- GitHub-`main`-Commit
- AVKK-Aufgabentypen in UI Projekt + Arbeitspaket: PASS/FAIL
- Tätigkeit aus AVKK-Aufgabenliste entfernt: PASS/FAIL
- Tätigkeit im Projektcockpit weiter vorhanden: PASS/FAIL
- Projektmanager/Teamleiter `activity.edit` unverändert: PASS/FAIL
- Engineer `activity.edit` im vorgesehenen eigenen Scope unverändert: PASS/FAIL
- Kundensicht/Leistungsnachweis/Abrechnung mit Tätigkeitsdaten: PASS/FAIL
- Verantwortung/Kompetenz/Konsequenz fachlich korrekt erklärt: PASS/FAIL
- kontextsensitive Hilfe/Benutzerhandbuch konsistent: PASS/FAIL
- Reporting-KPIs neu geprüft: PASS/FAIL + tatsächliche Werte
- SYSING-101/102/103 geprüft: PASS/FAIL
- Tests/Typecheck/Lint/Prettier/Build/Security: PASS/FAIL
- noch offene manuelle F-11-Schritte ausdrücklich nennen

## Abnahmekriterium

**Fachmodell, UI, Reporting und Hilfe sind konsistent auf Projekt + Arbeitspaket als AVKK-Aufgaben ausgerichtet; Tätigkeiten bleiben bearbeitbare Arbeitsnachweise für die berechtigten Rollen und operative Grundlage für Kundensicht, Leistungsnachweis und Abrechnung.**
