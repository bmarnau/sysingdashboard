---
id: A33
titel: "Skript: Bundle-Prüfung nach dem Publish (G22, G14)"
status: erledigt
start: 2026-11-07T04:55+01:00
ende: 2026-11-07T06:20+01:00
branch: feat/a33-check-bundle
pr: "#288 (Draft)"
commit: 8674505a (PR 288)
ci: 15/15 grün, Head 8674505a
---

# A33 Bericht: Bundle-Sicherheitsprüfung `check:bundle`

## Ergebnis

Der Draft-PR #288 enthält das lesende Skript `scripts/check-bundle-security.mjs` mit dem npm-Aufruf `check:bundle`.
Es prüft (a) auf Broker-Kennungen `lovable-preview-auth:get/:set/:remove/:result` und (b) ob `@tanstack/react-start` im Lockfile mindestens 1.168.60 ist (GHSA-qx66-fv34-fjm8).
Die Ausgabe ist eine Tabelle plus JSON. Exitcodes: 0 = ok, 1 = Fund, 2 = Eingabe fehlt. Das Skript greift nicht auf das Netz zu und läuft nicht in der Pflicht-CI.
Dazu kommen 11 Unit-Tests (vitest) mit Fixtures im Temp-Verzeichnis. Der Aufruf steht in der Publish-Prüfung, in der Merge-Checkliste (N6/G22) und in der Testtabelle des Handbuchs.
CI 15/15 grün auf dem exakten Head; ein Statuskommentar steht im PR.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Skript | Eingabe `dist/` (sonst `.output/`), `--dist`, Dateiliste, `--lockfile`, `--json` | `scripts/check-bundle-security.mjs` |
| Tests | 11 Tests: sauber, mit Kennung, Dateiliste, bun.lock zu alt, package-lock zu alt, Lockfile/Paket fehlt, dist fehlt, `.output`-Fallback, Versionsvergleich, Regression echtes `bun.lock` | `src/__tests__/scripts/check-bundle-security.test.ts`, lokal grün |
| Eigener Build | `vite build` → `.output/` mit 323 Dateien: keine Kennung, `bun.lock` 1.168.60, Exit 0 | lokaler Lauf 2026-11-07 |
| Lokale Prüfungen | lint, typecheck, Prettier, `docs:check`, `docs:project` ok | lokaler Lauf |
| Breiter Testlauf lokal | 720/723 grün. 3 Tests scheitern an Zeitlimits: `ci/quality-gate.test.ts` Timeouts 5 s, `management-cockpit/compose.test.ts` 101,8 ms > 100 ms. Der PR ändert diese Dateien nicht. | in der CI grün |
| CI | 15/15 pass | `gh pr checks 288`, Head `8674505` |
| PR-Kommentar | Stand, Tests, CI, Owner-Punkte | PR #288, Kommentar 6702669069 |
| Doku | `docs/LOVABLE-PUBLISH-PRUEFUNG.md` (Abschnitt A33), `docs/MERGE-CHECKLISTE-GOLDEN-GATE.md` (N6), `src/lib/help-documentation.ts` | Commit `8674505` |

## Offene Fragen

- **Abweichung vom Auftrag:** `scripts/check-bundle.mjs` ist schon belegt (Größenmessung `test:perf`, läuft in `.github/workflows/ci.yml:331`). Hätte man die Prüfung dort eingebaut, wäre sie in der Pflicht-CI gelandet. Sie liegt deshalb in `scripts/check-bundle-security.mjs`; der npm-Name `check:bundle` entspricht dem Auftrag. Der Owner muss diese Abweichung bestätigen.
- **Grenze der Aussage:** Für die veröffentlichte App beweist nur Prüfpunkt (a) etwas, und nur an Skripten, die vorher von Hand gespeichert wurden. Das Lockfile beschreibt den Repository-Stand, nicht zwingend den Lovable-Build. Ob Lovable dieselbe Version baut, ist noch zu belegen.
- Tracker, CURRENT-STATUS, Tagebuch und BACKLOG sind in diesem Code-PR nicht nachgeführt, damit es keine Konflikte mit dem Tagesbündel (`docs/2026-11-06-tagesbuendel`) gibt. Sie sollten dort nachgetragen werden: Fortschritt A33, PR #288.
- G22 ist auf `main` noch nicht als Gate-ID beschrieben, nur im A21-Bericht. In der Checkliste steht der Bezug als N6 (G22).
- Kein CHANGELOG-Eintrag, weil die Änderung für Nutzer nicht sichtbar ist.

## Eigene Ideen

- Nach dem Publish die Skripte der veröffentlichten App per Browser-Werkzeug speichern und `check:bundle -- <dateien> --json` als Nachweis (EV) ablegen.
- Später, nach Owner-Entscheid, `check:bundle` als nicht blockierenden CI-Job nach dem Build ergänzen (Bericht als Artefakt).
- Die Kennungsliste aus ADR-0036 an einer zentralen Stelle führen, damit Vertragstest und Skript dieselbe Quelle nutzen.
- In der BACKLOG-Aufgabe DOC-01 (`fileURLToPath`) ist `check-bundle.mjs` noch offen; die Korrektur ist klein und könnte mitgenommen werden.
- Die zeitkritischen Tests (Cockpit-Perf 100 ms, Quality-Gate 5 s) sind lokal unter Last instabil; das Timeout sollte erhöht oder eine Toleranz gesetzt werden.

## Abschluss

Hygiene: 0 gemergte Remote-Branches, 6 offene PRs, davon 5 Drafts.

```yaml
Reifegrad: "Prüfskript fertig und getestet (Draft-PR #288, CI 15/15); nicht gemergt"
Projektstatus: "Golden Gate: Publish No-Go (R-07); Bundle-Prüfpunkt G22 jetzt per Skript reproduzierbar"
Offene_Fragen:
  - "Owner: Dateiname check-bundle-security.mjs statt check-bundle.mjs bestätigen"
  - "Lovable-Build-Version von @tanstack/react-start belegen (zu belegen)"
  - "Merge von #288 erst, wenn Lovable nicht schreibt"
Roadmap:
  Sprints_bis_BSF: "zu belegen (laut Tracker)"
  Sprints_bis_MVP: "zu belegen (laut Tracker)"
```
