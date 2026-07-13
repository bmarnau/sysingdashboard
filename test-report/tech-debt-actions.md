# Maßnahmenliste (sortiert nach Priorität)

1. **[High/klein]** API-Endpoint ohne erkennbaren Auth-Guard
   - Ort: `src/routes/api/status.ts`
   - Empfehlung: Auth-Middleware oder Token-Prüfung ergänzen; für externe Caller `/api/public/*` + Signaturprüfung nutzen.
   - Finding-ID: `td-endpoint-auth-cdae73c5`

2. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/routes/__root.tsx:40`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-375dfc5b`

3. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/start.ts:12`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-629bd14d`

4. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/server.ts:68`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-6c701bbd`

5. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/server.ts:79`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-74bd3646`

6. **[Medium/klein]** Direktes console.error außerhalb der Logger-Fassade
   - Ort: `src/lib/help-documentation.ts:425`
   - Empfehlung: Auf `logger.info/warn/error` umstellen (`src/lib/logger.ts`).
   - Finding-ID: `td-console-da1180ce`

7. **[Medium/mittel]** E2E-Suite ist bewusst nur Smoke
   - Ort: `e2e/`
   - Empfehlung: data-testid in Dialoge einführen (BackupDialog, ImportExportDialog, AzureDataDialog) und darauf basierend echte Flows in e2e/*.spec.ts ergänzen.
   - Finding-ID: `td-manual-playwright-smoke-only`

8. **[Low/klein]** MSW-Handler decken nur wenige Azure-Endpunkte
   - Ort: `src/__tests__/mocks/handlers/azure.ts`
   - Empfehlung: Handler-Set pro Azure-Operation erweitern, sobald der jeweilige Feature-Test geschrieben wird.
   - Finding-ID: `td-manual-msw-coverage-gap`

9. **[High/mittel]** Zyklische Abhängigkeit (1 Kanten)
   - Ort: `src/__tests__/mocks/server.ts`
   - Empfehlung: Gemeinsame Types/Utilities in ein drittes Modul extrahieren; Abhängigkeitsrichtung erzwingen.
   - Finding-ID: `td-cycle-1fa843a1`

10. **[High/mittel]** Zyklische Abhängigkeit (2 Kanten)
   - Ort: `src/lib/logger.ts`
   - Empfehlung: Gemeinsame Types/Utilities in ein drittes Modul extrahieren; Abhängigkeitsrichtung erzwingen.
   - Finding-ID: `td-cycle-dc9fbe11`

11. **[High/gross]** Modul überschreitet Größenschwelle (808 Zeilen)
   - Ort: `src/components/ExportDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-26e43c0a`

12. **[High/gross]** Modul überschreitet Größenschwelle (3255 Zeilen)
   - Ort: `src/routes/index.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-99cca8a6`

13. **[High/gross]** Modul überschreitet Größenschwelle (840 Zeilen)
   - Ort: `src/components/UserManagementDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-ebfd4b54`

14. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureActionsPanel.tsx:7`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-b432b1b9`

15. **[Medium/klein]** UI-Direktzugriff auf Persistenz-Schicht
   - Ort: `src/routes/index.tsx:112`
   - Empfehlung: useDashboardStore-Selector oder dedizierten Facade-Hook verwenden.
   - Finding-ID: `td-layer-c1c89b30`

16. **[Medium/klein]** UI-Direktzugriff auf Azure-Interna
   - Ort: `src/components/azure/AzureHistoryPanel.tsx:4`
   - Empfehlung: Ausschließlich `@/lib/azure/azure-service` importieren.
   - Finding-ID: `td-layer-e4fb0e64`

17. **[Medium/mittel]** Modul überschreitet Größenschwelle (745 Zeilen)
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-242b307c`

18. **[Medium/mittel]** Modul überschreitet Größenschwelle (731 Zeilen)
   - Ort: `src/components/UserManualDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-f3843ebe`

19. **[Low/mittel]** Modul überschreitet Größenschwelle (436 Zeilen)
   - Ort: `src/components/WorkingTimeModelsDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-32eb5e8c`

20. **[Low/mittel]** Modul überschreitet Größenschwelle (560 Zeilen)
   - Ort: `src/components/ImportExportDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-38954b26`

21. **[Low/mittel]** Modul überschreitet Größenschwelle (702 Zeilen)
   - Ort: `src/lib/json-import-service.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-392d9209`

22. **[Low/mittel]** Modul überschreitet Größenschwelle (466 Zeilen)
   - Ort: `src/components/ImportPreviewDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-564261af`

23. **[Low/mittel]** Modul überschreitet Größenschwelle (716 Zeilen)
   - Ort: `src/lib/backup-service.ts`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-789d61fa`

24. **[Low/mittel]** Modul überschreitet Größenschwelle (454 Zeilen)
   - Ort: `src/components/SystemStatusDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-af210d92`

25. **[Low/mittel]** Modul überschreitet Größenschwelle (496 Zeilen)
   - Ort: `src/components/LogViewerDialog.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-d5f3942b`

26. **[Low/mittel]** Modul überschreitet Größenschwelle (490 Zeilen)
   - Ort: `src/components/PerformanceReport.tsx`
   - Empfehlung: Verantwortlichkeiten identifizieren und in Sub-Module aufteilen (Hooks/Services extrahieren).
   - Finding-ID: `td-oversize-feb81a2f`

27. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/collapsible.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-1634f273`

28. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/progress.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-19eefab7`

29. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/sidebar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-242b307c`

30. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/i18n/format.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2452737a`

31. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/chart.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2900775b`

32. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/carousel.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-2c46e416`

33. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/scroll-area.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-432c9ba1`

34. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/pagination.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-47d5b07c`

35. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/context-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4c5ab6a6`

36. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/alert-dialog.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-4fae0654`

37. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/toggle-group.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-539cbbad`

38. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/form.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-60027755`

39. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/textarea.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-7ed7cbb9`

40. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/aspect-ratio.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8152e2df`

41. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/menubar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-8b8d7a5b`

42. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/resizable.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-906e6010`

43. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/drawer.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-98f7d819`

44. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/lib/rbac/permission-groups.ts`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-9b5a9f9b`

45. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/card.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-9d8b7a18`

46. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/accordion.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-adda4e46`

47. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/navigation-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-af1ee499`

48. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/popover.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-b0c0d351`

49. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/breadcrumb.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-d5b25a61`

50. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/slider.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-da11a267`

51. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/avatar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-deb46595`

52. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/table.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-ded2d8d0`

53. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/dropdown-menu.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e4656c7f`

54. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/hover-card.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-e89d394d`

55. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/calendar.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-f35c0af6`

56. **[Low/klein]** Möglicherweise verwaistes Modul
   - Ort: `src/components/ui/command.tsx`
   - Empfehlung: Datei löschen oder ins `archive/` verschieben, falls historisch relevant.
   - Finding-ID: `td-orphan-fee5a79a`

57. **[Low/klein]** CI installiert Chromium bei jedem Lauf
   - Ort: `.github/workflows/ci.yml`
   - Empfehlung: Cache-Step vor Playwright-Install ergänzen; Key = Runner-OS + Playwright-Version.
   - Finding-ID: `td-manual-ci-playwright-cache`

58. **[Informational/klein]** Kein Coverage-Report vorhanden
   - Ort: `coverage/coverage-summary.json`
   - Empfehlung: In CI vor `test:debt` `bun run test:coverage` ausführen (bereits konfiguriert).
   - Finding-ID: `td-coverage-027fe478`
