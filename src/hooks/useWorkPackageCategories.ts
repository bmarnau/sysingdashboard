/**
 * BSF-03D (#103) — Kategoriekontext für Arbeitspaket-Dialoge und Katalogpflege.
 *
 * Verbindet Systemhaus-Memberships (eigene, RLS-begrenzt) mit dem
 * Reference-Data-Katalog `workpackage.category`. Werte werden strikt auf das
 * gewählte Systemhaus gefiltert — auch wenn der Cache Werte mehrerer
 * Systemhäuser enthält (Mehrfach-Membership), gibt es keine Vermischung.
 */
import { useEffect, useMemo, useState } from "react";
import type { WorkPackageCategoryContext } from "@/components/dashboard/dialogs/WorkPackageDialog";
import { useReferenceData } from "@/hooks/useReferenceData";
import { createSupabaseSystemhouseMembershipRepository } from "@/integrations/supabase/systemhouse-membership-adapter";
import { CATALOG_KEYS } from "@/lib/reference-data";
import type { ReferenceValue } from "@/lib/reference-data";
import {
  activeMemberships,
  resolveSystemhouseSelection,
  type SystemhouseMembership,
  type SystemhouseMembershipRepository,
} from "@/lib/systemhouse/membership";

const KEYS = [CATALOG_KEYS.workPackageCategory] as const;

export interface WorkPackageCategoriesResult extends WorkPackageCategoryContext {
  /** Alle Werte des gewählten Systemhauses inkl. deaktivierter (für Pflege). */
  allValues: ReferenceValue[];
  memberships: SystemhouseMembership[];
  reload: () => void;
}

export function useWorkPackageCategories(
  repository: SystemhouseMembershipRepository = createSupabaseSystemhouseMembershipRepository(),
): WorkPackageCategoriesResult {
  const ref = useReferenceData(KEYS);
  const [memberships, setMemberships] = useState<SystemhouseMembership[] | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [explicitId, setExplicitId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository
      .listOwnMemberships()
      .then((list) => {
        if (!cancelled) setMemberships(activeMemberships(list));
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setMemberships([]);
          setMembershipError(e instanceof Error ? e.message : "Systemhaus nicht ermittelbar.");
        }
      });
    return () => {
      cancelled = true;
    };
    // Repository ist bewusst stabil; erneutes Laden über `reload()`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selection = resolveSystemhouseSelection(memberships ?? [], explicitId);
  const systemhouseId = selection.systemhouseId;

  const allValues = useMemo(
    () =>
      systemhouseId
        ? (ref.values[CATALOG_KEYS.workPackageCategory] ?? []).filter(
            (v) => v.systemhouseId === systemhouseId,
          )
        : [],
    [ref.values, systemhouseId],
  );

  const status: WorkPackageCategoryContext["status"] = (() => {
    if (memberships === null || ref.loading) return "loading";
    if (membershipError || ref.error) return "error";
    if (selection.status === "none") return "no-systemhouse";
    if (selection.status === "choice-required") return "select-systemhouse";
    return "ready";
  })();

  return {
    status,
    values: allValues,
    allValues,
    systemhouses: (memberships ?? []).map((m) => ({ id: m.systemhouseId, name: m.systemhouseName })),
    selectedSystemhouseId: systemhouseId,
    onSelectSystemhouse: setExplicitId,
    error: membershipError ?? ref.error,
    memberships: memberships ?? [],
    reload: ref.reload,
  };
}
