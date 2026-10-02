import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  ResponsibilityPersonViewRepository,
  ResponsibilityPersonViewSourceRow,
} from "@/lib/avkk/responsibility-management.types";
import { DEFAULT_RISK_THRESHOLD, type RiskThreshold } from "@/lib/avkk/types";

type UserSupabaseClient = SupabaseClient<Database>;

interface ResponsibilityRow {
  id: string;
  avkk_subject_id: string;
  person_id: string;
  role_key_snapshot: string;
  valid_from: string;
  valid_to: string | null;
}

interface SubjectRow {
  id: string;
  subject_type: string;
  subject_id: string;
  systemhouse_id: string | null;
  customer_id: string | null;
}

interface PersonRow {
  id: string;
  display_name: string;
  status: string;
}

interface CustomerRow {
  id: string;
  systemhouse_id: string;
  name: string;
}

interface ProjectProjectionRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  name: string;
  status: string;
  is_active: boolean;
}

interface WorkPackageProjectionRow {
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  title: string;
  status: string;
  due: string | null;
  is_active: boolean;
}

interface CompetenceRow {
  avkk_subject_id: string;
  rating_key_snapshot: string;
  support_needed: boolean;
  superseded_at: string | null;
}

function fail(operation: string): never {
  throw new Error(`Verantwortungssicht: ${operation} fehlgeschlagen.`);
}

function thresholdFrom(value: unknown): RiskThreshold {
  const candidate = (value ?? {}) as Partial<RiskThreshold>;
  return {
    missingCount: Number(candidate.missingCount ?? DEFAULT_RISK_THRESHOLD.missingCount),
    partialCount: Number(candidate.partialCount ?? DEFAULT_RISK_THRESHOLD.partialCount),
  };
}

export function createSupabaseResponsibilityPersonViewRepository(
  supabase: UserSupabaseClient,
): ResponsibilityPersonViewRepository {
  return {
    async listByPerson(personId) {
      const { data: responsibilityData, error: responsibilityError } = await supabase
        .from("avkk_responsibility")
        .select("id,avkk_subject_id,person_id,role_key_snapshot,valid_from,valid_to")
        .eq("person_id", personId)
        .is("valid_to", null);
      if (responsibilityError) fail("aktive Verantwortungen lesen");

      const responsibilities = ((responsibilityData ?? []) as ResponsibilityRow[]).filter(
        (row) => row.role_key_snapshot === "owner" || row.role_key_snapshot === "deputy",
      );
      if (responsibilities.length === 0) return [];

      const subjectIds = [...new Set(responsibilities.map((row) => row.avkk_subject_id))];
      const { data: subjectData, error: subjectError } = await supabase
        .from("avkk_subject")
        .select("id,subject_type,subject_id,systemhouse_id,customer_id")
        .in("id", subjectIds)
        .in("subject_type", ["project", "workpackage"]);
      if (subjectError) fail("AVKK-Subjects lesen");

      const subjects = ((subjectData ?? []) as SubjectRow[]).filter(
        (row) => row.systemhouse_id !== null && row.customer_id !== null,
      );
      if (subjects.length === 0) return [];

      const scopedSubjectIds = new Set(subjects.map((row) => row.id));
      const relevantResponsibilities = responsibilities.filter((row) =>
        scopedSubjectIds.has(row.avkk_subject_id),
      );
      if (relevantResponsibilities.length === 0) return [];

      const projectSourceIds = subjects
        .filter((row) => row.subject_type === "project")
        .map((row) => row.subject_id);
      const workPackageSourceIds = subjects
        .filter((row) => row.subject_type === "workpackage")
        .map((row) => row.subject_id);
      const customerIds = [
        ...new Set(subjects.map((row) => row.customer_id).filter((id): id is string => !!id)),
      ];

      const peoplePromise = supabase.rpc("avkk_people_directory" as never);
      const customerPromise =
        customerIds.length > 0
          ? supabase.from("customer").select("id,systemhouse_id,name").in("id", customerIds)
          : Promise.resolve({ data: [], error: null });
      const projectPromise =
        projectSourceIds.length > 0
          ? supabase
              .from("shared_project_projection")
              .select("systemhouse_id,customer_id,source_id,name,status,is_active")
              .in("source_id", projectSourceIds)
              .eq("is_active", true)
          : Promise.resolve({ data: [], error: null });
      const workPackagePromise =
        workPackageSourceIds.length > 0
          ? supabase
              .from("shared_work_package_projection")
              .select("systemhouse_id,customer_id,source_id,title,status,due,is_active")
              .in("source_id", workPackageSourceIds)
              .eq("is_active", true)
          : Promise.resolve({ data: [], error: null });
      const competencePromise = supabase
        .from("avkk_competence")
        .select("avkk_subject_id,rating_key_snapshot,support_needed,superseded_at")
        .in("avkk_subject_id", subjectIds)
        .is("superseded_at", null);

      const [peopleResult, customerResult, projectResult, workPackageResult, competenceResult] =
        await Promise.all([
          peoplePromise,
          customerPromise,
          projectPromise,
          workPackagePromise,
          competencePromise,
        ]);

      if (peopleResult.error) fail("Personenverzeichnis lesen");
      if (customerResult.error) fail("Kunden lesen");
      if (projectResult.error) fail("Projektprojektion lesen");
      if (workPackageResult.error) fail("Arbeitspaketprojektion lesen");
      if (competenceResult.error) fail("Kompetenzen lesen");

      const person = ((peopleResult.data ?? []) as PersonRow[]).find(
        (row) => row.id === personId && row.status === "active",
      );
      if (!person) return [];

      const customers = (customerResult.data ?? []) as CustomerRow[];
      const projects = (projectResult.data ?? []) as ProjectProjectionRow[];
      const workPackages = (workPackageResult.data ?? []) as WorkPackageProjectionRow[];
      const competences = (competenceResult.data ?? []) as CompetenceRow[];

      const rows: ResponsibilityPersonViewSourceRow[] = [];

      for (const responsibility of relevantResponsibilities) {
        const subject = subjects.find((row) => row.id === responsibility.avkk_subject_id);
        if (!subject || !subject.systemhouse_id || !subject.customer_id) continue;

        const customer = customers.find(
          (row) => row.id === subject.customer_id && row.systemhouse_id === subject.systemhouse_id,
        );
        if (!customer) continue;

        const projection =
          subject.subject_type === "project"
            ? projects.find(
                (row) =>
                  row.source_id === subject.subject_id &&
                  row.systemhouse_id === subject.systemhouse_id &&
                  row.customer_id === subject.customer_id &&
                  row.is_active,
              )
            : workPackages.find(
                (row) =>
                  row.source_id === subject.subject_id &&
                  row.systemhouse_id === subject.systemhouse_id &&
                  row.customer_id === subject.customer_id &&
                  row.is_active,
              );
        if (!projection) continue;

        const subjectCompetences = competences.filter(
          (row) => row.avkk_subject_id === subject.id && row.superseded_at === null,
        );

        rows.push({
          responsibilityId: responsibility.id,
          subjectRef: subject.id,
          personId: responsibility.person_id,
          displayName: person.display_name,
          role: responsibility.role_key_snapshot as "owner" | "deputy",
          subjectType: subject.subject_type as "project" | "workpackage",
          subjectId: subject.subject_id,
          title: "name" in projection ? projection.name : projection.title,
          systemhouseId: subject.systemhouse_id,
          customerId: subject.customer_id,
          customerName: customer.name,
          status: projection.status,
          due: "due" in projection ? projection.due : null,
          missingCount: subjectCompetences.filter((row) => row.rating_key_snapshot === "missing")
            .length,
          partialCount: subjectCompetences.filter((row) => row.rating_key_snapshot === "partial")
            .length,
          supportNeeded: subjectCompetences.some((row) => row.support_needed),
          validFrom: responsibility.valid_from,
          validTo: responsibility.valid_to,
        });
      }

      return rows;
    },

    async readRiskThreshold() {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "avkk.risk_threshold")
        .maybeSingle();
      if (error || !data) return DEFAULT_RISK_THRESHOLD;
      return thresholdFrom(data.value);
    },
  };
}
