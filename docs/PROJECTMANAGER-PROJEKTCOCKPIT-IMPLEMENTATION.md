# F-11 Projektcockpit — technischer Umsetzungsplan

Stand: 2026-08-21  
Zielversion: 1.59.5  
Branch: `feature/f11-project-cockpit`  
Ausgangs-Commit: `5c47e8b0cd1dda0f4133c95ab491afcc66fdd4ef`

## 1. Ziel

Die während der manuellen F-11-Abnahme bestätigte Lücke wird minimal geschlossen: Ein Projektmanager soll aus der Projektsicht ein Projekt öffnen und in einer zusammenhängenden Projektdetailansicht Stammdaten, Kennzahlen, Arbeitspakete, Tätigkeiten, AVKK-Kontext und den Projektbericht erreichen können.

Die Umsetzung ergänzt keine neue Fachlogik und keinen neuen Datenbestand. Sie führt vorhandene Daten anhand der bestehenden `projectId` zusammen.

## 2. Bestehender Stand

- `ProjectsView` zeigt Projektkarten und bietet bei `project.edit` Bearbeiten/Löschen; es gibt keinen separaten Öffnen-/Drill-down-Pfad.
- `WorkPackagesView` kann nach Projekt filtern, hält diesen Filter aber intern.
- `ActivitiesView` zeigt Projektzuordnung über Arbeitspaket → Projekt, hat jedoch keinen direkten Projektfilter.
- `ReportDialog` kann bereits den Bericht `avkk-project` für eine `projectId` erzeugen, übernimmt aber derzeit keinen vorgewählten Projektkontext von außen.
- `AvkkWorkspaceView` und Reporting arbeiten bereits mit den vorhandenen AVKK-Daten; die neue Projektsicht darf keine zweite AVKK-Logik erzeugen.

## 3. Minimalarchitektur

### 3.1 Neuer UI-State im Dashboard

Im Dashboard einen rein lokalen Navigations-State ergänzen:

```ts
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
```

Die Projektdetailansicht wird innerhalb der bestehenden Dashboard-Route gerendert. Keine neue Router-Route ist für den MVP nötig.

### 3.2 ProjectsView

`ProjectsView` erhält zusätzlich einen Pflicht-Callback:

```ts
onOpen: (projectId: string) => void
```

Die Projektkarte oder ein klarer Button `Öffnen` ruft `onOpen(p.id)` auf. Der vorhandene Bearbeitungsstift bleibt unverändert und öffnet ausschließlich den Stammdaten-Editor.

Wichtig:

- Öffnen ist Lesefunktion und darf **nicht** an `project.edit` gekoppelt werden.
- Bearbeiten/Löschen bleiben an `canEdit` gebunden.
- Klick auf Bearbeiten darf nicht gleichzeitig den Drill-down auslösen.

### 3.3 Neue Komponente `ProjectDetailView`

Empfohlener Pfad:

`src/components/dashboard/views/ProjectDetailView.tsx`

Props nur aus bereits geladenem Dashboard-/AVKK-State:

```ts
project: Project
workPackages: WorkPackage[]
activities: Activity[]
avkkRows: AvkkRow[] // oder geeignete bereits vorhandene neutrale AVKK-Projektion
canEditProject: boolean
canEditWP: boolean
canEditActivity: boolean
onBack: () => void
onEditProject: (project: Project) => void
onEditWP: (wp: WorkPackage) => void
onEditActivity: (activity: Activity) => void
onOpenReport: (projectId: string) => void
```

Keine Datenbank-/Supabase-Abfrage in der Komponente.

## 4. Fachlicher Inhalt der Projektdetailansicht

### 4.1 Kopf

- Zurück zu Projekte
- Projektname / Projekt-ID
- Kunde
- Projektleitung
- Status
- Start / Deadline
- Budget / Sollstunden
- Team
- Beschreibung
- Bearbeiten nur bei `project.edit`

### 4.2 Kennzahlen

Aus vorhandenen Daten ableiten:

- Arbeitspakete gesamt
- offene Arbeitspakete
- überfällige Arbeitspakete
- Tätigkeiten gesamt
- Ist-Aufwand aus Tätigkeiten
- abrechenbare Stunden
- abrechenbarer Betrag
- AVKK gefährdet / unvollständig im Projekt

Keine neuen KPI-Definitionen außerhalb der bestehenden Fachlogik erfinden. Wo bereits Hilfsfunktionen existieren, diese wiederverwenden.

### 4.3 Arbeitspakete

Nur:

```ts
workPackages.filter((wp) => wp.projectId === project.id)
```

Anzeigen:

- Titel / ID
- Status
- Priorität
- Fälligkeit
- Soll/Ist-Aufwand
- Verantwortlicher
- Bearbeiten nur bei `workpackage.edit`

### 4.4 Tätigkeiten

Projektzuordnung ausschließlich über bestehende Beziehung:

```ts
const projectWpIds = new Set(projectWorkPackages.map((wp) => wp.id));
activities.filter((a) => a.workPackageId && projectWpIds.has(a.workPackageId))
```

Anzeigen:

- Datum
- Tätigkeit
- Arbeitspaket
- Dauer
- abrechenbar
- Satz/Betrag, sofern im vorhandenen Modell vorhanden
- Abrechnungsstatus
- Bearbeiten nur bei `activity.edit`

Keine projektspezifische Kopie der Tätigkeit anlegen.

### 4.5 AVKK-Projektkontext

Vorhandene Projektauswahl wiederverwenden, bevorzugt über die bereits im Reporting verwendete Selektion `selectProjectRows(...)` oder eine kleine neutrale Selector-Funktion im bestehenden AVKK-Layer.

Anzeigen, kompakt:

- Sachverhalte gesamt
- gefährdet
- kritisch
- überfällig
- Kompetenz-/Voraussetzungslücken
- ohne Verantwortung
- Liste der gefährdeten/unvollständigen Vorgänge

Keine personenbezogene Rangliste oder Leistungsbewertung (ADR-0027).

## 5. Projektbericht aus demselben Kontext

`ReportDialog` minimal erweitern um optionale Initialwerte, z. B.:

```ts
initialReportId?: string
initialProjectId?: string
```

Beim Öffnen aus `ProjectDetailView`:

- `initialReportId = "avkk-project"`
- `initialProjectId = selectedProjectId`

Die bestehende Reportdefinition, Fassade und Renderer bleiben unverändert. Kein zweiter Projektberichtspfad.

## 6. Navigation

Minimaler MVP-Fluss:

`Projekte → Projekt öffnen → ProjectDetailView → Arbeitspaket/Tätigkeit bearbeiten → zurück zum Projektdetail`

Beim Schließen eines Edit-Dialogs bleibt `selectedProjectId` erhalten.

`Zurück` setzt nur `selectedProjectId = null` und zeigt wieder die bestehende Projektsicht.

Kein URL-/Deep-Linking in diesem Fix. Das kann später ergänzt werden.

## 7. RBAC / Security

Verbindlich:

- keine Rollen-Strings in `ProjectDetailView`,
- bestehende Permission-Booleans weiterreichen,
- Lesen nicht an Edit-Permissions koppeln,
- Bearbeiten über bestehende `project.edit`, `workpackage.edit`, `activity.edit`,
- bestehende defensive Save/Delete-Handler unverändert beibehalten,
- AVKK-Schreiben nicht in diesem Projektcockpit neu implementieren,
- keine Änderung der RBAC-Matrix,
- keine Änderung an RLS-Policies,
- F-13/F-14 nicht in diesen Fix ziehen.

## 8. Nicht-Scope

Nicht Bestandteil von 1.59.5:

- Kundenabrechnung / BSF,
- neue Kundendomäne,
- neue Supabase-Tabellen,
- zentrale Cloud-Synchronisation,
- neue RLS-Scope-Regeln,
- URL-Routing/Deep Links,
- neues Design-System,
- neue AVKK-Fachlogik,
- Report-Renderer-/PDF-Layout-Fix,
- UUID-Anzeigenamen-Finding,
- Refactoring des Dashboard-Monolithen über das für diese Änderung notwendige Maß hinaus.

## 9. Erwartete Dateien

Voraussichtlich:

- `src/routes/_authenticated/dashboard.tsx`
- `src/components/dashboard/views/ProjectsView.tsx`
- neu `src/components/dashboard/views/ProjectDetailView.tsx`
- `src/components/report/ReportDialog.tsx`
- optional kleiner Selector im bestehenden `src/lib/avkk/`- oder `src/lib/report/data/`-Layer
- neue/erweiterte Tests unter `src/__tests__/components/` bzw. `src/__tests__/unit/`
- `CHANGELOG.md`
- `docs/ROLE-ACCEPTANCE-09C.md`
- `docs/PROJECT-STATUS.yaml`
- `docs/PROJECTMANAGER-PROJEKTCOCKPIT.md`
- `docs/ENTWICKLUNGSTAGEBUCH.md`

## 10. Automatisierte Tests

Mindestens:

1. `ProjectsView`: Öffnen ist auch bei `canEdit=false` verfügbar; Edit/Delete bleiben verborgen.
2. `ProjectsView`: Öffnen und Bearbeiten rufen getrennte Callbacks auf.
3. `ProjectDetailView`: filtert exakt die Arbeitspakete des Projekts.
4. `ProjectDetailView`: filtert Tätigkeiten transitiv über die Projekt-Arbeitspakete.
5. `ProjectDetailView`: Edit-Aktionen respektieren die drei bestehenden Permission-Booleans.
6. `ProjectDetailView`: fremde Projekte/WPs/Tätigkeiten erscheinen nicht im Detail.
7. Projekt-AVKK-Scope verwendet denselben Selector wie der Projektbericht bzw. liefert dieselbe Zeilenmenge.
8. `ReportDialog`: initialer Projektbericht und Projekt-ID werden korrekt vorgewählt, normale Nutzung ohne Initialwerte bleibt unverändert.
9. Regression F-18: Viewer/Customer erhalten durch das Projektdetail keine Schreibaktionen.
10. Bestehende Tests vollständig grün.

## 11. Quality Gates

Nach Umsetzung vollständig ausführen:

- Vitest komplett
- Typecheck
- ESLint
- Prettier / Format-Check
- Build
- `docs:check`
- `project-status:check`
- `rbac:check`
- `no-console`
- Security-Check
- vorhandene Architektur-/Debt-Gates, soweit regulär Bestandteil des Projekts

## 12. Manuelle Abnahme nach Umsetzung

Mit Petra / Projektmanager:

1. Projekt `Netzwerkmodernisierung Verwaltungsstandort` öffnen.
2. Projektkopf plausibel.
3. Genau die zwei zugehörigen Arbeitspakete sichtbar.
4. Nur Tätigkeiten dieser beiden Arbeitspakete sichtbar.
5. Projektbezogene AVKK-Kennzahlen plausibel.
6. Arbeitspaket/Tätigkeit kann bei vorhandener Permission bearbeitet werden.
7. Projektbericht öffnet mit genau diesem Projekt vorausgewählt.
8. Berichtswerte stimmen mit Cockpit überein.
9. Zurück führt wieder in die Projektsicht.

Negativtest mit Alexa/Viewer:

1. Projekt öffnen erlaubt.
2. Projektdetail lesbar.
3. keine Bearbeiten-/Löschen-/Neu-Aktionen.
4. keine Rechteausweitung über Bericht oder Drill-down.

## 13. Abschlusskriterium

Erst wenn automatisierte Gates und der manuelle Petra-/Viewer-Retest bestanden sind, darf der F-11-Punkt `Drill-down` auf `erfüllt` gesetzt werden.

Die restlichen F-11-Punkte (Projektbericht, Georg-Managementbericht, Administrator/Role Preview) bleiben unabhängig davon offen, bis sie tatsächlich geprüft wurden.
