import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";

// Supabase-Client-Mock: verhindert, dass die Testumgebung echte Env-Variablen
// benötigt. Tests, die echte DB-Interaktionen prüfen, können den Mock lokal
// überschreiben (vi.mocked / vi.spyOn).
vi.mock("@/integrations/supabase/client", () => {
  const noop = vi.fn();
  const buildChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    const resolved = Promise.resolve({ data: null, error: null });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.neq = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.then = resolved.then.bind(resolved);
    return chain;
  };
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: noop } },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockImplementation(() => buildChain()),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: null, error: null }),
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
        }),
      },
    },
  };
});

// vitest-axe: `toHaveNoViolations` als Vitest-Matcher registrieren.
expect.extend(axeMatchers);

// React-Testing-Library-DOM zwischen Tests aufräumen.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// Browser-APIs, die jsdom nicht implementiert und die Radix / Recharts brauchen.
if (typeof window !== "undefined") {
  if (!("matchMedia" in window)) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }),
    });
  }

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  if (!("ResizeObserver" in window)) {
    // @ts-expect-error – Testumgebungs-Stub
    window.ResizeObserver = ResizeObserverStub;
  }

  if (!("scrollTo" in window)) {
    // @ts-expect-error – jsdom kennt kein scrollTo
    window.scrollTo = vi.fn();
  }
}
