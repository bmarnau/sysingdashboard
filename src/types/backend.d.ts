declare module "*/backend/services/syncService.mjs" {
  export function runSync(opts?: { source?: string }): Promise<{
    ok: boolean;
    startedAt: string;
    durationMs: number;
    mode: "mock" | "live";
    recordsProcessed: number;
    source: string;
  }>;
  export function getSyncMeta(): {
    lastRun: string | null;
    lastError: string | null;
    lastDurationMs: number | null;
    runCount: number;
  };
}

declare module "*/backend/services/statusService.mjs" {
  export function getStatus(): {
    mode: "development" | "production";
    azure: { allowed: boolean; secrets: Record<string, boolean> };
    sync: {
      lastRun: string | null;
      lastError: string | null;
      lastDurationMs: number | null;
      runCount: number;
    };
    timestamp: string;
  };
}

declare module "*/config/env.mjs" {
  export const MODE: "development" | "production";
  export function isDev(): boolean;
  export function isProd(): boolean;
  export function getMode(): "development" | "production";
  export function assertAzureAllowed(): void;
}

declare module "*/config/secretManager.mjs" {
  export const KNOWN: readonly string[];
  export const REQUIRED_IN_PROD: readonly string[];
  export function isDev(): boolean;
  export function isProd(): boolean;
  export function has(name: string): boolean;
  export function mask(value: string | undefined | null): string;
  export function preview(name: string): string;
  export function status(): Record<string, boolean>;
  export function consume(name: string): string;
  export function getEnv(name: string, requiredInProd?: boolean): string | undefined;
  export function validate(): {
    mode: "development" | "production";
    missing: string[];
    ok: boolean;
  };
}

declare module "*/backend/services/ensure-env.mjs" {
  export function ensureEnv(): {
    mode: "development" | "production";
    missing: string[];
    ok: boolean;
  };
}
