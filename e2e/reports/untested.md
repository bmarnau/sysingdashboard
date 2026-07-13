# Nicht getestete UI-Funktionen (E2E-Lücken)

Stand: v1.31.0. Diese Datei ist die **bewusste** Lücken-Dokumentation zum E2E-Prompt 2A.4.
Was hier steht, ist NICHT durch automatisierte E2E-Tests abgedeckt und braucht in
einem Folgeschritt entweder stabile `data-testid`-Anker oder eine Test-Refactor-Runde.

## Dashboard-Interaktionen (nur Smoke, nicht funktional geprüft)

- Bearbeitung von Aufgaben, Projekten, Arbeitspaketen, Tätigkeiten inline
- Zeiterfassung: Start/Stop, Buchungs-Validierung
- Filter- und Sortier-Kombinationen (Persistenz, Reset)
- Wechsel View Woche ↔ Monat inkl. Navigation Vorheriger/Nächster Zeitraum
- KPI-Berechnung gegen Testdaten (nur "sichtbar" geprüft, nicht "korrekt")

## Servicemenü-Dialoge (nur „öffnet sich"-Ebene)

- Log Viewer: Filter, Level-Umschaltung, Export
- Systemstatus: Live-Aktualisierung, GitHub/Azure-Sektionen
- System Health: Metriken-Refresh
- Backup: manueller Trigger, Download-Verifikation
- Download Center: PDF-Vorschau, Retention-Löschlogik
- Import/Export-Wizard: 4-Schritt-Flow inkl. Rollback
- Azure-Datenbereich: Verbindung, Sync
- Benutzerverwaltung: Anlegen/Rollenwechsel, Admin-Lockout
- Handbuch-Suche und Deep-Links
- Release Readiness

## RBAC

- Nur Sichtbarkeit des Servicemenü-Buttons ist matrix-geprüft. Einzelne
  Menü-Einträge, Dialog-Aktionen und Feld-Level-Gating fehlen.
- Backend-Denial ist auf die zwei aktuell registrierten Endpoints beschränkt.
  Sobald `/api/azure/*` und `/api/rbac/assignments` live sind, müssen sie ergänzt werden.

## Accessibility

- Nur Startseite wird gegen axe geprüft. Servicemenü-Dialoge und Wizards fehlen.
- Fokus-Reihenfolge wird nur an einem Anker (Hilfe-Button) geprüft.
- Screenreader-Namen für dynamische Toasts, Live-Regions: nicht geprüft.

## Responsive

- Nur „Main-Landmark sichtbar" pro Viewport. Kein Layout-Regressions-Snapshot,
  kein tap-target-Größencheck, kein Overflow-Regressions-Detector.

## Cross-Browser & Sessions

- Nur Chromium. Firefox/WebKit bewusst nicht in CI (ADR-0012).
- Abgelaufene Sessions: nicht geprüft (App nutzt aktuell keine Auth-Session
  mit Ablauf – client-seitige User-Auswahl).
