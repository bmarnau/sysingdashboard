import { z } from "zod";

/**
 * Eingabevertrag des Publish-Endpunkts für geteilte Kundenprojektionen.
 *
 * Wichtig: Zod verwirft unbekannte Felder still. Jedes Feld, das bis in die
 * Projektion durchgereicht werden soll (z. B. `due`, `categoryKey`), muss daher
 * ausdrücklich hier stehen. Sonst wird es serverseitig als leer gespeichert.
 */

const uuid = z.string().uuid();
const sourceId = z.string().trim().min(1).max(255);
const text = z.string().max(2000);

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Fälligkeit eines Arbeitspakets. Der Arbeitspaket-Dialog schreibt beim Leeren
 * des Feldes eine leere Zeichenkette; sie bedeutet "kein Fälligkeitsdatum".
 * Ergebnis: gültiges `YYYY-MM-DD` oder `undefined`.
 */
const dueSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || isValidIsoDate(value),
    "due muss ein gültiges Kalenderdatum im Format YYYY-MM-DD sein",
  )
  .nullish()
  .transform((value) => value || undefined);

/** Stabiler Kategorie-Schlüssel (nie Label). Leer oder fehlend = keine Kategorie. */
const categoryKeySchema = z
  .string()
  .trim()
  .max(255)
  .nullish()
  .transform((value) => value || null);

const customerMappingSchema = z.object({
  legacyName: z.string().trim().min(1).max(500),
  customerId: uuid,
});

const projectSchema = z.object({
  id: sourceId,
  name: text,
  client: z.string().max(500),
  status: z.enum(["on_track", "at_risk", "delayed", "abgeschlossen"]),
});

const workPackageSchema = z.object({
  id: sourceId,
  title: text,
  projectId: sourceId.nullish(),
  client: z.string().max(500).optional(),
  status: z.enum(["offen", "in_arbeit", "wartend", "erledigt"]),
  priority: z.enum(["niedrig", "mittel", "hoch", "kritisch"]),
  due: dueSchema,
  categoryKey: categoryKeySchema,
});

const activitySchema = z.object({
  id: sourceId,
  title: text,
  workPackageId: sourceId.nullish(),
  engineerId: uuid.optional(),
  client: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.number().finite().nonnegative(),
  hourlyRate: z.number().finite().nonnegative(),
  billable: z.boolean(),
  billingStatus: z.enum(["offen", "abgerechnet", "nicht_abrechenbar"]),
});

export const sharedProjectionPublishSchema = z.object({
  systemhouseId: uuid,
  customerId: uuid,
  /**
   * Reconciliation ist nur mit einem vollständigen Local-First-Snapshot
   * zulässig. Teilmengen dürfen niemals implizit als gelöschte Sources
   * interpretiert werden.
   */
  snapshotComplete: z.literal(true),
  customerMappings: z.array(customerMappingSchema).max(5000),
  projects: z.array(projectSchema).max(10000),
  workPackages: z.array(workPackageSchema).max(20000),
  activities: z.array(activitySchema).max(50000),
});
