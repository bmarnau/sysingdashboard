/**
 * Einspielen und Rücknahme der AVKK-Demofälle in der Cloud-Datenbank.
 *
 * Sicherheitsregeln:
 * - Es werden ausschließlich Sachverhalte mit `demo-`-Objektkennung angefasst.
 * - Der Seed läuft über den regulären `AvkkService`, also vollständig unter
 *   RLS und Rechteprüfung des angemeldeten Benutzers. Kein Service-Role-Key,
 *   kein direkter Datenbankzugriff.
 * - Die Rücknahme löscht nicht, sondern legt still (ADR-0026). Diese Grenze
 *   ist bewusst und im Abnahmebericht dokumentiert.
 */

import { AvkkService } from "@/lib/avkk/service";
import type { AvkkDossier } from "@/lib/avkk/types";
import { isDemoId } from "./dataset";
import { DEMO_AVKK_VERSION, demoAvkkCases } from "./avkk-dataset";
import type { DemoAvkkCase } from "./avkk-dataset";

export interface AvkkSeedResult {
  version: string;
  created: number;
  skipped: number;
  responsibilities: number;
  competences: number;
  consequences: number;
}

export interface AvkkCleanupResult {
  retired: number;
  /** Immer true: AVKK-Daten werden stillgelegt, nicht gelöscht. */
  softOnly: true;
}

/** Liefert alle Dossiers, die zu Demo-Objekten gehören. */
export async function listDemoDossiers(): Promise<AvkkDossier[]> {
  const all = await AvkkService.listDossiers();
  return all.filter((d) => isDemoId(d.subject.subjectId));
}

async function seedCase(
  demoCase: DemoAvkkCase,
  actorId: string,
  result: AvkkSeedResult,
): Promise<void> {
  const existing = await AvkkService.getDossier(demoCase.subjectType, demoCase.subjectId);
  if (existing && existing.subject.status !== "closed") {
    result.skipped += 1;
    return;
  }

  const subjectRef = existing
    ? existing.subject.id
    : (
        await AvkkService.createSubject({
          subjectType: demoCase.subjectType,
          subjectId: demoCase.subjectId,
          title: demoCase.title,
          actorId,
        })
      ).id;
  result.created += 1;

  if (demoCase.responsibility) {
    await AvkkService.assignResponsibility({
      subjectRef,
      personId: actorId,
      roleKey: demoCase.responsibility.roleKey,
      typeKeys: demoCase.responsibility.typeKeys,
      note: demoCase.responsibility.note,
      actorId,
    });
    result.responsibilities += 1;
  }

  for (const k of demoCase.competences) {
    await AvkkService.rateCompetence({
      subjectRef,
      dimensionKey: k.dimensionKey,
      ratingKey: k.ratingKey,
      supportNeeded: k.supportNeeded ?? false,
      note: k.note ?? "",
      actorId,
    });
    result.competences += 1;
  }

  for (const c of demoCase.consequences) {
    await AvkkService.addConsequence({
      subjectRef,
      areaKey: c.areaKey,
      severityKey: c.severityKey,
      scheduleImpactKey: c.scheduleImpactKey,
      description: c.description,
      actorId,
    });
    result.consequences += 1;
  }
}

/**
 * Idempotent: bereits vorhandene, offene Demo-Sachverhalte werden übersprungen.
 * Erfordert `avkk.edit` — ohne Berechtigung schlägt der Aufruf über RLS fehl.
 */
export async function seedAvkkDemoData(actorId: string): Promise<AvkkSeedResult> {
  const result: AvkkSeedResult = {
    version: DEMO_AVKK_VERSION,
    created: 0,
    skipped: 0,
    responsibilities: 0,
    competences: 0,
    consequences: 0,
  };

  for (const demoCase of demoAvkkCases) {
    await seedCase(demoCase, actorId, result);
  }
  return result;
}

/** Legt alle Demo-Sachverhalte still (kein Löschen — siehe Modulkopf). */
export async function retireAvkkDemoData(actorId: string): Promise<AvkkCleanupResult> {
  const dossiers = await listDemoDossiers();
  let retired = 0;
  for (const d of dossiers) {
    if (d.subject.status === "closed") continue;
    await AvkkService.retireSubject(d.subject.id, actorId);
    retired += 1;
  }
  return { retired, softOnly: true };
}
