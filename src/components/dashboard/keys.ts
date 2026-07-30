/**
 * User-scoped localStorage-Schlüssel des Dashboards.
 * Werte und Format sind unverändert gegenüber der monolithischen Fassung.
 */
import { UserManagementService } from "@/lib/user-management";

const STORAGE_KEY_BASE = "northbit-dashboard-v2";
const VIEWMODE_KEY_BASE = "northbit-dashboard-viewmode";
const PERIOD_KEY_BASE = "northbit-dashboard-period";
const PERF_REPORT_KEY_BASE = "northbit-dashboard-perf-report";
export const storageKey = () => UserManagementService.userScopedKey(STORAGE_KEY_BASE);
export const viewmodeKey = () => UserManagementService.userScopedKey(VIEWMODE_KEY_BASE);
export const periodKey = () => UserManagementService.userScopedKey(PERIOD_KEY_BASE);
export const perfReportKey = () => UserManagementService.userScopedKey(PERF_REPORT_KEY_BASE);
