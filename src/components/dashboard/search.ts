import { z } from "zod";

/** Nur der vorhandene Management-Reiter ist als Cockpit-Drill-down vorgesehen. */
export const DashboardSearchSchema = z.object({
  tab: z.literal("avkk-management").optional().catch(undefined),
});
