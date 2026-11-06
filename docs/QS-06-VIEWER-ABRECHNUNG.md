# QS-06 – Abrechnungsdaten rollenabhängig anzeigen (Befund M4)

Stand: 2026-11-03 · Status: QS6-1 bis QS6-3 umgesetzt (Paket U7, Gate vor dem ersten Publish seit 2026-11-02), QS6-4 und QS6-5 offen · Quelle: Test T9 (Alexa, Viewer)

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

| ID    | Anforderung                                                                                                                                                                                                                                | Abnahme                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| QS6-1 | Das System muss eine eigene Permission `billing.view` bereitstellen und in `docs/RBAC-MATRIX.md` dokumentieren.                                                                                                                            | Matrix und `check-rbac` grün                  |
| QS6-2 | Die Permission `billing.view` muss mindestens Systemadministrator, Administrator, Teamlead und Projektmanager erhalten; Engineer, Customer, Viewer, Kiosk nicht (Entscheidung Nutzer 2026-10-25: Engineer nein, nur Stunden; Teamlead ja). | Rollen-Matrix-Test je Rolle                   |
| QS6-3 | Die Oberfläche muss ohne `billing.view` den Reiter „Abrechnung“, die Umsatz-Kachel sowie die Spalten Satz, Betrag und Abrechnung in den Tätigkeiten ausblenden.                                                                            | Komponententest je Rolle, T9 wiederholt       |
| QS6-4 | Das System sollte Beträge auch serverseitig für Rollen ohne `billing.view` nicht ausliefern.                                                                                                                                               | Prüfbericht RLS/Projektion, ggf. Datenauftrag |
| QS6-5 | Exporte und Leistungsnachweis müssen die Beträge nach derselben Permission behandeln.                                                                                                                                                      | Test `leistungsnachweis`, `ExportSummary`     |

## 3 Risiken

- R-QS6-1: Rolle Engineer verliert die Sicht auf Beträge (entschieden, nur Stunden). Hilfetexte und Tests müssen das widerspiegeln.
- R-QS6-2: Layoutänderung in Tabellen (Spalten entfallen) kann Tests und Druckansicht brechen.
- R-QS6-3: Nur UI-Gating täuscht Sicherheit vor, wenn der Server Beträge liefert (QS6-4).

## 4 Umsetzung (Reihenfolge)

1. Entscheidung Rollenkreis (Nutzer).
2. Permission und Matrix anpassen (Claude Code, Branch, Test `check-rbac`).
3. UI-Gating mit `PermissionGate` bzw. `usePermission("billing.view")`; Tests je Rolle.
4. Serverseitige Prüfung (read-only Bericht, danach ggf. Datenauftrag nach ADR-0037).
5. Test T9 mit Alexa auf der veröffentlichten App wiederholen.

## 5 Entscheidungen

- Nutzer 2026-10-25: `engineer` sieht keine Beträge, nur Stunden. `teamlead` sieht Beträge. `customer` und `viewer` sehen keine Beträge.
- Owner 2026-11-02: QS-06 ist Gate vor dem ersten Publish; Umsetzung als Paket U7 (Neuaufbau auf aktuellem `main`, Draft-PR 222 bleibt unverändert).
- Owner 2026-11-04 (Abnahme U7, Nachweis EV-0005 in `docs/NACHWEISE.yaml`): Kiosk ist ein Anzeigemodus, keine Rolle. Das in der Abnahme genutzte Konto bm@ hat die Rolle Systemadministrator; im Anzeigemodus erscheinen keine Beträge. Befund: Im Code existiert `kiosk` weiter als Rolle (`app_role`, Migration `20260914062000_bsf_kiosk_01_add_role.sql`, `src/lib/rbac/permissions.ts`); QS6-2 und `docs/RBAC-MATRIX.md` nennen Kiosk als Rolle. Restrisiko: Ein Systemadministrator-Konto im Anzeigemodus hat außerhalb des Anzeigemodus volle Rechte einschließlich `billing.view`. Entscheidung offen (eigenes Kiosk-Konto oder Restrisiko annehmen; Begriff in QS6-2 und RBAC-Matrix angleichen).
- Offen: QS6-4 (serverseitig) und QS6-5 (Export, Leistungsnachweis).

## 6 Plan Engineer-Abnahme (A05, Entwurf 2026-11-06)

Status: Plan, Umsetzung nach Freigabe · Grundlage: Branch `docs/2026-11-06-tagesbuendel` auf `27dbcae3` (enthält `main` mit PR 273, Merge `2d3299ab`), Draft-PR 283 (`origin/fix/qs6-5-export-billing-view`, Head `4b82a0a1`, CI 15 von 15 grün) · Bezug: EV-0005 (Einschränkung „Rolle Engineer nicht geprüft“), QS6-2, QS6-3, QS6-5

### 6.1 Rolle und Erwartung

- Fachliche Rolle Engineer heißt technisch `engineer`, Anzeigename „Systemingenieur“ (`src/lib/user-management.ts:49`). Demo-Konten Alex und Sam haben diese Rolle (`docs/DEMO-USERS.md:17`, `docs/DEMO-DATA.md:69-70`).
- `engineer` hat **kein** `billing.view` (`src/lib/rbac/permissions.ts:202-210`; Matrix `docs/RBAC-MATRIX.md:49`). Entscheidung Nutzer 2026-10-25: nur Stunden (Abschnitt 5).
- Unterschied zum Viewer: `engineer` hat `activity.edit` und `workpackage.edit` (eigene Datensätze, `src/lib/rbac/permissions.ts:16-19`, `:205-206`). Dadurch erreicht der Engineer den Tätigkeitsdialog, den der Viewer nicht sieht. Ohne `azure.export` fehlt der Menüpunkt „Import / Export…“ (`src/components/dashboard/header/ServiceMenu.tsx:194-204`).
- E2E-Seed-Rolle: `engineer` (`e2e/fixtures/supabase-e2e.ts:26-34`, UUID `:53`).

### 6.2 Prüfpunkte Engineer

| Nr. | Punkt (EV-0005)                    | Erwartung Engineer                                                                                         | Komponente, `billing.view`-Prüfung                                                                                                                                                           | Stand am Code (`27dbcae3`)                                                |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| P1  | Startseite                         | Keine Kachel „Umsatz gesamt“ (auch nicht „noch offen“); Stunden-Kacheln sichtbar                           | `src/routes/_authenticated/dashboard.tsx:256`, `:803-811`                                                                                                                                    | erfüllt                                                                   |
| P2  | Tab-Leiste                         | Kein Reiter „Abrechnung“; Inhalt `BillingView` nicht erreichbar                                            | `src/routes/_authenticated/dashboard.tsx:858-866`, `:983`                                                                                                                                    | erfüllt                                                                   |
| P3  | Projektdetail                      | Keine KPI „Abrechenbarer Betrag“; Tätigkeitstabelle ohne Spalten „Betrag“, „Abrechnung“; Stunden sichtbar  | `src/components/dashboard/views/ProjectDetailView.tsx:106`, `:212-214`, `:314-319`, `:341-348`                                                                                               | erfüllt                                                                   |
| P4  | Projektbericht (AVKK)              | Bericht sichtbar (Engineer hat `avkk.view`), ohne Beträge                                                  | Schalter `ProjectDetailView.tsx:183-192` (`avkk.view`); Berichtsdefinition `src/lib/report/definitions/avkk.ts` ohne Betragsfelder                                                           | erfüllt (Bericht enthält strukturell keine Beträge)                       |
| P5  | Tätigkeiten (Liste)                | Spalten Satz, Betrag, Abrechnung und Filter Abrechnungsstatus fehlen; Hinweis „Abrechnung erfolgt …“ fehlt | `src/components/dashboard/views/ActivitiesView.tsx:49`, `:82`, `:108-121`, `:141-147`, `:189-208`, `:235`; Übergabe `dashboard.tsx:980`                                                      | erfüllt                                                                   |
| P6  | Tätigkeiten (Dialog Neu/Bearbeit)  | Kein Feld „Stundensatz (€)“, kein Betrag, ggf. kein Abrechnungsstatus                                      | `src/components/dashboard/dialogs/ActivityDialog.tsx:33`, `:133-150`, `:174-195`, `:206-211`: **keine** `billing.view`-Prüfung; Vorgabe 145 €/h aus `src/components/dashboard/domain.ts:105` | **Lücke (neuer Befund):** Engineer sieht Stundensatz und Betrag im Dialog |
| P7  | Abrechnung                         | Nicht erreichbar (siehe P2)                                                                                | `dashboard.tsx:983`                                                                                                                                                                          | erfüllt                                                                   |
| P8  | Export „Export…“ (CSV/Excel/PDF)   | Ohne Stundensatz, Betrag und Gesamtbetrag; Vorschau ohne „Gesamtbetrag“                                    | auf `main` keine Prüfung; PR 283: `src/hooks/useExportDialog.ts` (`usePermission("billing.view")`), `src/components/export/ExportSummary.tsx`, `src/lib/pdf-export.ts`                       | **offen bis Merge PR 283** (QS6-5)                                        |
| P9  | Export „Vollständiges JSON-Backup“ | Erwartung offen (Owner): ohne Sätze oder als eigene Sicherung erlaubt                                      | Schalter `src/components/ExportDialog.tsx:261-271`, Funktion `dashboard.tsx:335-352` (`activities` vollständig), Übergabe `dashboard.tsx:1168`; in PR 283 unverändert                        | **Lücke (neuer Befund):** enthält `hourlyRate` je Tätigkeit               |
| P10 | Export „Import / Export…“ (JSON)   | Menüpunkt fehlt (kein `azure.export`)                                                                      | `ServiceMenu.tsx:194`; PR 283 zusätzlich `src/components/ImportExportDialog.tsx` (`includeBilling`)                                                                                          | erfüllt (nicht erreichbar)                                                |

Hinweis: In der Lovable-Vorschau stammen Sätze und Beträge nur aus dem Browser-Speicher bzw. den Demodaten; der Server liefert keine Beträge (`docs/BERICHT-QS6-4-ANALYSE.md`, Ergebnis 1 und 3). Die Abnahme ist deshalb eine reine Oberflächen- und Exportprüfung.

### 6.3 E2E-Abdeckung und Lücken

Vorhandene Tests mit Bezug zu `billing.view`:

- E2E `e2e/specs/rbac/qs06-billing-view.spec.ts:7-31` (auf `main`): Kachel und Reiter je Rolle. Lokal am 2026-11-06 auf `27dbcae3` ausgeführt: 7 von 7 bestanden (1,3 min, Chromium, einschließlich Kaltstart des Dev-Servers).
- E2E PR 283, gleiche Datei, neue Blöcke (Diff `origin/main...origin/fix/qs6-5-export-billing-view`): CSV-Export für `viewer`, `engineer` ohne, `teamlead` mit Satz und Betrag.
- E2E `e2e/specs/kiosk/kiosk-internal.spec.ts:33`: Kiosk ohne „EUR“/„€“.
- E2E `e2e/specs/rbac/role-matrix.spec.ts:19-29`: Rollenmatrix für Startpfad und Service-Menü, ohne Beträge.
- Unit `src/__tests__/security/qs06-billing-view-permission.test.ts:26-42`: ALLOW/DENY je Rolle, Backend-RBAC deckungsgleich.
- Komponente `src/__tests__/components/crud-view-gating.test.tsx` (Fall `should_hideAmountColumns_when_noBillingPermission`): Tätigkeitsliste ohne Spalten, nur Schalter `canViewBilling=false`, keine Rolle.
- PR 283: `src/__tests__/security/qs6-5-export-billing.test.ts` (Export-DTO, PDF, Text, JSON).

Matrix (E = E2E, U = Unit/Komponente, — = Lücke). Rollen: SA Systemadministrator, AD Administrator, TL Teamlead, PM Projektmanager, EN Engineer, CU Customer, VI Viewer.

| Punkt                     | SA                   | AD                  | TL                  | PM                  | EN                   | CU                  | VI                  |
| ------------------------- | -------------------- | ------------------- | ------------------- | ------------------- | -------------------- | ------------------- | ------------------- |
| P1 Startseite             | E `qs06…spec.ts:15`  | E `qs06…spec.ts:15` | E `qs06…spec.ts:15` | E `qs06…spec.ts:15` | E `qs06…spec.ts:27`  | E `qs06…spec.ts:27` | E `qs06…spec.ts:27` |
| P2 Tab-Leiste             | E `qs06…spec.ts:16`  | E `qs06…spec.ts:16` | E `qs06…spec.ts:16` | E `qs06…spec.ts:16` | E `qs06…spec.ts:28`  | E `qs06…spec.ts:28` | E `qs06…spec.ts:28` |
| P3 Projektdetail          | —                    | —                   | —                   | —                   | —                    | —                   | —                   |
| P4 Projektbericht         | —                    | —                   | —                   | —                   | —                    | — (kein Schalter)   | —                   |
| P5 Tätigkeiten Liste      | —                    | —                   | —                   | —                   | — (nur U ohne Rolle) | — (nur U)           | — (nur U)           |
| P6 Tätigkeitsdialog       | —                    | —                   | —                   | —                   | — (Lücke im Code)    | n. a. (kein Recht)  | n. a. (kein Recht)  |
| P7 Abrechnung (Inhalt)    | — (nur Reiter)       | — (nur Reiter)      | — (nur Reiter)      | — (nur Reiter)      | indirekt über P2     | indirekt über P2    | indirekt über P2    |
| P8 Export CSV             | —                    | —                   | E PR 283 (nur Kopf) | —                   | E PR 283             | —                   | E PR 283            |
| P8 Export PDF/Excel       | U PR 283             | U PR 283            | U PR 283            | U PR 283            | U PR 283             | U PR 283            | U PR 283            |
| P9 JSON-Backup            | —                    | —                   | —                   | —                   | —                    | —                   | —                   |
| P10 Import / Export… JSON | — (Menü nur E Rolle) | —                   | —                   | —                   | —                    | —                   | —                   |

Ergebnis: Für Engineer sind nur P1 und P2 per E2E belegt, P8 (CSV) nur im Draft-PR 283. P3 bis P6 und P9 sind für keine Rolle per E2E abgedeckt.

### 6.4 Testfälle QS6-E2E

Spec-Datei: neu `e2e/specs/rbac/qs06-billing-view-matrix.spec.ts` (keine Änderung an `qs06-billing-view.spec.ts`, um Konflikte mit Draft-PR 283 zu vermeiden). Rollenkreise: `MIT` = `systemadministrator`, `administrator`, `teamlead`, `projectmanager`; `OHNE` = `engineer`, `viewer`, `customer`. `kiosk` bleibt bei `e2e/specs/kiosk/kiosk-internal.spec.ts`. Fixture `e2e/fixtures/test-instance.ts` (`test.use({ role })`) genügt, Demodaten liefern Tätigkeiten mit Sätzen 135 bis 145 €/h.

| ID         | Punkt | Seed-Rollen                         | Schritte                                                                                                 | Erwartung MIT                                                            | Erwartung OHNE                                                                | Stand                        |
| ---------- | ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------- |
| QS6-E2E-01 | P1    | alle 7                              | `/dashboard` öffnen                                                                                      | Kachel „Umsatz gesamt“ sichtbar                                          | Kachel fehlt, „Offene Arbeitspakete“ sichtbar                                 | vorhanden (`qs06…:13-29`)    |
| QS6-E2E-02 | P2    | alle 7                              | `/dashboard` öffnen                                                                                      | Schalter „Abrechnung“ sichtbar, Klick zeigt Abrechnungsinhalt            | Schalter fehlt                                                                | vorhanden, Klick neu         |
| QS6-E2E-03 | P5    | alle 7                              | Reiter „Tätigkeiten“ (`/^Tätigkeiten/`) öffnen                                                           | Spaltenköpfe „Satz“, „Betrag“, „Abrechnung“, Filter Abrechnungsstatus da | Spaltenköpfe fehlen, „Dauer“ sichtbar, Filter fehlt                           | neu                          |
| QS6-E2E-04 | P3    | alle 7                              | Reiter „Projekte“, erstes `getByTitle("Projekt öffnen")`                                                 | KPI „Abrechenbarer Betrag“ und Spalten „Betrag“, „Abrechnung“ sichtbar   | KPI und Spalten fehlen, „Ist-Aufwand“ sichtbar                                | neu                          |
| QS6-E2E-05 | P4    | alle außer `customer` (`avkk.view`) | Projektdetail, „Projektbericht“ öffnen                                                                   | Bericht ohne „€“/„EUR“ (Bericht hat keine Beträge)                       | wie MIT; `customer`: Schalter fehlt                                           | neu                          |
| QS6-E2E-06 | P6    | MIT, `engineer` (`activity.edit`)   | Reiter „Tätigkeiten“, „Neu“; zweiter Lauf: erstes „Bearbeiten“; danach „Abbrechen“                       | Feld „Stundensatz (€)“ und „Betrag:“ sichtbar                            | `engineer`: Feld und Betrag fehlen; `viewer`/`customer`: Schalter „Neu“ fehlt | neu, für EN rot bis Fix      |
| QS6-E2E-07 | P8    | alle 7                              | „Einstellungen und Services“ → „Export…“, CSV, Monat 2026-05, Download lesen                             | Kopf enthält `hourlyRate;amountEur`                                      | Kopf ohne `hourlyRate`/`amountEur`, keine Satzwerte                           | PR 283 (3 Rollen), erweitern |
| QS6-E2E-08 | P8    | `engineer`, `teamlead`              | wie 07, Format PDF bzw. Vorschau im Dialog                                                               | Vorschau zeigt „Gesamtbetrag“                                            | Vorschau ohne „Gesamtbetrag“ und ohne „€“                                     | neu, nach PR 283             |
| QS6-E2E-09 | P9    | `engineer`, `teamlead`              | „Export…“ → „Vollständiges JSON-Backup“, Download lesen                                                  | `hourlyRate` enthalten                                                   | nach Owner-Entscheidung (F-QS6-ENG-02): kein `hourlyRate` oder Schalter fehlt | neu, nach Entscheidung       |
| QS6-E2E-10 | P10   | alle 7                              | Service-Menü öffnen                                                                                      | „Import / Export…“ nur bei `azure.export` (SA, AD, TL, PM)               | Menüpunkt fehlt                                                               | neu                          |
| QS6-E2E-11 | P1–P5 | OHNE                                | Reiter Projekte, Arbeitspakete, Tätigkeiten, ein Projektdetail nacheinander; Seitentext je Ansicht lesen | entfällt                                                                 | kein Treffer auf Betragsmuster `/\d[\d.]*,\d{2}\s?€/`                         | neu (Sammelprüfung)          |

### 6.5 Aufwand und Risiko

| Paket                                                                 | Aufwand (h)  | Risiko                                                                                                                                                                             |
| --------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec QS6-E2E-02 bis -05, -10, -11 (ohne Code-Fix)                     | 3 bis 4      | niedrig bis mittel: Selektoren (Tab-Beschriftung mit Zählern, `getByTitle`), Sammelprüfung -11 kann an anderen €-Texten falsch anschlagen                                          |
| QS6-E2E-06 und Fix `ActivityDialog` (`usePermission("billing.view")`) | 2 bis 3      | mittel: Fix ändert Formular; ohne Satzfeld muss der Satz beim Speichern erhalten bleiben bzw. aus dem Bestand kommen (keine stille Änderung auf 0 oder 145); Komponententest nötig |
| QS6-E2E-07/-08 auf alle Rollen erweitern (nach Merge PR 283)          | 1 bis 2      | niedrig: Download-Lesen ist in PR 283 erprobt                                                                                                                                      |
| QS6-E2E-09 und ggf. Fix JSON-Backup                                   | 1 bis 2      | niedrig, abhängig von Owner-Entscheidung                                                                                                                                           |
| Doku (Tracker, EV-0005 ergänzen bzw. neues EV, Handbuch, CHANGELOG)   | 1            | niedrig                                                                                                                                                                            |
| **Summe**                                                             | **8 bis 12** |                                                                                                                                                                                    |

Laufzeit: rund 60 neue Fälle (11 Testfälle × bis zu 7 Rollen). Bei etwa 5 bis 10 s je Fall rund 5 bis 10 min lokal (Messwert: 7 Fälle in 1,3 min inklusive Kaltstart).

Risiken:

- R-A05-1 Kaltstart: Erster Test nach Start des Dev-Servers (`playwright.config.ts:65-66`, `bun run dev`) kann wegen Kompilierzeit in Zeitlimits laufen. Laut Auftraggeber sind lokal `a11y`, `error-states` und `dashboard`-Starttests auch auf `main` rot (nicht nachgeprüft). Gegenmaßnahme: Warten auf „Offene Arbeitspakete“ als Bereitschaftsanker vor jeder Prüfung, kein festes `waitForTimeout`; Bewertung nur mit CI-Lauf als Beleg.
- R-A05-2 Datumsabhängigkeit: Tätigkeiten-Reiter zeigt Zeitraumzähler; Prüfungen auf Spaltenköpfe statt Zeilenwerte machen die Tests unabhängig vom aktuellen Monat.
- R-A05-3 Konflikt mit Draft-PR 283: gleiche Spec-Datei; deshalb neue Datei, QS6-E2E-07/-08 erst nach Merge von PR 283.
- R-A05-4 Rot geplante Fälle: QS6-E2E-06 (Engineer) und -09 schlagen bis zum Fix fehl. Sie dürfen nicht mit `test.skip` versteckt werden; zulässig ist `test.fail()` mit Verweis auf den Befund bis zum Fix im selben PR.
- R-A05-5 Lovable-Vorschau vs. E2E: E2E nutzt synthetische Sitzung und Demodaten (`e2e/fixtures/supabase-e2e.ts`), nicht das Teamdaten-Konto. Die Handliste (6.6) bleibt als Nachweis der Vorschau nötig.

### 6.6 Handliste Owner QS6-ENG (Lovable-Vorschau)

Vorbedingungen: Lovable-Vorschau des aktuellen `main` (Version im Hilfe-Fenster notieren), Konto alex@ (alternativ sam@, gleiche Rolle `engineer`). Keine Daten speichern: Dialoge immer mit „Abbrechen“ schließen. Je Punkt ein Screenshot mit sichtbarem Datum (Taskleiste oder Dateiname `JJJJ-MM-TT_QS6-ENG-NN`).

| ID         | Schritt                                                                                      | Erwartung                                                                                                                                                                 | Ergebnis (bestanden / nicht bestanden / Befund) | Beleg (Screenshot, Datum) |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------- |
| QS6-ENG-01 | Mit alex@ anmelden, Benutzermenü bzw. Kopfzeile prüfen, Version notieren                     | Rolle „Systemingenieur“ angezeigt, Startseite `/dashboard` geladen                                                                                                        |                                                 |                           |
| QS6-ENG-02 | Startseite: Kennzahl-Kacheln ansehen                                                         | Keine Kachel „Umsatz gesamt“ und kein „… noch offen“; Kacheln mit Stunden sichtbar                                                                                        |                                                 |                           |
| QS6-ENG-03 | Tab-Leiste ansehen                                                                           | Kein Reiter „Abrechnung“                                                                                                                                                  |                                                 |                           |
| QS6-ENG-04 | Reiter „Tätigkeiten“ öffnen                                                                  | Spalten Datum, Tätigkeit, Zuordnung, Dauer; keine Spalten Satz, Betrag, Abrechnung; kein Filter „Alle Abr.-Status“; kein Hinweis „Abrechnung erfolgt ausschließlich hier“ |                                                 |                           |
| QS6-ENG-05 | In „Tätigkeiten“ auf „Neu“ klicken, Dialog ansehen, „Abbrechen“                              | Soll: kein Feld „Stundensatz (€)“, keine Zeile „Betrag:“. Laut Code erwartet: Feld mit 145 und Betrag sichtbar (F-QS6-ENG-01)                                             |                                                 |                           |
| QS6-ENG-06 | Eine eigene Tätigkeit mit Stift „Bearbeiten“ öffnen, „Abbrechen“                             | wie QS6-ENG-05                                                                                                                                                            |                                                 |                           |
| QS6-ENG-07 | Reiter „Projekte“, ein Projekt mit „Projekt öffnen“ aufrufen                                 | Kennzahlen ohne „Abrechenbarer Betrag“; „Abrechenbar … h“ sichtbar; Tätigkeitstabelle ohne Betrag und Abrechnung                                                          |                                                 |                           |
| QS6-ENG-08 | Im Projektdetail „Projektbericht“ öffnen (wie EV-0005: SYSING-102 V1.0.0)                    | Bericht öffnet; keine Beträge, kein „€“                                                                                                                                   |                                                 |                           |
| QS6-ENG-09 | Service-Menü „Einstellungen und Services“ öffnen                                             | „Export…“ und „Berichte…“ sichtbar; kein „Import / Export…“, kein „Backup“                                                                                                |                                                 |                           |
| QS6-ENG-10 | „Export…“, Format CSV, Monat mit Tätigkeiten, Vorschau ansehen, Datei speichern und öffnen   | Vor Merge PR 283: Satz und Betrag enthalten (bekannter Befund QS6-5). Nach Merge: keine Spalten `hourlyRate`, `amountEur`, Vorschau ohne „Gesamtbetrag“                   |                                                 |                           |
| QS6-ENG-11 | „Export…“, Format PDF, Datei öffnen                                                          | Nach Merge PR 283: keine Spalte „Betrag“, kein „Gesamtbetrag“                                                                                                             |                                                 |                           |
| QS6-ENG-12 | „Export…“ → „Vollständiges JSON-Backup“, Datei in einem Editor nach `hourlyRate` durchsuchen | Erwartung offen (F-QS6-ENG-02); Treffer dokumentieren                                                                                                                     |                                                 |                           |
| QS6-ENG-13 | „Berichte…“ öffnen, angebotene Berichte ansehen                                              | Keine Beträge; kein Leistungsnachweis zur Verwaltung (`performance.statement.manage` fehlt)                                                                               |                                                 |                           |
| QS6-ENG-14 | Stichprobe mit sam@: QS6-ENG-02 bis -04                                                      | wie mit alex@                                                                                                                                                             |                                                 |                           |

Ergebnis wird als neuer Nachweis (z. B. EV-0007) oder als Ergänzung von EV-0005 in `docs/NACHWEISE.yaml` eingetragen; die Einschränkung „Rolle Engineer nicht geprüft“ entfällt erst mit Beleg.

### 6.7 Befunde und offene Fragen

Befunde aus der Planung (vorläufig, Bestätigung durch QS6-ENG-05/-06 und -12):

- F-QS6-ENG-01: Der Tätigkeitsdialog zeigt ohne Prüfung von `billing.view` das Feld „Stundensatz (€)“ (Vorgabe 145), den Abrechnungsstatus und den Betrag (`src/components/dashboard/dialogs/ActivityDialog.tsx:133-150`, `:174-195`, `:206-211`). Betroffen ist nur der Engineer, weil er als einzige Rolle ohne `billing.view` `activity.edit` hat. Weder PR 273 noch PR 283 ändern die Datei.
- F-QS6-ENG-02: „Vollständiges JSON-Backup“ im Dialog „Export…“ schreibt alle Tätigkeiten mit `hourlyRate` (`src/routes/_authenticated/dashboard.tsx:335-352`, `:1168`; `src/components/ExportDialog.tsx:261-271`) und ist für jede Rolle mit Dashboard erreichbar. Nicht in der Pfadtabelle von `docs/BERICHT-QS6-4-ANALYSE.md` und in PR 283 unverändert.

Offene Fragen an den Owner:

1. Soll der Engineer im Tätigkeitsdialog den Abrechnungsstatus („abrechenbar“ ja/nein) weiter setzen dürfen, nur ohne Satz und Betrag? Woher kommt dann der Satz neuer Tätigkeiten (Vorgabe, Projekt, Person)?
2. F-QS6-ENG-02: Gilt das JSON-Backup als Sicherung eigener Daten (erlaubt, analog Backup) oder als Export (Sätze ohne `billing.view` entfernen bzw. Schalter ausblenden)?
3. Sollen die Fixes zu F-QS6-ENG-01/-02 in PR 283 (QS6-5) aufgenommen werden oder als eigenes Paket nach dessen Merge?
4. Reicht die Abnahme mit alex@ und einer Stichprobe mit sam@, oder ist sam@ vollständig zu prüfen (vgl. EV-0003 „Sam nicht geprüft“)?
5. Ist die E2E-Matrix (QS6-E2E-01 bis -11) Abnahmekriterium für QS6-2/QS6-3 („Rollen-Matrix-Test je Rolle“), sodass EV-0005 danach auf „bestanden“ für alle Rollen gesetzt werden darf?
