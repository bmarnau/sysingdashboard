# ADR-0018 — CI-Integration und Quality Gates

Status: accepted
Datum: 2026-07-16
Kontext: Prompt 2A.10.

## Entscheidung

1. **Job-Split statt Monolith.** `.github/workflows/ci.yml` wird in
   `setup`, `static`, `unit`, `backend`, `api`, `security`, `io`, `backup`,
   `build`, `e2e`, `a11y`, `debt` und `report` aufgeteilt. Fehler in einer
   frühen Stufe stoppt die Kette via `needs:`, ohne Folgejobs zu zünden.
   Bewusst nicht: separate Reusable Workflows oder Matrix-Runner —
   Aufwand steht in keinem Verhältnis zum Single-Repo.
2. **Single Source of Truth für Blocker.** Prompt-Blocker werden **nicht**
   in YAML dupliziert. `scripts/technical-report/build.mjs` erzeugt das
   Feld `blockers[]` aus allen Bereichsberichten; `scripts/ci/quality-gate.mjs`
   liest ausschließlich dieses Feld und liefert Exit 1, wenn nicht leer.
   Damit ist die Definition harter Blocker exakt einmal in Code gepflegt
   und im Prüfbericht sichtbar (Kapitel 9).
3. **Harte Gates jetzt.** `security:gate` und `api:gate` werden im
   Report-Job hart aufgerufen (kein `--soft`, kein `|| echo`). Bekannte
   offene Findings müssen entweder als `accepted:true` in
   `scripts/security/static-findings.json` gepflegt oder behoben werden.
4. **Warn-Only bleiben** Accessibility, Tech-Debt und Perf-Delta: sie
   werden nicht in `blockers[]` überführt, weil sie nicht in der
   Prompt-Blocker-Liste stehen. Sichtbar bleiben sie über Report und
   Artefakte.
5. **Concurrency-Cancel** für PRs (`group: ci-${{ github.ref }}`,
   `cancel-in-progress: true`), damit neue Pushes ältere Läufe stoppen.

## Konsequenzen

- Positiv: klarer Blocker-Vertrag zwischen Prüfbericht und CI. Neue
  Blocker-Kategorie = Änderung in `computeBlockers()` + Test — keine
  YAML-Änderung nötig.
- Positiv: schnellerer Feedback-Zyklus durch frühen Stopp.
- Negativ: Bun-Install läuft pro Job; per `actions/cache` auf
  `~/.bun/install/cache` und `node_modules` reduziert, aber nicht
  eliminiert. Alternative wäre ein Setup-Artifact, brächte aber neue
  Fehlerquellen (Symlinks, node-gyp-Cache).
- Negativ: Reihenfolge in `needs:` ist bewusst linear. Parallelisierung
  von unabhängigen Stufen (z. B. api ∥ io ∥ security) wäre möglich,
  Vorgabe des Prompts ist aber eine geordnete Stufenfolge.

## Alternative (verworfen)

Weiches Gate mit E-Mail-Alarm statt Merge-Block. Verworfen, weil das
Prompt explizit „blockierend" fordert und ein Alert-Kanal für dieses
Repo nicht existiert.
