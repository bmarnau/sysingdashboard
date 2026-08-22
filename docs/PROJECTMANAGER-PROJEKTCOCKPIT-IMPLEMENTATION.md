# F-11 Projektcockpit — Implementierung und Abnahme

Stand: 2026-08-22  
Zielversion: 1.59.5  
Branch: `feature/f11-project-cockpit-v2`  
Ausgangs-Commit: `5bf381de6474a356b01ba757e7c2f3ffe812cbc0`

## 1. Ziel

Die in der manuellen F-11-Abnahme bestätigte Drill-down-Lücke wird minimal geschlossen. Aus der bestehenden Projektsicht kann ein Projekt geöffnet werden. Die Detailansicht führt vorhandene Projekt-, Arbeitspaket-, Tätigkeits- und AVKK-Daten in einem lesbaren Projektkontext zusammen und öffnet den bestehenden Projektbericht mit vorausgewähltem Projekt.

Es entsteht keine zweite Projekt-, AVKK- oder Reporting-Fachlogik.

## 2. Umsetzung

### Projektsicht

`ProjectsView` erhält einen lokalen `selectedProjectId`-State. Projektname und separater Öffnen-Button führen in `ProjectDetailView`.

Lesen/Öffnen ist bewusst unabhängig von `project.edit`. Die bestehenden Aktionen Neu, Bearbeiten und Löschen bleiben unverändert an `canEdit` gebunden. Der vorhandene Accessibility-Nachweis `aria-label="Projekte nach Status filtern"` bleibt erhalten.

### Projektdetail

`ProjectDetailView` verwendet ausschließlich bereits geladene Dashboard-Daten und bestehende Hooks/Selectoren. Angezeigt werden:

- Projektstammdaten, Status, Projektleitung, Termine, Team und Beschreibung,
- Arbeitspaket-Kennzahlen,
- Ist-Aufwand, abrechenbare Stunden und Betrag,
- ausschließlich Arbeitspakete des gewählten Projekts,
- ausschließlich Tätigkeiten, die über diese Arbeitspakete zum Projekt gehören,
- AVKK-Kennzahlen und gefährdete/unvollständige Sachverhalte im Projektkontext,
- der vorhandene Projektbericht.

Die Projektzuordnung erfolgt über `projectId`; Tätigkeiten werden transitiv über die Projekt-Arbeitspakete bestimmt.

### AVKK

Das Cockpit verwendet die bestehende AVKK-Leseschicht (`useAvkkManagement`) und den bereits im Reporting verwendeten `selectProjectRows(...)`-Selector. RLS bleibt die maßgebliche Datenzugriffsgrenze. Es wird keine neue AVKK-Schreibfunktion eingeführt.

### Reporting

`ReportDialog` unterstützt optionale Initialwerte `initialReportId` und `initialProjectId`. Aus dem Projektdetail werden `avkk-project` und die aktuelle Projekt-ID vorbelegt.

Die zuletzt abgenommenen Reporting-Änderungen bleiben erhalten, insbesondere die zentrale Darstellung von Namen/Rollen über `reportActorFromUser(...)`. Ohne Initialwerte bleibt das bisherige Dialogverhalten erhalten.

## 3. Sicherheit und Architektur

Unverändert bleiben:

- RBAC-Matrix,
- RLS-Policies,
- Supabase-Schema und Migrationen,
- Authentifizierung,
- AVKK-Fachlogik,
- Reportdefinitionen und Renderer,
- Backup-/Restore-Pfade.

Es werden keine Rollenstrings als Ersatz für Permissions eingeführt. Projektbearbeitung bleibt an der bestehenden `project.edit`-Grenze. Das Projektdetail selbst ist eine Lesefunktion.

## 4. Automatisierte Nachweise

Der neue Selector-Test sichert ab:

1. Nur Arbeitspakete des gewählten Projekts werden übernommen.
2. Tätigkeiten werden ausschließlich transitiv über diese Arbeitspakete ausgewählt.
3. Operative KPIs werden nur aus diesem Projektscope berechnet.

Zusätzlich müssen die vollständigen regulären CI- und Security-Gates des Repositories auf dem finalen PR-Head PASS sein.

## 5. Manuelle Abnahme

### Petra / Projektmanager

1. Projekt `Netzwerkmodernisierung Verwaltungsstandort` öffnen.
2. Projektkopf und Kennzahlen plausibel.
3. Genau die zugehörigen zwei Arbeitspakete sichtbar.
4. Nur Tätigkeiten dieser Arbeitspakete sichtbar.
5. AVKK-Projektkontext plausibel.
6. `Projektbericht` öffnet mit `SYSING-102` und diesem Projekt vorausgewählt.
7. Zurück führt wieder in die Projektsicht.

### Viewer-Negativtest

1. Projekt öffnen erlaubt.
2. Projektdetail lesbar.
3. Keine zusätzlichen Projekt-Schreibaktionen.
4. Drill-down und Bericht erweitern keine bestehenden Rechte.

Die manuellen Schritte werden nacheinander durchgeführt; erst nach Petra-PASS folgt der Viewer-Test.

## 6. Nicht-Scope

Nicht Bestandteil dieses Fixes sind:

- F-13/F-14,
- BSF/Kundenabrechnung,
- neues Kundenmodell,
- neue RLS-Scope-Regeln,
- neue Supabase-Tabellen,
- URL-Deep-Links,
- neue AVKK-Fachlogik,
- PDF-/Reporting-Layoutänderungen,
- allgemeines Dashboard-Refactoring.

## 7. Abschlusskriterium

Der F-11-Drill-down gilt erst als erfüllt, wenn:

- CI und Security auf dem finalen Head PASS sind,
- Petra den fachlichen Projektscope und die Berichtsvorwahl bestätigt hat,
- der Viewer-Negativtest keine Rechteausweitung zeigt.

Erst danach werden die noch offenen F-11-Rollennachweise und der MVP-Finalblock fortgesetzt.
