#!/usr/bin/env node
/**
 * Backup-/Restore-/IO-Integritätsbericht.
 * Liest die Vitest-JSON-Ausgabe aus `test-report/backup-vitest.json` und
 * erzeugt einen kompakten Bericht (JSON + Markdown).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const IN = "test-report/backup-vitest.json";
const OUT_JSON = "test-report/backup-integrity-report.json";
const OUT_MD = "test-report/backup-integrity-report.md";

function categoryOf(file) {
  if (file.includes("/backup/create")) return "backup";
  if (file.includes("/backup/integrity")) return "backup";
  if (file.includes("/backup/restore")) return "restore";
  if (file.includes("/io/import")) return "import";
  if (file.includes("/io/export")) return "export";
  return "other";
}

function severityFor(cat) {
  if (cat === "restore") return "high";
  if (cat === "backup") return "high";
  if (cat === "import") return "medium";
  if (cat === "export") return "medium";
  return "low";
}

function recommendation(cat, name) {
  const base = {
    backup: "ZIP-/Manifest-Erzeugung prüfen; Snapshot/Ausschlussliste konsistent halten.",
    restore: "Restore-Pfad reparieren; keinesfalls Teilzustände erlauben.",
    import: "Zod-Schema/Diff/Vorschau abgleichen; keine stillen Löschungen.",
    export: "Datei-Erzeugung (JSON/CSV) und Schema-Konformität sicherstellen.",
  };
  return `${base[cat] ?? "Fehlerursache analysieren."} — Fehlgeschlagen: ${name}`;
}

function main() {
  if (!existsSync(IN)) {
    console.error(`[backup-integrity] Vitest-Report fehlt: ${IN}`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(IN, "utf8"));
  const cats = { backup: {}, restore: {}, import: {}, export: {}, other: {} };
  for (const key of Object.keys(cats)) cats[key] = { passed: 0, failed: 0, findings: [] };

  let totalChecked = 0;
  const results = raw.testResults ?? [];
  for (const file of results) {
    const cat = categoryOf(file.name ?? "");
    for (const t of file.assertionResults ?? []) {
      totalChecked++;
      if (t.status === "passed") cats[cat].passed++;
      else if (t.status === "failed") {
        cats[cat].failed++;
        cats[cat].findings.push({
          id: `${cat.toUpperCase()}-${cats[cat].findings.length + 1}`,
          severity: severityFor(cat),
          title: t.fullName || t.title,
          recommendation: recommendation(cat, t.fullName || t.title),
        });
      }
    }
  }

  const summary = {
    checked: totalChecked,
    passed: Object.values(cats).reduce((s, c) => s + c.passed, 0),
    failed: Object.values(cats).reduce((s, c) => s + c.failed, 0),
    restorable: cats.restore.failed === 0 && cats.backup.failed === 0,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    categories: cats,
    records: {
      backupCases: cats.backup.passed + cats.backup.failed,
      restoreScenarios: cats.restore.passed + cats.restore.failed,
      importCases: cats.import.passed + cats.import.failed,
      exportCases: cats.export.passed + cats.export.failed,
    },
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = [];
  md.push("# Backup-/Restore-/IO-Integritätsbericht");
  md.push(`_Generiert: ${report.generatedAt}_`);
  md.push("");
  md.push(`- Geprüfte Fälle: **${summary.checked}**`);
  md.push(`- Bestanden: **${summary.passed}**`);
  md.push(`- Fehlgeschlagen: **${summary.failed}**`);
  md.push(`- Wiederherstellbarkeit: **${summary.restorable ? "ja" : "nein"}**`);
  md.push("");
  md.push("## Kategorien");
  md.push("| Kategorie | Bestanden | Fehlgeschlagen | Findings |");
  md.push("| --- | ---: | ---: | ---: |");
  for (const [k, v] of Object.entries(cats)) {
    md.push(`| ${k} | ${v.passed} | ${v.failed} | ${v.findings.length} |`);
  }
  md.push("");
  md.push("## Bekannte Einschränkungen");
  md.push(
    "- **Keine Prüfsumme im Manifest** — Integrität rein über Struktur/Manifest/Nachvalidierung, siehe ADR-0015.",
  );
  md.push(
    "- **PDF-Export** wird in dieser Suite nicht semantisch validiert (nur Struktur-Tests der Text-Exports); der PDF-Pfad ist über E2E abgedeckt.",
  );
  md.push(
    "- **Rollen-/Scope-Enforcement** rein clientseitig — Backend-RBAC steht offen (SEC-CRIT-001).",
  );
  md.push("");
  if (summary.failed > 0) {
    md.push("## Findings");
    for (const [cat, data] of Object.entries(cats)) {
      for (const f of data.findings) {
        md.push(`- [${f.severity.toUpperCase()}] **${f.id}** (${cat}): ${f.title}`);
        md.push(`  - Empfehlung: ${f.recommendation}`);
      }
    }
  }
  writeFileSync(OUT_MD, md.join("\n"));

  console.log(
    `[backup-integrity] ${summary.passed}/${summary.checked} bestanden — Report: ${OUT_MD}`,
  );
}

main();
