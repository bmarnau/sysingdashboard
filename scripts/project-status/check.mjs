#!/usr/bin/env node
/**
 * Project-Status-Check
 *
 * Validiert `docs/PROJECT-STATUS.yaml` als verbindliches Projektmanifest:
 *
 *  1. YAML ist syntaktisch gültig.
 *  2. Struktur entspricht `docs/project-status.schema.json` (JSON Schema 2020-12).
 *  3. `versions.dashboard` == oberste Version in `CHANGELOG.md`.
 *  4. `releaseManagement.currentRelease` == `versions.dashboard`.
 *  5. `currentState.currentSprint` existiert in `roadmap[]` oder `completedSprints[]`.
 *  6. Roadmap-Einträge sind vollständig und ihre `dependencies` auflösbar.
 *  7. Keine doppelten IDs (roadmap, backlog, technicalDebt, risks, adrs,
 *     completedSprints, architecturePrinciples).
 *  8. Referenzen (`reference`, `targetSprint`) zeigen auf bekannte IDs.
 *  9. Statuswerte sind erlaubt (über das Schema erzwungen).
 * 10. `lastUpdated` liegt nicht in der Zukunft.
 *
 * Exitcode 0 = ok, 1 = Verstoß. Aufruf: `bun run project-status:check`.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import Ajv2020 from "ajv/dist/2020.js";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const MANIFEST = "docs/PROJECT-STATUS.yaml";
const SCHEMA = "docs/project-status.schema.json";

const errors = [];
const warnings = [];

function read(p) {
  return readFileSync(resolve(ROOT, p), "utf8");
}

/** Reine Prüflogik — auch aus Tests aufrufbar. */
export function validateProjectStatus(yamlText, changelogText, schema) {
  const errs = [];
  const warns = [];

  let doc;
  try {
    doc = parseYaml(yamlText);
  } catch (err) {
    return { errors: [`YAML ist ungültig: ${err.message}`], warnings: warns, doc: null };
  }
  if (!doc || typeof doc !== "object") {
    return { errors: ["YAML enthält kein Objekt auf oberster Ebene."], warnings: warns, doc: null };
  }

  // (2) Schema
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (!validate(doc)) {
    for (const e of validate.errors ?? []) {
      errs.push(`Schema: ${e.instancePath || "/"} ${e.message}`);
    }
  }

  // (3/4) Versionsabgleich
  const top = /^##\s+([0-9][0-9A-Za-z.\-+]*)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/m.exec(changelogText);
  if (!top) {
    errs.push("CHANGELOG.md enthält keinen Eintrag im Format `## <version> - YYYY-MM-DD`.");
  } else if (doc.versions?.dashboard !== top[1]) {
    errs.push(
      `versions.dashboard (${doc.versions?.dashboard}) weicht von der obersten CHANGELOG-Version (${top[1]}) ab.`,
    );
  }
  if (
    doc.releaseManagement?.currentRelease &&
    doc.versions?.dashboard &&
    doc.releaseManagement.currentRelease !== doc.versions.dashboard
  ) {
    errs.push(
      `releaseManagement.currentRelease (${doc.releaseManagement.currentRelease}) weicht von versions.dashboard (${doc.versions.dashboard}) ab.`,
    );
  }

  // (7) Doppelte IDs
  const idSets = {};
  const collect = (section) => {
    const list = Array.isArray(doc[section]) ? doc[section] : [];
    const seen = new Set();
    for (const item of list) {
      const id = item?.id;
      if (id == null) continue;
      if (seen.has(id)) errs.push(`Doppelte ID in ${section}: "${id}".`);
      seen.add(id);
    }
    idSets[section] = seen;
  };
  for (const s of [
    "roadmap",
    "backlog",
    "technicalDebt",
    "risks",
    "adrs",
    "completedSprints",
    "architecturePrinciples",
  ]) {
    collect(s);
  }

  const sprintIds = new Set([...(idSets.roadmap ?? []), ...(idSets.completedSprints ?? [])]);
  const overlap = [...(idSets.roadmap ?? [])].filter((id) => idSets.completedSprints?.has(id));
  for (const id of overlap) {
    errs.push(`Sprint "${id}" steht gleichzeitig in roadmap und completedSprints.`);
  }

  // (5) Aktueller Sprint
  const current = doc.currentState?.currentSprint;
  if (current && !sprintIds.has(current)) {
    errs.push(
      `currentState.currentSprint "${current}" ist weder in roadmap noch in completedSprints enthalten.`,
    );
  }
  const previous = doc.currentState?.previousSprint;
  if (previous && !sprintIds.has(previous)) {
    errs.push(`currentState.previousSprint "${previous}" ist keinem bekannten Sprint zugeordnet.`);
  }

  // (6) Roadmap-Abhängigkeiten
  for (const item of doc.roadmap ?? []) {
    for (const dep of item.dependencies ?? []) {
      if (!sprintIds.has(dep)) {
        errs.push(`Roadmap "${item.id}" verweist auf unbekannte Abhängigkeit "${dep}".`);
      }
    }
    if (item.status === "planned" && (item.exitCriteria ?? []).length === 0) {
      warns.push(`Roadmap "${item.id}" hat keine exitCriteria.`);
    }
  }

  // (8) Referenzen
  const knownRefs = new Set([
    ...(idSets.adrs ?? []),
    ...(idSets.backlog ?? []),
    ...(idSets.risks ?? []),
    ...sprintIds,
  ]);
  const checkRef = (where, ref) => {
    if (!ref) return;
    if (!knownRefs.has(ref)) {
      warns.push(`${where} verweist auf unbekannte Referenz "${ref}".`);
    }
  };
  for (const td of doc.technicalDebt ?? []) checkRef(`technicalDebt "${td.id}"`, td.reference);
  for (const lim of doc.currentState?.knownVerificationLimits ?? []) {
    checkRef(`knownVerificationLimits "${lim.id}"`, lim.reference);
    if (lim.targetSprint && !sprintIds.has(lim.targetSprint)) {
      errs.push(
        `knownVerificationLimits "${lim.id}" nennt unbekannten targetSprint "${lim.targetSprint}".`,
      );
    }
  }

  // (10) Datum
  if (doc.lastUpdated && doc.lastUpdated > new Date().toISOString().slice(0, 10)) {
    warns.push(`lastUpdated (${doc.lastUpdated}) liegt in der Zukunft.`);
  }

  return { errors: errs, warnings: warns, doc };
}

/* ------------------------------ CLI ------------------------------ */

const isCli = process.argv[1] && process.argv[1].endsWith("check.mjs");
if (isCli) {
  if (!existsSync(resolve(ROOT, MANIFEST))) {
    console.error(`✗ ${MANIFEST} fehlt.`);
    process.exit(1);
  }
  if (!existsSync(resolve(ROOT, SCHEMA))) {
    console.error(`✗ ${SCHEMA} fehlt.`);
    process.exit(1);
  }

  const schema = JSON.parse(read(SCHEMA));
  const result = validateProjectStatus(read(MANIFEST), read("CHANGELOG.md"), schema);
  errors.push(...result.errors);
  warnings.push(...result.warnings);

  const bold = (s) => `\u001b[1m${s}\u001b[0m`;
  console.log(bold("Project-Status-Check"));
  console.log(`  Manifest:        ${MANIFEST}`);
  console.log(`  schemaVersion:   ${result.doc?.schemaVersion ?? "—"}`);
  console.log(`  Dashboard:       ${result.doc?.versions?.dashboard ?? "—"}`);
  console.log(`  Aktueller Sprint: ${result.doc?.currentState?.currentSprint ?? "—"}`);
  console.log(`  Roadmap-Einträge: ${(result.doc?.roadmap ?? []).length}`);

  if (warnings.length) {
    console.log("\nWarnungen:");
    for (const w of warnings) console.log(`  • ${w}`);
  }
  if (errors.length) {
    console.error("\nFehler:");
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log("\n✓ Projektmanifest ist gültig.");
}
