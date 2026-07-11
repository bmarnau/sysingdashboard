/**
 * JsonImportService — Stufe 2
 *
 * Pipeline: Datei lesen → Schema validieren → Plan bauen
 * (Konflikt-/Merge-/Mapping-Auflösung) → Pre-Snapshot anlegen →
 * Plan transaktional anwenden → Protokoll schreiben.
 *
 * Kritische Hinweise aus Stufe 1, hier adressiert:
 *  1. `activity.engineerId` ist im Single-Engineer-Modus kosmetisch — das
 *     Mapping wird automatisch übersprungen, wenn das Dashboard nur einen
 *     Benutzer kennt. Eingehende engineerIds werden dann verworfen und im
 *     Protokoll vermerkt.
 *  2. Kunden werden gegen bestehende `project.client` / `workPackage.client`
 *     normalisiert; Verdachts-Duplikate (Levenshtein ≤ 2 oder gleicher
 *     Normalize-Schlüssel) erscheinen im Mapping-Schritt und werden
 *     beim Apply auf alle abhängigen Felder projiziert.
 *  3. `timeEntries` ist kanonisch, sobald vorhanden. `activities` liefert
 *     nur Stamm­daten; abweichende Datums-/Dauer-Werte werden als
 *     Warnung protokolliert (timeEntry gewinnt).
 *  4. Der ZIP-Backup-Pfad bettet die JSON ein und nutzt sie beim Restore
 *     bevorzugt — siehe `backup-service.ts`.
 */

import {
  DashboardJsonExportSchema,
  JSON_SCHEMA_VERSION,
  stripSensitiveFields,
  type DashboardJsonExport,
} from "@/lib/json-schema";
import {
  JsonSchemaValidationService,
  type ValidationResult,
} from "@/lib/json-schema-validation-service";
import {
  loadUsers,
  saveUsers,
  userScopedKey,
  type UserProfile,
  type UserRole,
  type UserStatus,
} from "@/lib/user-management";
import {
  loadTargetTimeModels,
  saveTargetTimeModels,
  type EngineerTargetTimeModel,
} from "@/lib/engineer-target-time";
import { dashboardData, type Activity, type Project, type WorkPackage } from "@/lib/dashboard-data";
import { isSensitiveFieldName } from "@/lib/json-schema";
import { logger } from "@/lib/logger";

/* ------------------------------ Typen ------------------------------ */

export type ConflictStrategy = "overwrite" | "keep" | "merge";

export interface ImportOptions {
  strategy: ConflictStrategy;
  /** Map: incoming engineerId → bestehender userId | "__skip__" | "__create__" */
  engineerMapping?: Record<string, string>;
  /** Map: incoming customer-Name (normalisiert) → kanonischer Name */
  customerMapping?: Record<string, string>;
  /** Wird im Protokoll als Auslöser gespeichert. */
  actor?: string;
  /** Filtert Scopes auf eine Whitelist (z. B. nur "projects"). */
  scopeWhitelist?: ReadonlyArray<keyof DashboardJsonExport>;
}

export interface EntityDiff<T> {
  id: string;
  incoming: T;
  current?: T;
  /** "create" wenn current fehlt, sonst "update". */
  action: "create" | "update" | "skip";
  /** True, wenn current existiert und sich vom incoming unterscheidet. */
  conflict: boolean;
}

export interface CustomerSuggestion {
  incomingName: string;
  normalized: string;
  suggestion: string | null;
  /** Levenshtein-Distanz zur Suggestion (0 = gleicher Normalize-Key). */
  distance: number;
}

export interface ImportPlan {
  schemaValid: boolean;
  validation: ValidationResult;
  diffs: {
    users: EntityDiff<UserProfile>[];
    projects: EntityDiff<Project>[];
    workPackages: EntityDiff<WorkPackage>[];
    activities: EntityDiff<Activity>[];
    targetTimeModels: EntityDiff<EngineerTargetTimeModel>[];
    settings: EntityDiff<{ key: string; value: unknown }>[];
  };
  customerSuggestions: CustomerSuggestion[];
  engineerIdsInDoc: string[];
  singleEngineerMode: boolean;
  /**
   * Konflikte zwischen `activities[*]` und `timeEntries[*]` mit gleicher
   * `activityId` — `timeEntries` gewinnt, Differenz wird protokolliert.
   */
  timeEntryConflicts: Array<{
    activityId: string;
    field: string;
    activityValue: unknown;
    timeEntryValue: unknown;
  }>;
}

export interface ImportResult {
  ok: boolean;
  runId: string;
  startedAt: string;
  finishedAt: string;
  actor: string;
  fileName: string;
  counts: { created: number; updated: number; skipped: number; errors: number };
  warnings: string[];
  errors: string[];
  rollback: boolean;
  snapshotId?: string;
}

/* ---------------------- Storage-Adapter (gleich wie Export) ---------------------- */

const DASHBOARD_KEY_BASE = "northbit-dashboard-v2";

function dashboardStorageKey(): string {
  return userScopedKey(DASHBOARD_KEY_BASE);
}

function readDashboardState(): {
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
} {
  if (typeof window === "undefined") {
    return {
      projects: dashboardData.projects,
      workPackages: dashboardData.workPackages,
      activities: dashboardData.activities,
    };
  }
  try {
    const raw = window.localStorage.getItem(dashboardStorageKey());
    if (raw) {
      const p = JSON.parse(raw);
      return {
        projects: p.projects ?? dashboardData.projects,
        workPackages: p.workPackages ?? dashboardData.workPackages,
        activities: p.activities ?? dashboardData.activities,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    projects: dashboardData.projects,
    workPackages: dashboardData.workPackages,
    activities: dashboardData.activities,
  };
}

function writeDashboardState(state: {
  projects: Project[];
  workPackages: WorkPackage[];
  activities: Activity[];
}): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(dashboardStorageKey(), JSON.stringify(state));
}

/* ---------------------- Hilfsfunktionen ---------------------- */

export function normalizeCustomerName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Begrenzte Levenshtein-Distanz (für Vorschläge bis 2). */
export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[b.length];
}

function shallowEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffList<T extends { id: string }>(
  incoming: T[] = [],
  current: T[] = [],
): EntityDiff<T>[] {
  const byId = new Map(current.map((c) => [c.id, c]));
  return incoming.map((i) => {
    const cur = byId.get(i.id);
    if (!cur) return { id: i.id, incoming: i, action: "create", conflict: false };
    const same = shallowEqual(i, cur);
    return {
      id: i.id,
      incoming: i,
      current: cur,
      action: same ? "skip" : "update",
      conflict: !same,
    };
  });
}

/* ---------------------- Pre-Snapshot ---------------------- */

interface PreSnapshot {
  id: string;
  createdAt: string;
  dashboardKey: string;
  dashboardValue: string | null;
  usersKey: string;
  usersValue: string | null;
  targetKey: string;
  targetValue: string | null;
  settings: Array<{ key: string; value: string | null }>;
}

function makeSnapshot(settingsKeys: string[]): PreSnapshot {
  if (typeof window === "undefined") {
    return {
      id: "snap-ssr",
      createdAt: new Date().toISOString(),
      dashboardKey: dashboardStorageKey(),
      dashboardValue: null,
      usersKey: "northbit-users",
      usersValue: null,
      targetKey: userScopedKey("northbit-target-time-models"),
      targetValue: null,
      settings: [],
    };
  }
  const dashboardKey = dashboardStorageKey();
  const usersKey = "northbit-users";
  const targetKey = userScopedKey("northbit-target-time-models");
  return {
    id: `snap-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    dashboardKey,
    dashboardValue: window.localStorage.getItem(dashboardKey),
    usersKey,
    usersValue: window.localStorage.getItem(usersKey),
    targetKey,
    targetValue: window.localStorage.getItem(targetKey),
    settings: settingsKeys.map((k) => ({ key: k, value: window.localStorage.getItem(k) })),
  };
}

function restoreSnapshot(snap: PreSnapshot): void {
  if (typeof window === "undefined") return;
  const set = (k: string, v: string | null) => {
    if (v === null) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, v);
  };
  set(snap.dashboardKey, snap.dashboardValue);
  set(snap.usersKey, snap.usersValue);
  set(snap.targetKey, snap.targetValue);
  for (const s of snap.settings) set(s.key, s.value);
}

// In-Memory-Snapshot-Register für Rollback aus dem Protokoll heraus.
const snapshotRegistry = new Map<string, PreSnapshot>();

/* ---------------------- Public API ---------------------- */

export const JsonImportService = {
  SCHEMA_VERSION: JSON_SCHEMA_VERSION,

  async readFile(
    file: File,
  ): Promise<{ raw: string; doc: DashboardJsonExport | null; validation: ValidationResult }> {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      logger.error("JsonImport: parse failed", err, {
        module: "JsonImportService",
        action: "readFile",
        code: "JSON_PARSE",
        fileName: file.name,
        byteLength: text.length,
      });
      return {
        raw: text,
        doc: null,
        validation: {
          ok: false,
          schemaValid: false,
          issues: [
            {
              severity: "error",
              path: "(root)",
              message: `JSON konnte nicht geparst werden: ${(err as Error).message}`,
            },
          ],
          counts: {},
        },
      };
    }
    // Sicherheits-Stripping VOR Validierung — verhindert, dass eine
    // manipulierte Datei z. B. `passwordHash` einschleust.
    const stripped = stripSensitiveFields(parsed);
    const validation = JsonSchemaValidationService.validate(stripped);
    if (!validation.schemaValid) return { raw: text, doc: null, validation };
    const safe = DashboardJsonExportSchema.parse(stripped);
    return { raw: text, doc: safe, validation };
  },

  buildPlan(doc: DashboardJsonExport, options: ImportOptions = { strategy: "merge" }): ImportPlan {
    const validation = JsonSchemaValidationService.validate(doc);
    const state = readDashboardState();
    const users = loadUsers();
    const targets = loadTargetTimeModels();

    // ---- Kritischer Hinweis 1: Single-Engineer-Modus erkennen ----
    const singleEngineerMode = users.length <= 1;
    const engineerIdsInDoc = Array.from(
      new Set([
        ...(doc.activities ?? []).map((a) => a.engineerId).filter(Boolean),
        ...(doc.timeEntries ?? []).map((t) => t.engineerId).filter(Boolean),
      ]),
    ) as string[];

    // ---- Kritischer Hinweis 2: Kunden-Duplikate vorschlagen ----
    const existingCustomerNames = new Set<string>();
    for (const p of state.projects) if (p.client) existingCustomerNames.add(p.client);
    for (const w of state.workPackages) if (w.client) existingCustomerNames.add(w.client);
    const existingNorm = new Map<string, string>();
    for (const n of existingCustomerNames) existingNorm.set(normalizeCustomerName(n), n);

    const customerSuggestions: CustomerSuggestion[] = [];
    const seenNorm = new Set<string>();
    for (const c of doc.customers ?? []) {
      const norm = normalizeCustomerName(c.name);
      if (seenNorm.has(norm)) continue;
      seenNorm.add(norm);
      // Exakter Normalize-Match
      const exact = existingNorm.get(norm);
      if (exact && exact !== c.name) {
        customerSuggestions.push({
          incomingName: c.name,
          normalized: norm,
          suggestion: exact,
          distance: 0,
        });
        continue;
      }
      if (exact) continue; // identisch
      // Fuzzy-Match
      let best: { name: string; d: number } | null = null;
      for (const [, existing] of existingNorm) {
        const d = levenshtein(norm, normalizeCustomerName(existing), 2);
        if (d <= 2 && (!best || d < best.d)) best = { name: existing, d };
      }
      if (best) {
        customerSuggestions.push({
          incomingName: c.name,
          normalized: norm,
          suggestion: best.name,
          distance: best.d,
        });
      }
    }

    // ---- Kritischer Hinweis 3: timeEntry vs. activity Konflikte ----
    const timeEntryConflicts: ImportPlan["timeEntryConflicts"] = [];
    const actMap = new Map((doc.activities ?? []).map((a) => [a.id, a]));
    for (const te of doc.timeEntries ?? []) {
      const act = actMap.get(te.activityId);
      if (!act) continue;
      if (act.date !== te.date) {
        timeEntryConflicts.push({
          activityId: te.activityId,
          field: "date",
          activityValue: act.date,
          timeEntryValue: te.date,
        });
      }
      if (act.duration !== te.durationHours) {
        timeEntryConflicts.push({
          activityId: te.activityId,
          field: "duration",
          activityValue: act.duration,
          timeEntryValue: te.durationHours,
        });
      }
    }

    // ---- Entitäts-Diffs ----
    const usersIn: UserProfile[] = (doc.users ?? []).map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      displayName: u.displayName,
      email: u.email,
      phone: u.phone ?? "",
      role: (u.role as UserRole) ?? "engineer",
      status: (u.status as UserStatus) ?? "active",
      profileImage: u.profileImage,
      mfaEnabled: u.mfaEnabled ?? false,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    const projectsIn: Project[] = (doc.projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      client: applyCustomerMapping(p.client, options.customerMapping) ?? "",
      customerId: p.customerId,
      description: p.description,
      start: p.start,
      deadline: p.deadline,
      lead: p.lead,
      team: p.team,
      budget: p.budget,
      status: p.status as Project["status"],
    }));

    const wpsIn: WorkPackage[] = (doc.workPackages ?? []).map((w) => ({
      id: w.id,
      title: w.title,
      projectId: w.projectId ?? null,
      client: applyCustomerMapping(w.client, options.customerMapping),
      status: w.status as WorkPackage["status"],
      priority: w.priority as WorkPackage["priority"],
      due: w.due,
      estimated: w.estimated,
      assignee: w.assignee,
      tags: w.tags,
      description: w.description,
    }));

    // timeEntries kanonisch: Datum/Dauer aus timeEntries gewinnen.
    const teByActivityId = new Map((doc.timeEntries ?? []).map((t) => [t.activityId, t]));
    const activitiesIn: Activity[] = (doc.activities ?? []).map((a) => {
      const te = teByActivityId.get(a.id);
      const engineerId = resolveEngineerId(a.engineerId, options, singleEngineerMode, users);
      return {
        id: a.id,
        title: a.title,
        workPackageId: a.workPackageId ?? null,
        engineerId,
        client: applyCustomerMapping(a.client, options.customerMapping),
        date: te?.date ?? a.date,
        time: a.time,
        duration: te?.durationHours ?? a.duration,
        hourlyRate: te?.hourlyRate ?? a.hourlyRate,
        billable: te?.billable ?? a.billable,
        billingStatus: (te?.billingStatus ?? a.billingStatus) as Activity["billingStatus"],
        description: te?.description ?? a.description,
      };
    });

    const targetsIn: EngineerTargetTimeModel[] = (doc.targetTimeModels ?? []).map((t) => ({
      id: t.id,
      engineerId: resolveEngineerId(t.engineerId, options, singleEngineerMode, users) ?? "",
      targetTimeBase: (t.targetTimeBase as EngineerTargetTimeModel["targetTimeBase"]) ?? "monthly",
      monthlyTargetHours: t.monthlyTargetHours,
      weeklyTargetHours: t.weeklyTargetHours,
      validFrom: t.validFrom,
      validUntil: t.validUntil ?? undefined,
      description: t.description,
      createdAt: t.createdAt ?? new Date().toISOString(),
      updatedAt: t.updatedAt ?? new Date().toISOString(),
    }));

    const settingsIn = (doc.settings ?? [])
      .filter((s) => !isSensitiveFieldName(s.key))
      .map((s) => ({
        id: s.key,
        key: s.key,
        value: s.value,
      }));
    const currentSettings =
      typeof window !== "undefined"
        ? (settingsIn
            .map((s) => {
              const v = window.localStorage.getItem(s.key);
              return v ? { id: s.key, key: s.key, value: tryParse(v) } : undefined;
            })
            .filter(Boolean) as Array<{ id: string; key: string; value: unknown }>)
        : [];

    return {
      schemaValid: validation.schemaValid,
      validation,
      diffs: {
        users: diffList(usersIn, users),
        projects: diffList(projectsIn, state.projects),
        workPackages: diffList(wpsIn, state.workPackages),
        activities: diffList(activitiesIn, state.activities),
        targetTimeModels: diffList(targetsIn, targets),
        settings: diffList(settingsIn, currentSettings),
      },
      customerSuggestions,
      engineerIdsInDoc,
      singleEngineerMode,
      timeEntryConflicts,
    };
  },

  applyPlan(
    plan: ImportPlan,
    options: ImportOptions,
  ): { snapshotId: string; counts: ImportResult["counts"]; warnings: string[] } {
    const counts = { created: 0, updated: 0, skipped: 0, errors: 0 };
    const warnings: string[] = [];

    // Pre-Snapshot (Rollback-Sicherung)
    const settingsKeys = plan.diffs.settings.map((d) => d.incoming.key);
    const snap = makeSnapshot(settingsKeys);
    snapshotRegistry.set(snap.id, snap);

    const apply = <T extends { id: string }>(diffs: EntityDiff<T>[], list: T[]): T[] => {
      const map = new Map(list.map((x) => [x.id, x]));
      for (const d of diffs) {
        if (d.action === "skip") {
          counts.skipped++;
          continue;
        }
        if (d.action === "create") {
          map.set(d.id, d.incoming);
          counts.created++;
          continue;
        }
        // update: Strategie anwenden
        if (options.strategy === "keep") {
          counts.skipped++;
          continue;
        }
        if (options.strategy === "overwrite") {
          map.set(d.id, d.incoming);
          counts.updated++;
          continue;
        }
        // merge: incoming-Felder über bestehende kippen
        map.set(d.id, { ...(d.current as T), ...d.incoming });
        counts.updated++;
      }
      return Array.from(map.values());
    };

    try {
      const state = readDashboardState();
      const usersNext = apply(plan.diffs.users, loadUsers());
      const projectsNext = apply(plan.diffs.projects, state.projects);
      const wpsNext = apply(plan.diffs.workPackages, state.workPackages);
      const activitiesNext = apply(plan.diffs.activities, state.activities);
      const targetsNext = apply(plan.diffs.targetTimeModels, loadTargetTimeModels());

      // Schreiben
      if (plan.diffs.users.length > 0) saveUsers(usersNext);
      writeDashboardState({
        projects: projectsNext,
        workPackages: wpsNext,
        activities: activitiesNext,
      });
      if (plan.diffs.targetTimeModels.length > 0) saveTargetTimeModels(targetsNext);

      // Settings einzeln schreiben
      if (typeof window !== "undefined") {
        for (const d of plan.diffs.settings) {
          if (d.action === "skip") {
            counts.skipped++;
            continue;
          }
          if (d.action === "update" && options.strategy === "keep") {
            counts.skipped++;
            continue;
          }
          const v = d.incoming.value;
          window.localStorage.setItem(
            d.incoming.key,
            typeof v === "string" ? v : JSON.stringify(v),
          );
          if (d.action === "create") counts.created++;
          else counts.updated++;
        }
      }

      // Warnungen aus den kritischen Hinweisen
      if (plan.singleEngineerMode && plan.engineerIdsInDoc.length > 0) {
        warnings.push(
          `Single-Engineer-Modus aktiv — ${plan.engineerIdsInDoc.length} eingehende engineerId(s) wurden ignoriert oder dem aktiven Benutzer zugeordnet.`,
        );
      }
      if (plan.timeEntryConflicts.length > 0) {
        warnings.push(
          `timeEntries gewann gegenüber activities in ${plan.timeEntryConflicts.length} Feldern (Datum/Dauer) — siehe Protokoll-Detail.`,
        );
      }
      if (plan.customerSuggestions.length > 0 && !options.customerMapping) {
        warnings.push(
          `${plan.customerSuggestions.length} mögliche Kunden-Duplikate wurden nicht gemappt — verbleiben als eigenständige Kunden.`,
        );
      }

      logger.info("JsonImport applied", {
        module: "JsonImportService",
        action: "apply",
        snapshotId: snap.id,
        actor: options.actor,
        strategy: options.strategy,
        counts,
        warnings: warnings.length,
      });
      return { snapshotId: snap.id, counts, warnings };
    } catch (err) {
      // Rollback
      restoreSnapshot(snap);
      counts.errors++;
      logger.error("JsonImport failed — snapshot restored", err, {
        module: "JsonImportService",
        action: "apply",
        code: "IMPORT_APPLY",
        snapshotId: snap.id,
        actor: options.actor,
      });
      throw err;
    }
  },

  rollback(snapshotId: string): boolean {
    const snap = snapshotRegistry.get(snapshotId);
    if (!snap) {
      logger.warn("JsonImport rollback: snapshot not found", {
        module: "JsonImportService",
        action: "rollback",
        snapshotId,
      });
      return false;
    }
    restoreSnapshot(snap);
    logger.info("JsonImport rolled back", {
      module: "JsonImportService",
      action: "rollback",
      snapshotId,
    });
    return true;
  },
};

/* ---------------------- intern ---------------------- */

function applyCustomerMapping(
  name: string | undefined,
  mapping?: Record<string, string>,
): string | undefined {
  if (!name) return name;
  if (!mapping) return name;
  const norm = normalizeCustomerName(name);
  return mapping[norm] ?? name;
}

function resolveEngineerId(
  incoming: string | undefined,
  options: ImportOptions,
  singleEngineerMode: boolean,
  users: UserProfile[],
): string | undefined {
  if (!incoming) return incoming;
  if (singleEngineerMode) {
    // Auf den einzigen User abbilden (sofern vorhanden).
    return users[0]?.id ?? undefined;
  }
  const target = options.engineerMapping?.[incoming];
  if (!target || target === "__skip__") return undefined;
  if (target === "__create__") return incoming; // wird beim User-Apply mit angelegt
  return target;
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
