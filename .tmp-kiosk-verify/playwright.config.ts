import { defineConfig } from "@playwright/test";
import { E2E_SUPABASE_URL, E2E_SUPABASE_PUBLISHABLE_KEY } from "../e2e/fixtures/supabase-e2e";
export default defineConfig({
  testDir: ".tmp-kiosk-verify",
  timeout: 60000,
  reporter: "list",
  use: { baseURL: "http://localhost:8184", trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "chromium", use: { launchOptions: { executablePath: "/opt/ms-playwright/chromium-1194/chrome-linux/chrome" } } }],
  webServer: {
    command: "bun run dev --port 8184 --strictPort",
    cwd: "/dev-server",
    url: "http://localhost:8184",
    reuseExistingServer: false,
    timeout: 120000,
    env: { VITE_SUPABASE_URL: E2E_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL: E2E_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_PUBLISHABLE_KEY },
  },
});
