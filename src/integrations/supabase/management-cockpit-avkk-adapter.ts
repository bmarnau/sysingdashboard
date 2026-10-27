import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { evaluateRisk } from "@/lib/avkk/indicators";
import {
  CRITICAL_SEVERITY_RANK,
  HIGH_SEVERITY_RANK,
  buildManagementSummary,
} from "@/lib/avkk/management";
import {
  DEFAULT_RISK_THRESHOLD,
  type AvkkCompetence,
  type AvkkConsequence,
  type AvkkDossier,
  type AvkkResponsibility,
  type AvkkSubject,
  type RiskThreshold,
} from "@/lib/avkk/types";
import { buildRows, taskKey, type AvkkTask } from "@/lib/avkk/workspace";
import type { AvkkSignalRepository } from "@/lib/management-cockpit-runtime/management-cockpit.functions";
import type { AvkkCustomerSignal } from "@/lib/management-cockpit/types";
import { CATALOG_KEYS } from "@/lib/reference-data";

type UserSupabaseClient = SupabaseClient<Database>;

type SubjectRow = Database["public"]["Tables"]["avkk_subject"]["Row"];
type ResponsibilityRow = Database["public"]["Tables"]["avkk_responsibility"]["Row"];
type ResponsibilityTypeRow = Database["public"]["Tables"]["avkk_responsibility_type"]["Row"];
type CompetenceRow = Database["public"]["Tables"]["avkk_competence"]["Row"];
type ConsequenceRow = Database["public"]["Tables"]["avkk_consequence"]["Row"];

interface CatalogRow {
  id: string;
  key: string;
}

interface ValueRow {
  id: string;
  catalog_id: string;
  key: string;
  attributes: Json;
  is_active: boolean;
}

interface PageResult<Row> {
  data: Row[] | null;
  error: { message: string } | null;
}

const PAGE_SIZE = 500;
const FILTER_BATCH_SIZE = 100;

function fail(operation: string): never {
  throw new Error(`Management-Cockpit AVKK: ${operation} fehlgeschlagen.`);
}

async function readAll<Row>(
  operation: string,
  page: (from: number, to: number) => PromiseLike<PageResult<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await page(from, from + PAGE_SIZE - 1);
    if (result.error) fail(operation);
    const current = result.data ?? [];
    rows.push(...current);
    if (current.length < PAGE_SIZE) return rows;
  }
}

async function readBatched<Row>(
  ids: readonly string[],
  operation: string,
  page: (ids: readonly string[], from: number, to: number) => PromiseLike<PageResult<Row>>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; offset < ids.length; offset += FILTER_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + FILTER_BATCH_SIZE);
    rows.push(...(await readAll(operation, (from, to) => page(batch, from, to))));
  }
  return rows;
}

function thresholdFrom(value: unknown): RiskThreshold {
  const candidate = (value ?? {}) as Partial<RiskThreshold>;
  return {
    missingCount: Number(candidate.missingCount ?? DEFAULT_RISK_THRESHOLD.missingCount),
    partialCount: Number(candidate.partialCount ?? DEFAULT_RISK_THRESHOLD.partialCount),
  };
}

function rankFrom(attributes: Json): number | null {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return null;
  const rank = attributes.rank;
  return typeof rank === "number" && Number.isFinite(rank) ? rank : null;
}

function scopeKey(subject: Pick<SubjectRow, "systemhouse_id" | "customer_id">): string {
  return `${subject.systemhouse_id}:${subject.customer_id}`;
}

function mapSubject(row: SubjectRow): AvkkSubject {
  return {
    id: row.id,
    subjectType: row.subject_type as AvkkSubject["subjectType"],
    subjectId: row.subject_id,
    subjectTitleSnapshot: row.subject_title_snapshot,
    status: row.status as AvkkSubject["status"],
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResponsibility(
  row: ResponsibilityRow,
  types: readonly ResponsibilityTypeRow[],
): AvkkResponsibility {
  return {
    id: row.id,
    subjectRef: row.avkk_subject_id,
    personId: row.person_id,
    roleKey: row.role_key_snapshot,
    roleLabel: row.role_label_snapshot,
    types: types
      .filter((type) => type.responsibility_id === row.id)
      .map((type) => ({
        valueId: type.type_value_id,
        key: type.type_key_snapshot,
        label: type.type_label_snapshot,
      })),
    note: row.note,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  };
}

function mapCompetence(row: CompetenceRow): AvkkCompetence {
  return {
    id: row.id,
    subjectRef: row.avkk_subject_id,
    dimensionKey: row.dimension_key_snapshot,
    dimensionLabel: row.dimension_label_snapshot,
    ratingKey: row.rating_key_snapshot,
    ratingLabel: row.rating_label_snapshot,
    supportNeeded: row.support_needed,
    note: row.note,
    supersededAt: row.superseded_at,
    createdAt: row.created_at,
  };
}

function mapConsequence(row: ConsequenceRow): AvkkConsequence {
  return {
    id: row.id,
    subjectRef: row.avkk_subject_id,
    areaKey: row.area_key_snapshot,
    areaLabel: row.area_label_snapshot,
    severityKey: row.severity_key_snapshot,
    severityLabel: row.severity_label_snapshot,
    scheduleImpactKey: row.schedule_impact_key_snapshot,
    scheduleImpactLabel: row.schedule_impact_label_snapshot,
    description: row.description,
    supersededAt: row.superseded_at,
  };
}

export function createSupabaseManagementCockpitAvkkRepository(
  supabase: UserSupabaseClient,
  referenceInstant: string,
): AvkkSignalRepository {
  return {
    async listCustomerSignals(): Promise<readonly AvkkCustomerSignal[]> {
      const subjectRows = await readAll<SubjectRow>("Subjects lesen", (from, to) =>
        supabase
          .from("avkk_subject")
          .select("*")
          .eq("status", "active")
          .in("subject_type", ["project", "workpackage"])
          .order("id", { ascending: true })
          .range(from, to),
      );

      const subjects = subjectRows.filter(
        (subject) => subject.systemhouse_id !== null && subject.customer_id !== null,
      );
      if (subjects.length === 0) return [];

      const subjectIds = subjects.map((subject) => subject.id);
      const [responsibilities, competenceRows, consequenceRows, thresholdResult, catalogs] =
        await Promise.all([
          readBatched<ResponsibilityRow>(subjectIds, "Verantwortungen lesen", (ids, from, to) =>
            supabase
              .from("avkk_responsibility")
              .select("*")
              .in("avkk_subject_id", ids)
              .order("id", { ascending: true })
              .range(from, to),
          ),
          readBatched<CompetenceRow>(subjectIds, "Kompetenzen lesen", (ids, from, to) =>
            supabase
              .from("avkk_competence")
              .select("*")
              .in("avkk_subject_id", ids)
              .order("id", { ascending: true })
              .range(from, to),
          ),
          readBatched<ConsequenceRow>(subjectIds, "Konsequenzen lesen", (ids, from, to) =>
            supabase
              .from("avkk_consequence")
              .select("*")
              .in("avkk_subject_id", ids)
              .order("id", { ascending: true })
              .range(from, to),
          ),
          supabase
            .from("app_settings")
            .select("value")
            .eq("key", "avkk.risk_threshold")
            .maybeSingle(),
          readAll<CatalogRow>("Referenzkataloge lesen", (from, to) =>
            supabase
              .from("reference_catalog")
              .select("id,key")
              .in("key", [CATALOG_KEYS.competenceDimension, CATALOG_KEYS.consequenceSeverity])
              .order("id", { ascending: true })
              .range(from, to),
          ),
        ]);

      if (thresholdResult.error) fail("Risikoschwelle lesen");

      const responsibilityIds = responsibilities.map((row) => row.id);
      const responsibilityTypes =
        responsibilityIds.length === 0
          ? []
          : await readBatched<ResponsibilityTypeRow>(
              responsibilityIds,
              "Verantwortungsarten lesen",
              (ids, from, to) =>
                supabase
                  .from("avkk_responsibility_type")
                  .select("*")
                  .in("responsibility_id", ids)
                  .order("id", { ascending: true })
                  .range(from, to),
            );

      const catalogIds = catalogs.map((catalog) => catalog.id);
      const values =
        catalogIds.length === 0
          ? []
          : await readBatched<ValueRow>(catalogIds, "Referenzwerte lesen", (ids, from, to) =>
              supabase
                .from("reference_value")
                .select("id,catalog_id,key,attributes,is_active")
                .in("catalog_id", ids)
                .order("id", { ascending: true })
                .range(from, to),
            );

      const dimensionCatalog = catalogs.find(
        (catalog) => catalog.key === CATALOG_KEYS.competenceDimension,
      );
      const severityCatalog = catalogs.find(
        (catalog) => catalog.key === CATALOG_KEYS.consequenceSeverity,
      );
      const dimensionKeys = dimensionCatalog
        ? values
            .filter((value) => value.catalog_id === dimensionCatalog.id && value.is_active)
            .map((value) => value.key)
        : [];
      const severityRanks = Object.fromEntries(
        values
          .filter((value) => value.catalog_id === severityCatalog?.id)
          .flatMap((value) => {
            const rank = rankFrom(value.attributes);
            return rank === null ? [] : ([[value.key, rank]] as const);
          }),
      );
      const threshold = thresholdFrom(thresholdResult.data?.value);
      const competences = competenceRows.map(mapCompetence);
      const consequences = consequenceRows.map(mapConsequence);

      const groups = new Map<string, SubjectRow[]>();
      for (const subject of subjects) {
        const key = scopeKey(subject);
        groups.set(key, [...(groups.get(key) ?? []), subject]);
      }

      const today = referenceInstant.slice(0, 10);
      return [...groups.values()]
        .map((group): AvkkCustomerSignal => {
          const dossiers = new Map<string, AvkkDossier>();
          const tasks: AvkkTask[] = group.map((row) => {
            const subject = mapSubject(row);
            const subjectResponsibilities = responsibilities
              .filter((candidate) => candidate.avkk_subject_id === row.id)
              .map((candidate) => mapResponsibility(candidate, responsibilityTypes));
            const subjectCompetences = competences.filter(
              (candidate) => candidate.subjectRef === row.id,
            );
            const subjectConsequences = consequences.filter(
              (candidate) => candidate.subjectRef === row.id,
            );
            const risk = evaluateRisk(subjectResponsibilities, subjectCompetences, threshold);
            dossiers.set(taskKey(subject.subjectType, subject.subjectId), {
              subject,
              responsibilities: subjectResponsibilities,
              competences: subjectCompetences,
              consequences: subjectConsequences,
              atRisk: risk.atRisk,
              riskReasons: risk.reasons,
            });
            return {
              subjectType: subject.subjectType,
              subjectId: subject.subjectId,
              title: subject.subjectTitleSnapshot,
              context: row.customer_id!,
              due: null,
            };
          });
          const rows = buildRows(tasks, dossiers, {
            dimensionKeys,
            personId: null,
            today,
            severityRanks,
            criticalRank: CRITICAL_SEVERITY_RANK,
          });
          const summary = buildManagementSummary(rows, {
            highRank: HIGH_SEVERITY_RANK,
            criticalRank: CRITICAL_SEVERITY_RANK,
          });
          return {
            systemhouseId: group[0].systemhouse_id!,
            customerId: group[0].customer_id!,
            highOrCritical: summary.highConsequence,
          };
        })
        .sort(
          (left, right) =>
            left.systemhouseId.localeCompare(right.systemhouseId) ||
            left.customerId.localeCompare(right.customerId),
        );
    },
  };
}
