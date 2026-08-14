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
import { resolvePersonId } from "./personas";
import type { DemoPersonaAccounts } from "./personas";

export interface AvkkSeedResult {
  version: string;
  created: number;
  skipped: number;
  /** Bestehende Fälle, deren Verantwortung auf die Persona umgehängt wurde. */
  reassigned: number;
  responsibilities: number;
  /** Anzahl Verantwortungen, die auf ein eigenes Demo-Konto gezeigt haben. */
  delegated: number;
  competences: number;
  consequences: number;
  /** Fälle, bei denen das Umhängen fehlschlug (z. B. fehlendes Recht). */
  failures: string[];
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

/**
 * Gleicht die Verantwortung eines bereits vorhandenen Demo-Falls mit der
 * aktuellen Personenzuordnung ab. Trägt bereits genau die Zielperson die
 * gültige Verantwortung, geschieht nichts (Idempotenz). Andernfalls werden
 * laufende Verantwortungen beendet (kein Löschen, ADR-0026) und die neue
 * Zuordnung gesetzt.
 */
async function reconcileResponsibility(
  demoCase: DemoAvkkCase,
  existing: AvkkDossier,
  actorId: string,
  accounts: DemoPersonaAccounts,
  result: AvkkSeedResult,
): Promise<void> {
  result.skipped += 1;
  if (!demoCase.responsibility) return;

  const target = resolvePersonId(demoCase.subjectId, accounts, actorId);
  const active = existing.responsibilities.filter((r) => r.validTo === null);
  if (active.length === 1 && active[0].personId === target) return;

  try {
    for (const r of active) {
      await AvkkService.endResponsibility(r.id, actorId);
    }
    await AvkkService.assignResponsibility({
      subjectRef: existing.subject.id,
      personId: target,
      roleKey: demoCase.responsibility.roleKey,
      typeKeys: demoCase.responsibility.typeKeys,
      note: demoCase.responsibility.note,
      actorId,
    });
    result.reassigned += 1;
    result.responsibilities += 1;
    if (target !== actorId) result.delegated += 1;
  } catch (error) {
    result.failures.push(`${demoCase.subjectId}: ${String(error)}`);
  }
}

async function seedCase(
  demoCase: DemoAvkkCase,
  actorId: string,
  accounts: DemoPersonaAccounts,
  result: AvkkSeedResult,
): Promise<void> {
  const existing = await AvkkService.getDossier(demoCase.subjectType, demoCase.subjectId);
  if (existing && existing.subject.status !== "closed") {
    await reconcileResponsibility(demoCase, existing, actorId, accounts, result);
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
      personId: resolvePersonId(demoCase.subjectId, accounts, actorId),
      roleKey: demoCase.responsibility.roleKey,
      typeKeys: demoCase.responsibility.typeKeys,
      note: demoCase.responsibility.note,
      actorId,
    });
    result.responsibilities += 1;
    if (resolvePersonId(demoCase.subjectId, accounts, actorId) !== actorId) result.delegated += 1;
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
export async function seedAvkkDemoData(
  actorId: string,
  accounts: DemoPersonaAccounts = {},
): Promise<AvkkSeedResult> {
  const result: AvkkSeedResult = {
    version: DEMO_AVKK_VERSION,
    created: 0,
    skipped: 0,
    responsibilities: 0,
    delegated: 0,
    competences: 0,
    consequences: 0,
  };

  for (const demoCase of demoAvkkCases) {
    await seedCase(demoCase, actorId, accounts, result);
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
