/**
 * Sichtbare Abmeldeaktion im Dashboard-Header.
 *
 * Nutzt ausschließlich den bestehenden zentralen Abmeldepfad
 * (`performLogout`, ADR-0020) — keine eigene Session- oder Auth-Logik.
 */
import { LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { performLogout } from "@/lib/session/logout-service";

export function LogoutButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      title="Abmelden"
      aria-label="Abmelden"
      suppressHydrationWarning
      onClick={() => {
        void performLogout({
          reason: "manual",
          navigate: (target) => {
            void navigate({ to: target, replace: true });
          },
        });
      }}
      className="grid size-10 min-h-10 min-w-10 place-items-center rounded-lg border border-border bg-secondary/40 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LogOut className="size-4" aria-hidden="true" />
    </button>
  );
}
