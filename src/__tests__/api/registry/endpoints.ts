/**
 * Zentrale Endpoint-Registry.
 *
 * Neue Routen (Azure, RBAC, Assignments) hier eintragen — Runner, Matrix
 * und CI-Gate ziehen automatisch nach.
 */
import { z } from "zod";
import type { EndpointContract } from "./types";

const StatusResponseSchema = z
  .object({
    application: z.object({ name: z.string(), mode: z.string(), startedAt: z.string() }),
    azure: z.object({ allowed: z.boolean() }),
    security: z.object({
      rbac: z.object({ enabled: z.boolean() }),
      envValidation: z.object({ ok: z.boolean() }),
    }),
    mode: z.string(),
    timestamp: z.string(),
    correlationId: z.string().min(8).max(64),
  })
  .passthrough();

// v1.32.0: Fehlerantworten tragen jetzt zusätzlich `code`,
// `correlationId` und `timestamp`. Alte Felder bleiben optional
// erhalten, damit Detektoren nicht rot laufen, falls eine Route
// noch nicht migriert ist.
const ErrorSchema = z
  .object({
    ok: z.literal(false),
    code: z.string().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    correlationId: z.string().min(8).max(64).optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

const SyncSuccessSchema = z
  .object({
    ok: z.literal(true),
    startedAt: z.string(),
    durationMs: z.number(),
    mode: z.string(),
    correlationId: z.string().min(8).max(64).optional(),
  })
  .passthrough();

const SyncRequestSchema = z.object({ source: z.string().min(1).max(64).optional() }).partial();

export const ENDPOINTS: EndpointContract[] = [
  {
    id: "status",
    path: "/api/status",
    methods: ["GET"],
    authRequired: false,
    responseSchema: StatusResponseSchema,
    errorSchema: ErrorSchema,
    loadRoute: () => import("@/routes/api/status") as Promise<never>,
    status: "active",
    knownRisks: [
      "Keine Correlation-ID im Response — Traceability nur über Server-Log.",
      "Anonymer Zugriff bewusst offen (Uptime-Checks); prüft aber Secret-Freiheit hart.",
    ],
  },
  {
    id: "sync",
    path: "/api/sync",
    methods: ["POST"],
    authRequired: true,
    permission: "azure.export",
    requestSchema: SyncRequestSchema,
    responseSchema: SyncSuccessSchema,
    errorSchema: ErrorSchema,
    validRequest: () => ({ source: "endpoint-test" }),
    loadRoute: () => import("@/routes/api/sync") as Promise<never>,
    status: "active",
    knownRisks: [
      "Positive Sync-Ausführung benötigt eine echte angemeldete Session mit `azure.export` oder `azure.import`.",
      "Kein Rate-Limit — parallele Requests laufen alle durch.",
    ],
  },
  /* -------- Vorbereitete Einträge für spätere Routen (Runner → test.todo) -------- */
  {
    id: "azure-connection-test",
    path: "/api/azure/connection-test",
    methods: ["POST"],
    authRequired: true,
    permission: "azure.connection.test",
    scope: "global",
    loadRoute: async () => {
      throw new Error("planned");
    },
    status: "planned",
    knownRisks: ["Route noch nicht implementiert; Registry-Platzhalter für ADR-0008."],
  },
  {
    id: "azure-export",
    path: "/api/azure/export",
    methods: ["POST"],
    authRequired: true,
    permission: "azure.export",
    scope: "customer",
    loadRoute: async () => {
      throw new Error("planned");
    },
    status: "planned",
  },
  {
    id: "azure-import",
    path: "/api/azure/import",
    methods: ["POST"],
    authRequired: true,
    permission: "azure.import",
    scope: "customer",
    loadRoute: async () => {
      throw new Error("planned");
    },
    status: "planned",
  },
  {
    id: "rbac-assignments",
    path: "/api/rbac/assignments",
    methods: ["GET", "POST", "DELETE"],
    authRequired: true,
    permission: "rbac.assignments.write",
    scope: "tenant",
    loadRoute: async () => {
      throw new Error("planned");
    },
    status: "planned",
    knownRisks: ["Backend-Mirror für RBAC v2 (ADR-0008 Phase M5)."],
  },
];

export const ALL_METHODS: EndpointContract["methods"] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
];
