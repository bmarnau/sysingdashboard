import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  WorkPackageResponsibility,
  WorkPackageWorkViewRepository,
  WorkPackageWorkViewSourceRow,
} from "@/lib/avkk/work-package-work-view.types";

type UserSupabaseClient = SupabaseClient<Database>;

interface WorkPackageRow {
  id: string;
  systemhouse_id: string;
  customer_id: string;
  source_id: string;
  title: string;
  status: string;
  due: string | null;
  is_active: boolean;
}
interface CustomerRow {
  id: string;
  systemhouse_id: string;
  name: string;
}
interface SubjectRow {
  id: string;
  subject_type: string;
  subject_id: string;
  systemhouse_id: string | null;
  customer_id: string | null;
}
interface ResponsibilityRow {
  avkk_subject_id: string;
  person_id: string;
  role_key_snapshot: string;
  valid_from: string;
  valid_to: string | null;
}
interface PersonRow {
  id: string;
  display_name: string;
  status: string;
}

function fail(operation: string): never {
  throw new Error(`Arbeitspaket-Arbeitssicht: ${operation} fehlgeschlagen.`);
}

function timestampMs(value: string, field: string): number {
  const milliseconds = new Date(value).getTime();
  if (Number.isNaN(milliseconds)) fail(`ungültiger Timestamp ${field}`);
  return milliseconds;
}

function activeAt(row: ResponsibilityRow, referenceInstant: string): boolean {
  const referenceMs = timestampMs(referenceInstant, "referenceInstant");
  const validFromMs = timestampMs(row.valid_from, "valid_from");
  const validToMs = row.valid_to === null ? null : timestampMs(row.valid_to, "valid_to");

  return validFromMs <= referenceMs && (validToMs === null || validToMs > referenceMs);
}
function scopeKey(systemhouseId: string, customerId: string, sourceId: string): string {
  return `${systemhouseId}:${customerId}:${sourceId}`;
}

export function createSupabaseWorkPackageWorkViewRepository(
  supabase: UserSupabaseClient,
): WorkPackageWorkViewRepository {
  return {
    async listAuthorizedWorkPackages(referenceInstant) {
      const { data: workPackageData, error: workPackageError } = await supabase
        .from("shared_work_package_projection")
        .select("id,systemhouse_id,customer_id,source_id,title,status,due,is_active")
        .eq("is_active", true);
      if (workPackageError) fail("Arbeitspaketprojektion lesen");
      const workPackages = (workPackageData ?? []) as WorkPackageRow[];
      if (workPackages.length === 0) return [];

      const customerIds = [...new Set(workPackages.map((row) => row.customer_id))];
      const sourceIds = [...new Set(workPackages.map((row) => row.source_id))];
      const [customersResult, subjectsResult, peopleResult] = await Promise.all([
        supabase.from("customer").select("id,systemhouse_id,name").in("id", customerIds),
        supabase
          .from("avkk_subject")
          .select("id,subject_type,subject_id,systemhouse_id,customer_id")
          .in("subject_id", sourceIds)
          .eq("subject_type", "workpackage"),
        supabase.rpc("avkk_people_directory" as never),
      ]);
      if (customersResult.error) fail("Kunden lesen");
      if (subjectsResult.error) fail("AVKK-Subjects lesen");
      if (peopleResult.error) fail("Personenverzeichnis lesen");

      const customers = (customersResult.data ?? []) as CustomerRow[];
      const workPackageScopes = new Set(
        workPackages.map((row) => scopeKey(row.systemhouse_id, row.customer_id, row.source_id)),
      );
      const subjects = ((subjectsResult.data ?? []) as SubjectRow[]).filter(
        (subject) =>
          subject.systemhouse_id !== null &&
          subject.customer_id !== null &&
          workPackageScopes.has(
            scopeKey(subject.systemhouse_id, subject.customer_id, subject.subject_id),
          ),
      );
      const subjectIds = subjects.map((subject) => subject.id);
      const responsibilitiesResult =
        subjectIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from("avkk_responsibility")
              .select("avkk_subject_id,person_id,role_key_snapshot,valid_from,valid_to")
              .in("avkk_subject_id", subjectIds);
      if (responsibilitiesResult.error) fail("Verantwortungen lesen");

      const people = new Map(
        ((peopleResult.data ?? []) as PersonRow[])
          .filter((person) => person.status === "active")
          .map((person) => [person.id, person]),
      );
      const responsibilities = ((responsibilitiesResult.data ?? []) as ResponsibilityRow[]).filter(
        (responsibility) =>
          activeAt(responsibility, referenceInstant) &&
          (responsibility.role_key_snapshot === "owner" ||
            responsibility.role_key_snapshot === "deputy"),
      );

      return workPackages.map((workPackage): WorkPackageWorkViewSourceRow => {
        const customer = customers.find(
          (candidate) =>
            candidate.id === workPackage.customer_id &&
            candidate.systemhouse_id === workPackage.systemhouse_id,
        );
        if (!customer) fail("autorisierten Kundennamen auflösen");
        const subject = subjects.find(
          (candidate) =>
            candidate.subject_id === workPackage.source_id &&
            candidate.systemhouse_id === workPackage.systemhouse_id &&
            candidate.customer_id === workPackage.customer_id,
        );
        const subjectResponsibilities: WorkPackageResponsibility[] = subject
          ? responsibilities
              .filter((candidate) => candidate.avkk_subject_id === subject.id)
              .map((responsibility) => {
                const person = people.get(responsibility.person_id);
                if (!person) fail("aktive verantwortliche Person auflösen");
                return {
                  personId: person.id,
                  displayName: person.display_name,
                  role: responsibility.role_key_snapshot as "owner" | "deputy",
                };
              })
          : [];
        return {
          workPackageId: workPackage.id,
          sourceId: workPackage.source_id,
          systemhouseId: workPackage.systemhouse_id,
          customerId: workPackage.customer_id,
          customerName: customer.name,
          title: workPackage.title,
          status: workPackage.status,
          due: workPackage.due,
          responsibilities: subjectResponsibilities,
        };
      });
    },
  };
}
