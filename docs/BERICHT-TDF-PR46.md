# Kurzbericht TDF-PR #46 (Modul M-9 Artefaktverzeichnis)

Stand: 2026-11-05 · Auftrag A10 (ops/queue) · Art: nur lesen · Repository: `bmarnau-standards/technical-documentation-framework`

## Ergebnis

1. PR #46 ist bereits gemergt (2026-11-03 10:38 UTC, durch bmarnau, Merge-Commit 61443174). Die Frage nach der Merge-Reife ist damit überholt. Geprüft wurde der gemergte Stand.
2. Alle 17 Anforderungen ART-01 bis ART-17 sind übernommen. ART-03 bis ART-16 und ART-01 sind wortgleich mit `STANDARD-ERGAENZUNG-ARTEFAKTE.md` (Entwurf vom 03.11.).
3. Zwei Abweichungen im Wortlaut: ART-02 nennt „Plattformprojekt (zum Beispiel Lovable …)“ statt „Lovable-Projekt“ (in der Versionshistorie vermerkt). ART-17 hat „zum Beispiel `docs/NACHWEISE.yaml`“ statt „`docs/NACHWEISE.yaml`“ (nicht vermerkt, inhaltlich eine Abschwächung von fest zu beispielhaft).
4. CI am Head-Commit 11 von 11 grün, am Merge-Commit 5 von 5 grün (Claude-Review übersprungen).
5. Die Projektdoku ist veraltet: `docs/ARTEFAKTE.yaml` (Zeilen 2 und 164) und `docs/CURRENT-STATUS.md` führen PR 46 als offen.

## Prüftabelle

| Prüfpunkt                     | Ergebnis                                                                                                                                                       | Beleg                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Status                        | gemergt 2026-11-03T10:38:31Z, bmarnau                                                                                                                          | `gh api repos/bmarnau-standards/technical-documentation-framework/pulls/46` |
| Umfang                        | 5 Dateien, +103 −6: `docs/artifact-register.md` (neu), `docs/project-planning-standard.md`, `framework-manifest.yaml`, `README.md`, `CHANGELOG.md`             | `pulls/46/files`                                                            |
| CI Head eda5d4bb              | 11/11 success (markdown-lint, yaml-validate, link-check-internal, evidence-check-test, manifest-check, claude-review)                                          | `commits/eda5d4bb/check-runs`                                               |
| CI Merge 61443174             | 5/5 success, `claude` skipped                                                                                                                                  | `commits/61443174/check-runs`                                               |
| Konflikte                     | entfällt (gemergt), `main` seitdem unverändert (letzter Commit 61443174)                                                                                       | `commits?sha=main`                                                          |
| ART-01 bis ART-17 vollständig | 17 von 17                                                                                                                                                      | `grep '^\| ART-'` in beiden Dateien                                         |
| Wortgleichheit                | 15 von 17 gleich; ART-02 und ART-17 abweichend                                                                                                                 | `diff` der Tabellenzeilen                                                   |
| Strukturregeln                | Kopf nach Vorlage der Nachbarmodule, Version 0.1.0-draft, Versionshistorie mit KI-Kennzeichnung, Sprachabweichung nach `language-policy-standard.md` begründet | `docs/artifact-register.md` Zeilen 1-12, Schluss                            |
| Verweise                      | REST-14 und REST-26 zeigen auf einen Entwurf außerhalb des Repositorys (im Dokument offen benannt)                                                             | `docs/artifact-register.md` Kopf, Abschnitt 5                               |
| Freigabe                      | „human validation pending“                                                                                                                                     | Versionshistorie                                                            |

## Empfehlung

- Keine Aktion in `technical-documentation-framework` nötig. Optional ein Folge-PR: ART-17-Änderung in der Versionshistorie nachtragen oder „zum Beispiel“ streichen (Entscheidung des Owners).
- Im Projekt `docs/ARTEFAKTE.yaml` (Zeilen 2, 160-164) und `docs/CURRENT-STATUS.md` auf „gemergt, 61443174“ korrigieren. Das gehört zum Doku-Nachtrag (A12) im Tagesbündel.
- Menschliche Prüfung von M-9 ausstehend.
