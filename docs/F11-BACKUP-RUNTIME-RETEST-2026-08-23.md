# F-11 Backup-Runtime-Re-Test — 2026-08-23

## Zweck

Dieser Nachweis ergänzt `F11-RUNTIME-ADMIN-ACCEPTANCE-2026-08-23.md` und dokumentiert den technischen Fix sowie den noch ausstehenden manuellen Runtime-Re-Test des F-11-Backup-Pfads. Er verhindert, dass Merge-, CI-, Lovable-Sync- oder Betreiberergebnisse nur im Chat oder in einer temporären Umgebung verbleiben.

## Ausgangs-Findings

Der manuelle F-11-Backup-Test hatte drei technische Restpunkte ergeben:

1. Der aktuelle user-scoped Dashboard-Key `northbit-dashboard-v2::<user-id>` war nicht Bestandteil des Backup-Speichervertrags; ein formal gültiges Backup konnte damit wesentliche Dashboarddaten auslassen.
2. Manuelle Backups aktualisierten fälschlich `backup:lastAuto` und verfälschten dadurch die Anzeige des letzten automatischen Backups.
3. Der tägliche Auto-Backup-Scheduler war nicht ausreichend gegen parallele bzw. gleichzeitig gestartete Läufe geschützt.

Diese Punkte wurden als Issue #40 geführt.

## Technischer Fix

Umsetzung in PR #41 `Fix/F-11: aktuellen Dashboardzustand vollständig sichern`.

Geänderte Produkt-/Testpfade:

- `src/lib/backup/constants.ts`
- `src/lib/backup/integrity.ts`
- `src/lib/backup/create-backup.ts`
- `src/__tests__/backup/current-storage-regression.test.ts`

Wesentliche Korrekturen:

- aktueller `northbit-dashboard-v2::<user-id>`-Speichervertrag wird gesichert;
- weitere im Repository tatsächlich verwendete fachliche Northbit-Datenkeys werden explizit berücksichtigt;
- kein generisches `northbit-*`, damit Benutzer-/Auth-Storage nicht versehentlich als Rohdaten in das Backup gelangt;
- `backup:lastAuto` wird nur noch nach erfolgreichen automatischen Backups geschrieben;
- Tages-Scheduler besitzt In-Flight-Schutz und kurzlebigen browserweiten Lease gegen parallele Starts;
- Restore verwendet weiterhin den originalen `storageKey` aus dem Manifest und wurde nicht unnötig umgebaut.

Hinweis zur Datenminimierung: Rohe Storage-Keys wie `northbit-users` und `northbit-active-user` werden nicht als Backup-Storage-Einträge übernommen. Der bereits vorhandene optionale kanonische `dashboard.json`-Voll-Export kann weiterhin sanitierte Benutzerprofile enthalten; sensible Felder werden dort über den bestehenden `stripSensitiveFields`-Pfad entfernt. Dieser Exportvertrag wurde durch PR #41 nicht erweitert.

## Automatisierte Abnahme

Head vor Merge: `2d870afa7b02ca0fc4c9d786570a2dedbf548a31`.

### Security

Security #339 / Run `32622018188`: **PASS**

- Custom Scanner: PASS
- Gitleaks: PASS

### CI

CI #349 / Run `32622018189`: **PASS**

- Setup: PASS
- Prettier: PASS
- ESLint: PASS
- TypeScript: PASS
- RBAC-Matrix: PASS
- No-console: PASS
- Docs-Sync: PASS
- Project Manifest: PASS
- Unit & Components + Coverage: PASS
- Backend: PASS
- API inklusive Discovery / Smoke / Functional: PASS
- RBAC & Security: PASS
- Import/Export: PASS
- Backup/Restore: PASS
- Production Build + Bundle Report: PASS
- Playwright E2E + E2E Report: PASS
- Accessibility: PASS
- Technical Debt: PASS
- Technischer Prüfbericht aus laufaktuellen Artefakten: PASS
- Quality Gate: PASS

### Backup-Hard-Evidence

- `current-storage-regression.test.ts`: **3/3 PASS**
- Backup-/I/O-Suite: **11 Testdateien / 71 Tests PASS**
- Backup-Integritätsreport: **71/71 bestanden**

## Merge-Nachweis

PR #41 wurde mit Expected-Head-SHA-Schutz erfolgreich nach `main` gemergt.

- Merge-Commit: `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95`
- GitHub `main` wurde anschließend auf exakt diesen Merge-Commit verifiziert.
- Issue #40 enthält die technische Merge-/CI-Evidenz und bleibt bis zum manuellen Runtime-Re-Test bewusst offen.

## GitHub → Lovable Nachweis

Lovable-Projekt: `sysingdashboard` / `IT Task Hub`.

Nach dem Merge wurde der veröffentlichte Projektstand gezielt aktualisiert. Deployment-ID: `eb02109f-4474-4e6f-9b95-2b88a52ee0c1`.

Die Lovable-Edit-Historie weist anschließend sowohl die beiden Fix-Commits als auch den Merge-Commit als `completed` aus:

- `d2db508b4b3909d585c98e38ec9de72ce90cf231` — completed
- `2d870afa7b02ca0fc4c9d786570a2dedbf548a31` — completed
- `a6b0379f19289c5e94f5ee16fb0a0b4b3904db95` — completed

Zusätzlich konnte `src/lib/backup/constants.ts` direkt auf Lovable-Ref `a6b0379f...` gelesen werden; der neue Northbit-Speichervertrag ist dort vorhanden.

Bewertung: **GitHub → Lovable Code-Synchronisation technisch PASS**. Der noch offene Punkt ist ausschließlich der Betreiber-Runtime-Re-Test in der veröffentlichten Referenzumgebung.

## Manueller Runtime-Re-Test — Betreiber

Status: **OFFEN — jetzt durchzuführen**

Ziel: Sichtbarer Nachweis, dass der gemergte und synchronisierte Fix auch im veröffentlichten Administratorpfad korrekt wirkt.

### Testschritt

1. Als `System-Administrator` die veröffentlichte App öffnen.
2. `Einstellungen und Services` → `Backup…` öffnen.
3. Vor dem manuellen Backup den angezeigten Wert `Letztes automatisches Backup` notieren bzw. im Screenshot festhalten.
4. Genau **ein** manuelles Backup auslösen.
5. Nach Abschluss prüfen:
   - Backup wurde erfolgreich erstellt;
   - keine Warnung `Keine typischen App-Schlüssel erkannt ...` erscheint;
   - `Letztes automatisches Backup` ist durch den manuellen Lauf **nicht verändert** worden;
   - im Backup-Protokoll ist genau ein neuer manueller Lauf erkennbar und kein sichtbarer Doppelstart.
6. Einen Screenshot des Backup-Dialogs nach dem Lauf senden. Wenn die Anzeige des vorherigen Auto-Zeitpunkts im selben Screenshot nicht eindeutig vergleichbar ist, zusätzlich kurz den vorherigen Wert als Text nennen.

### PASS-Kriterien

- manueller Backup-Lauf erfolgreich;
- keine falsche App-Key-/frisch-initialisiert-Warnung;
- Auto-Backup-Zeitstempel unverändert;
- kein sichtbarer Doppelstart;
- keine Secrets oder Zugangsdaten sichtbar.

Der parallele Scheduler-Schutz ist zusätzlich automatisiert durch die neue Regression abgesichert; der manuelle Test soll primär die sichtbaren Runtime-Auswirkungen bestätigen.

## Aktueller Status

- Root Cause technisch behoben: PASS
- PR #41 gemergt: PASS
- Security #339: PASS
- CI #349: PASS
- Backup-Regression: 3/3 PASS
- Backup-Suite: 71/71 PASS
- Production Build: PASS
- E2E: PASS
- Technischer Prüfbericht: PASS
- Quality Gate: PASS
- GitHub `main` auf Merge `a6b0379f...`: PASS
- Lovable-Synchronisation auf Merge `a6b0379f...`: PASS
- manueller Betreiber-Runtime-Re-Test: **OFFEN**
- Issue #40: **OFFEN bis Runtime-Re-Test PASS**
- F-11 gesamt: weiterhin `MANUAL VERIFICATION REQUIRED`

## Abschlussbericht

Der technische Backup-Blocker ist implementiert, automatisiert getestet, vollständig durch CI/Security/Build/E2E/Quality Gate abgenommen, nach `main` gemergt und in Lovable als `completed` synchronisiert. Es verbleibt genau ein fachlich notwendiger Schritt für Issue #40: der manuelle Runtime-Re-Test des veröffentlichten Backup-Dialogs. Erst dessen Ergebnis entscheidet über das Schließen von Issue #40.
