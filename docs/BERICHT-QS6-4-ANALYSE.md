# Bericht QS6-4: Beträge serverseitig (Ist-Analyse)

Stand: 2026-11-05 · Auftrag A01 (ops/queue) · Grundlage: `main` 9ab42d15 · Art: nur lesen

## Ergebnis

1. Kein Server-Pfad auf `main` speichert oder liefert Stundensätze, Beträge oder Umsätze aus. Die Datenbank kennt nur Stunden, `billable` und `billing_status`.
2. Der Server nimmt `hourlyRate` beim Veröffentlichen an (Schema), speichert den Wert aber nicht und nutzt ihn nicht im Hash.
3. Sätze und Beträge entstehen nur im Browser aus dem lokalen Speicher der angemeldeten Person (`localStorage`) oder aus den eingebauten Demodaten.
4. Die Lücke liegt bei den Exporten im Browser (QS6-5): „Export…“ (CSV, Excel, PDF), „Import / Export…“ (JSON) und Text-Export enthalten Satz und Betrag ohne Prüfung von `billing.view`.
5. Die Annahme in QS6-4 („Server liefert Beträge weiter aus“) ist am Code nicht belegbar. QS6-4 sollte als „kein Serverbefund“ geschlossen werden, QS6-5 bleibt Gate.

## Pfadtabelle

| Pfad                                                                                    | Datei                                                                                                                                          | liefert Betrag                                          | serverseitige Prüfung                                                                                                     | Lücke                                              | Aufwand (h) | Risiko                  |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------- | ----------------------- |
| Datenbanktabellen (Projektionen, Leistungsnachweis)                                     | `src/integrations/supabase/types.ts:1125-1148`, `:603-626`, `:707-729`                                                                         | nein (nur Stunden, `billable`, `billing_status`)        | RLS, nicht auf `billing.view`                                                                                             | keine                                              | 0           | niedrig                 |
| Server-Funktion Veröffentlichen (Eingang)                                               | `src/lib/customer-data-runtime/shared-projection.schema.ts:79`                                                                                 | nimmt `hourlyRate` an                                   | Schema-Prüfung                                                                                                            | Datensparsamkeit: Feld unnötig                     | 1           | niedrig                 |
| Speichern der Projektion                                                                | `src/integrations/supabase/shared-projection-adapter.ts:95-117`                                                                                | nein (Satz wird verworfen, nicht im `source_hash`)      | entfällt                                                                                                                  | keine                                              | 0           | niedrig                 |
| Server-Funktion Lesen der Projektion                                                    | `src/lib/customer-data-runtime/shared-projection.functions.ts:161-173`                                                                         | nein                                                    | Mitgliedschaft, RLS                                                                                                       | keine                                              | 0           | niedrig                 |
| Übrige Server-Funktionen (Cockpit, Controlling, AVKK, Kiosk, Leistungsnachweis, Konten) | `src/lib/*-runtime/*.functions.ts`, `src/lib/admin/auth-accounts.functions.ts`                                                                 | nein (keine Fundstelle für Satz, Betrag, Umsatz)        | je Funktion eigene Rechte                                                                                                 | keine                                              | 0           | niedrig                 |
| API `/api/sync`                                                                         | `src/routes/api/sync.ts:64`, `backend/services/syncService.mjs:34-63`                                                                          | nein (liefert nur Zählwerte, Live-Teil ist TODO)        | `azure.import`/`azure.export` über `has_permission`                                                                       | keine                                              | 0           | niedrig                 |
| API `/api/status`, `/api/public/auth-config`                                            | `src/routes/api/status.ts:16`, `src/routes/api/public/auth-config.ts:49`                                                                       | nein                                                    | entfällt                                                                                                                  | keine                                              | 0           | niedrig                 |
| Browser: Speicher der Arbeitsdaten                                                      | `src/lib/store/dashboard-persistence.ts:52`, `:91`                                                                                             | ja, eigene Sätze der Person                             | keine (lokal)                                                                                                             | keine Fremddaten; nur eigene Daten                 | 0           | niedrig                 |
| Browser: Demodaten                                                                      | `src/lib/demo-data/dataset.ts` (7 Fundstellen `hourlyRate`), `src/lib/demo-data/seed.ts:44`                                                    | ja, Demo-Sätze im Bundle und nach dem Laden im Speicher | keine                                                                                                                     | Demo-Sätze für jede Rolle lesbar                   | 0           | niedrig (nur Demowerte) |
| Browser: „Export…“ (CSV, Excel, PDF-Projektbericht)                                     | `src/components/dashboard/header/ServiceMenu.tsx:102-110`, `src/lib/export-data.ts:74-75`, `:277-303`, `:356`, `src/lib/pdf-export.ts:310-336` | ja, Betrag je Gruppe und Summe                          | keine; Menüpunkt ohne Rechteprüfung, `ExportDialog` ohne `billing.view`                                                   | QS6-5: Viewer, Engineer, Kiosk exportieren Beträge | 4 bis 6     | mittel                  |
| Browser: „Import / Export…“ (JSON)                                                      | `src/components/dashboard/header/ServiceMenu.tsx:202`, `src/lib/json-export-service.ts:204`                                                    | ja, `hourlyRate` je Tätigkeit                           | keine für `billing.view` (nur `avkk.view`, `performance.statement.manage`, `src/components/ImportExportDialog.tsx:87-88`) | QS6-5                                              | 2 bis 3     | mittel                  |
| Browser: Text-Export (CSV/JSON-Zeilen)                                                  | `src/lib/text-export.ts:102-122`, `:152-153`                                                                                                   | ja, `hourlyRate`, `AmountEur`                           | keine                                                                                                                     | QS6-5                                              | 1 bis 2     | mittel                  |
| Browser: Backup                                                                         | `src/components/dashboard/header/ServiceMenu.tsx:174-182`                                                                                      | ja (vollständiger Speicher)                             | Menüpunkt nur mit `backup.restore`                                                                                        | gewollt (Sicherung eigener Daten)                  | 0           | niedrig                 |

Gegenprobe: `billing.view` kommt in `supabase/migrations` nicht vor. Im Ordner `backend/` steht es nur als Spiegel der Rechtematrix (`backend/services/rbac.mjs:44`).

## Bewertung

- Ein Viewer sieht in der Netzwerkantwort keine fremden Sätze. Fremde Daten erreichen ihn nur über die Projektion, und die enthält keinen Satz.
- Was ein Viewer an Beträgen sehen kann, stammt aus seinem eigenen Speicher (eigene Eingaben oder Demodaten). Die Ausblendung in der Oberfläche (QS-06) ist dort Darstellung, kein Schutz. Bei eigenen Daten ist das vertretbar.
- Offen bleibt der Export. Die Rollen ohne `billing.view` erhalten Beträge in Dateien, obwohl die Oberfläche sie verbirgt. Das widerspricht der Handbuchaussage in `src/lib/help-documentation.ts:1843-1845`.

## Empfehlung zum Umsetzungsschnitt

1. QS6-4 schließen mit Verweis auf diesen Bericht (Entscheidung des Owners).
2. QS6-5 als ein PR „Exporte ohne Beträge ohne `billing.view`“: `ExportDialog`, `export-data.ts`, `pdf-export.ts`, `json-export-service.ts`, `text-export.ts`. Satz- und Betragsspalten sollten ohne Recht entfallen, nicht als 0 erscheinen (sonst Verwechslung mit Gratisleistung). Aufwand gesamt 7 bis 11 Stunden einschließlich Tests.
3. Optional, eigener kleiner PR: `hourlyRate` aus `shared-projection.schema.ts` entfernen (Datensparsamkeit). Vorher prüfen, ob ältere Clients das Feld senden (`.strip()` statt Fehler).

## Testkonzept

- Unit: je Exportfunktion ein Test mit und ohne `billing.view` (Spalten vorhanden oder nicht).
- E2E: `e2e/specs/rbac/qs06-billing-view.spec.ts` prüft heute nur Umsatz-Kachel und Reiter (Zeilen 13 und 24). Ergänzen: Viewer öffnet „Export…“, lädt CSV, Datei enthält keine Spalte „Betrag“ und keinen Satz. Gleiches für den JSON-Export.
- Netzwerk: E2E mit Viewer-Konto, Antwort von `readSharedCustomerProjectionFn` auf Felder `hourly`, `rate`, `amount` prüfen (Regressionsschutz).

## Grenzen der Analyse

- Nur Code auf `main` 9ab42d15. Keine Abfrage am Live-System, keine Laufzeitmessung im Browser.
- Der veröffentlichte Stand 1.69.0 ist nicht geprüft.
- Datenbank-Views und RPCs sind über `src/integrations/supabase/types.ts` und `supabase/migrations` ausgewertet. Eine Spalte, die nur am Live-System und nicht in den Migrationen existiert, wäre nicht erfasst (R-10).
