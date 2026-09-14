import {
  KIOSK_DEMO_DATASET_VERSION,
  createKioskDemoDataset,
  type KioskDemoDataset,
} from "@/lib/kiosk/kiosk-demo-dataset";

export { KIOSK_DEMO_DATASET_VERSION };

export const KIOSK_DEMO_STORAGE_KEY = "northbit-kiosk-demo-dataset-v1";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function isDataset(value: unknown): value is KioskDemoDataset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<KioskDemoDataset>;
  return (
    candidate.version === KIOSK_DEMO_DATASET_VERSION &&
    typeof candidate.loadedAt === "string" &&
    Array.isArray(candidate.domains)
  );
}

export function readKioskDemoDataset(): KioskDemoDataset | null {
  const target = storage();
  if (!target) return null;
  try {
    const raw = target.getItem(KIOSK_DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDataset(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadKioskDemoDataset(now = () => new Date()): KioskDemoDataset {
  const dataset = createKioskDemoDataset(now);
  const target = storage();
  if (target) target.setItem(KIOSK_DEMO_STORAGE_KEY, JSON.stringify(dataset));
  return dataset;
}

export function removeKioskDemoDataset(): void {
  storage()?.removeItem(KIOSK_DEMO_STORAGE_KEY);
}
