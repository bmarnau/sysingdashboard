import type { CustomerAccessLevel } from "@/lib/customer-data/my-customers";

const customerStatusLabel: Record<string, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
};

export function customerStatusText(status: string): string {
  return customerStatusLabel[status] ?? status;
}

/** Anzeigetext für den Read-/Write-Indikator aus dem eigenen Customer Access. */
export function accessLevelText(level: CustomerAccessLevel): string {
  return level === "write" ? "Schreibzugriff" : "Nur Lesen";
}

/** Anzeigetext für den eigenen Verantwortungsstatus (fachliche Beziehung, keine Rolle). */
export function responsibilityStatusText(status: string): string {
  switch (status) {
    case "active":
      return "Verantwortlich";
    case "ended":
      return "Verantwortung beendet";
    default:
      return status;
  }
}
