# Risikoregister Golden Gate

Stand: 2026-11-07 (Bewertung vom 2026-11-02 unverändert; A40: Hinweis R-04, RA-02, Annahme AN-01) · Daten: `docs/RISIKOREGISTER.yaml` (führend für Bewertung) · Texte zu R-01 bis R-14: Tracker, Abschnitt `risiken` · Status: **Bewertung vom Owner am 2026-11-02 bestätigt** (R-04, R-11, R-07 und R-14 einzeln, die übrigen nach der vereinbarten Regel)

## 1 Methode

- Wahrscheinlichkeit `w` und Auswirkung `a` je 1 bis 5; Score = `w` × `a`. Stufen: **hoch** ab 15, **mittel** 8 bis 14, **niedrig** bis 7.
- Die Bewertung ist eine Einschätzung (Analogie, keine Messung). Der Owner hat sie am 2026-11-02 bestätigt (`bestaetigt_durch_owner: true`); Änderungen sind jederzeit möglich.
- Die Spalte SPoF kennzeichnet einen Single Point of Failure, FuSi einen Bezug zur funktionalen Sicherheit (falsche oder unberechtigte Anzeige, Datenverlust).
- Prüfrhythmus: bei jedem Tagesabschluss Status und nächste Prüfung ansehen; Neubewertung nach jedem gemergten L2-Schritt und bei jeder Antwort des Lovable-Supports.

## 2 Rangfolge

| ID    | Risiko                                                                                                                 | w   | a   | Score | Stufe   | Status            | SPoF | FuSi | Nächste Prüfung |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | --- | --- | ----- | ------- | ----------------- | ---- | ---- | --------------- |
| R-04  | Einzelner Betreiber als SPoF für Freigaben und Supabase-Zugriff                                                        | 4   | 5   | 20    | hoch    | offen             | ja   | –    | 2026-11-09      |
| R-11  | Terminrisiko durch knappe Kapazität des Betreibers                                                                     | 4   | 4   | 16    | hoch    | offen             | ja   | –    | 2026-11-09      |
| R-07  | Lovable erzeugt den verbotenen Auth-Storage-Broker bei jeder Arbeitskopie neu                                          | 3   | 5   | 15    | hoch    | offen             | ja   | –    | 2026-11-05      |
| R-14  | Kein Nachweis für Wiederherstellung von Daten, Konfiguration und Schema                                                | 3   | 5   | 15    | hoch    | offen             | ja   | ja   | 2026-11-09      |
| L2-R3 | Fehlende Daten wirken wie „alles in Ordnung“                                                                           | 3   | 4   | 12    | mittel  | offen             | –    | ja   | 2026-11-02      |
| R-01  | Lovable-Basis divergiert erneut von GitHub                                                                             | 4   | 3   | 12    | mittel  | beherrscht        | –    | –    | 2026-11-02      |
| R-03  | Cockpit ist größter noch nicht begonnener Block                                                                        | 3   | 4   | 12    | mittel  | in_arbeit         | –    | –    | 2026-11-02      |
| R-12  | Abhängigkeit von der Lovable-Plattform (Credits, Plattform-Änderungen, Sync-Dialoge)                                   | 4   | 3   | 12    | mittel  | beobachten        | ja   | –    | 2026-11-09      |
| L2-R1 | Zweite Rechte- oder KPI-Logik im Composer                                                                              | 2   | 5   | 10    | mittel  | beherrscht        | –    | ja   | 2026-11-02      |
| L2-R2 | Beträge ohne billing.view angezeigt (QS-06 offen)                                                                      | 2   | 5   | 10    | mittel  | beherrscht        | –    | ja   | 2026-11-02      |
| R-02  | Unwiderrufliche Datenbankmigrationen                                                                                   | 2   | 5   | 10    | mittel  | beherrscht        | –    | ja   | 2026-11-09      |
| L2-R4 | Publish-Weg unklar: Code ohne Auslieferung                                                                             | 3   | 3   | 9     | mittel  | beobachten        | –    | –    | 2026-11-05      |
| R-06  | Gemeinsame Projektion ohne Bedienweg bleibt leer                                                                       | 3   | 3   | 9     | mittel  | beobachten        | –    | –    | 2026-11-02      |
| R-09  | Kein Bereitstellungspfad für die erste Systemhaus-Mitgliedschaft; Mandantentabellen live leer                          | 3   | 3   | 9     | mittel  | beobachten        | –    | –    | 2026-11-16      |
| R-10  | Migrationshistorie der Live-Datenbank hat Lücken (20260913213000, 20260917182000, 20260917190000) und leere Statements | 3   | 3   | 9     | mittel  | wartet_auf_dritte | –    | –    | 2026-11-05      |
| L2-R5 | Single Point of Failure im Server-Read                                                                                 | 2   | 4   | 8     | mittel  | offen             | ja   | ja   | 2026-11-02      |
| R-05  | Gelesene PASS-Statusanzeigen ohne Evidenz                                                                              | 2   | 3   | 6     | niedrig | beherrscht        | –    | –    | 2026-11-09      |
| R-13  | Branch-Wildwuchs erschwert Überblick und Aufräumen                                                                     | 3   | 2   | 6     | niedrig | beobachten        | –    | –    | 2026-11-09      |
| R-08  | Live-Datenbank weicht von den Migrationen ab (FK reference_value_history_systemhouse_fk)                               | 1   | 3   | 3     | niedrig | geschlossen       | –    | –    | –               |

## 3 Matrix (nur offene und beobachtete Risiken)

```mermaid
quadrantChart
    title Risiken nach Wahrscheinlichkeit und Auswirkung
    x-axis Wahrscheinlichkeit niedrig --> hoch
    y-axis Auswirkung niedrig --> hoch
    quadrant-1 sofort handeln
    quadrant-2 absichern
    quadrant-3 beobachten
    quadrant-4 begrenzen
    R-01: [0.7, 0.5]
    R-02: [0.3, 0.9]
    R-03: [0.5, 0.7]
    R-04: [0.7, 0.9]
    R-05: [0.3, 0.5]
    R-06: [0.5, 0.5]
    R-07: [0.5, 0.9]
    R-09: [0.5, 0.5]
    R-10: [0.5, 0.5]
    R-11: [0.7, 0.7]
    R-12: [0.7, 0.5]
    R-13: [0.5, 0.3]
    R-14: [0.5, 0.9]
    L2-R1: [0.3, 0.9]
    L2-R2: [0.3, 0.9]
    L2-R3: [0.5, 0.7]
    L2-R4: [0.5, 0.5]
    L2-R5: [0.3, 0.7]
```

## 4 Einordnung

**Single Points of Failure:** R-04 (Einzelbetreiber), R-07 (Publish-Weg und Auth-Broker nur über den Lovable-Support klärbar), R-11 (Kapazität des Betreibers), R-12 (Lovable-Plattform), R-14 (keine Wiederherstellungsprobe), L2-R5 (Server-Read). R-04 und R-11 hängen zusammen: Fällt der Owner aus, stehen Freigaben, Merges und Datenaufträge still.

**Hinweis R-04 (2026-11-04):** Der Datenauftrag Kiosk-Konto weicht von ADR-0037 ab. Der Owner gibt beide Stufen allein frei; die nachträgliche Bestätigung durch eine zweite Person ist offen (`docs/DATENAUFTRAG-KIOSK-KONTO.md`). Mails an kiosk@ erreichen nur den Owner.

**Hinweis R-04 (2026-11-06):** Zugänge, zweite berechtigte Person und Notfallkonto je Dienst stehen ohne Werte in `docs/ZUGAENGE-UND-NOTFALLKONTO.md` (Entwurf, A09; Prüfliste ZN-01 bis ZN-18, REST-20, REST-21, N7, N9). Stand: für keinen Dienst ist eine zweite Person oder ein Notfallkonto belegt; Wiederherstellungsadressen sind offen; Auth-Mails der App-Konten und der Aliase kiosk@ und anzeige@ erreichen nur das Postfach info@. RTO-Werte nach ADR-0042 gelten bis dahin nur bei Verfügbarkeit des Owners.

**Hinweis R-04 (2026-11-07):** Der Owner hat eine zweite Vertrauensperson in der Rolle Familie/Lebenspartner benannt (Entscheidung des Owners 2026-11-07, Planer-Auftrag A40). Der Name steht nur im Notfallumschlag, nicht im Git. Umschlag und Zugang sind offen (`docs/NOTFALL-HANDBUCH.md`, Lücke 2); die ADR-0037-Abweichung kiosk@ bleibt offen, bis diese Person sie bestätigt (ZN-18). Die Bewertung bleibt unverändert.

**Hinweis R-07 und R-10 (2026-11-06):** Der Lovable-Support hat am 2026-11-06 geantwortet (EV-0008 in `docs/NACHWEISE.yaml`): Die Änderung der Speicherzeile in `client.ts` wirkte, der Auth-Storage-Helper kam nach der README-Änderung nicht zurück. Die inhaltliche Antwort zu den Migrationsversionen (20260913213000, 20260917182000, 20260917190000) und den leeren Statements ist zugesagt und offen. Die Bewertung bleibt unverändert, bis die Antwort vorliegt. Ergänzung A29: Ob Lovable beim Publish oder Sync Repo-Migrationen anwendet, ist nicht belegt; `20260917182000` wäre bei Anwendung kein No-Op. Die Frage steht als Frage 6 im Lese-Prompt (`docs/LOVABLE-PUBLISH-PRUEFUNG.md`).

**Funktionale Sicherheit:** R-02 (unwiderrufliche Migrationen), R-14 (Daten nicht wiederherstellbar nachgewiesen), L2-R1, L2-R2, L2-R3 und L2-R5 (falsche oder unberechtigte Anzeige im Cockpit). Gegenmaßnahmen sind die RED-Testmatrix und die Sicherheitstests aus U2 und U3 (Voraussetzung für Entscheidung E2).

**Schwerpunkte der nächsten sieben Tage:**

1. R-07/R-10: inhaltliche Antwort des Lovable-Supports abwarten (Erstantwort 2026-11-06, EV-0008); Publish bleibt No-Go.
2. R-03/L2-R3/L2-R5: Sicherheitstests und RED-Fälle in U2 und U3 mit Beleg.
3. R-04/R-11: Betreiberhoheit (BSF-06) als Konzept einplanen; zweite berechtigte Person benennen und offene Felder in `docs/ZUGAENGE-UND-NOTFALLKONTO.md` füllen; Tempo nach drei L2-Schritten neu messen.

## 5 Risikoakzeptanzen

| ID    | Risiko                                                                     | Entscheidung                                                                   | Quelle                                                      | Frist                           | Gate | Status     |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------- | ---- | ---------- |
| RA-01 | `zod@3.25.76` im Server-Code (GHSA-mrhx-c7xc-m3w5, hoch), behoben in 4.6.6 | befristet akzeptiert bis nach dem Publish 1.70.0                               | Entscheidung des Owners 2026-11-06 (Planer-Auftrag A28, D3) | nach dem Publish 1.70.0         | G13  | akzeptiert |
| RA-02 | Konto bm@ im Anzeigemodus mit Rolle Systemadministrator                    | befristet akzeptiert; Kiosk-Datenauftrag Weg B als Folgepunkt nach dem Publish | Entscheidung des Owners 2026-11-07 (Planer-Auftrag A40)     | 30 Tage nach dem Publish 1.70.0 | G20  | akzeptiert |

Nach dem Publish folgt die Migration auf `zod@4.6.6` (8 bis 16 h, `docs/BACKLOG.md`). Die Akzeptanz endet mit dem Merge dieser Migration oder mit einer neuen Entscheidung des Owners.

RA-02 endet mit der Ausführung des Datenauftrags Weg B (`docs/DATENAUFTRAG-KIOSK-KONTO.md`, zwei Freigaben nach ADR-0037) oder mit einer neuen Entscheidung des Owners. Läuft die Nachfrist ohne Ausführung ab, muss der Owner neu entscheiden.

## 5a Annahmen

Eine Annahme beschreibt die Bedingung, unter der eine Entscheidung oder ein Code-Pfad zulässig ist. Bricht sie, gilt die Entscheidung nicht mehr und der Owner muss neu entscheiden.

| ID    | Annahme                                                                                                                      | Quelle                                                  | Beleg                                                                                                                                      | Bezug                 | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------ |
| AN-01 | Das ZIP-Backup 2.0 enthält `hourlyRate` immer; zulässig nur, solange jede Rolle mit `backup.restore` auch `billing.view` hat | Entscheidung des Owners 2026-11-07 (Planer-Auftrag A40) | Rollenmatrix `src/lib/rbac/permissions.ts:131`, `:143`, `:156`, `:167`; Test `src/__tests__/security/qs6-5-export-billing.test.ts:179-191` | R-14, G07, G09, QS-06 | gilt   |

Code: `src/lib/backup/zip.ts:114-116` (`buildZip`, `includeBilling: true` seit PR 283, `main` `be712548`). `backup.restore` haben nur Systemadministrator und Administrator, beide haben `billing.view`.

Grenze des Belegs: Der Test prüft die statische Rollenmatrix, nicht die Einstiegspunkte. Die automatische Tagessicherung (`BackupService.scheduleDaily`, `src/routes/_authenticated/dashboard.tsx:309`) läuft für jede angemeldete Rolle und legt das ZIP im IndexedDB des Browsers ab. Herunterladen und Wiederherstellen gehen nur über den Dialog „Backup…“ (`backup.restore`, `ServiceMenu.tsx:174`) und „Aus Azure importieren“ (`azure.import` oder `backup.restore`, `AzureActionsPanel.tsx:98`). Der Inhalt stammt aus dem `localStorage` desselben Browsers (`src/lib/backup/snapshot.ts`), es entsteht keine neue Datenquelle.

AN-01 bricht, wenn eine Rolle `backup.restore` ohne `billing.view` erhält, ein Einstieg zu gespeicherten Sicherungen ohne `backup.restore` entsteht oder `billing.view` serverseitig eingeführt wird. Vertragstest: A42, Draft-PR folgt (Negativfall: Rolle mit `backup.restore` ohne `billing.view` muss den Test rot machen). Hinweis: `reports/A36-BERICHT.md` (`origin/ops/reports`, `hourlyRate` auf dem Veröffentlichungsweg) berührt das ZIP-Backup nicht.

## 6 Pflege

- Neues Risiko: Eintrag im Tracker (`risiken`, Text und Gegenmaßnahme) und im Register (Bewertung); `npm run docs:project` prüft, dass jede Tracker-ID im Register steht.
- Geschlossene Risiken bleiben im Register mit Status `geschlossen` (Nachvollziehbarkeit im Diff).
