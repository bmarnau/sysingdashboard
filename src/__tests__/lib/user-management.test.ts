import { beforeEach, describe, expect, it } from "vitest";
import {
  createUser,
  deleteUser,
  hasRole,
  isAdmin,
  isSystemAdmin,
  initialsOf,
  loadUsers,
  saveUsers,
  setActiveUserId,
  setUserRole,
  setUserStatus,
  updateUser,
  userScopedKey,
} from "@/lib/user-management";
import { makeUser } from "../fixtures/users";

beforeEach(() => {
  window.localStorage.clear();
  // Modul-Cache in user-management explizit leeren – nach `invalidateCaches`
  // ist `usersCacheRaw` `null` und würde ohne dieses `saveUsers([])` weiterhin
  // die stale `usersCache`-Referenz aus dem vorherigen Test liefern.
  saveUsers([]);
  window.localStorage.clear();
});

describe("hasRole / isAdmin / isSystemAdmin", () => {
  it("should_returnFalse_when_userIsNull", () => {
    expect(hasRole(null, "administrator")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isSystemAdmin(null)).toBe(false);
  });

  it("should_matchAdminRoles_when_isAdmin", () => {
    expect(isAdmin(makeUser("administrator"))).toBe(true);
    expect(isAdmin(makeUser("systemadministrator"))).toBe(true);
    expect(isAdmin(makeUser("engineer"))).toBe(false);
  });

  it("should_matchOnlySysAdmin_when_isSystemAdmin", () => {
    expect(isSystemAdmin(makeUser("systemadministrator"))).toBe(true);
    expect(isSystemAdmin(makeUser("administrator"))).toBe(false);
  });
});

describe("initialsOf", () => {
  it("should_useFirstAndLastName_when_bothPresent", () => {
    expect(initialsOf({ firstName: "Anna", lastName: "Berg", displayName: "" })).toBe("AB");
  });

  it("should_fallBackToDisplayName_when_namesEmpty", () => {
    expect(initialsOf({ firstName: "", lastName: "", displayName: "System Admin" })).toBe("SY");
  });
});

describe("CRUD lifecycle", () => {
  it("should_persistUser_when_created", () => {
    const admin = createUser({ firstName: "Anna", lastName: "Berg", role: "administrator" });
    expect(loadUsers()).toHaveLength(1);
    expect(admin.displayName).toBe("Anna Berg");
  });

  it("should_blockDemotion_when_lastSysAdmin", () => {
    const sysAdmin = createUser({ firstName: "S", lastName: "A", role: "systemadministrator" });
    const updated = updateUser(sysAdmin.id, { role: "viewer" });
    expect(updated).toBeNull();
  });

  it("should_allowDemotion_when_secondSysAdminExists", () => {
    const first = createUser({ firstName: "S", lastName: "A", role: "systemadministrator" });
    createUser({ firstName: "S", lastName: "B", role: "systemadministrator" });
    const updated = updateUser(first.id, { role: "viewer" });
    expect(updated?.role).toBe("viewer");
  });

  it("should_updateStatusAndRole_when_helpersCalled", () => {
    createUser({ firstName: "S", lastName: "A", role: "systemadministrator" });
    const eng = createUser({ firstName: "E", lastName: "N", role: "engineer" });
    expect(setUserStatus(eng.id, "inactive")?.status).toBe("inactive");
    expect(setUserRole(eng.id, "teamlead")?.role).toBe("teamlead");
  });

  it("should_blockDelete_when_lastSysAdmin", () => {
    const sysAdmin = createUser({ firstName: "S", lastName: "A", role: "systemadministrator" });
    const result = deleteUser(sysAdmin.id);
    expect(result.ok).toBe(false);
  });

  it("should_removeScopedStorage_when_userDeleted", () => {
    createUser({ firstName: "S", lastName: "A", role: "systemadministrator" });
    const eng = createUser({ firstName: "E", lastName: "N", role: "engineer" });
    setActiveUserId(eng.id);
    window.localStorage.setItem(userScopedKey("northbit-dashboard-v2"), "payload");
    const key = userScopedKey("northbit-dashboard-v2");

    const result = deleteUser(eng.id);
    expect(result.ok).toBe(true);
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});

describe("userScopedKey", () => {
  it("should_scopeByActiveUserId_when_userActive", () => {
    saveUsers([makeUser("engineer", { id: "usr-xy" })]);
    setActiveUserId("usr-xy");
    expect(userScopedKey("base")).toBe("base::usr-xy");
  });

  it("should_useDefault_when_noActiveUser", () => {
    expect(userScopedKey("base")).toBe("base::default");
  });
});
