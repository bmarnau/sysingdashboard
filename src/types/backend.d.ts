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
    application: {
      name: string;
      mode: "development" | "production";
      startedAt: string;
    };
    github: {
      repositoryUrl: string;
      branch: string | null;
      commit: string | null;
    };
    lovable: {
      publishedUrl: string | null;
      lastDeploymentAt: string | null;
      status: "configured" | null;
    };
    azure: {
      allowed: boolean;
      authMode: string;
      sql: { configured: boolean };
      table: { configured: boolean };
      storage: { configured: boolean };
      lastConnectionTestAt: null;
      missingEnv: string[];
      missingEnvCount: number;
    };
    security: {
      authMode: string;
      rbac: {
        enabled: boolean;
        rolesCount: number;
        permissionsCount: number;
      };
      secretManager: {
        enabled: boolean;
        missing: string[];
        missingCount: number;
      };
      envValidation: {
        scope: string;
        ok: boolean;
        missing: string[];
        missingCount: number;
      };
      keyVault: { configured: boolean };
      correlationId: {
        middlewareActive: boolean;
        header: string;
        activeRoutesWithSupport: number;
        activeRoutesWithoutSupport: number;
        lastTestAt: null;
      };
    };
    data: {
      lastAzureExportAt: string | null;
      lastAzureImportAt: null;
    };
    sync: {
      lastRun: string | null;
      lastError: string | null;
      lastDurationMs: number | null;
      runCount: number;
    };
    mode: "development" | "production";
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
