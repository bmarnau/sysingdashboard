# Prompt 7 — RBAC Architektur (Implementierung)

Wechsel in Build-Mode bitte über „Implement plan". Anschließend werden in einer Iteration folgende Dateien angelegt/geändert:

## Neue Dateien
- `src/lib/rbac/permissions.ts` — `Permission`-Union (14), `ROLE_PERMISSIONS`-Matrix, `ROLE_PRIORITY`, `can/canAny/canAll/requirePermission/permissionsOf`. Single Source of Truth.
- `src/hooks/usePermission.ts` — `usePermission(perm)`, `useAnyPermission(perms)` reaktiv über `useCurrentUser`.
- `src/components/PermissionGate.tsx` — JSX-Wrapper mit `permission` + `fallback`.
- `backend/services/rbac.mjs` — identische Matrix als ESM, `can(role, perm)`, `requirePermission(role, perm)`.
- `config/roleResolver.mjs` — Entra-Readiness-Stub: `resolveInternalRole({entraOid, groupIds, internalUsers, mapping})`, Least-Privilege-Fallback `viewer`, niemals Auto-Promotion zu `administrator`/`systemadministrator`.
- `config/entraMapping.example.json` — Beispiel-Mapping `entra-group-id → interne Rolle`.
- `scripts/check-rbac.mjs` — prüft Matrix-Invarianten **und** verifiziert, dass Frontend- (`src/lib/rbac/permissions.ts`) und Backend-Matrix (`backend/services/rbac.mjs`) zeichengenau übereinstimmen. Exit 1 bei Verstoß.

## Geänderte Dateien
- `src/lib/user-management.ts` — `UserRole` um `systemadministrator | viewer` erweitern; `ROLE_LABEL`, `ALL_ROLES` ergänzen; `isAdmin()` deckt beide Admin-Typen ab; einmalige Migration im `bootstrap` (Flag `northbit-rbac-migrated-v1`): bestehender Default-Admin wird `systemadministrator`; Schutz „letzter aktiver Systemadministrator" in `updateUser`/`setUserRole`/`deleteUser`.
- `src/routes/index.tsx` — Servicemenü-Einträge gaten:
  - Benutzer & Profile → `users.manage`
  - Backup → `backup.restore`
  - Import / Export → `azure.import` (Import) bzw. `azure.export` (Export); kombiniert per `canAny`
  - Systemstatus → `systemstatus.view`
  - Engineer-Stammdaten / Arbeitszeitmodell → `users.manage` (Stammdaten-Pflege)
  - Customer/Viewer: kein Service-Menü-Button sichtbar, nur Handbuch + Downloads (read-only Pfade)
- `src/components/UserManagementDialog.tsx` — `isAdmin` durch `can(user, 'users.manage')` ersetzen; Rollenauswahl im `UserEditor` filtert `administrator`/`systemadministrator` aus, wenn der aktive Benutzer kein `systemadministrator` ist; `roleStyle` exhaustiv für neue Rollen; Löschen/Degradieren des letzten Systemadministrators sperren.
- `src/components/BackupDialog.tsx`, `src/components/ImportExportDialog.tsx` — destruktive Aktionen (Restore / Import) zusätzlich defensiv via `requirePermission` absichern (Belt-and-Suspenders).
- `src/routes/api/sync.ts` — optionaler RBAC-Check: wenn Request-Header `X-User-Role` vorhanden, prüft `requirePermission(role, 'azure.export')` und antwortet 403 bei Verstoß. Bestehender `X-Sync-Token`-Gate bleibt unverändert.
- `src/types/backend.d.ts` — Typdecl für `backend/services/rbac.mjs` und `config/roleResolver.mjs`.
- `src/lib/help-documentation.ts` — neues Kapitel „Rollen & Berechtigungen" mit vollständiger Matrix-Tabelle, Entra-Mapping-Hinweis und Sicherheitsdisclaimer; `lastUpdated: "2026-06-28"`.
- `CHANGELOG.md` — `## 1.18.0 - 2026-06-28` mit den oben genannten Bullets.
- `package.json` — Script `"rbac:check": "node scripts/check-rbac.mjs"`.
- `.github/workflows/ci.yml` — Step „RBAC check" nach Lint, vor Build.

## Check 7 — Abdeckung
- ✅ Jede Azure-Aktion: eigene Permission (`azure.connection.test/.export/.import/.database.build`).
- ✅ `azure.import` ⊊ Träger(`azure.export`) — durch Matrix + Test erzwungen.
- ✅ `azure.database.build` ausschließlich `systemadministrator`.
- ✅ `users.manage` und `roles.manage` admin-only (Letzteres SysAdmin-only).
- ✅ Customer/Viewer sehen kein Servicemenü-Admin-Item.
- ✅ Viewer ist read-only (keine `*.edit`/`azure.*`/`*.manage`).
- ✅ Entra ersetzt nicht das interne Rollenmodell (`roleResolver` mappt, Override durch interne Tabelle, keine Auto-Promotion).

## Kritische Hinweise — umgesetzt
- **Permissions statt Rollen-Checks**: alle UI-Gates rufen `can()`/`PermissionGate`, kein `user.role === '…'` in Komponenten.
- **Ownership-Vertrag für `engineer`**: in `permissions.ts` als JSDoc dokumentiert, Schema-Feld `ownerId` auf Activities/WorkPackages bleibt unverändert nutzbar — Server-Check folgt mit Auth-Aktivierung.
- **Sicherheitsdisclaimer**: Handbuch + JSDoc in `permissions.ts` weisen explizit aus, dass RBAC ohne echte Auth UI-Komfort ist.

Sage „ok" / drücke Implement plan, dann lege ich los.
