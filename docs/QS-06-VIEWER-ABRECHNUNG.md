# QS-06 – Abrechnungsdaten rollenabhängig anzeigen (Befund M4)

Stand: 2026-10-25 · Status: Analyse abgeschlossen, Umsetzung nach dem Golden Gate (vor BSF-06) · Quelle: Test T9 (Alexa, Viewer)

## 1 Befund

Die Rolle `viewer` sieht im Dashboard Abrechnungsdaten, obwohl sie laut RBAC-Matrix nur lesende Basisrechte hat.

| Stelle                                | Datei                                               | Absicherung heute                                |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Kachel „Umsatz gesamt“ / „noch offen“ | `src/routes/_authenticated/dashboard.tsx` (≈ 796)   | keine Permission-Prüfung                         |
| Reiter „Abrechnung“                   | `src/routes/_authenticated/dashboard.tsx` (≈ 849)   | keine Permission-Prüfung (`TabButton` ohne Gate) |
| Inhalt Abrechnung                     | `src/components/dashboard/views/BillingView.tsx`    | nur `canEdit` für Schreibaktionen                |
| Spalten Satz, Betrag, Abrechnung      | `src/components/dashboard/views/ActivitiesView.tsx` | nur `canEdit` für Schreibaktionen                |

Ursache: In `src/lib/rbac/permissions.ts` gibt es keine Permission für Abrechnungsdaten. `viewer` und `customer` haben `dashboard.view` und sehen deshalb alles, was nicht eigens gegated ist. `engineer` ist gleichermaßen betroffen.

Einordnung: Im Test sind es lokale Demodaten im Browser. Bei Team-Daten (Datenbank) muss zusätzlich geprüft werden, ob Beträge serverseitig (RLS bzw. Projektion) für diese Rollen gefiltert werden. Das ist ausdrücklich Teil der Umsetzung, nicht des Golden Gate.

## 2 Anforderungen (SMART)

| ID    | Anforderung                                                                                                                                                                                      | Abnahme                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| QS6-1 | Das System muss eine eigene Permission `billing.view` bereitstellen und in `docs/RBAC-MATRIX.md` dokumentieren.                                                                                  | Matrix und `check-rbac` grün                  |
| QS6-2 | Die Permission `billing.view` muss mindestens Systemadministrator, Administrator, Teamlead und Projektmanager erhalten; Engineer, Customer, Viewer, Kiosk nicht (Entscheidung Nutzer steht aus). | Rollen-Matrix-Test je Rolle                   |
| QS6-3 | Die Oberfläche muss ohne `billing.view` den Reiter „Abrechnung“, die Umsatz-Kachel sowie die Spalten Satz, Betrag und Abrechnung in den Tätigkeiten ausblenden.                                  | Komponententest je Rolle, T9 wiederholt       |
| QS6-4 | Das System sollte Beträge auch serverseitig für Rollen ohne `billing.view` nicht ausliefern.                                                                                                     | Prüfbericht RLS/Projektion, ggf. Datenauftrag |
| QS6-5 | Exporte und Leistungsnachweis müssen die Beträge nach derselben Permission behandeln.                                                                                                            | Test `leistungsnachweis`, `ExportSummary`     |

## 3 Risiken

- R-QS6-1: Rolle Engineer verliert die Sicht auf eigene Beträge. Das ist fachlich zu entscheiden (Frage unten).
- R-QS6-2: Layoutänderung in Tabellen (Spalten entfallen) kann Tests und Druckansicht brechen.
- R-QS6-3: Nur UI-Gating täuscht Sicherheit vor, wenn der Server Beträge liefert (QS6-4).

## 4 Umsetzung (Reihenfolge)

1. Entscheidung Rollenkreis (Nutzer).
2. Permission und Matrix anpassen (Claude Code, Branch, Test `check-rbac`).
3. UI-Gating mit `PermissionGate` bzw. `usePermission("billing.view")`; Tests je Rolle.
4. Serverseitige Prüfung (read-only Bericht, danach ggf. Datenauftrag nach ADR-0037).
5. Test T9 mit Alexa auf der veröffentlichten App wiederholen.

## 5 Offene Fragen

- Soll `engineer` Beträge sehen (eigene Tätigkeiten)? Empfehlung: nein, nur Stunden.
- Soll `teamlead` Beträge sehen? Empfehlung: ja.
