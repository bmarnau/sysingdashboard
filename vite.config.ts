// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { visualizer } from "rollup-plugin-visualizer";

function safeGit(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version?: string };
const buildInfo = {
  commit: safeGit("git rev-parse --short HEAD") || "unknown",
  commitFull: safeGit("git rev-parse HEAD") || "unknown",
  branch: safeGit("git rev-parse --abbrev-ref HEAD") || "unknown",
  builtAt: new Date().toISOString(),
  packageVersion: pkg.version ?? "0.0.0",
  repoRemote: safeGit("git config --get remote.origin.url") || "",
  dirty: safeGit("git status --porcelain") !== "",
};

// Bundle-Visualizer nur bei ANALYZE=1 einbinden — kein Overhead im Default-Build.
// Nutzung: `bun run analyze` → schreibt dist/stats.html (gitignored).
const analyze = process.env.ANALYZE === "1";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      __BUILD_INFO__: JSON.stringify(buildInfo),
    },
    plugins: analyze
      ? [
          visualizer({
            filename: "dist/stats.html",
            template: "treemap",
            gzipSize: true,
            brotliSize: true,
            open: false,
          }),
        ]
      : [],
  },
});
