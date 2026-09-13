/**
 * BSF-03 P4 — E2E-Abdeckung „Meine Kunden“ (Issue #105).
 *
 * Geprüft wird das Laufzeitverhalten der Oberfläche für genau die
 * Sichtbarkeitsmatrix aus `docs/BSF-03-CUSTOMER-RESPONSIBILITY-DESIGN.md` §4:
 *
 *   aktives Konto ∩ dashboard.view ∩ aktive Membership ∩ aktive Responsibility
 *   ∩ Customer Access >= read
 *
 * Die Sicherheitsgrenze selbst bleibt serverseitig (RLS, `is_my_customer`,
 * `has_permission`) und ist im SQL-Artefakt `supabase/tests/bsf-03-*.sql`
 * (R01–R18) sowie in `src/__tests__/security/my-customers-functions.test.ts`
 * (M09–M13) belegt. Diese Spec stellt sicher, dass die UI die jeweilige
 * Serverentscheidung fail-closed und ohne Datenleck abbildet.
 *
 * Matrixzuordnung:
 *  1 read Access                      -> „Nur Lesen“
 *  2 write Access                     -> „Schreibzugriff“ + Hinweis
 *  3 Access ohne Responsibility       -> nicht in „Meine Kunden“
 *  4 Responsibility ohne Access       -> nicht sichtbar, Detail verweigert
 *  5 fremde Customer-URL / IDOR       -> kein Detail
 *  6 Cross-Systemhouse                -> DENY
 *  7 beendete Responsibility          -> nicht sichtbar
 *  8 inaktive/ungültige Membership    -> nicht sichtbar
 *  9 Viewer                           -> keine neuen Rechte
 * 10 Client-Rollenmanipulation        -> keine echten Serverrechte
 * 11 Empty State
 * 12 Error State
 */
import { test, expect } from "../../fixtures/test-instance";
import {
  CUSTOMER_FOREIGN,
  CUSTOMER_READ,
  CUSTOMER_WRITE,
  DENIED_MESSAGE,
  PERMISSION_MESSAGE,
  SH_A,
  SH_B,
  detail,
  installMyCustomersServerFnMock,
  scopeKey,
  summary,
} from "../../fixtures/my-customers-e2e";

const LIST_URL = "/meine-kunden";
const detailUrl = (systemhouseId: string, customerId: string) =>
  `/meine-kunden/${systemhouseId}/${customerId}`;

test.describe("BSF-03 „Meine Kunden“ – Sichtbarkeit und Fail-Closed-Verhalten", () => {
  test.use({ role: "engineer" });

  test("1/2: eigener Kunde mit read bzw. write Access wird korrekt gekennzeichnet", async ({
    page,
  }) => {
    await installMyCustomersServerFnMock(page, {
      list: {
        kind: "ok",
        value: [
          summary({ customerId: CUSTOMER_READ, name: "ACME Industrie", accessLevel: "read" }),
          summary({ customerId: CUSTOMER_WRITE, name: "Beta Werke", accessLevel: "write" }),
        ],
      },
    });
    await page.goto(LIST_URL);

    await expect(page.getByRole("heading", { name: "Meine Kunden", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /ACME Industrie/ })).toBeVisible();
    await expect(page.getByText("Nur Lesen")).toBeVisible();
    await expect(page.getByText("Schreibzugriff")).toBeVisible();
    await expect(page.getByText("Verantwortlich").first()).toBeVisible();
  });

  test("2: Detail mit write Access weist Schreiben als zusätzlich berechtigungspflichtig aus", async ({
    page,
  }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [summary({ customerId: CUSTOMER_WRITE, accessLevel: "write" })] },
      detailByScope: {
        [scopeKey(SH_A, CUSTOMER_WRITE)]: {
          kind: "ok",
          value: detail({ customerId: CUSTOMER_WRITE, accessLevel: "write", name: "Beta Werke" }),
        },
      },
    });
    await page.goto(detailUrl(SH_A, CUSTOMER_WRITE));

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Beta Werke");
    await expect(page.getByText("Schreibzugriff")).toBeVisible();
    await expect(page.getByText("Schreiben nur mit fachlicher Berechtigung")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /bearbeiten|löschen|zuweisen|neu/i }),
    ).toHaveCount(0);
  });

  test("1: Detail mit read Access zeigt Projekt -> Arbeitspaket -> Tätigkeit ohne Schreibhinweis", async ({
    page,
  }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [summary()] },
      detailByScope: {
        [scopeKey(SH_A, CUSTOMER_READ)]: { kind: "ok", value: detail() },
      },
    });
    await page.goto(detailUrl(SH_A, CUSTOMER_READ));

    await expect(page.getByText("Nur Lesen")).toBeVisible();
    await expect(page.getByText("Migration")).toBeVisible();
    await expect(page.getByText("Netzwerk")).toBeVisible();
    await expect(page.getByText("Switch konfiguriert")).toBeVisible();
    await expect(page.getByText("Schreiben nur mit fachlicher Berechtigung")).toHaveCount(0);
  });

  test("3: Customer Access ohne Responsibility erscheint nicht in „Meine Kunden“", async ({
    page,
  }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [] },
      detailByScope: {},
    });
    await page.goto(LIST_URL);

    await expect(page.getByText("Keine zugeordneten Kunden")).toBeVisible();
    await page.goto(detailUrl(SH_A, CUSTOMER_READ));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kunde nicht verfügbar");
  });

  test("4: Responsibility ohne Customer Access bleibt fail-closed unsichtbar", async ({ page }) => {
    const denied: string[] = [];
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [] },
      detailByScope: {},
      onDetailDenied: (scope) => denied.push(scope),
    });
    await page.goto(detailUrl(SH_A, CUSTOMER_READ));

    await expect(page.getByRole("alert")).toContainText(/keine gültige Zuordnung|existiert nicht/);
    await expect(page.getByText("Migration")).toHaveCount(0);
    expect(denied).toContain(scopeKey(SH_A, CUSTOMER_READ));
  });

  test("5: direkte fremde Customer-URL (IDOR) liefert kein Detail und keine Existenzaussage", async ({
    page,
  }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [summary()] },
      detailByScope: {
        [scopeKey(SH_A, CUSTOMER_READ)]: { kind: "ok", value: detail() },
      },
    });

    await page.goto(detailUrl(SH_A, CUSTOMER_FOREIGN));
    const foreign = await page.getByRole("alert").innerText();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kunde nicht verfügbar");

    await page.goto(detailUrl(SH_A, "22222222-2222-4222-8222-2222222222aa"));
    await expect(page.getByRole("alert")).toHaveText(foreign);
  });

  test("5: syntaktisch ungültige IDs lösen keinen Serveraufruf aus", async ({ page }) => {
    let calls = 0;
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [] },
      detailByScope: {},
      onDetailDenied: () => {
        calls += 1;
      },
    });
    await page.goto("/meine-kunden/not-a-uuid/also-not-a-uuid");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kunde nicht verfügbar");
    expect(calls).toBe(0);
  });

  test("6: Cross-Systemhouse-Zugriff wird verweigert", async ({ page }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [summary()] },
      detailByScope: {
        [scopeKey(SH_A, CUSTOMER_READ)]: { kind: "ok", value: detail() },
      },
    });
    await page.goto(detailUrl(SH_B, CUSTOMER_READ));

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kunde nicht verfügbar");
    await expect(page.getByText("ACME Industrie")).toHaveCount(0);
  });

  test("7: beendete Responsibility entfernt den Kunden aus Liste und Detail", async ({ page }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [] },
      detailByScope: {
        [scopeKey(SH_A, CUSTOMER_READ)]: { kind: "deny", message: DENIED_MESSAGE },
      },
    });
    await page.goto(LIST_URL);
    await expect(page.getByText("Keine zugeordneten Kunden")).toBeVisible();

    await page.goto(detailUrl(SH_A, CUSTOMER_READ));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kunde nicht verfügbar");
  });

  test("8: inaktive oder ungültige Membership macht den Kunden unsichtbar", async ({ page }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "ok", value: [] },
      detailByScope: {
        [scopeKey(SH_A, CUSTOMER_WRITE)]: { kind: "deny", message: DENIED_MESSAGE },
      },
    });
    await page.goto(LIST_URL);
    await expect(page.getByText("Keine zugeordneten Kunden")).toBeVisible();

    await page.goto(detailUrl(SH_A, CUSTOMER_WRITE));
    await expect(page.getByRole("alert")).toContainText(/keine gültige Zuordnung|existiert nicht/);
  });

  test("11: Empty State erklärt die fehlende Zuordnung ohne Kundendaten", async ({ page }) => {
    await installMyCustomersServerFnMock(page, { list: { kind: "ok", value: [] } });
    await page.goto(LIST_URL);

    await expect(page.getByText("Keine zugeordneten Kunden")).toBeVisible();
    await expect(page.getByRole("link", { name: /Kunde öffnen/ })).toHaveCount(0);
  });

  test("12: Error State zeigt keine Kundendaten", async ({ page }) => {
    await installMyCustomersServerFnMock(page, {
      list: { kind: "deny", message: "Kundenliste konnte nicht geladen werden." },
    });
    await page.goto(LIST_URL);

    await expect(page.getByRole("alert")).toContainText("konnte nicht geladen werden");
    await expect(page.getByRole("link", { name: /Kunde öffnen/ })).toHaveCount(0);
  });
});

test.describe("BSF-03 „Meine Kunden“ – Rollen- und Manipulationsgrenzen", () => {
  test.describe("Viewer", () => {
    test.use({ role: "viewer" });

    test("9: Viewer erhält über „Meine Kunden“ keine zusätzlichen Rechte", async ({ page }) => {
      await installMyCustomersServerFnMock(page, {
        list: { kind: "deny", message: PERMISSION_MESSAGE },
        detailByScope: {
          [scopeKey(SH_A, CUSTOMER_READ)]: { kind: "deny", message: PERMISSION_MESSAGE },
        },
      });

      await page.goto(LIST_URL);
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("link", { name: /Kunde öffnen/ })).toHaveCount(0);

      await page.goto(detailUrl(SH_A, CUSTOMER_READ));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kunde nicht verfügbar");
    });
  });

  test.describe("Client-Manipulation", () => {
    test.use({ role: "viewer" });

    test("10: vorgetäuschte Rolle im Browser-Storage erzeugt keine Serverrechte", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        try {
          localStorage.setItem("northbit-active-user", "attacker-sysadmin");
          localStorage.setItem("sysing:role-preview", "systemadministrator");
        } catch {
          /* ignore */
        }
      });
      await installMyCustomersServerFnMock(page, {
        list: { kind: "deny", message: PERMISSION_MESSAGE },
        detailByScope: {},
      });

      await page.goto(LIST_URL);
      await expect(page.getByRole("alert")).toBeVisible();

      await page.goto(detailUrl(SH_A, CUSTOMER_READ));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kunde nicht verfügbar");
      await expect(page.getByText("Migration")).toHaveCount(0);
    });
  });
});

test.describe("BSF-03 „Meine Kunden“ – ohne Session", () => {
  test("Unangemeldeter Aufruf landet auf der Anmeldung, nicht im Kundendetail", async ({
    page,
  }) => {
    await installMyCustomersServerFnMock(page, { list: { kind: "ok", value: [summary()] } });
    await page.goto(detailUrl(SH_A, CUSTOMER_READ));

    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText("ACME Industrie")).toHaveCount(0);
  });
});
