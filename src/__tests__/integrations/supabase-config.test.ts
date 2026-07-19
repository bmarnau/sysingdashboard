import { describe, it, expect, beforeEach, vi } from "vitest";

describe("getAuthConfigurationStatus", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function loadWith(env: Record<string, string | undefined>) {
    vi.stubGlobal("import", { meta: { env } });
    // Setze via import.meta-Ersatz: Vitest liest import.meta.env aus vite; wir stubben process.env.
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
      else process.env[k] = v;
    }
    return await import("@/integrations/supabase/config");
  }

  it("meldet 'missing', wenn keine ENV gesetzt ist", async () => {
    const mod = await loadWith({
      VITE_SUPABASE_URL: undefined,
      VITE_SUPABASE_PUBLISHABLE_KEY: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_PUBLISHABLE_KEY: undefined,
    });
    const s = mod.getAuthConfigurationStatus();
    expect(s.status).toBe("missing");
    expect(s.missingKeys).toContain("SUPABASE_URL");
    expect(s.missingKeys).toContain("SUPABASE_PUBLISHABLE_KEY");
  });

  it("meldet 'invalid' bei kaputter URL", async () => {
    const mod = await loadWith({
      SUPABASE_URL: "not-a-url",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
    });
    expect(mod.getAuthConfigurationStatus().status).toBe("invalid");
  });

  it("meldet 'invalid' und weist sb_secret_ ab", async () => {
    const mod = await loadWith({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_secret_should_never_ship",
    });
    const s = mod.getAuthConfigurationStatus();
    expect(s.status).toBe("invalid");
    expect(s.invalidReason).toMatch(/service-role/i);
  });

  it("meldet 'configured' bei plausiblem Publishable-Key", async () => {
    const mod = await loadWith({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abcdef",
    });
    expect(mod.getAuthConfigurationStatus().status).toBe("configured");
  });

  it("akzeptiert Legacy-JWT-Anon-Key-Form", async () => {
    const mod = await loadWith({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "aaa.bbb.ccc",
    });
    expect(mod.getAuthConfigurationStatus().status).toBe("configured");
  });
});
