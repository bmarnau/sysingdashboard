#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const errors = [];

function read(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function metadata(markdown, key) {
  const match = new RegExp(`^- \\*\\*${key}:\\*\\* (.*)$`, "m").exec(markdown);
  return match?.[1]?.trim() ?? "";
}

function stringConstant(source, name) {
  const match = new RegExp(`export const ${name}\\s*=\\s*["']([^"']+)["']`).exec(source);
  return match?.[1] ?? "";
}

function domainIds(source) {
  const match = /export const KIOSK_DOMAIN_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source);
  if (!match) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((entry) => entry[1]);
}

function sameSet(left, right) {
  if (left.length !== right.length) return false;
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return (
    a.length === left.length && b.length === right.length && a.every((value, i) => value === b[i])
  );
}

const docsDir = resolve(ROOT, "docs");
const tdfSources = readdirSync(docsDir)
  .filter((name) => /^SYSING-KIOSK-001_.*\.md$/.test(name))
  .sort();

assert(
  tdfSources.length === 1,
  `Erwartet genau eine SYSING-KIOSK-001-Quelle, gefunden: ${tdfSources.length}`,
);

const documentPath = tdfSources.length === 1 ? `docs/${tdfSources[0]}` : "";
const document = documentPath ? read(documentPath) : "";
const contractSource = read("src/lib/kiosk/kiosk-contract.ts");
const importSource = read("src/lib/kiosk/kiosk-demo-import.ts");
const datasetSource = read("src/lib/kiosk/kiosk-demo-dataset.ts");
const referencePath = "docs/examples/kiosk-demo-dataset-v1.json";
const reference = JSON.parse(read(referencePath));

const schemaVersion = stringConstant(importSource, "KIOSK_DEMO_IMPORT_SCHEMA_VERSION");
const datasetVersion = stringConstant(datasetSource, "KIOSK_DEMO_DATASET_VERSION");
const codeDomains = domainIds(contractSource);
const referenceDomains = reference?.snapshot?.domains?.map((domain) => domain.id) ?? [];

assert(
  metadata(document, "document_id") === "SYSING-KIOSK-001",
  "document_id muss SYSING-KIOSK-001 sein.",
);
assert(metadata(document, "version") === "1.0.0", "Dokumentversion muss 1.0.0 sein.");
assert(metadata(document, "release_date") === "2026-09-23", "release_date muss 2026-09-23 sein.");
assert(
  metadata(document, "source_review_date") === "2026-09-23",
  "source_review_date muss 2026-09-23 sein.",
);
assert(
  metadata(document, "referenzdatensatz") === `\`${referencePath}\``,
  "referenzdatensatz muss auf die führende JSON-Datei zeigen.",
);
assert(
  metadata(document, "demo_schema") === `\`${schemaVersion}\``,
  "demo_schema im Dokument muss dem Codevertrag entsprechen.",
);

assert(Boolean(schemaVersion), "KIOSK_DEMO_IMPORT_SCHEMA_VERSION konnte nicht gelesen werden.");
assert(Boolean(datasetVersion), "KIOSK_DEMO_DATASET_VERSION konnte nicht gelesen werden.");
assert(
  codeDomains.length === 6,
  `KIOSK_DOMAIN_IDS muss sechs Einträge enthalten, gefunden: ${codeDomains.length}`,
);

assert(
  reference.schemaVersion === schemaVersion,
  "Referenz-JSON schemaVersion driftet vom Codevertrag.",
);
assert(reference.synthetic === true, "Referenz-JSON muss synthetic=true enthalten.");
assert(reference?.snapshot?.mode === "demo", "Referenz-JSON snapshot.mode muss demo sein.");
assert(
  reference?.snapshot?.datasetVersion === datasetVersion,
  "Referenz-JSON datasetVersion driftet vom Codevertrag.",
);
assert(
  sameSet(referenceDomains, codeDomains),
  "Referenz-JSON Domain-IDs driften von KIOSK_DOMAIN_IDS.",
);

assert(
  document.includes(`\`${schemaVersion}\``),
  "Dokument nennt die implementierte Demo-Schema-Version nicht.",
);
assert(
  document.includes(`\`${datasetVersion}\``),
  "Dokument nennt die implementierte Dataset-Version nicht.",
);
assert(
  document.includes(`\`${referencePath}\``),
  "Dokument nennt die führende Referenzdatei nicht.",
);
assert(
  document.includes(`\`KioskDataProvider.getSnapshot(): Promise<KioskSnapshot>\``),
  "Dokument nennt den providerneutralen Runtime-Vertrag nicht.",
);

for (const domainId of codeDomains) {
  assert(document.includes(`\`${domainId}\``), `Dokument nennt Domain-ID ${domainId} nicht.`);
}

assert(
  /keine produktive externe HTTP-API/i.test(document),
  "Dokument muss ausdrücklich festhalten, dass keine produktive externe HTTP-API implementiert ist.",
);
assert(
  /\*\*Produktive externe Kiosk-API:\*\*\s+NICHT UMGESETZT\./.test(document),
  "Freigabeentscheidung muss die produktive externe Kiosk-API als NICHT UMGESETZT kennzeichnen.",
);
assert(
  !/\*\*Produktive externe Kiosk-API:\*\*\s+UMGESETZT\b/.test(document),
  "Dokument darf keine produktive externe Kiosk-API als umgesetzt kennzeichnen.",
);

console.log("SYSING-KIOSK-001 TDF contract");
console.log(`  Dokument:       ${documentPath || "FEHLT"}`);
console.log(`  Schema:         ${schemaVersion || "FEHLT"}`);
console.log(`  Dataset:        ${datasetVersion || "FEHLT"}`);
console.log(`  Domains:        ${codeDomains.join(", ")}`);
console.log(`  Referenzdaten:  ${referencePath}`);

if (errors.length > 0) {
  console.error("\nFehler:");
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}

console.log("\n✓ SYSING-KIOSK-001: PASS");
