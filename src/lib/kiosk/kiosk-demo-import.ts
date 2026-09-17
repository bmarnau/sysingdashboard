import { z } from "zod";
import { KIOSK_DOMAIN_IDS } from "@/lib/kiosk/kiosk-contract";
import { KIOSK_DEMO_DATASET_VERSION, type KioskDemoDataset } from "@/lib/kiosk/kiosk-demo-dataset";

export const KIOSK_DEMO_IMPORT_SCHEMA_VERSION = "sysing.kiosk.demo.v1";
export const KIOSK_DEMO_IMPORT_MAX_BYTES = 256 * 1024;

const kioskLevelSchema = z.enum(["ok", "warning", "critical", "unknown"]);
const kioskDomainIdSchema = z.enum([...KIOSK_DOMAIN_IDS]);

const kioskMetricSchema = z
  .object({
    value: z.number().finite().nullable(),
    label: z.string().trim().min(1).max(120),
    level: kioskLevelSchema,
    unit: z.string().trim().min(1).max(12).optional(),
  })
  .strict();

const kioskStatusBreakdownSchema = z
  .object({
    ok: z.number().int().nonnegative(),
    warning: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
  })
  .strict();

const kioskStatusRowSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    breakdown: kioskStatusBreakdownSchema,
  })
  .strict();

const kioskDomainSchema = z
  .object({
    id: kioskDomainIdSchema,
    title: z.string().trim().min(1).max(120),
    level: kioskLevelSchema,
    metrics: z.array(kioskMetricSchema).max(50),
    note: z.string().trim().max(500).optional(),
    rows: z.array(kioskStatusRowSchema).max(20).optional(),
  })
  .strict();

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Ungültiger Zeitstempel",
});

export const kioskDemoImportSchema = z
  .object({
    schemaVersion: z.literal(KIOSK_DEMO_IMPORT_SCHEMA_VERSION),
    synthetic: z.literal(true),
    snapshot: z
      .object({
        mode: z.literal("demo"),
        datasetVersion: z.literal(KIOSK_DEMO_DATASET_VERSION),
        generatedAt: isoTimestampSchema,
        observedAt: isoTimestampSchema,
        domains: z.array(kioskDomainSchema).max(KIOSK_DOMAIN_IDS.length),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.snapshot.domains.forEach((domain, index) => {
      if (seen.has(domain.id)) {
        context.addIssue({
          code: "custom",
          path: ["snapshot", "domains", index, "id"],
          message: `Doppelte Kiosk-Domäne: ${domain.id}`,
        });
      }
      seen.add(domain.id);
    });
  });

export function parseKioskDemoJson(
  json: string,
  now: () => Date = () => new Date(),
): KioskDemoDataset {
  const byteLength = new TextEncoder().encode(json).byteLength;
  if (byteLength > KIOSK_DEMO_IMPORT_MAX_BYTES) {
    throw new Error(`Kiosk-Demo-JSON überschreitet ${KIOSK_DEMO_IMPORT_MAX_BYTES} Bytes.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Kiosk-Demo-JSON ist syntaktisch ungültig.");
  }

  const validated = kioskDemoImportSchema.parse(parsed);
  return {
    version: validated.snapshot.datasetVersion,
    loadedAt: now().toISOString(),
    domains: validated.snapshot.domains.map((domain) => ({
      ...domain,
      metrics: domain.metrics.map((metric) => ({ ...metric })),
    })),
  };
}
