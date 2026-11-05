---
id: A01
titel: "QS6-4 Ist-Analyse: Beträge serverseitig"
status: erledigt
start: 2026-11-05T05:38+01:00
ende: 2026-11-05T05:44+01:00
branch: docs/2026-11-05-teilautomatik
pr: offen (Tagesbündel, noch nicht angelegt)
commit: f61afc28
ci: "nicht gelaufen (kein PR), Head-SHA f61afc28"
---

# A01 Bericht

## Ergebnis

Kein Server-Pfad auf `main` 9ab42d15 speichert oder liefert Sätze, Beträge oder Umsätze. Die Datenbank kennt nur Stunden, `billable` und `billing_status`.
Der Server nimmt `hourlyRate` beim Veröffentlichen an, verwirft den Wert aber.
Die Lücke liegt im Browser: „Export…“, „Import / Export…“ und der Text-Export geben Beträge ohne `billing.view` aus (QS6-5).
Empfehlung: QS6-4 als „kein Serverbefund“ schließen, QS6-5 als ein PR (7 bis 11 h), optional `hourlyRate` aus dem Publish-Schema entfernen.
Vollbericht: `docs/BERICHT-QS6-4-ANALYSE.md` (Commit f61afc28).

| Punkt | Beobachtung | Beleg |
| --- | --- | --- |
| Tabellen ohne Satz | Projektion und Leistungsnachweis ohne Satz- oder Betragsspalte | `src/integrations/supabase/types.ts:1125-1148`, `:603-626`, `:707-729` |
| `billing.view` in SQL | 0 Fundstellen | `grep -rn billing.view supabase` → leer |
| Satz wird verworfen | Adapter schreibt kein `hourlyRate`, Hash ohne Satz | `src/integrations/supabase/shared-projection-adapter.ts:95-117` |
| Publish-Schema | `hourlyRate` Pflichtfeld im Eingang | `src/lib/customer-data-runtime/shared-projection.schema.ts:79` |
| `/api/sync` | liefert nur Zählwerte | `backend/services/syncService.mjs:34-63` |
| Export ohne Recht | Menüpunkt und Dialog ohne `billing.view` | `src/components/dashboard/header/ServiceMenu.tsx:102-110`, `src/lib/export-data.ts:74-75` |
| JSON-Export | `hourlyRate` je Tätigkeit | `src/lib/json-export-service.ts:204` |
| E2E-Abdeckung | QS-06-Test prüft nur Kachel und Reiter | `e2e/specs/rbac/qs06-billing-view.spec.ts:13`, `:24` |

## Offene Fragen, Risiken, Abweichungen

- Offene Frage an den Owner: QS6-4 schließen und QS6-5 als Gate behalten?
- Risiko: Spalten, die nur am Live-System und nicht in den Migrationen existieren, sind nicht erfasst (R-10). Der veröffentlichte Stand 1.69.0 ist nicht geprüft.
- Abweichungen vom Auftrag: keine. Der Bericht liegt wie verlangt in `docs/`. Er ist im Tagesbündel-Branch committet, ein PR ist noch nicht angelegt (Bündelung nach CLAUDE.md Regel 7).
- Hinweis zur Einrichtung: Die ZIP-Datei enthielt A01 bis A14, angekündigt waren A01 bis A10. Alle 14 Aufträge wurden übernommen, weil `INDEX.yaml` A11 bis A14 als bereit führt.

Hygiene: 0 gemergte Remote-Branches, 8 offene PRs, davon 7 Drafts.

```yaml
Reifegrad: Golden Gate Testphase, QS-06 Oberfläche abgenommen, Export (QS6-5) offen
Projektstatus: Publish No-Go (R-07, QS6-5, R-14)
Offene_Fragen:
  - QS6-4 schließen?
  - QS6-5 Umsetzung beauftragen?
Roadmap:
  Sprints_bis_BSF: nicht neu bewertet
  Sprints_bis_MVP: nicht neu bewertet
```
