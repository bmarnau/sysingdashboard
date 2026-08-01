# Management-Zusammenfassung — Technical Debt

**Version 1.44.0** · 2026-08-01

| Kategorie | Wert |
| --------- | ---- |
| Findings gesamt | 60 |
| Critical | 0 |
| High | 1 |
| Medium | 9 |
| Low + Info | 50 |
| Neu seit Vorlauf | 3 |
| Behoben seit Vorlauf | 7 |

## Top-10 nach Priorität

1. **[Medium]** API-Endpoint ohne Eingabevalidierung — `src/routes/api/public/auth-config.ts` (`td-endpoint-zod-34111d3b`)
2. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/lib/help-documentation.ts:473` (`td-console-eb91ada9`)
3. **[Medium]** E2E-Suite ist bewusst nur Smoke — `e2e/` (`td-manual-playwright-smoke-only`)
4. **[Low]** MSW-Handler decken nur wenige Azure-Endpunkte — `src/__tests__/mocks/handlers/azure.ts` (`td-manual-msw-coverage-gap`)
5. **[Low]** API-Endpoint ohne strukturierte Fehlerantwort — `src/routes/api/status.ts` (`td-endpoint-err-cdae73c5`)
6. **[Low]** API-Endpoint ohne strukturierte Fehlerantwort — `src/routes/api/sync.ts` (`td-endpoint-err-ce5fa0be`)
7. **[Informational]** Dokumentierte Konsolen-Ausnahme (console-exc-worker-entry) — `src/start.ts:13` (`td-console-08e8609a`)
8. **[Informational]** Dokumentierte Konsolen-Ausnahme (console-exc-generated-supabase) — `src/integrations/supabase/auth-middleware.ts:45` (`td-console-2c49302b`)
9. **[Informational]** Dokumentierte Konsolen-Ausnahme (console-exc-generated-supabase) — `src/integrations/supabase/client.ts:54` (`td-console-43084e7a`)
10. **[Informational]** Dokumentierte Konsolen-Ausnahme (console-exc-generated-supabase) — `src/integrations/supabase/client.server.ts:42` (`td-console-665c1d8d`)

## Interpretation

- **Critical** blockiert die CI (Exit 2). Aktuell: 0.
- **High/Medium** sind Trend-Metriken — keine harte Gate, aber Steuerungssignal.
- Manuelle Findings pflegen Team-Wissen ab, das kein Detektor erkennt.

Vollständiger Bericht: `test-report/tech-debt.md`. Maßnahmenliste: `test-report/tech-debt-actions.md`.
