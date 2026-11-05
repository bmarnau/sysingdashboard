---
id: A07
titel: Standards in docs/ ablegen
status: blockiert
start: 2026-11-05T07:35+01:00
ende: 2026-11-05T05:59+01:00
branch: docs/2026-11-05-teilautomatik
pr: offen (Tagesbündel, noch nicht angelegt)
commit: 0a8dad47
ci: "nicht gelaufen (kein PR), Head-SHA 0a8dad47; docs:check und docs:project lokal grün"
---

# A07 Bericht

## Ergebnis

Teilweise erledigt. Abgelegt in `docs/standards/` (Status Entwurf, offene Punkte im Kopf): `STANDARD-WIEDERHERSTELLBARKEIT.md` (Fassung 7 Teil B, REST-01 bis REST-26, N1 bis N10), `STANDARD-ERGAENZUNG-ARTEFAKTE.md`, `BSI-MAPPING.yaml`. Verweise in `docs/ARTEFAKTE.yaml` sind ergänzt, PR 46 ist dort als gemergt korrigiert.
Blockiert: Ein **Notfallhandbuch** und der **Standard Lovable-Grenzen (LG-01 bis LG-12)** liegen nirgends als Datei vor (Downloads, Dokumente, Desktop, `C:\dev`). Sie sind in `ARTEFAKTE.yaml` als „nicht bereitgestellt“ markiert.
`ARTEFAKTE.yaml` wurde nicht aus Downloads übernommen, weil die Repo-Fassung neuer ist und die Download-Fassung vollständig enthält.

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Fassung 7 | PDF 14 Seiten, Teil A + B; Markdown = Teil B (gleiche 16 Abschnitte, 26 REST-IDs) | `pdftotext`, Abschnittsvergleich |
| Zugangsdaten | keine (Suche nach E-Mail, Token, Schlüssel) | `grep` über die drei Quelldateien |
| Konformität | keine Behauptung; REST-24 und REST-25 schließen sie aus, Kopf wiederholt das | Standard Zeilen 38-39, 267 |
| Pfadanpassung | `docs/BSI-MAPPING.yaml` → `docs/standards/BSI-MAPPING.yaml` im Standardtext (2 Stellen) | Standard Zeilen 295, 324 |
| Linkprüfung | intern alle ok außer `NOTFALL-HANDBUCH.md` (fehlt, gewollt markiert); extern 200, TDF-Link 404 nur ohne Anmeldung (Repo privat, Datei laut `gh api` vorhanden) | `curl`, `gh api …/contents/docs/artifact-register.md` |
| docs:check | „Doku ist synchron“ | `node scripts/check-docs-sync.mjs` |
| docs:project | „Projektdoku konsistent“ | `node scripts/check-project-docs.mjs` |
| YAML | BSI-MAPPING und ARTEFAKTE (33 Einträge) gültig | `yaml`-Parser |

## Offene Fragen, Risiken, Abweichungen

- Blockiert durch fehlende Eingaben: Owner muss Notfallhandbuch und Standard Lovable-Grenzen bereitstellen oder entscheiden, dass sie neu zu schreiben sind (eigener Auftrag). A08 und A09 hängen von A07 ab. Die abgelegten Teile reichen für beide inhaltlich aus (REST-09, REST-15 bis REST-21), die Entscheidung liegt beim Planer.
- Abweichung: Teil A der Fassung 7 ist nicht abgelegt (nur PDF). Die PDF liegt nicht in Git (Binärdatei, 400 KB).
- Abweichung: Die Ergänzung Artefakte ist als Ursprungsfassung abgelegt, mit Verweis auf das maßgebliche TDF-Modul M-9 (doppelte Quelle sonst unklar).
- Risiko: `docs/standards/STANDARD-WIEDERHERSTELLBARKEIT.md` ist eine Kopie. Ändert der Owner den Entwurf außerhalb von Git, laufen beide auseinander. Künftige Änderungen sollten nur noch in Git erfolgen.

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Standards Restore und BSI-Zuordnung versioniert (Entwurf)
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - Notfallhandbuch und Lovable-Grenzen bereitstellen?
  - A08 und A09 trotz A07 blockiert freigeben?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
