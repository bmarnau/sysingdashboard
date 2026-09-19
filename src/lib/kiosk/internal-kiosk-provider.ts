import { createDemoKioskDataProvider } from "@/lib/kiosk/demo-kiosk-provider";
import type {
  KioskDataProvider,
  KioskDomainId,
  KioskDomainSnapshot,
  KioskSnapshot,
} from "@/lib/kiosk/kiosk-contract";
import type { InternalKioskSnapshotOutcome } from "@/lib/kiosk-runtime/internal-kiosk.functions";
import { readInternalKioskSnapshotFn } from "@/lib/kiosk-runtime/internal-kiosk.functions";

const INTERNAL_DOMAIN_IDS = new Set<KioskDomainId>(["projects", "workPackages", "activities"]);
const DEMO_DOMAIN_IDS = new Set<KioskDomainId>(["availability", "infrastructure", "support"]);

const DOMAIN_TITLE: Record<KioskDomainId, string> = {
  projects: "Projekte",
  workPackages: "Arbeitspakete",
  activities: "Tätigkeiten",
  availability: "Verfügbarkeit",
  infrastructure: "Infrastruktur",
  support: "Support-Postfach",
};

export interface InternalKioskProviderOptions {
  systemhouseId?: string;
  now?: () => Date;
  demoProvider?: KioskDataProvider;
  readInternal?: (input: {
    data: { systemhouseId?: string };
  }) => Promise<InternalKioskSnapshotOutcome>;
}

function unavailableDomain(id: KioskDomainId, note: string): KioskDomainSnapshot {
  return {
    id,
    title: DOMAIN_TITLE[id],
    level: "unknown",
    metrics: [],
    note,
    sourceKind: "unavailable",
    observedAt: null,
  };
}

function internalUnavailableDomains(note: string): KioskDomainSnapshot[] {
  return [...INTERNAL_DOMAIN_IDS].map((id) => unavailableDomain(id, note));
}

function demoUnavailableDomains(note: string): KioskDomainSnapshot[] {
  return [...DEMO_DOMAIN_IDS].map((id) => unavailableDomain(id, note));
}

function selectDemoDomains(snapshot: KioskSnapshot | null): KioskDomainSnapshot[] {
  if (!snapshot || snapshot.datasetState !== "loaded") {
    return demoUnavailableDomains("Demo-Daten sind auf diesem Gerät nicht geladen.");
  }

  const selected = snapshot.domains.filter((domain) => DEMO_DOMAIN_IDS.has(domain.id));
  const byId = new Map(selected.map((domain) => [domain.id, domain]));

  return [...DEMO_DOMAIN_IDS].map(
    (id) => byId.get(id) ?? unavailableDomain(id, "Demo-Domäne ist nicht verfügbar."),
  );
}

export function createInternalReadKioskDataProvider({
  systemhouseId,
  now = () => new Date(),
  demoProvider = createDemoKioskDataProvider({ scenario: "default", now }),
  readInternal = readInternalKioskSnapshotFn,
}: InternalKioskProviderOptions = {}): KioskDataProvider {
  return {
    async getSnapshot(): Promise<KioskSnapshot> {
      const generatedAt = now().toISOString();

      let demoSnapshot: KioskSnapshot | null = null;
      try {
        demoSnapshot = await demoProvider.getSnapshot();
      } catch {
        demoSnapshot = null;
      }

      const internalOutcome = await readInternal({
        data: systemhouseId ? { systemhouseId } : {},
      });

      const internalDomains = internalOutcome.ok
        ? internalOutcome.value.domains
        : internalUnavailableDomains(
            internalOutcome.error === "INTERNAL_KIOSK_SCOPE_REQUIRED"
              ? "Systemhausauswahl für interne Daten erforderlich."
              : "Interne Daten derzeit nicht verfügbar.",
          );

      const demoDomains = selectDemoDomains(demoSnapshot);
      const internalObservedAt = internalOutcome.ok ? internalOutcome.value.observedAt : null;
      const demoObservedAt = demoSnapshot?.observedAt ?? null;

      return {
        mode: "hybrid",
        datasetState: "loaded",
        datasetVersion: "sysing.kiosk.hybrid.v1",
        generatedAt,
        observedAt: internalObservedAt ?? demoObservedAt ?? generatedAt,
        domains: [...internalDomains, ...demoDomains],
      };
    },
  };
}
