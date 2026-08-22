import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === "profiles") {
          return {
            order: async () => ({
              data: [
                {
                  id: "user-petra",
                  first_name: "petra",
                  last_name: "Marnau",
                  display_name: "petra Marnau",
                  email: "petra@example.test",
                  phone: "",
                  status: "active",
                  mfa_enabled: false,
                  profile_image: null,
                  created_at: "2026-08-22T00:00:00.000Z",
                  updated_at: "2026-08-22T00:00:00.000Z",
                },
                {
                  id: "user-complex",
                  first_name: "alex",
                  last_name: "von Überlingen-Schmidt",
                  display_name: "alex von Überlingen-Schmidt",
                  email: "alex@example.test",
                  phone: "",
                  status: "active",
                  mfa_enabled: false,
                  profile_image: null,
                  created_at: "2026-08-22T00:00:00.000Z",
                  updated_at: "2026-08-22T00:00:00.000Z",
                },
              ],
              error: null,
            }),
          };
        }

        return Promise.resolve({
          data: [
            { user_id: "user-petra", role: "projectmanager" },
            { user_id: "user-complex", role: "engineer" },
          ],
          error: null,
        });
      },
    }),
  },
}));

import { listUsers } from "@/lib/users-supabase-service";

describe("users-supabase-service", () => {
  it("normalizes profile display names consistently with the dashboard header", async () => {
    const users = await listUsers();

    expect(users.find((user) => user.id === "user-petra")?.displayName).toBe("Petra Marnau");
    expect(users.find((user) => user.id === "user-complex")?.displayName).toBe(
      "Alex von Überlingen-Schmidt",
    );
  });
});
