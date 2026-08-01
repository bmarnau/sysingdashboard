# Maßnahmenliste (sortiert nach Priorität)

1. **[Medium/klein]** API-Endpoint ohne Eingabevalidierung
   - Ort: `src/routes/api/public/auth-config.ts`
   - Empfehlung: Zod-Schema am Handler-Eingang ergänzen und bei Fehler 400 zurückgeben.
   - Finding-ID: `td-endpoint-zod-34111d3b`

2. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/lib/help-documentation.ts:473`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-eb91ada9`

3. **[Medium/mittel]** E2E-Suite ist bewusst nur Smoke
   - Ort: `e2e/`
   - Empfehlung: data-testid in Dialoge einführen (BackupDialog, ImportExportDialog, AzureDataDialog) und darauf basierend echte Flows in e2e/*.spec.ts ergänzen.
   - Finding-ID: `td-manual-playwright-smoke-only`

4. **[Low/klein]** MSW-Handler decken nur wenige Azure-Endpunkte
   - Ort: `src/__tests__/mocks/handlers/azure.ts`
   - Empfehlung: Handler-Set pro Azure-Operation erweitern, sobald der jeweilige Feature-Test geschrieben wird.
   - Finding-ID: `td-manual-msw-coverage-gap`

5. **[Low/klein]** API-Endpoint ohne strukturierte Fehlerantwort
   - Ort: `src/routes/api/status.ts`
   - Empfehlung: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
   - Finding-ID: `td-endpoint-err-cdae73c5`

6. **[Low/klein]** API-Endpoint ohne strukturierte Fehlerantwort
   - Ort: `src/routes/api/sync.ts`
   - Empfehlung: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
   - Finding-ID: `td-endpoint-err-ce5fa0be`

7. **[High/gross]** Modul überschreitet Größenschwelle (979 Zeilen)
   - Ort: `src/routes/_authenticated/dashboard.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-7e9a0b20`

8. **[Medium/klein]** UI-Direktzugriff auf Persistenz-Schicht
   - Ort: `src/routes/_authenticated/dashboard.tsx:89`
   - Empfehlung: useDashboardStore-Selector oder dedizierten Facade-Hook verwenden.
   - Finding-ID: `td-layer-9275d7a1`

9. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureActionsPanel.tsx:7`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-b432b1b9`

10. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureHistoryPanel.tsx:4`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-e4fb0e64`

11. **[Medium/mittel]** Modul überschreitet Größenschwelle (745 Zeilen)
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-242b307c`

12. **[Medium/mittel]** Modul überschreitet Größenschwelle (1084 Zeilen)
   - Ort: `src/lib/backup-service.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-789d61fa`

13. **[Medium/mittel]** Modul überschreitet Größenschwelle (731 Zeilen)
   - Ort: `src/components/UserManualDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-f3843ebe`

14. **[Low/mittel]** Modul überschreitet Größenschwelle (436 Zeilen)
   - Ort: `src/components/WorkingTimeModelsDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-32eb5e8c`

15. **[Low/mittel]** Modul überschreitet Größenschwelle (560 Zeilen)
   - Ort: `src/components/ImportExportDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-38954b26`

16. **[Low/mittel]** Modul überschreitet Größenschwelle (702 Zeilen)
   - Ort: `src/lib/json-import-service.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-392d9209`

17. **[Low/mittel]** Modul überschreitet Größenschwelle (466 Zeilen)
   - Ort: `src/components/ImportPreviewDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-564261af`

18. **[Low/mittel]** Modul überschreitet Größenschwelle (423 Zeilen)
   - Ort: `src/components/compliance/ComplianceReportPrint.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-92e5643a`

19. **[Low/mittel]** Modul überschreitet Größenschwelle (481 Zeilen)
   - Ort: `src/components/SystemStatusDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-af210d92`

20. **[Low/mittel]** Modul überschreitet Größenschwelle (496 Zeilen)
   - Ort: `src/components/LogViewerDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-d5f3942b`

21. **[Low/mittel]** Modul überschreitet Größenschwelle (563 Zeilen)
   - Ort: `src/components/UserManagementDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-ebfd4b54`

22. **[Low/mittel]** Modul überschreitet Größenschwelle (490 Zeilen)
   - Ort: `src/components/PerformanceReport.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-feb81a2f`

23. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/collapsible.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-1634f273`

24. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/progress.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-19eefab7`

25. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-242b307c`

26. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/i18n/format.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2452737a`

27. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/chart.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2900775b`

28. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/carousel.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2c46e416`

29. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/scroll-area.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-432c9ba1`

30. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/pagination.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-47d5b07c`

31. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/context-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4c5ab6a6`

32. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/alert-dialog.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4fae0654`

33. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/toggle-group.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-539cbbad`

34. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/form.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-60027755`

35. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/textarea.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-7ed7cbb9`

36. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/aspect-ratio.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8152e2df`

37. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/menubar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8b8d7a5b`

38. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/resizable.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-906e6010`

39. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/drawer.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-98f7d819`

40. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/rbac/permission-groups.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-9b5a9f9b`

41. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/accordion.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-adda4e46`

42. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/navigation-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-af1ee499`

43. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/popover.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-b0c0d351`

44. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/integrations/supabase/auth-middleware.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-bd7563ab`

45. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/breadcrumb.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-d5b25a61`

46. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/slider.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-da11a267`

47. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/avatar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-deb46595`

48. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/table.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-ded2d8d0`

49. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/dropdown-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e4656c7f`

50. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/hover-card.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e89d394d`

51. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/calendar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-f35c0af6`

52. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/command.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-fee5a79a`

53. **[Low/klein]** CI installiert Chromium bei jedem Lauf
   - Ort: `.github/workflows/ci.yml`
   - Empfehlung: Cache-Step vor Playwright-Install ergänzen; Key = Runner-OS + Playwright-Version.
   - Finding-ID: `td-manual-ci-playwright-cache`

54. **[Informational/klein]** Kein Coverage-Report vorhanden
   - Ort: `coverage/coverage-summary.json`
   - Empfehlung: In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).
   - Finding-ID: `td-coverage-027fe478`
