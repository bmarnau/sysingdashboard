---
id: A02
titel: "bun audit: zwei verbleibende kritische Funde"
status: erledigt
start: 2026-11-05T06:20+01:00
ende: 2026-11-05T05:48+01:00
branch: docs/2026-11-05-teilautomatik
pr: offen (Tagesbündel, noch nicht angelegt)
commit: 796ed511
ci: "nicht gelaufen (kein PR), Head-SHA 796ed511"
---

# A02 Bericht

## Ergebnis

`bun audit` auf `main` 9ab42d15: 60 Funde, davon 2 kritisch.
K1 `dompurify@3.4.13` (über `jspdf`, GHSA-cg2g-xh64-v4q7): Client-Laufzeit, der Pfad `doc.html()` wird nicht genutzt. Behebung: 3.4.17 per `overrides`.
K2 `shell-quote@1.9.0` (über `@tanstack/devtools-vite > launch-editor`, GHSA-pqg4-j6r4-53mv): nur im Dev-Server. Behebung: 1.12.0 per `overrides`.
TanStack (GHSA-qx66-fv34-fjm8) ist auf `main` behoben. Der Release-Commit 1.69.0 war verwundbar, ob das auch für den veröffentlichten Stand gilt, ist nicht ermittelbar.
Vollbericht: `docs/BERICHT-AUDIT-2026-11-04.md` (Commit 796ed511).

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Gesamtzahl | 60 (2 kritisch, 25 hoch, 24 mittel, 9 niedrig) | `bun audit`, letzte Zeile |
| K1 Pfad | `jspdf > dompurify` | `bun.lock:1009`, `:1213` |
| K1 erreichbar | kein `.html(` und kein DOMPurify im Code | `grep -rnE '\.html\(\|dompurify' src` → leer |
| K2 Pfad | `launch-editor > shell-quote`, nur Devtools | `bun.lock:1223`, `:1459` |
| TanStack main | react-start 1.168.60, start-server-core 1.169.39 | `bun.lock`, PR 276 Merge 44b5ebf5 |
| TanStack 1.69.0 | 1.168.26 und 1.169.15, verwundbar | `git show 3732df26:bun.lock` |
| Tag v1.69.0 | fehlt (letzter v1.65.0) | `git tag --list` |

## Offene Fragen, Risiken, Abweichungen

- Offene Frage an den Owner: K1 und K2 als je einen PR beauftragen? Danach muss Lovable den Stand übernehmen.
- Risiko: Der veröffentlichte Stand 1.69.0 ist wahrscheinlich von GHSA-qx66-fv34-fjm8 betroffen (XSS ohne Anmeldung). Prüfen lässt sich das nur am ausgelieferten Bundle. Das spricht für einen baldigen Publish, sobald R-07 geklärt ist.
- Risiko: 58 weitere Funde (u. a. `sharp` 2 × hoch) sind nicht bewertet. Vorschlag: Backlog-Eintrag „Sammelbewertung Audit“.
- Abweichung: Dateiname folgt dem Auftrag (`BERICHT-AUDIT-2026-11-04.md`), die Messung stammt aber vom 2026-11-05.
- Korrektur: Tippfehler im Setup-Bericht (`7213406x` → `72134063`) mit diesem Commit behoben.

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Golden Gate Testphase, Abhängigkeiten bewertet (nur kritisch)
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - K1 und K2 beauftragen?
  - Veröffentlichten Stand am Bundle auf TanStack prüfen?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
