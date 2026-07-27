# Maßnahmenliste (sortiert nach Priorität)

1. **[High/klein]** Fehlerantwort ohne Correlation-ID
   - Ort: `src/routes/api/public/auth-config.ts`
   - Empfehlung: Alle Fehlerpfade auf `jsonErrorWithCorrelation(status, code, message)` umstellen.
   - Finding-ID: `td-correlation-err-shape-34111d3b`

2. **[Medium/klein]** API-Endpoint ohne Eingabevalidierung
   - Ort: `src/routes/api/public/auth-config.ts`
   - Empfehlung: Zod-Schema am Handler-Eingang ergänzen und bei Fehler 400 zurückgeben.
   - Finding-ID: `td-endpoint-zod-34111d3b`

3. **[Medium/klein]** Aktive API-Route ohne Correlation-ID-Middleware
   - Ort: `src/routes/api/public/auth-config.ts`
   - Empfehlung: Handler durch `withCorrelation(...)` wickeln und Fehlerpfade auf `jsonErrorWithCorrelation` umstellen.
   - Finding-ID: `td-correlation-missing-34111d3b`

4. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/start.ts:13`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-08e8609a`

5. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/integrations/supabase/auth-middleware.ts:45`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-2c49302b`

6. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/routes/__root.tsx:40`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-375dfc5b`

7. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/integrations/supabase/client.ts:54`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-43084e7a`

8. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/integrations/supabase/client.server.ts:42`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-665c1d8d`

9. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/server.ts:68`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-6c701bbd`

10. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/server.ts:79`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-74bd3646`

11. **[Medium/klein]** Direktes console.info außerhalb der Logger-Fassade
   - Ort: `src/integrations/supabase/env-check.ts:93`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-9771f164`

12. **[Medium/klein]** Direktes console.warn außerhalb der Logger-Fassade
   - Ort: `src/integrations/supabase/env-check.ts:82`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-993be125`

13. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/lib/help-documentation.ts:426`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-f7820fc7`

14. **[Medium/mittel]** E2E-Suite ist bewusst nur Smoke
   - Ort: `e2e/`
   - Empfehlung: data-testid in Dialoge einführen (BackupDialog, ImportExportDialog, AzureDataDialog) und darauf basierend echte Flows in e2e/*.spec.ts ergänzen.
   - Finding-ID: `td-manual-playwright-smoke-only`

15. **[Low/klein]** MSW-Handler decken nur wenige Azure-Endpunkte
   - Ort: `src/__tests__/mocks/handlers/azure.ts`
   - Empfehlung: Handler-Set pro Azure-Operation erweitern, sobald der jeweilige Feature-Test geschrieben wird.
   - Finding-ID: `td-manual-msw-coverage-gap`

16. **[Low/klein]** API-Endpoint ohne strukturierte Fehlerantwort
   - Ort: `src/routes/api/status.ts`
   - Empfehlung: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
   - Finding-ID: `td-endpoint-err-cdae73c5`

17. **[Low/klein]** API-Endpoint ohne strukturierte Fehlerantwort
   - Ort: `src/routes/api/sync.ts`
   - Empfehlung: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
   - Finding-ID: `td-endpoint-err-ce5fa0be`

18. **[High/gross]** Modul überschreitet Größenschwelle (808 Zeilen)
   - Ort: `src/components/ExportDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-26e43c0a`

19. **[High/gross]** Modul überschreitet Größenschwelle (3281 Zeilen)
   - Ort: `src/routes/_authenticated/dashboard.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-7e9a0b20`

20. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureActionsPanel.tsx:7`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-b432b1b9`

21. **[Medium/klein]** UI-Direktzugriff auf Persistenz-Schicht
   - Ort: `src/routes/_authenticated/dashboard.tsx:115`
   - Empfehlung: useDashboardStore-Selector oder dedizierten Facade-Hook verwenden.
   - Finding-ID: `td-layer-e0ac1bea`

22. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureHistoryPanel.tsx:4`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-e4fb0e64`

23. **[Medium/mittel]** Modul überschreitet Größenschwelle (745 Zeilen)
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-242b307c`

24. **[Medium/mittel]** Modul überschreitet Größenschwelle (1084 Zeilen)
   - Ort: `src/lib/backup-service.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-789d61fa`

25. **[Medium/mittel]** Modul überschreitet Größenschwelle (731 Zeilen)
   - Ort: `src/components/UserManualDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-f3843ebe`

26. **[Low/mittel]** Modul überschreitet Größenschwelle (436 Zeilen)
   - Ort: `src/components/WorkingTimeModelsDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-32eb5e8c`

27. **[Low/mittel]** Modul überschreitet Größenschwelle (560 Zeilen)
   - Ort: `src/components/ImportExportDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-38954b26`

28. **[Low/mittel]** Modul überschreitet Größenschwelle (702 Zeilen)
   - Ort: `src/lib/json-import-service.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-392d9209`

29. **[Low/mittel]** Modul überschreitet Größenschwelle (466 Zeilen)
   - Ort: `src/components/ImportPreviewDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-564261af`

30. **[Low/mittel]** Modul überschreitet Größenschwelle (481 Zeilen)
   - Ort: `src/components/SystemStatusDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-af210d92`

31. **[Low/mittel]** Modul überschreitet Größenschwelle (496 Zeilen)
   - Ort: `src/components/LogViewerDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-d5f3942b`

32. **[Low/mittel]** Modul überschreitet Größenschwelle (563 Zeilen)
   - Ort: `src/components/UserManagementDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-ebfd4b54`

33. **[Low/mittel]** Modul überschreitet Größenschwelle (490 Zeilen)
   - Ort: `src/components/PerformanceReport.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-feb81a2f`

34. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/collapsible.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-1634f273`

35. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/progress.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-19eefab7`

36. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-242b307c`

37. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/i18n/format.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2452737a`

38. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/chart.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2900775b`

39. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/carousel.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2c46e416`

40. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/scroll-area.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-432c9ba1`

41. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/pagination.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-47d5b07c`

42. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/context-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4c5ab6a6`

43. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/alert-dialog.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4fae0654`

44. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/toggle-group.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-539cbbad`

45. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/form.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-60027755`

46. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/textarea.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-7ed7cbb9`

47. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/aspect-ratio.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8152e2df`

48. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/menubar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8b8d7a5b`

49. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/resizable.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-906e6010`

50. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/drawer.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-98f7d819`

51. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/rbac/permission-groups.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-9b5a9f9b`

52. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/accordion.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-adda4e46`

53. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/navigation-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-af1ee499`

54. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/popover.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-b0c0d351`

55. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/integrations/supabase/auth-middleware.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-bd7563ab`

56. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/breadcrumb.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-d5b25a61`

57. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/slider.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-da11a267`

58. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/avatar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-deb46595`

59. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/table.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-ded2d8d0`

60. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/dropdown-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e4656c7f`

61. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/hover-card.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e89d394d`

62. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/calendar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-f35c0af6`

63. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/command.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-fee5a79a`

64. **[Low/klein]** CI installiert Chromium bei jedem Lauf
   - Ort: `.github/workflows/ci.yml`
   - Empfehlung: Cache-Step vor Playwright-Install ergänzen; Key = Runner-OS + Playwright-Version.
   - Finding-ID: `td-manual-ci-playwright-cache`

65. **[Informational/klein]** Kein Coverage-Report vorhanden
   - Ort: `coverage/coverage-summary.json`
   - Empfehlung: In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).
   - Finding-ID: `td-coverage-027fe478`
