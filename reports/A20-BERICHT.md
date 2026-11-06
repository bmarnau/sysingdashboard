---
id: A20
titel: "Audit-Sammelbewertung: die 58 weiteren bun-audit-Funde"
status: erledigt
start: 2026-11-06T06:24+01:00
ende: 2026-11-06T06:34+01:00
branch: docs/2026-11-06-tagesbuendel
pr: "286 (Draft, Tagesbündel)"
commit: d7843a4a
ci: "läuft (Head d7843a4a)"
---

# Bericht A20


## Ergebnis

1. `main` 02cb3d28: 60 Funde (2/25/24/9). PR 287 (46607da8): 54 Funde (0/24/24/6) in 13 Gruppen.
2. Von den 58 in A02 nicht bewerteten Funden erledigt PR 285/287 vier weitere `dompurify`-Hinweise (1 hoch, 3 niedrig).
3. Im ausgelieferten Code liegt nur `zod@3.25.76` (Server-Funktionen, nur nach Anmeldung). Behoben erst in 4.6.6 (Major-Sprung).
4. Klassen: vor Publish 1 Fund (1 h), nach Publish 8 (2 h), Dev-only 38 (4 h), ignorieren 7 (0 h). Die zod-Migration kommt danach (8–16 h).
5. Alle Anhebungen außer zod und minimatch sind ohne Major-Sprung möglich, `undici` und `sharp` nur über `overrides` oder ein Plugin-Update.

| Punkt                    | Beobachtung                                                                                       | Beleg                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Zahlen main              | 60 (2 kritisch, 25 hoch, 24 mittel, 9 niedrig), 16 Pakete                                         | `bun audit` v1.4.3 auf `git show origin/main:{package.json,bun.lock}`     |
| Zahlen PR 287            | 54 (0 kritisch, 24 hoch, 24 mittel, 6 niedrig), 14 Pakete, 47 eindeutige GHSA                     | `bun audit` auf `origin/fix/audit-shell-quote` 46607da8                   |
| Wegfall durch PR 285/287 | `dompurify` 5 Hinweise (davon K1), `shell-quote` 1 (K2)                                           | `diff` der beiden Ausgaben; `package.json` `overrides` in PR 287          |
| zod Laufzeit             | Server-Funktionen validieren mit zod, Validator läuft nach `requireSupabaseAuth`                  | `shared-projection.functions.ts:96-98`; `createServerFn.js:43` (1.170.34) |
| zod Behebung             | nur 4.6.6, keine Korrektur für 3.x; Betroffenheit von 3.x unklar (Advisory beschreibt zod-4-Code) | `gh api advisories/GHSA-mrhx-c7xc-m3w5`; `package.json:133`               |
| vite und launch-editor   | nur Dev-Server, Patch im Bereich (7.3.7, 2.14.2)                                                  | `package.json:163`, `:138`; `bun.lock:713`                                |
| undici und sharp         | nur über miniflare (fest gepinnt) und jsdom, kein Import in src/                                  | `bun.lock:1285`; `package.json:74`, `:157`                                |
| fast-uri                 | nur über ajv im Prüfskript `project-status:check`                                                 | `package.json:149`, `:19`; `scripts/project-status/check.mjs`             |
| minimatch 10             | Behebung nur in 11.0.1, `typescript-estree` verlangt ^10.2.2                                      | `bun.lock:831`                                                            |

## Abweichungen und Fragen

- Die Advisory GHSA-mrhx-c7xc-m3w5 führt CVE-2023-54404 und beschreibt `$ZodArray` (zod 4), gilt aber laut Bereich für alles unter 4.6.6. Owner-Entscheidung: Ist zod 3 als betroffen zu behandeln?
- Vor Publish genügt bei zod Risikoakzeptanz (nur angemeldete Nutzer, nur DoS)? Oder wird die Migration auf zod 4 vorgezogen?
- Ist der Dev-Server der Lovable-Vorschau von außen erreichbar? Davon hängt ab, wie dringlich `vite` und `launch-editor` sind.
- Ohne Build nicht belegt: `undici` und `sharp` gelangen nicht in das Worker-Bundle.
- In den Hinweisen `GHSA-rgj7` und `GHSA-wq5f` zu `sharp` fehlt die CVE-Kennung (Advisory-Datenbank).

## Abschluss

- Stichprobe durch Claude Code: `zod` ist direkte Abhängigkeit (`package.json:133`, `^3.25.76`); `bun audit` meldet auf `main` 60 und mit PR 287 54 Funde (0 kritisch).
- Grenze eingehalten: keine Pakete oder Lockfiles geändert; `bun audit` lief auf Kopien von `package.json` und `bun.lock` in einem Scratch-Verzeichnis.

Hygiene: 0 gemergte Remote-Branches, 7 offene PRs, davon 6 Drafts.

```yaml
Reifegrad: Audit-Funde vollständig eingeordnet
Projektstatus: Publish No-Go (R-07, R-14); vor Publish nur Entscheidung zu zod 3
Offene_Fragen:
  - zod 3 als betroffen behandeln, Risikoakzeptanz oder Migration auf zod 4?
  - Ist der Dev-Server der Lovable-Vorschau von außen erreichbar (Dringlichkeit vite und launch-editor)?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
