# ADR-0016 — Performance-, Build- und Betriebsprüfung mit Baselines

Status: accepted
Datum: 2026-07-14
Kontext: Prompt 2A.7.

## Entscheidung

1. **Baselines statt harter Grenzwerte.** Erster Lauf schreibt
   `test-report/ops-baseline.json`. Folgeläufe vergleichen und markieren
   Deltas > 20 % als **Warnung**, nicht als Fail. Grund: absolute Zahlen
   (ms, KB) sind maschinen-/runner-abhängig; harte Gates ohne stabile
   Umgebung erzeugen nur Rauschen.
2. **Soft-Gate für den Aggregator.** Der `ops-check`-Job scheitert nur an
   echten Fehlern (Build kaputt, Typecheck rot, Playwright-Crash). Report
   ist die Deliverable. Umstellung auf Hard-Gate frühestens nach drei
   stabilen Baselines in Folge.
3. **Cross-Browser-Matrix opt-in.** Chromium ist Standard, Firefox über
   `RUN_FIREFOX=1`, WebKit über `RUN_WEBKIT=1`. Grund: Playwright-Chromium
   ist bereits in der Sandbox verfügbar; WebKit/Firefox verursachen
   zusätzliche CI-Kosten und werden bei Bedarf zugeschaltet.
4. **Kein Lighthouse.** Extra-Toolchain für wenig zusätzlichen Erkenntnis-
   gewinn. Für Kernkennzahlen genügen `PerformanceNavigationTiming` und
   `paint`-Entries.
5. **Bundle-Duplikat-Erkennung via `bun pm ls`.** Vermeidet weitere
   Dependencies; hinreichend zuverlässig für Major-Konflikte.

## Konsequenzen

- Positiv: kein Konfigurations-Overhead, klar dokumentierte Erwartung.
- Positiv: Reports lassen sich in CI-Artefakten einfach diff-en.
- Negativ: Regressionen nur sichtbar, wenn man den Report liest — daher
  Empfehlung, den Ops-Report in Release-Reviews zu verlinken.
- Negativ: Baseline-Reset ist manuell (Datei löschen). Bewusste Trade-off,
  um versehentliches Überschreiben zu vermeiden.

## Bekannte Einschränkungen

- `performance.memory` liefert nur Chromium.
- Runner-Wechsel invalidiert die Baseline — vor Vergleich prüfen.
- Kein Load-/Stress-Testing (nicht Ziel dieser Suite).
