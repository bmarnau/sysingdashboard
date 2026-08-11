# Sprint 08 – Persönlicher AVKK-Arbeitsplatz

Ziel: Das in 07B fertige AVKK-Datenmodell wird erstmals bedienbar. Keine neuen Tabellen, keine neuen Services — die vorhandenen Fassaden `src/lib/avkk` und `src/lib/reference-data` werden verwendet.

## 0. Zuerst: offene Gates aus 07B

`bun run build`, vollständiger ESLint-Lauf, Tech-Debt-Lauf und Ops-Checks werden vor der Entwicklung ausgeführt. Rote Gates werden mit Ursache dokumentiert und, wenn sie AVKK betreffen, vor Sprintende behoben — sonst als Befund geführt. Kein Verstecken bestehender Probleme als Sprint-08-Erfolg.

## 1. Einstieg: „Mein AVKK"

Das Dashboard hat bereits eine Tab-Leiste (Projekte, Arbeitspakete, Tätigkeiten, Abrechnung). Dort kommt ein fünfter Tab **„Mein AVKK"** dazu — keine neue Hauptnavigation. Der Tab ist über `PermissionGate` an `avkk.view` gebunden; Bearbeitung an `avkk.edit` bzw. `avkk.responsibility.assign`.

## 2. Aufgabenliste

Quelle sind die vorhandenen lokalen Aufgabenobjekte (Projekte, Arbeitspakete, Tätigkeiten), angereichert um den AVKK-Stand aus der Datenbank. Spalten: Aufgabe, Typ, Projekt, Termin, Verantwortung, Kompetenzstand, Konsequenzstand, Gefährdung, zuletzt geändert.

Suche, Sortierung und Filter: alle | vollständig bewertet | unvollständig | gefährdet | kritisch | fällig | überfällig | eigene Verantwortung. Status immer als Text + Symbol + Badge, nie nur farbig.

## 3. Detailansicht (Dialog)

Gegliedert in fünf klar getrennte Abschnitte:

```text
Aufgabe (Titel, Beschreibung, Typ, Projekt, Termin, Status — nur lesend)
A – Aufgabe verstehen        Kurzerklärung + Bezug zur Aufgabe
V – Verantwortung            Person + Rolle + Verantwortungsarten (Mehrfachauswahl)
K – Kompetenz                je Katalogdimension: vorhanden / teilweise / nicht vorhanden
K – Konsequenz               Bereich + Schweregrad + Terminwirkung + Beschreibung
Kontext & Frühindikator      Gefährdung mit ausgeschriebenen Gründen
```

Alle Auswahllisten kommen aus dem ReferenceDataService (Kataloge `avkk.responsibility_type`, `avkk.responsibility_role`, `avkk.competence_dimension`, `avkk.competence_rating`, `avkk.consequence_area`, `avkk.consequence_severity`, `avkk.schedule_impact`). Keine fachlichen Enums in Komponenten. Lade-, Fehler- und Veraltet-Zustand („Katalogstand vom …") werden sichtbar gemacht; deaktivierte Werte erscheinen nur, wenn sie bereits gespeichert sind.

## 4. AVKK-Methodik erklären

Kompakte Inline-Erklärung je Abschnitt (ein bis zwei Sätze) plus Einstiegspunkt „AVKK verstehen", der das bestehende Handbuch am AVKK-Kapitel öffnet. Keine langen Texte im Arbeitsfluss.

## 5. Gefährdung nachvollziehbar

`evaluateRisk()` liefert bereits Gründe. Diese werden als Klartextliste angezeigt („Zeit nicht vorhanden", „2 Dimensionen nur teilweise vorhanden"). Zusätzlich werden im UI — ohne neue Persistenz — Konsequenz-Schweregrad und Terminnähe als erklärende Hinweise ergänzt; wenn dafür eine Regeländerung nötig ist, erfolgt sie in `indicators.ts`, nicht in der Komponente.

## 6. Kontext-/weiche Faktoren

Im Datenmodell existieren **keine** Kontextfelder (Stress, Belastung, Teamunterstützung). In Sprint 08 wird nur ein sichtbarer, leerer Erweiterungspunkt mit Erklärung angelegt („noch nicht erfasst, folgt als getrennt berechtigte Ebene"). Keine Schattenpersistenz, keine personenbezogenen Bewertungen.

## 7. Speichern

Ausschließlich über `AvkkService` (Anlegen des Subjekts bei Bedarf, Verantwortung, Kompetenz, Konsequenz). Kein Supabase-Import in Komponenten — der bestehende statische Sicherheitstest bleibt gültig. Erfolgs- und Fehlermeldungen über Sonner, Fehlertexte aus `DashboardError`-Codes. Nach Speichern Neuladen des Dossiers; Reload-Persistenz wird manuell und im Test geprüft.

## 8. RBAC / RLS

UI-Gating über `usePermission`; Schreibfehler aus der Datenbank (RLS) werden angezeigt statt verschluckt. Read-only-Rollen sehen Werte, aber deaktivierte Eingaben mit Hinweis. Tests: Lesen erlaubt, Schreiben verweigert, UI-Sperre und RLS stimmen überein.

## 9. Backup/Export

Verifiziert wird, dass AVKK (serverseitig) heute nicht im lokal orientierten Backup/JSON-Export enthalten ist. Erwartung: das ist kein kleiner Fix, weil Backup 2.0 manifestbasiert auf localStorage arbeitet. Ergebnis wird dokumentiert und als verbindlicher MVP-Blocker für Sprint 09 in `PROJECT-STATUS.yaml` geführt, statt den Scope hier auszuweiten.

## 10. Tests

Neue Vitest-Suiten für Arbeitsplatz-Logik (Filter, Suche, Sortierung, Statusableitung), Detailansicht (Speicherpfade, Fehlerfall, Read-only, Reference-Data-Fehler, Gefährdungsanzeige) sowie eine Playwright-Spec für Öffnen, Bearbeiten, Speichern und Reload. Bestehende 428 Tests dürfen nicht regressieren.

## 11. Responsive & Accessibility

Karten-Layout unter `sm`, Tabelle ab `md`. Geprüft werden Tastaturbedienung, Fokus im Dialog, Labels, Überschriftenstruktur und Statusdarstellung ohne reine Farbcodierung — mit Screenshots auf Desktop, Tablet und Mobil.

## 12. Dokumentation

Neu: `docs/AVKK-MANUAL-ACCEPTANCE.md` mit den zehn Testschritten und der Bewertungsliste zum Abhaken.
Aktualisiert: `CHANGELOG.md` (1.53.0), `docs/PROJECT-STATUS.yaml`, `docs/ENTWICKLUNGSTAGEBUCH.md`, `docs/AVKK.md`, Handbuch (`src/lib/help-documentation.ts`: Was/Warum AVKK, Bedienung, „gefährdet", Kompetenz/Konsequenz, Kontextfaktoren), technischer Prüfbericht neu erzeugt.

## Technische Details

- Neu: `src/components/avkk/` (`AvkkWorkspaceView.tsx`, `AvkkTaskTable.tsx`, `AvkkDetailDialog.tsx`, `AvkkResponsibilitySection.tsx`, `AvkkCompetenceSection.tsx`, `AvkkConsequenceSection.tsx`, `AvkkRiskBadge.tsx`, `AvkkExplainer.tsx`).
- Neu: `src/hooks/useReferenceData.ts`, `src/hooks/useAvkkWorkspace.ts`, `src/hooks/useAvkkDossier.ts` — nur diese sprechen mit den Fassaden.
- Neu: `src/lib/avkk/workspace.ts` (reine Ableitung: Aufgaben + Dossiers → Zeilen, Filter, Statusberechnung), damit die Logik ohne React testbar bleibt.
- Registrierung von `registerSubjectResolver` beim Mount des Arbeitsplatzes gegen den lokalen Bestand.
- Personenauswahl für Verantwortung aus `public.profiles` über eine Fassade, nicht direkt aus der Komponente.
- Keine Datenbankmigration geplant. Fehlt ein Katalogwert, wird er per Migration im Reference-Data-Modell ergänzt und dokumentiert — nicht hardcodiert.

## Abschluss

Nach Umsetzung: alle Quality Gates mit Zahlen, MVP-Statusbericht, Abschlussbericht mit den 17 geforderten Punkten und die Meldung „Sprint 08 ist bereit für den manuellen AVKK-Abnahmetest". Danach warte ich auf Feedback, bevor am Bedienkonzept größer geändert wird.
