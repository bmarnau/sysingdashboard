# Maßnahmenliste (sortiert nach Priorität)

1. **[Medium/klein]** API-Endpoint ohne Eingabevalidierung
   - Ort: `src/routes/api/public/auth-config.ts`
   - Empfehlung: Zod-Schema am Handler-Eingang ergänzen und bei Fehler 400 zurückgeben.
   - Finding-ID: `td-endpoint-zod-34111d3b`

2. **[Medium/mittel]** E2E-Suite ist bewusst nur Smoke
   - Ort: `e2e/`
   - Empfehlung: data-testid in Dialoge einführen (BackupDialog, ImportExportDialog, AzureDataDialog) und darauf basierend echte Flows in e2e/*.spec.ts ergänzen.
   - Finding-ID: `td-manual-playwright-smoke-only`

3. **[Low/klein]** MSW-Handler decken nur wenige Azure-Endpunkte
   - Ort: `src/__tests__/mocks/handlers/azure.ts`
   - Empfehlung: Handler-Set pro Azure-Operation erweitern, sobald der jeweilige Feature-Test geschrieben wird.
   - Finding-ID: `td-manual-msw-coverage-gap`

4. **[Low/klein]** API-Endpoint ohne strukturierte Fehlerantwort
   - Ort: `src/routes/api/status.ts`
   - Empfehlung: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
   - Finding-ID: `td-endpoint-err-cdae73c5`

5. **[Low/klein]** API-Endpoint ohne strukturierte Fehlerantwort
   - Ort: `src/routes/api/sync.ts`
   - Empfehlung: try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.
   - Finding-ID: `td-endpoint-err-ce5fa0be`

6. **[High/gross]** Modul überschreitet Größenschwelle (1075 Zeilen)
   - Ort: `src/routes/_authenticated/dashboard.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-7e9a0b20`

7. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureActionsPanel.tsx:7`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-b432b1b9`

8. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureHistoryPanel.tsx:4`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-e4fb0e64`

9. **[Medium/mittel]** Modul überschreitet Größenschwelle (745 Zeilen)
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-242b307c`

10. **[Medium/mittel]** Modul überschreitet Größenschwelle (731 Zeilen)
   - Ort: `src/components/UserManualDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-f3843ebe`

11. **[Low/mittel]** Modul überschreitet Größenschwelle (436 Zeilen)
   - Ort: `src/components/WorkingTimeModelsDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-32eb5e8c`

12. **[Low/mittel]** Modul überschreitet Größenschwelle (580 Zeilen)
   - Ort: `src/components/ImportExportDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-38954b26`

13. **[Low/mittel]** Modul überschreitet Größenschwelle (702 Zeilen)
   - Ort: `src/lib/json-import-service.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-392d9209`

14. **[Low/mittel]** Modul überschreitet Größenschwelle (466 Zeilen)
   - Ort: `src/components/ImportPreviewDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-564261af`

15. **[Low/mittel]** Modul überschreitet Größenschwelle (776 Zeilen)
   - Ort: `src/integrations/supabase/types.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-92249691`

16. **[Low/mittel]** Modul überschreitet Größenschwelle (403 Zeilen)
   - Ort: `src/components/compliance/ComplianceReportPrint.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-92e5643a`

17. **[Low/mittel]** Modul überschreitet Größenschwelle (481 Zeilen)
   - Ort: `src/components/SystemStatusDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-af210d92`

18. **[Low/mittel]** Modul überschreitet Größenschwelle (497 Zeilen)
   - Ort: `src/components/LogViewerDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-d5f3942b`

19. **[Low/mittel]** Modul überschreitet Größenschwelle (585 Zeilen)
   - Ort: `src/components/UserManagementDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-ebfd4b54`

20. **[Low/mittel]** Modul überschreitet Größenschwelle (490 Zeilen)
   - Ort: `src/components/PerformanceReport.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-feb81a2f`

21. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/collapsible.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-1634f273`

22. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/progress.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-19eefab7`

23. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-242b307c`

24. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/i18n/format.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2452737a`

25. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/chart.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2900775b`

26. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/carousel.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2c46e416`

27. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/scroll-area.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-432c9ba1`

28. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/pagination.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-47d5b07c`

29. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/context-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4c5ab6a6`

30. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/alert-dialog.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4fae0654`

31. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/toggle-group.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-539cbbad`

32. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/form.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-60027755`

33. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/textarea.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-7ed7cbb9`

34. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/aspect-ratio.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8152e2df`

35. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/menubar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8b8d7a5b`

36. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/resizable.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-906e6010`

37. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/drawer.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-98f7d819`

38. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/rbac/permission-groups.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-9b5a9f9b`

39. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/accordion.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-adda4e46`

40. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/navigation-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-af1ee499`

41. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/popover.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-b0c0d351`

42. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/integrations/supabase/auth-middleware.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-bd7563ab`

43. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/breadcrumb.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-d5b25a61`

44. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/slider.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-da11a267`

45. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/avatar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-deb46595`

46. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/table.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-ded2d8d0`

47. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/dropdown-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e4656c7f`

48. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/hover-card.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e89d394d`

49. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/calendar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-f35c0af6`

50. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/command.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-fee5a79a`

51. **[Low/klein]** CI installiert Chromium bei jedem Lauf
   - Ort: `.github/workflows/ci.yml`
   - Empfehlung: Cache-Step vor Playwright-Install ergänzen; Key = Runner-OS + Playwright-Version.
   - Finding-ID: `td-manual-ci-playwright-cache`

52. **[Informational/klein]** Kein Coverage-Report vorhanden
   - Ort: `coverage/coverage-summary.json`
   - Empfehlung: In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).
   - Finding-ID: `td-coverage-027fe478`
