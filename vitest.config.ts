/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Eigenständige Test-Konfiguration.
 *
 * Bewusst getrennt von `vite.config.ts`, damit das Cloudflare/TanStack-Start-
 * Plugin nicht in die Vitest-Umgebung geladen wird (spart Zeit und vermeidet
 * SSR-Kollisionen mit jsdom).
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    setupFiles: ["src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".output", ".vinxi"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/lib/**", "src/hooks/**"],
      exclude: [
        "**/*.d.ts",
        "src/routeTree.gen.ts",
        "src/lib/i18n/**",
        "src/lib/pdf-export.ts",
        "src/lib/export-download-service.ts",
      ],
      // Nur die kritische Geschäftslogik gated harten Threshold – global 80% wäre
      // Wartungslast ohne Sicherheitsgewinn.
      thresholds: {
        "src/lib/time-period.ts": {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
