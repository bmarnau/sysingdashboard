import "@testing-library/jest-dom/vitest";
// vitest-axe: aktiviert Matcher `toHaveNoViolations` + globales Type-Augment.
import "vitest-axe/extend-expect";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

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
