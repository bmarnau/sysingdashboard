# BSF-KIOSK-01 – finaler Layout-Abschluss

## Ziel
Die bestehende helle Drei-Spalten-Ansicht bleibt visuell und fachlich unverändert, wird aber bei exakt 1920×1080 vollständig ohne Seitenüberlauf sichtbar. Der sichtbare Haupttitel lautet „Operative Steuerungsübersicht“.

## Umsetzung
- `KioskView` nur vertikal verdichten: Außenabstand, Kopfzeilen-Padding und Abstände reduzieren, ohne Inhalte oder wichtige Schriftgrößen zu entfernen.
- `KioskWallboardSections` nur vertikal verdichten: Spalten-/Abschnittsabstände, Karten-Padding und Mindesthöhen, Tabellen-Zellpadding sowie Hinweisabstände moderat reduzieren.
- Drei Spalten, Statusfarben, Fortschrittsanzeigen, Ring, Urlaubskarten, Infrastrukturmatrix, Systemverfügbarkeit und alle vier Support-Verläufe unverändert erhalten.
- Die beiden Urlaubskarten bleiben gleich breit und gleich hoch.
- Den sichtbaren Titel und den zugehörigen Komponententest auf „Operative Steuerungsübersicht“ umstellen; interne Namen bleiben unverändert.
- Unmittelbar zugehörige Benutzerdokumentation nur dort anpassen, wo die alte sichtbare Bezeichnung vorkommt. Erforderliche Dokumentations-Synchronisation bleibt minimal.

## Verifikation
- Geänderte Dateien: Prettier und ESLint.
- Kiosk-Komponententests, TypeScript, Kiosk-Accessibility und Produktions-Build.
- Browserprüfung mit geladenem synthetischem Demo-Datensatz bei exakt 1920×1080 und 1280×900.
- Je Größe: `innerWidth`, `scrollWidth`, `innerHeight`, `scrollHeight`, horizontaler/vertikaler Überlauf, Clipping, Console- und Page-Errors.
- Sichtprüfung, dass alle geforderten Inhalte vorhanden und bei Full HD vollständig sichtbar sind.
- Abschließender Diff-/Scope-Check auf verbotene Auth-, Datenbank-, Routing-, Vertrags- oder Integrationsänderungen.
