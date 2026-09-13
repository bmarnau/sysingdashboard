/**
 * Schlanker Seitenrahmen für die BSF-03-Kundenansichten.
 * Gleicht dem Dashboard-Header (Marke, Abmelden) und führt zurück zum Dashboard.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Server } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/header/LogoutButton";

export function CustomerPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="app-header sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl no-print">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Zum Dashboard"
          >
            <span
              className="grid size-9 place-items-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Server className="size-5 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Engineer Console
              </span>
              <span className="block text-sm font-semibold">Meine Kunden</span>
            </span>
          </Link>
          <nav aria-label="Bereiche" className="ml-auto flex items-center gap-2">
            <Link
              to="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" /> Dashboard
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
