# Management-Zusammenfassung — Technical Debt

**Version 1.28.0** · 2026-07-13

| Kategorie | Wert |
| --------- | ---- |
| Findings gesamt | 58 |
| Critical | 0 |
| High | 6 |
| Medium | 11 |
| Low + Info | 41 |
| Neu seit Vorlauf | 58 |
| Behoben seit Vorlauf | 0 |

## Top-10 nach Priorität

1. **[High]** API-Endpoint ohne erkennbaren Auth-Guard — `src/routes/api/status.ts` (`td-endpoint-auth-cdae73c5`)
2. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/routes/__root.tsx:40` (`td-console-375dfc5b`)
3. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/start.ts:12` (`td-console-629bd14d`)
4. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/server.ts:68` (`td-console-6c701bbd`)
5. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/server.ts:79` (`td-console-74bd3646`)
6. **[Medium]** Direktes console.error außerhalb der Logger-Fassade — `src/lib/help-documentation.ts:425` (`td-console-da1180ce`)
7. **[Medium]** E2E-Suite ist bewusst nur Smoke — `e2e/` (`td-manual-playwright-smoke-only`)
8. **[Low]** MSW-Handler decken nur wenige Azure-Endpunkte — `src/__tests__/mocks/handlers/azure.ts` (`td-manual-msw-coverage-gap`)
9. **[High]** Zyklische Abhängigkeit (1 Kanten) — `src/__tests__/mocks/server.ts` (`td-cycle-1fa843a1`)
10. **[High]** Zyklische Abhängigkeit (2 Kanten) — `src/lib/logger.ts` (`td-cycle-dc9fbe11`)

## Interpretation

- **Critical** blockiert die CI (Exit 2). Aktuell: 0.
- **High/Medium** sind Trend-Metriken — keine harte Gate, aber Steuerungssignal.
- Manuelle Findings pflegen Team-Wissen ab, das kein Detektor erkennt.

Vollständiger Bericht: `test-report/tech-debt.md`. Maßnahmenliste: `test-report/tech-debt-actions.md`.
