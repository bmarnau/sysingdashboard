# Bericht bun audit: Sammelbewertung

Stand: 2026-11-06 · Auftrag A20 (ops/queue) · Grundlage: main 02cb3d28, bun.lock · bun 1.4.3 · Art: nur lesen

## Ergebnis

1. `main` meldet 60 Funde (2 kritisch, 25 hoch, 24 mittel, 9 niedrig) in 16 Paketen, der Stand von PR 287 (enthält PR 285) noch 54 (0 kritisch, 24 hoch, 24 mittel, 6 niedrig) in 14 Paketen.
2. Von den 58 in A02 nicht bewerteten Funden entfallen 4 mit PR 285/287 (weitere `dompurify`-Hinweise). Es bleiben 54 Funde, zusammengefasst in 13 Fundgruppen.
3. Nur `zod@3.25.76` wirkt im ausgelieferten Server-Code (Server-Funktionen). Eine Behebung gibt es erst in 4.6.6, also mit Major-Sprung. Der Validator läuft nach der Anmelde-Middleware.
4. Alle übrigen 53 Funde betreffen Build, Test, Lint oder den Dev-Server. Für 11 von 13 Gruppen gibt es ein Update ohne Major-Sprung. Für `undici` und `sharp` ist dafür ein `overrides`-Eintrag oder ein neueres `@cloudflare/vite-plugin` nötig.
5. Klassen: vor Publish 1 Gruppe (1 Fund, Entscheidung zu `zod`, 1 h), nach Publish 2 Gruppen (8 Funde, 2 h), Dev-only beobachten 8 Gruppen (38 Funde, 4 h), ignorieren 2 Gruppen (7 Funde, 0 h).

## Überblick

| Stand                                              | Funde | kritisch | hoch | mittel | niedrig | Pakete | eindeutige GHSA |
| -------------------------------------------------- | ----- | -------- | ---- | ------ | ------- | ------ | --------------- |
| `main` 02cb3d28                                    | 60    | 2        | 25   | 24     | 9       | 16     | 53              |
| PR 287 (`fix/audit-shell-quote`, 46607da8)         | 54    | 0        | 24   | 24     | 6       | 14     | 47              |
| Differenz (K1 und K2 aus A02 plus 4 Folgehinweise) | −6    | −2       | −1   | 0      | −3      | −2     | −6              |

Mit PR 285/287 fallen weg: K1 `dompurify` GHSA-cg2g-xh64-v4q7 (kritisch), K2 `shell-quote` GHSA-pqg4-j6r4-53mv (kritisch). Dazu kommen vier `dompurify`-Hinweise aus den „58“: GHSA-mrv2-3pqr-j5jr (hoch), GHSA-p98j-92pf-mc4p, GHSA-6688-9rhm-gjv2 und GHSA-c6gr-qvv4-5v3f (je niedrig). Alle sind mit `dompurify` 3.4.17 behoben (`overrides` in `package.json` von PR 287).

Hinweis zur Zählung: `bun audit` zählt je Paket und Versionsbereich. Dieselbe Kennung erscheint mehrfach, zum Beispiel die drei `launch-editor`-Hinweise auch unter `vite` und GHSA-82fw-gwwq-j7x9 unter `vitest` und `@vitest/mocker`. 54 Einträge entsprechen deshalb 47 eindeutigen GHSA-Kennungen.

## Funde

Laufzeit: `client` = im Browser-Bundle, `server` = im Worker-Bundle, `build_test_dev` = nur Build, Test, Lint oder Dev-Server. Zeilenangaben zu `package.json` und `bun.lock` beziehen sich auf `main` 02cb3d28.

```yaml
funde:
  - id: S01
    paket: "zod@3.25.76 (direkt); zod@4.6.7 über @tanstack/router-generator ist nicht betroffen"
    pfad: "(direkte Abhängigkeit); @tanstack/router-plugin > @tanstack/router-generator > zod"
    laufzeit: server_und_client
    advisories: ["GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404)"]
    schweregrad: hoch
    behoben_in: "4.6.6 (keine Korrektur für die 3.x-Linie)"
    erreichbarkeit: >-
      Server-Funktionen validieren Eingaben mit zod, darunter große Arrays
      (bis 50 000 Elemente in sharedProjectionPublishSchema). Die Validierung
      läuft nach requireSupabaseAuth, also nur für angemeldete Nutzer. Ob die
      3.x-Klassik (Import "zod") denselben Fehler hat, ist nicht ermittelbar:
      Das Advisory nennt die Logik von $ZodArray (zod 4), aber den Bereich <4.6.6.
    beleg: >-
      package.json:133; bun.lock:1645;
      src/lib/customer-data-runtime/shared-projection.schema.ts:84 und :93-96;
      src/lib/customer-data-runtime/shared-projection.functions.ts:96-98;
      node_modules/@tanstack/start-client-core/dist/esm/createServerFn.js:43
      (Validator der Funktion wird hinter die Middleware gehängt, Version 1.170.34 wie im Lock);
      src/integrations/supabase/auth-middleware.ts:52-67; 19 Dateien unter src/ importieren zod
    update_ohne_major: false
    klasse: vor_publish
    begruendung: >-
      Einziger Fund im ausgelieferten Server-Code. Folge im Worker ist
      Speichererschöpfung einer Anfrage (DoS), keine Datenpreisgabe. Behebung
      nur mit Migration auf zod 4. Vor Publish muss deshalb eine dokumentierte
      Entscheidung stehen: Risikoakzeptanz mit Begründung oder Migration.
      Die Migration selbst gehört nach Publish.
  - id: S02
    paket: "vite@7.3.6"
    pfad: "(direkte Abhängigkeit); außerdem über @lovable.dev/vite-tanstack-config, @tanstack/react-start, vitest und weitere"
    laufzeit: build_test_dev
    advisories:
      - "GHSA-9jrq-w75r-8gcw (CVE-2026-112945)"
      - "GHSA-rq7h-c2jc-7f22 (CVE-2026-112946)"
      - "GHSA-587h-7wmj-h5pm (CVE-2026-112942)"
      - "GHSA-698v-4r3x-3vcv (CVE-2026-112943)"
      - "GHSA-r825-w8mm-5pxw (CVE-2026-112944)"
    schweregrad: "1 hoch, 3 mittel, 1 niedrig"
    behoben_in: "7.3.7"
    erreichbarkeit: >-
      Nur im Dev-Server (Middleware, server.fs.allow, „im Editor öffnen“).
      Nicht im ausgelieferten Bundle. Die Lovable-Vorschau betreibt den
      Dev-Server in einer Linux-Sandbox (vite.config.ts:3-5 nennt
      „sandbox detection (port/host/strictPort)“). Ob sie von außen erreichbar
      ist, ist nicht ermittelbar. GHSA-rq7h-c2jc-7f22 betrifft ausdrücklich
      Nicht-Windows-Systeme.
    beleg: "package.json:163 (devDependencies); bun.lock:1581; vite.config.ts:3-5"
    update_ohne_major: true
    klasse: nach_publish
    begruendung: >-
      Patch-Version im Bereich ^7.3.6. Höher priorisiert als die übrigen
      Dev-Funde, weil der Dev-Server der Lovable-Vorschau möglicherweise
      erreichbar ist. Kein Einfluss auf das veröffentlichte Bundle.
  - id: S03
    paket: "launch-editor@2.14.1"
    pfad: "@lovable.dev/vite-tanstack-config > @tanstack/devtools-vite > launch-editor"
    laufzeit: build_test_dev
    advisories:
      - "GHSA-587h-7wmj-h5pm (CVE-2026-112942)"
      - "GHSA-698v-4r3x-3vcv (CVE-2026-112943)"
      - "GHSA-r825-w8mm-5pxw (CVE-2026-112944)"
    schweregrad: "1 hoch, 2 mittel"
    behoben_in: "2.14.2"
    erreichbarkeit: >-
      Nur Dev-Server (Devtools „im Editor öffnen“), zwei Hinweise nur unter
      Windows. Derselbe Pfad wie K2 (shell-quote) aus A02.
    beleg: "package.json:138 (devDependencies, @lovable.dev/vite-tanstack-config 2.26.5 fest); bun.lock:713 (^2.11.1); bun.lock:1223"
    update_ohne_major: true
    klasse: nach_publish
    begruendung: >-
      Im Bereich ^2.11.1, über overrides wie bei K2 umsetzbar. Gleicher
      PR-Zuschnitt wie S02 ist möglich, LG-05 verlangt aber einen eigenen
      geprüften PR je Anhebung.
  - id: S04
    paket: "undici@7.29.0"
    pfad: "jsdom > undici; @cloudflare/vite-plugin > miniflare > undici; nitro > env-runner > miniflare > undici"
    laufzeit: build_test_dev
    advisories:
      - "GHSA-3wwx-pv8p-q78v"
      - "GHSA-pmjh-fq2x-6v4x"
      - "GHSA-r53p-7pc4-xj5r"
      - "GHSA-rfgv-xxqx-mfg5"
      - "GHSA-3xpg-4rpp-hhhm"
      - "GHSA-2jfj-6hjv-fm6j"
      - "GHSA-2gqq-gqf2-x968"
      - "GHSA-w293-vg96-wgc3"
      - "GHSA-8436-99hf-9mmv"
      - "GHSA-rx4f-c7p8-82vq"
      - "GHSA-4qv8-2p9j-2685"
      - "GHSA-f72v-6w45-q472"
      - "GHSA-xjj6-f33q-929c"
      - "GHSA-4w7w-5xrc-9h26"
      - "GHSA-2m5v-pch6-74hx"
      - "GHSA-qrxm-fqhp-jwvm"
      - "GHSA-9fm3-97px-rjf6"
      - "GHSA-55wc-3pg8-jfw6"
    schweregrad: "6 hoch, 9 mittel, 3 niedrig"
    behoben_in: "7.29.1 (10 Hinweise), 7.30.1 (alle 18)"
    erreichbarkeit: >-
      Nur Test (jsdom) und lokale Worker-Simulation (miniflare). Der
      Cloudflare-Worker nutzt das native fetch von workerd. Kein Import von
      undici in src/. Ob ein Build undici in das Worker-Bundle zieht, ist
      ohne Build nicht ermittelbar. Die Pfade sprechen dagegen.
    beleg: >-
      package.json:74 (@cloudflare/vite-plugin 1.53.1 fest, dependencies),
      :119 (nitro), :157 (jsdom, devDependencies); bun.lock:1285 (miniflare
      setzt undici fest auf 7.29.0); bun.lock:1551; git grep ohne Treffer auf
      Imports von undici in src/
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: >-
      Hohe Hinweise betreffen TLS und Caching im Node-Client, der hier nur in
      Test und lokaler Simulation läuft. Anhebung per overrides auf 7.30.1 oder
      mit einem neueren @cloudflare/vite-plugin/miniflare, das die feste
      Version anhebt.
  - id: S05
    paket: "sharp@0.35.2"
    pfad: "@cloudflare/vite-plugin > miniflare > sharp; nitro > env-runner > miniflare > sharp"
    laufzeit: build_test_dev
    advisories: ["GHSA-rgj7-g3m4-5g8c", "GHSA-wq5f-xc86-pv6w (librsvg CVE-2026-96889)"]
    schweregrad: "2 hoch"
    behoben_in: "0.35.5"
    erreichbarkeit: >-
      Nur lokale Worker-Simulation (Bild-Binding von miniflare). Die App
      verarbeitet keine HEIF- oder SVG-Bilder mit sharp, und in src/ gibt es
      keinen Import von sharp.
    beleg: "bun.lock:1285 (miniflare setzt sharp fest auf 0.35.2); bun.lock:1453; package.json:74"
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: "Wie S04: über overrides oder ein Plugin-Update. Native Binärdateien, deshalb Dev-Start auf Windows und Linux prüfen."
  - id: S06
    paket: "fast-uri@3.1.5"
    pfad: "ajv > fast-uri"
    laufzeit: build_test_dev
    advisories:
      - "GHSA-5jgf-p345-68v8"
      - "GHSA-f65p-4m7j-42xc"
      - "GHSA-fph4-wmhf-6fwf"
      - "GHSA-jqff-g426-hqxp"
      - "GHSA-qw65-cvwx-89v3"
      - "GHSA-hrr3-gc8f-f4qj"
      - "GHSA-w74x-v6f9-j3xg"
      - "GHSA-xhq7-xmqj-769h"
      - "GHSA-wjr9-j795-jxcr"
      - "GHSA-333x-w4r6-6crp"
    schweregrad: "5 hoch, 3 mittel, 2 niedrig"
    behoben_in: "3.1.9"
    erreichbarkeit: >-
      ajv wird nur im Prüfskript project-status:check genutzt. Es validiert
      Schemata aus dem Repo, also keine fremden URIs. Keine SSRF-Fläche.
    beleg: "package.json:149 (ajv, devDependencies), :19; scripts/project-status/check.mjs (import Ajv2020); bun.lock:861 (fast-uri ^3.0.1); bun.lock:1087"
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: "Nur CI- und Doku-Prüfung, Eingaben stammen aus dem Repo. Lockfile-Update im Bereich."
  - id: S07
    paket: "@vitest/mocker@4.1.9, vitest@4.1.9"
    pfad: "vitest > @vitest/mocker; vitest (direkt), @vitest/coverage-v8, @vitest/ui, vitest-axe"
    laufzeit: build_test_dev
    advisories: ["GHSA-82fw-gwwq-j7x9 (CVE-2026-84373)", "GHSA-qxg6-89mg-rqv8 (CVE-2026-112949)"]
    schweregrad: "3 mittel (eine Kennung doppelt gezählt)"
    behoben_in: "4.1.12"
    erreichbarkeit: "Nur während laufender Tests oder der Vitest-UI auf dem Entwicklerrechner beziehungsweise in CI."
    beleg: "package.json:164, :147, :148, :165 (devDependencies); bun.lock:843, :1587"
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: "Patch im Bereich ^4.1.9. vitest und alle @vitest/*-Pakete gemeinsam anheben (gleiche Version)."
  - id: S08
    paket: "browserslist@4.28.2"
    pfad: "@babel/core > @babel/helper-compilation-targets > browserslist (über @tanstack/router-plugin, @vitejs/plugin-react, @tanstack/react-start)"
    laufzeit: build_test_dev
    advisories: ["GHSA-c83g-rgw3-j3cx (CVE-2026-73089)", "GHSA-73wf-gq98-2v4g (CVE-2026-73088)"]
    schweregrad: "2 hoch"
    behoben_in: "4.28.7"
    erreichbarkeit: "Nur Build. Abfragen und browserslist-stats.json stammen aus dem Repo, nicht von Nutzern."
    beleg: "bun.lock:125 (^4.24.0); bun.lock:895"
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: "Keine fremden Eingaben. Lockfile-Update im Bereich."
  - id: S09
    paket: "baseline-browser-mapping@2.10.21"
    pfad: "@babel/helper-compilation-targets > browserslist > baseline-browser-mapping"
    laufzeit: build_test_dev
    advisories: ["GHSA-w5vr-8v7q-w6rv (CVE-2026-45819)"]
    schweregrad: mittel
    behoben_in: "2.11.0"
    erreichbarkeit: "Nur Build."
    beleg: "bun.lock:895 (^2.10.12); bun.lock:887"
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: "Wie S08, gemeinsam anheben."
  - id: S10
    paket: "source-map-js@1.2.1"
    pfad: "vite > postcss; @tailwindcss/vite > @tailwindcss/node; jsdom > ... > css-tree; @vitest/coverage-v8 > magicast"
    laufzeit: build_test_dev
    advisories: ["GHSA-68fv-2mgg-jv7q (CVE-2026-93749)"]
    schweregrad: hoch
    behoben_in: "1.2.2"
    erreichbarkeit: "Nur Build und Test. Source-Maps stammen aus eigenen Quellen und Paketen."
    beleg: "package.json:103 (@tailwindcss/vite, dependencies, Build-Plugin); bun.lock:1471"
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: "DoS des Build-Prozesses nur mit präparierten Source-Maps, also über die Lieferkette. Lockfile-Update im Bereich."
  - id: S11
    paket: "js-yaml@4.3.1"
    pfad: "eslint > @eslint/eslintrc > js-yaml; @tanstack/react-start > @tanstack/start-plugin-core > xmlbuilder2 > js-yaml"
    laufzeit: build_test_dev
    advisories: ["GHSA-2883-xcg3-v3hh (CVE-2026-84375)"]
    schweregrad: hoch
    behoben_in: "4.3.2"
    erreichbarkeit: >-
      Lint und Build-Plugin (start-plugin-core). Die App liest YAML in Skripten
      mit dem Paket yaml, nicht mit js-yaml. Keine fremden YAML-Eingaben zur
      Laufzeit.
    beleg: "bun.lock:261, :745, :1625 (^4.1.1); bun.lock:1199; package.json:150"
    update_ohne_major: true
    klasse: dev_only_beobachten
    begruendung: "CPU-DoS nur mit präparierten Merge-Schlüsseln im Build. Lockfile-Update im Bereich."
  - id: S12
    paket: "brace-expansion@1.1.18 und @5.0.9"
    pfad: "eslint > @eslint/eslintrc > minimatch@3 > brace-expansion; typescript-eslint > ... > typescript-estree > minimatch@10 > brace-expansion"
    laufzeit: build_test_dev
    advisories:
      - "GHSA-qhr7-859c-m2p7 (CVE-2026-102278)"
      - "GHSA-6j4f-fj2g-mc7p (CVE-2026-102276)"
      - "GHSA-q2hr-2g5m-vwhr (CVE-2026-102277)"
    schweregrad: "4 hoch, 2 mittel (je Linie gezählt)"
    behoben_in: "1.1.21 und 5.0.12"
    erreichbarkeit: "Nur Lint. Die Glob-Muster stammen aus der ESLint-Konfiguration im Repo."
    beleg: "bun.lock:1289 (^1.1.7), :1753 (^5.0.5); bun.lock:893, :1907; package.json:150, :162"
    update_ohne_major: true
    klasse: ignorieren
    begruendung: "Keine fremden Eingaben, kein Laufzeitbezug. Beim nächsten Sammel-Update im Bereich mitnehmen, ohne eigenen Aufwand."
  - id: S13
    paket: "minimatch@10.2.5 (minimatch@3.1.5 liegt außerhalb des Bereichs und ist nicht betroffen)"
    pfad: "typescript-eslint > @typescript-eslint/utils > @typescript-eslint/typescript-estree > minimatch"
    laufzeit: build_test_dev
    advisories: ["GHSA-g3hv-75wg-m249 (CVE-2026-118764)"]
    schweregrad: mittel
    behoben_in: "11.0.1"
    erreichbarkeit: "Nur Lint, Muster aus dem Repo."
    beleg: "bun.lock:831 (^10.2.2); bun.lock:1753; package.json:162"
    update_ohne_major: false
    klasse: ignorieren
    begruendung: "Die Behebung braucht minimatch 11, typescript-estree verlangt ^10. Ein Override über die Major-Grenze wäre riskanter als der Fund. Abwarten, bis typescript-eslint nachzieht."
  - id: S14
    paket: "dompurify@3.4.13 (vier weitere Hinweise neben K1)"
    pfad: "jspdf > dompurify"
    laufzeit: client
    advisories:
      - "GHSA-mrv2-3pqr-j5jr"
      - "GHSA-p98j-92pf-mc4p"
      - "GHSA-6688-9rhm-gjv2"
      - "GHSA-c6gr-qvv4-5v3f"
    schweregrad: "1 hoch, 3 niedrig"
    behoben_in: "3.4.17 (mit PR 285/287)"
    erreichbarkeit: "Wie K1 in A02: nicht erreichbar, doc.html() wird nicht verwendet."
    beleg: "docs/BERICHT-AUDIT-2026-11-04.md (K1); diff der bun-audit-Ausgaben main gegen PR 287"
    update_ohne_major: true
    klasse: entfaellt_mit_pr_287
    begruendung: "Teil der 58, mit dem Merge von PR 287 erledigt. Nicht in der Zählung der 54."
```

## Priorisierung je Klasse

| Klasse              | Funde                                            | Aufwand_h                               | Prüfumfang                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vor Publish         | S01 `zod` (1)                                    | 1 (Entscheidung); Migration danach 8–16 | Entscheidung mit Begründung im Tracker: Validierung erst nach Anmeldung, nur DoS, Größe der Anfrage begrenzt. Optional Lasttest einer Server-Funktion mit großem Array in der Vorschau. Die Migration auf zod 4 ist ein eigener Auftrag. |
| nach Publish        | S02 `vite` (5), S03 `launch-editor` (3)          | 2                                       | Je ein PR: `vite` ^7.3.7 sowie `overrides` für `launch-editor` 2.14.2. Build, `npm run dev`, Devtools „im Editor öffnen“, Lovable-Vorschau startet, E2E-Rauchtest.                                                                       |
| Dev-only beobachten | S04 `undici` (18), S05 `sharp` (2), S06–S11 (18) | 4                                       | PR A: Lockfile-Update im Bereich (S06–S11): `bun run test`, Lint, Build, `project-status:check`. PR B: `@cloudflare/vite-plugin` beziehungsweise `overrides` für `undici` 7.30.1 und `sharp` 0.35.5: Build, Dev-Start (Windows), CI.     |
| ignorieren          | S12 `brace-expansion` (6), S13 `minimatch` (1)   | 0                                       | Keiner. Mitnehmen, wenn PR A oder ein `typescript-eslint`-Update es ohne Zusatzaufwand erlaubt. Bei der nächsten Sammelbewertung erneut ansehen.                                                                                         |
| entfällt mit PR 287 | S14 `dompurify` (4 aus den 58)                   | 0                                       | Erledigt durch die Prüfung von PR 285/287.                                                                                                                                                                                               |

Summe: 54 offene Funde nach PR 287, dazu 4 mit PR 287 erledigte. Aufwand ohne zod-Migration 7 h, mit Migration 15–23 h.

## Bezug LG-05 bis LG-08

| Regel | Folgerung für diese Funde                                                                                                                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LG-05 | Keine der Anhebungen darf die Plattform ungefragt ausführen. Jede Anhebung muss beauftragt sein und als eigener PR mit Lockfile geprüft werden (PR A, PR B, `vite`, `launch-editor`, später `zod`). Kein `bun audit fix` ohne Auftrag.         |
| LG-06 | Fordert Lovable eine dieser Anhebungen, muss die GHSA-Kennung genannt werden. Die Kennungen dieses Berichts sind an der GitHub-Advisory-Datenbank geprüft (`gh api advisories/<GHSA>`, behobene Versionen). Kritisch ist nach PR 287 keiner.   |
| LG-07 | Änderungen an `package.json` (`overrides`), `bun.lock` und gegebenenfalls `vite.config.ts` müssen vor der Übernahme einzeln geprüft sein. Das gilt besonders für PR B, weil `@cloudflare/vite-plugin` den Build für den Worker stellt.         |
| LG-08 | Führt Lovable eine Anhebung im Plattformstand aus, muss sie per PR nach `main`. Sonst kehrt der alte Stand mit dem nächsten Abgleich zurück. Nach jedem Merge muss Lovable den Stand übernehmen (LG-03), sonst bleibt die Vorschau verwundbar. |

## Grenzen

- Keine Pakete geändert, kein `bun install`, kein Build. Die Aussage „nicht im Worker-Bundle“ für `undici` und `sharp` beruht auf den Abhängigkeitspfaden und fehlenden Imports, nicht auf einer Prüfung des Build-Ergebnisses.
- Die Reihenfolge Middleware vor Validator ist an der lokal installierten Version `@tanstack/start-client-core` 1.170.34 belegt (gleiche Version wie im Lock), nicht am veröffentlichten Bundle.
- Ob `zod` 3.x tatsächlich betroffen ist, ist nicht ermittelbar. Das Advisory beschreibt Code von zod 4 und führt eine CVE-Kennung aus dem Jahr 2023. Der Bericht folgt dem angegebenen Bereich <4.6.6.
- Ob der Dev-Server der Lovable-Vorschau öffentlich erreichbar ist, ist nicht ermittelbar.
- Der veröffentlichte Stand 1.69.0 ist nicht bewertet (siehe A02, R-07).

## Gekürzte Ausgabe von bun audit

```text
# main 02cb3d28 (bun audit v1.4.3)
dompurify@3.4.13      jspdf > dompurify                       1 critical, 1 high, 3 low
shell-quote@1.9.0     ... > launch-editor > shell-quote        1 critical
60 vulnerabilities (2 critical, 25 high, 24 moderate, 9 low)

# PR 287 fix/audit-shell-quote 46607da8 (overrides dompurify 3.4.17, shell-quote 1.12.0)
@vitest/mocker@4.1.9                vitest > @vitest/mocker                          2 moderate
baseline-browser-mapping@2.10.21    ... > browserslist > baseline-browser-mapping    1 moderate
brace-expansion@1.1.18, 5.0.9       eslint / typescript-eslint > minimatch          4 high, 2 moderate
browserslist@4.28.2                 @babel/core > ... > browserslist                2 high
fast-uri@3.1.5                      ajv > fast-uri                                   5 high, 3 moderate, 2 low
js-yaml@4.3.1                       eslint, start-plugin-core > xmlbuilder2          1 high
launch-editor@2.14.1                @tanstack/devtools-vite > launch-editor          1 high, 2 moderate
minimatch@3.1.5, 10.2.5             eslint / typescript-eslint                       1 moderate
sharp@0.35.2                        miniflare > sharp                                2 high
source-map-js@1.2.1                 postcss, @tailwindcss/node, css-tree, magicast   1 high
undici@7.29.0                       jsdom, miniflare > undici                        6 high, 9 moderate, 3 low
vite@7.3.6                          (direct dependency)                              1 high, 3 moderate, 1 low
vitest@4.1.9                        (direct dependency)                              1 moderate
zod@3.25.76, 4.6.7                  (direct dependency), router-generator            1 high
54 vulnerabilities (24 high, 24 moderate, 6 low)
```
