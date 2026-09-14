import type { UserProfile } from "@/lib/user-management";
import { requirePermission } from "@/lib/rbac/permissions";
import {
  loadKioskDemoDataset,
  removeKioskDemoDataset,
  type KIOSK_DEMO_DATASET_VERSION,
} from "@/lib/kiosk/kiosk-demo-repository";
import type { KioskDemoDataset } from "@/lib/kiosk/kiosk-demo-dataset";

void (null as unknown as typeof KIOSK_DEMO_DATASET_VERSION);

export function loadKioskDemoDataForActor(actor: UserProfile): KioskDemoDataset {
  requirePermission(actor, "users.manage");
  return loadKioskDemoDataset();
}

export function removeKioskDemoDataForActor(actor: UserProfile): void {
  requirePermission(actor, "users.manage");
  removeKioskDemoDataset();
}
