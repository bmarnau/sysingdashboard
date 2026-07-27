# Management-Zusammenfassung — Technical Debt

**Version 1.42.1** · 2026-07-27

| Kategorie | Wert |
| --------- | ---- |
| Findings gesamt | 63 |
| Critical | 0 |
| High | 2 |
| Medium | 18 |
| Low + Info | 43 |
| Neu seit Vorlauf | 0 |
| Behoben seit Vorlauf | 2 |

## Top-10 nach Priorität

1. **[Medium]** API-Endpoint ohne Eingabevalidierung — `src/routes/api/public/auth-config.ts` (`td-endpoint-zod-34111d3b`)
2. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/start.ts:13` (`td-console-08e8609a`)
3. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/integrations/supabase/auth-middleware.ts:45` (`td-console-2c49302b`)
4. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/routes/__root.tsx:40` (`td-console-375dfc5b`)
5. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/integrations/supabase/client.ts:54` (`td-console-43084e7a`)
6. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/integrations/supabase/client.server.ts:42` (`td-console-665c1d8d`)
7. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/server.ts:68` (`td-console-6c701bbd`)
8. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/server.ts:79` (`td-console-74bd3646`)
9. **[Medium]** Direktes console.info außerhalb der Logger-Fassade — `src/integrations/supabase/env-check.ts:93` (`td-console-9771f164`)
10. **[Medium]** Direktes console.warn außerhalb der Logger-Fassade — `src/integrations/supabase/env-check.ts:82` (`td-console-993be125`)

## Interpretation

- **Critical** blockiert die CI (Exit 2). Aktuell: 0.
- **High/Medium** sind Trend-Metriken — keine harte Gate, aber Steuerungssignal.
- Manuelle Findings pflegen Team-Wissen ab, das kein Detektor erkennt.

Vollständiger Bericht: `test-report/tech-debt.md`. Maßnahmenliste: `test-report/tech-debt-actions.md`.
