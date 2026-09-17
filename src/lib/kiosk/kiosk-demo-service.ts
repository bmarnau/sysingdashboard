import type { UserProfile } from "@/lib/user-management";
import { requirePermission } from "@/lib/rbac/permissions";
import {
  loadKioskDemoDataset,
  removeKioskDemoDataset,
  writeKioskDemoDataset,
} from "@/lib/kiosk/kiosk-demo-repository";
import type { KioskDemoDataset } from "@/lib/kiosk/kiosk-demo-dataset";
import { parseKioskDemoJson } from "@/lib/kiosk/kiosk-demo-import";

export function loadKioskDemoDataForActor(actor: UserProfile): KioskDemoDataset {
  requirePermission(actor, "users.manage");
  return loadKioskDemoDataset();
}

export function importKioskDemoJsonForActor(
  actor: UserProfile,
  json: string,
  now: () => Date = () => new Date(),
): KioskDemoDataset {
  requirePermission(actor, "users.manage");
  const dataset = parseKioskDemoJson(json, now);
  return writeKioskDemoDataset(dataset);
}

export function removeKioskDemoDataForActor(actor: UserProfile): void {
  requirePermission(actor, "users.manage");
  removeKioskDemoDataset();
}
