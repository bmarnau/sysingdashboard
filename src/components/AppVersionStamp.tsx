import { DASHBOARD_RELEASE_DATE, DASHBOARD_VERSION_LABEL } from "@/lib/app-version";
import { cn } from "@/lib/utils";

export function AppVersionStamp({ className }: { className?: string }) {
  return (
    <p className={cn("font-mono text-xs text-muted-foreground", className)}>
      <span>{DASHBOARD_VERSION_LABEL}</span>
      <span className="sr-only">
        {" "}
        (Versionsdatum <time dateTime={DASHBOARD_RELEASE_DATE}>{DASHBOARD_RELEASE_DATE}</time>)
      </span>
    </p>
  );
}
