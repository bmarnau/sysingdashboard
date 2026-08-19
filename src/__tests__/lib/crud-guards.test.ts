import { describe, expect, it } from "vitest";
import { canCreateAny, canMutate, type CrudEntity } from "@/lib/rbac/crud-guards";
import { makeUser } from "../fixtures/users";

const ENTITIES: CrudEntity[] = ["project", "workpackage", "activity"];

/**
 * F-18: Read-only-Rollen dürfen lokale Fachobjekte nicht verändern.
 * Die Erwartungen spiegeln ausschließlich die bestehende RBAC-Matrix.
 */
describe("F-18 CRUD-Guards", () => {
  for (const role of ["viewer", "customer"] as const) {
    it(`should_denyAllCrud_when_${role}`, () => {
      const user = makeUser(role);
      for (const e of ENTITIES) expect(canMutate(user, e)).toBe(false);
      expect(canCreateAny(user)).toBe(false);
    });
  }

  it("should_denyAllCrud_when_noUser", () => {
    for (const e of ENTITIES) expect(canMutate(null, e)).toBe(false);
    expect(canCreateAny(null)).toBe(false);
  });

  for (const role of ["systemadministrator", "administrator", "teamlead", "projectmanager"] as const) {
    it(`should_allowAllCrud_when_${role}`, () => {
      const user = makeUser(role);
      for (const e of ENTITIES) expect(canMutate(user, e)).toBe(true);
      expect(canCreateAny(user)).toBe(true);
    });
  }

  it("should_keepEngineerOwnSemanticsUnchanged_when_engineer", () => {
    const user = makeUser("engineer");
    expect(canMutate(user, "project")).toBe(false);
    expect(canMutate(user, "workpackage")).toBe(true);
    expect(canMutate(user, "activity")).toBe(true);
    expect(canCreateAny(user)).toBe(true);
  });
});

/**
 * Defensive Handler-Prüfung: der Mutationspfad der lokalen Fachobjekte darf
 * bei fehlender Permission den Store nicht anfassen.
 */
describe("F-18 defensive Handler", () => {
  function makeHandler(user: ReturnType<typeof makeUser> | null, entity: CrudEntity) {
    const store: string[] = ["bestand"];
    return {
      store,
      save(value: string) {
        if (!canMutate(user, entity)) return;
        store.push(value);
      },
      remove(value: string) {
        if (!canMutate(user, entity)) return;
        const i = store.indexOf(value);
        if (i >= 0) store.splice(i, 1);
      },
    };
  }

  for (const role of ["viewer", "customer"] as const) {
    for (const entity of ENTITIES) {
      it(`should_notMutateStore_when_${role}_mutates_${entity}`, () => {
        const h = makeHandler(makeUser(role), entity);
        h.save("neu");
        h.remove("bestand");
        expect(h.store).toEqual(["bestand"]);
      });
    }
  }

  it("should_mutateStore_when_projectmanager", () => {
    const h = makeHandler(makeUser("projectmanager"), "project");
    h.save("neu");
    expect(h.store).toEqual(["bestand", "neu"]);
  });
});
