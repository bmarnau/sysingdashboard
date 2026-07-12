# RBAC-Matrix (Rolle × Ressource × Aktion)

Menschenlesbare Sicht auf das Berechtigungsmodell. Die maschinenlesbare v1-Matrix
lebt in `src/lib/rbac/permissions.ts` (Frontend) und `backend/services/rbac.mjs`
(gespiegelt, geprüft durch `scripts/check-rbac.mjs`). Das v2-Datenmodell (Scopes,
Groups, Assignments) beschreibt ADR-0007.

## Rollen

| Rolle | Kurzbeschreibung |
| ----- | ---------------- |
| `systemadministrator` | Vollzugriff inkl. Rollenverwaltung und Azure DB-Aufbau. |
| `administrator` | Betrieb + Benutzerverwaltung, keine Rollenmatrix. |
| `teamlead` | Projekte + Export, kein Import/DB-Bau. |
| `projectmanager` | Projektbearbeitung, Export. |
| `engineer` | Arbeitspakete + Tätigkeiten (eigene). |
| `customer` | Nur Dashboard + Dokumentation. |
| `viewer` | Read-only. |

## Matrix Rolle × Aktion (v1, flach)

Legende: ● erlaubt · ○ verboten

| Aktion | sysadmin | admin | teamlead | projmgr | engineer | customer | viewer |
| ------ | :------: | :---: | :------: | :-----: | :------: | :------: | :----: |
| `dashboard.view` | ● | ● | ● | ● | ● | ● | ● |
| `documentation.view` | ● | ● | ● | ● | ● | ● | ● |
| `systemstatus.view` | ● | ● | ● | ○ | ○ | ○ | ○ |
| `project.edit` | ● | ● | ● | ● | ○ | ○ | ○ |
| `workpackage.edit` | ● | ● | ● | ● | ● (own) | ○ | ○ |
| `activity.edit` | ● | ● | ● | ● | ● (own) | ○ | ○ |
| `azure.connection.test` | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `azure.export` | ● | ● | ● | ● | ○ | ○ | ○ |
| `azure.import` | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `azure.database.build` | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| `backup.restore` | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `users.manage` | ● | ● | ○ | ○ | ○ | ○ | ○ |
| `roles.manage` | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| `auditlog.view` | ● | ● | ○ | ○ | ○ | ○ | ○ |

Invarianten aus `scripts/check-rbac.mjs`:

- `azure.database.build` ⊆ {systemadministrator}
- `azure.import` ⊆ {systemadministrator, administrator}
- Träger(`azure.import`) ⊆ Träger(`azure.export`)
- `roles.manage` ⊆ {systemadministrator}
- `viewer`/`customer` ohne `.edit`, `azure.*`, `*.manage`, `backup.*`
- `customer` ohne `systemstatus.view`

## Ressourcentypen (v2)

| Typ | Zweck | Beispiel-Scope |
| --- | ----- | -------------- |
| `tenant` | Mandant (IT-Systemhaus). | `tenant:northbit` |
| `customer` | Kunde eines Mandanten. | `tenant:northbit/customer:acme` |
| `project` | Projekt eines Kunden. | `…/project:pj-42` |
| `workpackage` | Arbeitspaket eines Projekts. | `…/workpackage:wp-7` |
| `activity` | Tätigkeit eines Arbeitspakets. | `…/activity:a-99` |
| `azure.subscription` | Azure-Subscription. | `azure.subscription:sub-01` |
| `azure.resourceGroup` | Azure-Ressourcengruppe. | `azure.subscription:sub-01/azure.resourceGroup:rg-prod` |
| `system` | Globale Systemobjekte (Users, Roles, Audit). | `system:*` |

## Permission Groups (v2, additiv)

| Group | Zweck | Enthaltene Aktionen |
| ----- | ----- | ------------------- |
| `readonly.basic` | Nur Lesen. | `project:view`, `workpackage:view`, `activity:view`, `system:view` |
| `project.manage` | Projektpflege. | `project:*`, `workpackage:*`, `activity:*` (view/edit) |
| `azure.readonly` | Azure lesen. | `azure.subscription:test`, `azure.subscription:export` |
| `azure.operate` | Azure betreiben. | + `azure.subscription:import`, `azure.resourceGroup:build` |
| `admin.users` | Benutzerpflege. | `system:manage` |
| `admin.system` | Systemadministration. | `system:manage`, `system:restore`, `system:view` |

## Beispiel-Assignments

```jsonc
[
  {
    "id": "asg-001",
    "principalId": "usr-max",
    "principalType": "user",
    "role": "engineer",
    "scope": "tenant:northbit/customer:acme/project:pj-42",
    "source": "local",
    "grantedAt": "2026-07-12T09:00:00Z",
    "grantedBy": "usr-sysadmin"
  },
  {
    "id": "asg-002",
    "principalId": "grp-projmgr-acme",
    "principalType": "group",
    "role": "projectmanager",
    "scope": "tenant:northbit/customer:acme",
    "source": "entra",
    "grantedAt": "2026-07-12T09:05:00Z",
    "grantedBy": "system",
    "expiresAt": "2027-07-12T00:00:00Z"
  }
]
```

## Migration v1 → v2

Siehe ADR-0007. Kurzfassung:

1. v2-Typen und `evaluateAccess()` einführen (dieser Schritt).
2. Aufrufer schrittweise auf `evaluateAccess(user, perm, { scope })` migrieren;
   ohne Scope bleibt v1-Verhalten.
3. Backend-Mirror + Scope-Invarianten in `check-rbac.mjs`.
4. Entra-ID-Sync aktivieren, `RoleAssignment.source = "entra"`.
