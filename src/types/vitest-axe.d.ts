/// <reference types="vitest-axe/extend-expect" />

// vitest-axe v0.1 augments `namespace Vi`; einige Vitest-Versionen erwarten
// zusätzlich eine explizite Erweiterung des `Assertion`-Interfaces. Wir
// re-exportieren die Matcher-Signaturen hier, damit `expect(...).toHaveNoViolations()`
// projektweit ohne Cast typisiert wird.
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

export {};
