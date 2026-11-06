# Bericht: Handbuch Kiosk und QS-06, Analyse monatlich aktueller Demodaten

**Datum:** 2026-11-04 · **Art:** Anforderung 1 umgesetzt (Handbuch, CHANGELOG), Anforderung 2 nur analysiert (read-only, keine Codeänderung)
**Stand des Codes:** Branch `docs/2026-11-04-u7-abnahme` auf Basis `main` `8efb91d1`
**Bezug:** `docs/BERICHT-2026-11-04-KIOSK-KONTO.md`, `docs/DATENAUFTRAG-KIOSK-KONTO.md`, EV-0005, U3b (PR 267), S0-05, TD-01 Stufe b

## 1 Ergebnis

1. **Anforderung 1 (Handbuch und CHANGELOG):** umgesetzt. Das Handbuch beschreibt QS-06, das Kiosk-Konto, das Laden der Kiosk-Demodaten auf dem Gerät und einen Abschnitt „Bei Störungen“. Das CHANGELOG hat einen neuen Eintrag **1.70.0 (2026-11-04)**. Damit steigt die angezeigte App-Version auf 1.70.0 (Entscheidung offen, Abschnitt 2.3).
2. **Anforderung 2 (Demodaten monatlich aktuell):** analysiert, nicht umgesetzt. Die 0.0 h im November haben drei Ursachen in drei verschiedenen Datenquellen. Keine davon wird heute automatisch nachgeführt. Die Anforderungen DM-01 bis DM-14 stehen in Abschnitt 4.

## 2 Anforderung 1: Handbuch und CHANGELOG

### 2.1 Änderungen

| Datei                                               | Änderung                                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/help-documentation.ts`, Thema `info-kiosk` | Neue Abschnitte „Kiosk-Konto für das Anzeigegerät“, „Kiosk-Demodatensatz laden“ (mit der Meldung „Kiosk-Demodaten sind auf diesem Gerät nicht geladen.“) und „Bei Störungen“ (Tabelle Anzeige, Ursache, Abhilfe). |
| Thema `backend-admin`                               | Aktion „Kiosk-Konto anlegen“ ergänzt: nur mit `roles.manage`; Konten aus der Auth-Verwaltung erhalten die Standardrolle Viewer.                                                                                   |
| Thema `rbac-rollen-berechtigungen`                  | Neuer Abschnitt „Beträge und Abrechnung (QS-06)“; Matrix auf 25 Rechte mit `billing.view` und `performance.statement.manage` berichtigt (vorher 23).                                                              |
| `DOCUMENTATION_VERSION`                             | 1.24.1 → 1.25.0                                                                                                                                                                                                   |
| `CHANGELOG.md`                                      | Eintrag 1.70.0 mit fünf Punkten                                                                                                                                                                                   |
| `docs/PROJECT-STATUS.yaml`                          | `versions.dashboard` und `releaseManagement.currentRelease` auf 1.70.0 (vom Validator verlangt)                                                                                                                   |
| `docs/ENTWICKLUNGSTAGEBUCH.md`                      | Kopfzeile Dashboard-Version 1.70.0 (vom Test `DevDiary` verlangt)                                                                                                                                                 |
| Tests                                               | `app-version.test.ts`, `help-documentation-version.test.ts`, `help-navigation-topics.test.ts`: Versionen, Datum und Zahl der Rechte angepasst                                                                     |

Belegt aus dem Code: Der Kiosk-Datensatz liegt im `localStorage` unter `northbit-kiosk-demo-dataset-v1`, unabhängig vom Konto, und bleibt beim Abmelden erhalten (`logout-service.ts` entfernt nur `sb-*-auth-token`). Laden, Importieren und Entfernen verlangen `users.manage` (`kiosk-demo-service.ts:12, 21, 27`). Der Menüpunkt „Demo-Datensatz…“ erscheint mit `avkk.edit` (`ServiceMenu.tsx:267`).

### 2.2 Prüfungen

| Prüfung                                   | Ergebnis                                                                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest, gesamte Suite, `TZ=Europe/Berlin` | 1260 bestanden, 4 todo, 3 fehlgeschlagen im ersten Gesamtlauf. Nach den Korrekturen: zwei Tests in `BackendAdminDialog.test.tsx` liefen nur im Gesamtlauf in ein Zeitlimit; einzeln 19 von 19 grün (bekannt, Backlog). |
| `npm run docs:check`                      | grün, Version 1.70.0                                                                                                                                                                                                   |
| `npm run docs:project`                    | grün                                                                                                                                                                                                                   |
| Typecheck                                 | ohne Fehler                                                                                                                                                                                                            |
| Prettier                                  | geänderte Dateien geprüft                                                                                                                                                                                              |

### 2.3 Offener Punkt: Version

Der oberste CHANGELOG-Eintrag bestimmt `DASHBOARD_VERSION`. `docs:check` verlangt, dass kein Thema neuer ist als dieser Eintrag. Ein Eintrag ohne neue Version war daher nicht möglich. Die Merge-Checkliste sieht nach dem ersten Publish den Tag **v1.69.0** vor (`docs/MERGE-CHECKLISTE-GOLDEN-GATE.md`). Der Owner muss entscheiden: Tag auf 1.70.0 anpassen oder den Eintrag vor dem Merge zurück auf 1.69.0 setzen. Die Cockpit-Punkte aus L2 (U1 bis U6) fehlen weiter im CHANGELOG (L2-12).

## 3 Anforderung 2: Befunde

### 3.1 Wo die Datumswerte liegen

| Nr. | Quelle                                       | Fundstelle                                                                               | Aussage                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5a  | Basisdaten des Dashboards                    | `src/data/dashboard.json`, eingelesen in `src/lib/dashboard-data.ts:1`                   | **Absolut.** Sechs Tätigkeiten mit festen Daten im Mai 2026. Sie werden nie verschoben. Ursache für „Mai“.                                                                                                                                                         |
| 5b  | Systemhaus-Demodatensatz (lokal)             | `src/lib/demo-data/dataset.ts:23–35, 491–586`                                            | **Relativ beim Einspielen, danach absolut.** `day(offset)` rechnet ab `baseDate` (Tage −1 bis −55). Gespeichert werden feste Daten. Nach dem Einspielen altert der Bestand. Ursache für „Oktober“ (Basisdatum 2026-10-26).                                         |
| 5c  | Live-Demo-Mandant (Kunde A und B, Datenbank) | `docs/DATENAUFTRAG-TD01-AUFFRISCHUNG.md`                                                 | **Absolut nach einmaliger Verschiebung.** Stufe b hat Fälligkeiten und Tätigkeitsdaten am 2026-10-28 auf den Stichtag gesetzt. Seitdem altern sie. Die interne Kiosk-Sicht und das Cockpit lesen diese Daten. bm@ im Anzeigemodus zeigt deshalb im November 0.0 h. |
| 5d  | Kiosk-Demodatensatz                          | `src/lib/kiosk/kiosk-demo-dataset.ts:96–118`, `demo-kiosk-provider.ts:63–90`             | **Ohne Tätigkeitsdaten.** Feste Kennzahlen (Mengen, Trends) ohne Datum. Der Datenstand ist der Ladezeitpunkt `loadedAt` und bleibt stehen, bis neu geladen wird.                                                                                                   |
| 5e  | Golden Dataset (Tests)                       | `src/lib/golden-dataset/golden-dataset-contract.ts:3`, `docs/examples/golden-dataset/v1` | **Absolut mit festem Stichtag** `2026-09-14T00:00:00Z`. Es muss so bleiben, sonst sind die erwarteten Ergebnisse nicht wiederholbar.                                                                                                                               |

**Wo die Verschiebung ansetzen müsste:**

| Quelle            | Beim Laden                                   | Beim Lesen                                                                            | Beim Monatswechsel                                | Empfehlung                                                                                      |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 5a, 5b lokal      | möglich (Start der App)                      | möglich, aber jede Lesestelle müsste umrechnen (Controlling, Bericht, Export, Backup) | möglich (Prüfung bei Fokus oder Zeitgeber)        | **Beim Laden und beim Monatswechsel**, als einmalige Verschiebung der gespeicherten Demo-Zeilen |
| 5c Datenbank      | nicht möglich ohne Schreibrecht des Browsers | nicht empfohlen: geteilte Daten würden je Leser anders aussehen                       | nur als Datenauftrag oder serverseitiger Zeitplan | **Monatlicher Datenauftrag** mit Stichtag als Parameter (Vorlage TD-01 Stufe b)                 |
| 5d Kiosk          | entfällt (kein Datum)                        | entfällt                                                                              | Datenstand optional neu setzen                    | Nur Kennzeichnung schärfen (DM-11)                                                              |
| 5e Golden Dataset | nein                                         | nein                                                                                  | nein                                              | **Unverändert lassen**                                                                          |

Verschieben in ganzen Monaten erhält Wochentage nicht und kann bei Monatsenden springen (31.10. → 30.11.). Verschieben in ganzen Tagen (Abstand Basismonat zu aktuellem Monat in Tagen) erhält den Abstand zu „heute“. Entscheidung offen (Frage 2 in Abschnitt 6).

### 3.2 Zeitzone, Stichtag und Monatswechsel

| Nr. | Befund                                                                                                                                                                                                                      | Fundstelle                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 6a  | `baseDate` entsteht aus `new Date().toISOString().slice(0, 10)`, also aus dem UTC-Datum. `day()` rechnet in UTC. Zwischen 00:00 und 01:00 (Winter) bzw. 02:00 (Sommer) Berliner Zeit liegt das Basisdatum einen Tag zurück. | `src/lib/demo-data/dataset.ts:23, 34` |
| 6b  | Gleiches Fehlerbild wie U3b (AVKK-Adapter), dort mit `berlinDate` behoben. Am **01.12. 00:00 bis 00:59** würde ein Seed noch den **30.11.** als Basis nehmen, also den alten Monat.                                         | PR 267                                |
| 6c  | Die Monatskacheln werten Datumstexte seit S0-05 als lokalen Kalendertag aus (`sumActivitiesInRange`). Auf einem Gerät in Europe/Berlin passt das; der Monatswechsel der Anzeige erfolgt um 00:00 Berliner Zeit.             | `src/lib/time-period.ts:279`          |
| 6d  | Golden-Dataset-Tests nutzen einen festen Stichtag. Eine automatische Verschiebung darf dort nicht greifen; sie braucht ein einspeisbares „jetzt“ (`now`-Parameter wie in `createKioskDemoDataset`).                         | `golden-dataset-contract.ts:3`        |

Prüfpunkte für die Umsetzung:

| ID    | Zeitpunkt (Europe/Berlin)                               | Erwartung                                                                                   |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| ZP-01 | 30.11. 23:59                                            | Demodaten liegen im November; Monatskachel November > 0 h                                   |
| ZP-02 | 01.12. 00:00                                            | Nach dem Monatswechsel liegen die Demodaten im Dezember; Monatskachel Dezember > 0 h        |
| ZP-03 | 01.12. 00:30                                            | Basisdatum ist der 01.12., nicht der 30.11. (Befund 6a)                                     |
| ZP-04 | 28.03.2027 01:59 und 03:00 (letzter Sonntag im März)    | Umstellung auf Sommerzeit verschiebt keinen Tag                                             |
| ZP-05 | 31.10.2027 02:00 bis 03:00 (letzter Sonntag im Oktober) | Umstellung auf Winterzeit verschiebt keinen Tag                                             |
| ZP-06 | beliebig                                                | Golden-Dataset-Tests liefern mit festem Stichtag 2026-09-14 dieselben Ergebnisse wie vorher |

### 3.3 Kennzeichnung

Heute vorhanden: Die Kiosk-Ansicht zeigt im Demomodus „DEMO-DATEN — KEINE LIVE-DATEN“ und den Datenstand aus `loadedAt` (`KioskView.tsx:62–65, 103`). Alle lokalen Demo-Kennungen tragen das Präfix `demo-`; die Live-Demo-Kunden heißen „DEMO – Kunde A/B (synthetisch)“.

Risiko einer Verschiebung: Mit aktuellen Daten sehen Demozahlen echter aus als vorher. Ein verschobener Zeitstempel darf deshalb nie als Datenstand erscheinen. Der Datenstand muss Lade- oder Verschiebezeitpunkt und den Bezugsmonat nennen.

## 4 Anforderungen an Anforderung 2

| ID    | Anforderung                                                                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DM-01 | Lokale Demodaten (Quellen 5a und 5b) **müssen** beim Laden der App so verschoben werden, dass sie relativ zum aktuellen Monat liegen.                                                            |
| DM-02 | Die Verschiebung **muss** beim Monatswechsel erneut greifen, auch wenn die App geöffnet bleibt (Anzeigegerät).                                                                                   |
| DM-03 | Verschoben werden **dürfen** nur Zeilen, die als Demo gekennzeichnet sind (Präfix `demo-` oder Herkunft `dashboard.json`). Eigene lokale Daten **dürfen nicht** verändert werden.                |
| DM-04 | Die Verschiebung **muss** in Europe/Berlin rechnen; das Basisdatum **muss** über `berlinDate` statt `toISOString` gebildet werden (Befund 6a).                                                   |
| DM-05 | Die Verschiebung **muss** wiederholbar sein: Ein zweiter Lauf im selben Monat **darf** nichts ändern. Dazu **muss** der Bezugsmonat gespeichert werden.                                          |
| DM-06 | Die Verschiebung **sollte** in ganzen Tagen erfolgen, damit der Abstand zu „heute“ und die Verteilung überfällig, heute, künftig erhalten bleiben.                                               |
| DM-07 | Alle Datumsfelder einer Zeile (Tätigkeit, Fälligkeit, Start, Deadline) **müssen** um denselben Betrag verschoben werden.                                                                         |
| DM-08 | Golden-Dataset-Tests **müssen** mit festem Stichtag unverändert grün bleiben; die Verschiebung **muss** ein einspeisbares „jetzt“ haben.                                                         |
| DM-09 | Tests **müssen** die Prüfpunkte ZP-01 bis ZP-06 abdecken, jeweils unter `TZ=Europe/Berlin`, UTC und America/New_York.                                                                            |
| DM-10 | Die Kennzeichnung „DEMO-DATEN — KEINE LIVE-DATEN“ **muss** erhalten bleiben.                                                                                                                     |
| DM-11 | Der Datenstand **muss** den Lade- oder Verschiebezeitpunkt zeigen, nie einen verschobenen Datumswert, und **sollte** den Bezugsmonat nennen (zum Beispiel „Demo, auf November 2026 verschoben“). |
| DM-12 | Der Live-Demo-Mandant (5c) **muss** über einen monatlichen Datenauftrag nach ADR-0037 nachgeführt werden, mit Stichtag als Parameter und Rückbau über die alten Werte.                           |
| DM-13 | Eine automatische serverseitige Verschiebung (Zeitplan in der Datenbank) **sollte** erst nach einer eigenen Entscheidung (ADR) erfolgen, weil sie ohne Einzelfreigabe schreibt.                  |
| DM-14 | Export, Backup und Bericht **sollten** die verschobenen Werte ausgeben und im Kopf als Demodaten kennzeichnen.                                                                                   |

## 5 Aufwand und Risiko

Schätzung: Arbeitstage Gesamtaufwand einschließlich Tests und Doku, Analogie zu S0-05 und TD-01.

| Anforderung                                                  | Aufwand                                              | Risiko | Begründung                                                                                                                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** Handbuch und CHANGELOG                                 | 0,5 Tage (erledigt)                                  | gering | Nur Texte und Tests. Offen: Version 1.70.0 gegen den geplanten Tag v1.69.0 (Abschnitt 2.3).                                                                                                     |
| **2a** Lokale Demodaten verschieben (DM-01 bis DM-11, DM-14) | 2 bis 3 Tage                                         | mittel | Greift in gespeicherte Daten ein. Fehler bei DM-03 würden eigene Daten verändern. Zeitzonen und Monatsenden sind fehleranfällig (S0-05, U3b). Gegenmittel: Präfixfilter, Tests ZP-01 bis ZP-06. |
| **2b** Kiosk-Datenstand und Kennzeichnung (DM-10, DM-11)     | 0,5 Tage                                             | gering | Nur Anzeige. Keine Tätigkeitsdaten im Kiosk-Datensatz.                                                                                                                                          |
| **2c** Live-Demo-Mandant monatlich (DM-12)                   | 1 Tag für die Vorlage, danach etwa 1 Stunde je Monat | mittel | Schreibt in die geteilte Datenbank mit Rolle `postgres`. Zwei Freigaben je Monat; Bus-Faktor 1 (R-04).                                                                                          |
| **2d** Automatischer Zeitplan in der Datenbank (DM-13)       | 3 bis 5 Tage mit ADR                                 | hoch   | Schreibt ohne Einzelfreigabe. Widerspricht heute ADR-0037. Erst nach dem Golden Gate.                                                                                                           |

Empfehlung: 2a und 2b als ein Paket nach L2-12; 2c als Vorlage auf Grundlage von TD-01 Stufe b; 2d in den Backlog.

## 6 Offene Fragen an den Owner

1. Version: 1.70.0 behalten und den Tag in der Merge-Checkliste anpassen, oder vor dem Merge auf 1.69.0 zurück?
2. Verschiebung in ganzen Tagen (empfohlen, DM-06) oder Kalendermonaten?
3. Soll das Paket 2a/2b vor dem ersten Publish kommen (Gate) oder danach?
4. Soll der Live-Demo-Mandant jeden Monat per Datenauftrag nachgeführt werden (2c), auch wenn jeder Lauf zwei Freigaben braucht?
