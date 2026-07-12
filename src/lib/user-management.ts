/**
 * UserManagementService
 *
 * Lokale Mehrbenutzer-Verwaltung als Vorbereitung für Auth (Lovable Cloud /
 * Entra ID / OAuth2). Aktuell rein clientseitig, ohne Passwort- oder MFA-Logik.
 *
 * Sicherheit: solange keine echte Authentifizierung aktiv ist, sind alle
 * Rollen- und Sichtbarkeitsprüfungen UI-Komfort und KEINE Sicherheitsmaßnahme.
 * Die Architektur ist so geschnitten, dass `getActiveUser()` /
 * `hasRole()` später ohne Umbau auf einen echten Auth-Provider zeigen können.
 */

import { dashboardData } from "@/lib/dashboard-data";
import { logger } from "@/lib/logger";

export type UserRole =
  | "systemadministrator"
  | "administrator"
  | "teamlead"
  | "engineer"
  | "projectmanager"
  | "customer"
  | "viewer";

export type UserStatus = "active" | "inactive" | "locked" | "archived";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  /** Optional Base64 / Data-URL Profilbild. */
  profileImage?: string;
  /** Reserved für spätere Auth-Provider-Integration. */
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  systemadministrator: "System-Administrator",
  administrator: "Administrator",
  teamlead: "Teamleiter",
  engineer: "Systemingenieur",
  projectmanager: "Projektmanager",
  customer: "Kunde",
  viewer: "Viewer",
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  locked: "Gesperrt",
  archived: "Archiviert",
};

/** Reihenfolge entspricht der Privilegabstufung (hoch → niedrig). */
export const ALL_ROLES: UserRole[] = [
  "systemadministrator",
  "administrator",
  "teamlead",
  "projectmanager",
  "engineer",
  "customer",
  "viewer",
];

export const ALL_STATUSES: UserStatus[] = ["active", "inactive", "locked", "archived"];

const USERS_KEY = "northbit-users";
const ACTIVE_USER_KEY = "northbit-active-user";

/** Legacy Storage Keys, die vor Einführung der Benutzerverwaltung existierten.
 *  Werden beim Bootstrap auf den Default-Admin gescoped. */
const LEGACY_KEYS = [
  "northbit-dashboard-v2",
  "northbit-target-time-models",
  "northbit-perf-preset",
  "northbit-perf-custom",
  "northbit-dashboard-viewmode",
  "northbit-dashboard-period",
  "northbit-dashboard-perf-report",
];

/* ------------------------------ Subscribe API ------------------------------ */

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function subscribeUserChanges(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* --------------------------------- Helpers -------------------------------- */

function nowIso() {
  return new Date().toISOString();
}

function newUserId(): string {
  return `usr-${Math.random().toString(36).slice(2, 10)}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------ Persistence ------------------------------- */

// Cache, damit useSyncExternalStore-Snapshots referenz-stabil sind.
// Sonst meldet React „getSnapshot should be cached" und re-rendert in Schleife.
let usersCacheRaw: string | null = null;
let usersCache: UserProfile[] = [];
let activeIdCache: string | null = null;
let activeUserCache: UserProfile | null = null;

function invalidateCaches() {
  usersCacheRaw = null;
  activeIdCache = null;
  activeUserCache = null;
}

export function loadUsers(): UserProfile[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(USERS_KEY);
  if (raw === usersCacheRaw) return usersCache;
  const list = safeParse<UserProfile[]>(raw, []);
  usersCacheRaw = raw;
  usersCache = Array.isArray(list) ? list : [];
  // Aktiver Benutzer hängt von der Liste ab → ebenfalls invalidieren.
  activeUserCache = null;
  return usersCache;
}

export function saveUsers(users: UserProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* quota */
  }
  invalidateCaches();
  emit();
}

export function getActiveUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_USER_KEY);
}

export function setActiveUserId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_USER_KEY, id);
  invalidateCaches();
  emit();
}

export function getActiveUser(): UserProfile | null {
  const id = getActiveUserId();
  if (!id) return null;
  const users = loadUsers();
  if (id === activeIdCache && activeUserCache && users.includes(activeUserCache)) {
    return activeUserCache;
  }
  activeIdCache = id;
  activeUserCache = users.find((u) => u.id === id) ?? null;
  return activeUserCache;
}

/** Erzeugt einen storage-key gescoped auf den aktiven Benutzer. */
export function userScopedKey(baseKey: string): string {
  const id = getActiveUserId() ?? "default";
  return `${baseKey}::${id}`;
}

/* -------------------------------- Bootstrap ------------------------------- */

/** Einmalige Migration auf das erweiterte RBAC-Modell (Prompt 7).
 *  Hebt den bisherigen Default-Administrator auf `systemadministrator` an,
 *  sofern kein SysAdmin existiert. Idempotent über Flag-Key. */
const RBAC_MIGRATION_KEY = "northbit-rbac-migrated-v1";
function migrateToRbacV1(users: UserProfile[]): UserProfile[] {
  if (typeof window === "undefined") return users;
  if (window.localStorage.getItem(RBAC_MIGRATION_KEY) === "1") return users;
  const hasSysAdmin = users.some((u) => u.role === "systemadministrator");
  let next = users;
  if (!hasSysAdmin) {
    const firstAdmin = users.find((u) => u.role === "administrator" && u.status === "active");
    if (firstAdmin) {
      next = users.map((u) =>
        u.id === firstAdmin.id ? { ...u, role: "systemadministrator", updatedAt: nowIso() } : u,
      );
    }
  }
  try {
    window.localStorage.setItem(RBAC_MIGRATION_KEY, "1");
  } catch {
    /* quota */
  }
  return next;
}

/** Beim ersten Start: legt einen Default-Admin auf Basis des Engineer-Stamms an
 *  und migriert vorhandene Legacy-Storage-Keys auf dessen Scope. Idempotent. */
export function bootstrap(): UserProfile {
  if (typeof window === "undefined") {
    // SSR-safer dummy; wird clientseitig durch echten Bootstrap ersetzt
    return makeDefaultAdmin("bootstrap-ssr");
  }
  let users = loadUsers();
  if (users.length === 0) {
    const admin = makeDefaultAdmin(newUserId());
    users = [admin];
    saveUsers(users);
    // Legacy-Keys auf Admin-Scope verschieben (kopieren, Original lassen)
    for (const k of LEGACY_KEYS) {
      const v = window.localStorage.getItem(k);
      const scoped = `${k}::${admin.id}`;
      if (v !== null && window.localStorage.getItem(scoped) === null) {
        try {
          window.localStorage.setItem(scoped, v);
        } catch {
          /* quota */
        }
      }
    }
    try {
      window.localStorage.setItem(RBAC_MIGRATION_KEY, "1");
    } catch {
      /* quota */
    }
    setActiveUserId(admin.id);
    return admin;
  }
  const migrated = migrateToRbacV1(users);
  if (migrated !== users) {
    saveUsers(migrated);
    users = migrated;
  }
  const activeId = getActiveUserId();
  if (!activeId || !users.find((u) => u.id === activeId)) {
    const fallback = users.find((u) => u.status === "active") ?? users[0];
    setActiveUserId(fallback.id);
    return fallback;
  }
  return users.find((u) => u.id === activeId)!;
}

function makeDefaultAdmin(id: string): UserProfile {
  const fullName = dashboardData.engineer.name ?? "Admin Nutzer";
  const parts = fullName.split(/\s+/);
  const firstName = parts[0] ?? "Admin";
  const lastName = parts.slice(1).join(" ") || "Nutzer";
  return {
    id,
    firstName,
    lastName,
    displayName: fullName,
    email: "",
    phone: "",
    role: "systemadministrator",
    status: "active",
    mfaEnabled: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

/* ----------------------------- Actor Context ------------------------------ */

/**
 * ActorContext — beschreibt, **wer** eine Mutation ausführt.
 *
 * Bewusst als expliziter Parameter statt Ambient/Global: macht Aufrufpfade im
 * Code lesbar und lässt sich später leicht durch AsyncLocalStorage /
 * Request-Context ersetzen, sobald echte Auth aktiv ist. Feldname `actorId`
 * (statt `changedBy`) passt zum späteren Entra-`oid`.
 */
export interface ActorContext {
  /** Id des ausführenden Users. `"system"` für automatisierte Pfade. */
  actorId: string;
  /** Snapshot der Rolle zum Zeitpunkt der Aktion. */
  actorRole?: UserRole;
  /** Optionaler Freitext (z. B. "bulk deactivation"). */
  reason?: string;
}

/** Baut das Actor-Feld-Set für Log-Contexte. Fehlender Actor → `"unknown"`. */
function actorFields(actor?: ActorContext): Record<string, unknown> {
  return {
    actorId: actor?.actorId ?? "unknown",
    actorRole: actor?.actorRole,
    reason: actor?.reason,
  };
}

/**
 * Wählt das Log-Level für erfolgreiche Mutationen. Ohne Actor-Attribution
 * loggen wir auf `warn`, damit der Log-Viewer fehlende Herkunftsinfos
 * sichtbar macht (forensische Lücke, nicht bloß Info).
 */
function successLevel(actor?: ActorContext): "info" | "warn" {
  return actor?.actorId ? "info" : "warn";
}

/* ----------------------------------- CRUD --------------------------------- */

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  profileImage?: string;
}

export function createUser(input: CreateUserInput, actor?: ActorContext): UserProfile {
  const users = loadUsers();
  const user: UserProfile = {
    id: newUserId(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    displayName:
      (input.displayName ?? `${input.firstName} ${input.lastName}`).trim() || "Unbenannt",
    email: (input.email ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    role: input.role,
    status: input.status ?? "active",
    profileImage: input.profileImage,
    mfaEnabled: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveUsers([...users, user]);
  logger[successLevel(actor)]("User created", {
    module: "UserManagement",
    action: "createUser",
    userId: user.id,
    role: user.role,
    status: user.status,
    ...actorFields(actor),
  });
  return user;
}

/** Zählt aktive Systemadministratoren (ohne `excludeId`). Schutz vor Lockout. */
function activeSysAdminCount(users: UserProfile[], excludeId?: string): number {
  return users.filter(
    (u) => u.role === "systemadministrator" && u.status === "active" && u.id !== excludeId,
  ).length;
}

export function updateUser(
  id: string,
  patch: Partial<Omit<UserProfile, "id" | "createdAt">>,
  actor?: ActorContext,
): UserProfile | null {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) {
    logger.warn("User update skipped: user not found", {
      module: "UserManagement",
      action: "updateUser",
      userId: id,
      ...actorFields(actor),
    });
    return null;
  }
  const current = users[idx];
  const nextRole = (patch.role ?? current.role) as UserRole;
  const nextStatus = (patch.status ?? current.status) as UserStatus;
  const wasActiveSysAdmin = current.role === "systemadministrator" && current.status === "active";
  const stillActiveSysAdmin = nextRole === "systemadministrator" && nextStatus === "active";
  if (wasActiveSysAdmin && !stillActiveSysAdmin) {
    if (activeSysAdminCount(users, id) === 0) {
      logger.warn("User update blocked: last active systemadministrator", {
        module: "UserManagement",
        action: "updateUser",
        code: "SYSADMIN_LOCKOUT",
        userId: id,
        ...actorFields(actor),
      });
      return null;
    }
  }
  const next: UserProfile = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  };
  const copy = users.slice();
  copy[idx] = next;
  saveUsers(copy);
  logger[successLevel(actor)]("User updated", {
    module: "UserManagement",
    action: "updateUser",
    userId: next.id,
    role: next.role,
    status: next.status,
    changedFields: Object.keys(patch),
    ...actorFields(actor),
  });
  return next;
}

/** Hard-Delete inklusive aller gescopten Daten. Letzten SysAdmin nicht löschen. */
export function deleteUser(id: string, actor?: ActorContext): { ok: boolean; reason?: string } {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) {
    logger.warn("User delete skipped: not found", {
      module: "UserManagement",
      action: "deleteUser",
      userId: id,
      ...actorFields(actor),
    });
    return { ok: false, reason: "Benutzer nicht gefunden." };
  }
  if (target.role === "systemadministrator" && activeSysAdminCount(users, id) === 0) {
    logger.warn("User delete blocked: last active systemadministrator", {
      module: "UserManagement",
      action: "deleteUser",
      code: "SYSADMIN_LOCKOUT",
      userId: id,
      ...actorFields(actor),
    });
    return {
      ok: false,
      reason: "Letzter aktiver System-Administrator kann nicht gelöscht werden.",
    };
  }
  const adminsLeft = users.filter(
    (u) =>
      (u.role === "administrator" || u.role === "systemadministrator") &&
      u.status === "active" &&
      u.id !== id,
  );
  if (target.role === "administrator" && adminsLeft.length === 0) {
    logger.warn("User delete blocked: last active administrator", {
      module: "UserManagement",
      action: "deleteUser",
      code: "ADMIN_LOCKOUT",
      userId: id,
      ...actorFields(actor),
    });
    return {
      ok: false,
      reason: "Letzter aktiver Administrator kann nicht gelöscht werden.",
    };
  }
  const next = users.filter((u) => u.id !== id);
  saveUsers(next);
  // gescopte Storage-Einträge dieses Users entfernen
  if (typeof window !== "undefined") {
    const toDrop: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.endsWith(`::${id}`)) toDrop.push(k);
    }
    toDrop.forEach((k) => window.localStorage.removeItem(k));
  }
  // Falls aktiver Benutzer gelöscht wurde, fallback setzen
  if (getActiveUserId() === id) {
    const fallback = next.find((u) => u.status === "active") ?? next[0];
    if (fallback) setActiveUserId(fallback.id);
  }
  logger[successLevel(actor)]("User deleted", {
    module: "UserManagement",
    action: "deleteUser",
    userId: id,
    role: target.role,
    ...actorFields(actor),
  });
  return { ok: true };
}


export function setUserStatus(id: string, status: UserStatus): UserProfile | null {
  return updateUser(id, { status });
}

export function setUserRole(id: string, role: UserRole): UserProfile | null {
  return updateUser(id, { role });
}

/* ------------------------------ Auth Helpers ------------------------------ */

export function hasRole(user: UserProfile | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/** Wahr für `administrator` UND `systemadministrator`. */
export function isAdmin(user: UserProfile | null): boolean {
  return hasRole(user, "administrator", "systemadministrator");
}

export function isSystemAdmin(user: UserProfile | null): boolean {
  return hasRole(user, "systemadministrator");
}

/** Initialen aus Vor-/Nachname (Fallback: Anzeigename). */
export function initialsOf(u: Pick<UserProfile, "firstName" | "lastName" | "displayName">): string {
  const a = (u.firstName ?? "").trim();
  const b = (u.lastName ?? "").trim();
  if (a || b) return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || "?";
  const d = (u.displayName ?? "").trim();
  return d.slice(0, 2).toUpperCase() || "?";
}

export const UserManagementService = {
  loadUsers,
  saveUsers,
  getActiveUser,
  getActiveUserId,
  setActiveUserId,
  userScopedKey,
  bootstrap,
  createUser,
  updateUser,
  deleteUser,
  setUserStatus,
  setUserRole,
  hasRole,
  isAdmin,
  subscribeUserChanges,
};
