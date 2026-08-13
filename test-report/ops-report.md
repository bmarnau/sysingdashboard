# Ops-Report

Erzeugt: 2026-08-13T04:35:01.150Z

## Build
- Checks gesamt: 0 · Harte Fehler: 0 · Soft-Fehler: 0

## Bundle
- Kein Bundle-Report verfügbar.

## Performance
- Kein Perf-Raw verfügbar (Playwright-Suite noch nicht gelaufen).

## Stabilität
- Kein Stability-Raw verfügbar.

## Kompatibilität
- Chromium (Standard). Firefox opt-in via `RUN_FIREFOX=1`, WebKit via `RUN_WEBKIT=1`.

## Betrieb
- Kein Ops-Check verfügbar.

## Trends / Warnungen
Keine.

## Bekannte Einschränkungen
- Baselines sind maschinenabhängig — CI-Runner-Wechsel verzerrt Trends.
- `performance.memory` nur in Chromium verfügbar.
- WebKit- und Firefox-Läufe sind opt-in wegen CI-Kosten.
- Kein Load-/Stress-Testing.