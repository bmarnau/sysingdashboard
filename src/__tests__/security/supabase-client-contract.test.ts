/**
 * Governance-Regressionstest — abgenommener Auth-Client-Vertrag (Commit 425fbed,
 * Security #407 / CI #416 PASS).
 *
 * Der Lovable Preview-Auth-Broker (`previewAuthStorage.ts` /
 * `brokeredPreviewStorage`) wurde am 24.08.2026 als unbeauftragte Nebenänderung
 * entfernt (Commits 9849350, 425fbed). Dieser statische Test verhindert, dass er
 * erneut in den Client gelangt.
 */
import { describe, expect, it } from "vitest";
import "../env/test-instance";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "src", "integrations", "supabase");
const CLIENT = readFileSync(join(DIR, "client.ts"), "utf8");
const FLAT = CLIENT.replace(/\s+/g, " ");

describe("Supabase-Client — abgenommener Auth-Storage-Vertrag (425fbed)", () => {
  it("should_notImportPreviewAuthBroker_when_readingClient", () => {
    expect(CLIENT).not.toMatch(/previewAuthStorage/);
    expect(CLIENT).not.toMatch(/brokeredPreviewStorage/);
  });

  it("should_useLocalStorageOrUndefined_when_configuringAuthStorage", () => {
    expect(FLAT).toMatch(
      /auth: \{ storage: typeof window !== "undefined" \? localStorage : undefined, persistSession: true, autoRefreshToken: true, \}/,
    );
  });

  it("should_notExist_when_checkingPreviewAuthStorageFile", () => {
    expect(existsSync(join(DIR, "previewAuthStorage.ts"))).toBe(false);
  });
});
