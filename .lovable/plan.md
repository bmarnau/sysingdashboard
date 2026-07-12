# Plan: Actor-ID Audit + zukunftssichere RBAC-Architektur v2

Zwei zusammenhängende Bausteine für Prompt v1.27.0:

## Teil A — Actor-ID im User-Management (forensische Audit-Logs)

Ziel: Jede Änderung im User-Management protokolliert **wer** (actor) **wen** (target) geändert hat.

### Änderungen `src/lib/user-management.ts`

- Neuer optionaler `ActorContext`-Parameter:
  ```ts
  export interface ActorContext {
    actorId: string;         // id des ausführenden Users, "system" für automatisierte Pfade
    actorRole?: UserRole;    // Snapshot der Rolle zum Zeitpunkt der Aktion
    reason?: string;         // freitext (z.B. "bulk deactivation")
  }
  ```
- Signaturen erweitern (rückwärtskompatibel, actor optional):
  - `createUser(input, actor?)`
  - `updateUser(id, patch, actor?)`
  - `deleteUser(id, actor?)`
  - `setUserStatus(id, status, actor?)` / `setUserRole(id, role, actor?)` reichen durch.
- Alle `logger.info/warn`-Aufrufe in diesen Funktionen erweitern um:
  ```ts
  actorId: actor?.actorId ?? "unknown",
  actorRole: actor?.actorRole,
  reason: actor?.reason,
  ```
- Default-Fallback `"unknown"` wird beim Log als Warnung markiert (level `warn` statt `info`, wenn kein actor gesetzt), damit fehlende Actor-Attribution im Log-Viewer sichtbar wird.

### Aufrufseite `src/components/UserManagementDialog.tsx`

- Aktiven Benutzer via `useCurrentUser()` holen und als `actor` an alle Mutations-Aufrufe weiterreichen.

### Tests `src/__tests__/lib/user-management.test.ts`

- Zusätzliche Cases: `should_logActorId_when_updateUserCalledWithActor`, `should_logUnknownActor_when_actorOmitted`.

## Teil B — RBAC-Architektur v2 (Vorbereitung Entra ID / Multi-Customer / Azure Resources)

Ziel: Bestehende flache Matrix (Role → Permission) erweitern zu einem **skalierbaren Modell mit Resource Types, Scopes und Permission Groups**, ohne Breaking Changes am heutigen `can()`-API.

### Konzeptuelle Erweiterungen

**Rollen** (unverändert 7):
`systemadministrator`, `administrator`, `teamlead`, `projectmanager`, `engineer`, `customer`, `viewer`.

**Resource Types** (neu):
- `tenant` — Multi-Customer Root (Mandant)
- `customer` — einzelner Kunde innerhalb eines Tenants
- `project` — Projekt eines Kunden
- `workpackage` — Arbeitspaket eines Projekts
- `activity` — Tätigkeit eines Arbeitspakets
- `azure.subscription` — Azure Subscription (später)
- `azure.resourceGroup` — Azure Ressourcengruppe (später)
- `system` — globale Systemobjekte (Users, Roles, Settings, Audit)

**Scope-Modell**:
```
tenant:{id}/customer:{id}/project:{id}/workpackage:{id}/activity:{id}
```
Wildcards (`*`) und Vererbung (höherer Scope gewährt Zugriff auf Kinder).

**Permission Groups** (Bündel für UI + Entra Mapping):
- `readonly.basic`, `project.manage`, `azure.readonly`, `azure.operate`, `admin.users`, `admin.system`.

**Assignment-Modell**:
```
RoleAssignment {
  principalId: string,        // User-ID oder (später) Entra ObjectId
  principalType: "user" | "group" | "service",
  role: UserRole,
  scope: ResourceScope,
  source: "local" | "entra",  // Herkunft
  grantedAt, grantedBy, expiresAt?
}
```

### Neue Dateien

1. **`src/lib/rbac/types.ts`** — TypeScript Interfaces (`ResourceType`, `ResourceScope`, `Permission` mit `resource:action`-Format, `PermissionGroup`, `RoleAssignment`, `AccessContext`).
2. **`src/lib/rbac/permission-groups.ts`** — Definition der Permission Groups + Mapping Rolle → Groups.
3. **`src/lib/rbac/scope.ts`** — Pure-Utils: `parseScope`, `scopeIncludes`, `narrowestScope`.
4. **`src/lib/rbac/access.ts`** — `evaluateAccess(user, permission, resourceScope)` als zukünftiger Ersatz für `can()`. Heute delegiert es zurück an die flache Matrix, wenn kein Scope gesetzt ist → **kein Breaking Change**.
5. **`docs/ADR/0007-rbac-v2-scopes-and-resources.md`** — Kontext, Entscheidung, Alternativen, Migrationspfad, Trust-Boundary, Entra-Mapping-Regeln.
6. **`docs/RBAC-MATRIX.md`** — Menschenlesbare Matrix Role × Permission × ResourceType inkl. Beispiel-Assignments.
7. **`src/__tests__/lib/rbac/scope.test.ts`** und **`access.test.ts`** — Invarianten (Vererbung, Wildcard, Deny-by-Default).

### Bestehendes bleibt

- `src/lib/rbac/permissions.ts` (v1-Matrix) bleibt Single Source of Truth für die *flache* Prüfung und `can()`.
- `backend/services/rbac.mjs` bleibt gespiegelt. `check-rbac.mjs` unverändert grün.
- v2 ist rein additiv — kein Aufruf-Site-Umbau in dieser Iteration.

### Doku & CI

- `CHANGELOG.md`: neue Version `1.27.0` mit beiden Teilen.
- `src/lib/help-documentation.ts`: neues Kapitel „Actor-Audit im Benutzer-Management" + Update „Rollen und Berechtigungen" (Ausblick RBAC v2). `DOCUMENTATION_VERSION` → 1.5.0.
- `bun run docs:check`, `bun run test`, `bun run check:rbac` müssen grün sein.

## Technische Details

- `ActorContext` bewusst nicht als Middleware-Global — explizit übergeben macht Aufrufpfade im Code lesbar und lässt sich später leicht durch AsyncLocalStorage/Request-Context ersetzen.
- Log-Feld heißt konsistent `actorId` (nicht `changedBy`), passend zum späteren Entra-`oid`.
- Permission-Format-Migration (`azure.import` → `azure.subscription:import`) ist **explizit nicht Teil dieses Prompts** — nur die Typen und ADR bereiten sie vor, damit v3 sie durchzieht ohne v1-Aufrufe zu brechen.

## Nicht enthalten (bewusst)

- Server-seitige Auth-Middleware (folgt mit echter Entra-Anbindung).
- Backend-Mirror der v2-Typen (`backend/services/rbac.mjs` bleibt v1 bis der Server tatsächlich Scope prüft).
- UI zum Verwalten von RoleAssignments (Datenmodell nur, Admin-UI folgt später).
