/**
 * ComplianceReportPrint — vollständige, druckbare Fassung des technischen
 * Prüfberichts (Sprint 05B).
 *
 * Wird ausschließlich während des Drucks in ein Portal direkt an `document.body`
 * gerendert (`#technical-report-print-root`). Dadurch ist der Bericht vom
 * Dialog-Layout (fixed, max-height, overflow) vollständig entkoppelt — das war
 * die Ursache des leeren Ausdrucks.
 *
 * Alle Werte stammen aus `test-report/technical-test-report.json`; es sind
 * keine Reportwerte hart kodiert.
 */
import type { Finding, Report } from "./types";
import { REC_LABEL, SEVERITY_ORDER, STATUS_LABEL } from "./types";

const SEV_LABEL: Record<string, string> = {
  CRITICAL: "Kritisch",
  HIGH: "Hoch",
  MEDIUM: "Mittel",
  LOW: "Niedrig",
  INFO: "Info",
};

const AREA_LABEL: Record<string, string> = {
  architecture: "Architektur",
  auth: "Authentifizierung",
  rbac: "RBAC",
  rls: "RLS",
  supabase: "Supabase",
  api: "API-Sicherheit",
  "api-security": "API-Sicherheit",
  logging: "Logging",
  ops: "Betrieb",
  operations: "Betrieb",
  tests: "Tests",
  testing: "Tests",
  backup: "Backup und Restore",
  "backup-restore": "Backup und Restore",
  docker: "Docker-Portabilität",
  azure: "Azure-Readiness",
  "azure-readiness": "Azure-Readiness",
  docs: "Dokumentation",
  documentation: "Dokumentation",
  security: "Sicherheit",
  frontend: "Frontend",
};

const label = (key: string) => AREA_LABEL[key] ?? key;
const statusText = (s: string) => STATUS_LABEL[s] ?? s;

function severityRank(f: Finding): number {
  return SEVERITY_ORDER.indexOf(f.severity);
}

function sortActions(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const gate = Number(Boolean(b.gateRelevant)) - Number(Boolean(a.gateRelevant));
    if (gate !== 0) return gate;
    const acc = Number(a.accepted) - Number(b.accepted);
    if (acc !== 0) return acc;
    return severityRank(a) - severityRank(b);
  });
}

export function ComplianceReportPrint({ report }: { report: Report }) {
  const blockers = report.findings.filter((f) => f.gateRelevant && !f.accepted).length;
  const closed = report.diff?.fixed?.length ?? 0;
  const loggerFindings = report.findings.filter(
    (f) => /console/i.test(f.id) || /console\./i.test(f.title),
  );
  const loggerOpen = loggerFindings.filter((f) => !f.accepted);
  const loggerAccepted = loggerFindings.filter((f) => f.accepted);
  const stage = report.releaseStage;

  return (
    <div className="tr-print">
      {/* Kopf */}
      <header className="tr-print-head">
        <h1>Technischer Prüfbericht — Sysing Dashboard</h1>
        <p>
          Dashboard-Version {report.identity.dashboardVersion} · Reportversion{" "}
          {report.version ?? "—"} · Schema {report.schemaVersion ?? "—"} · erstellt{" "}
          {report.generatedAt} · Umgebung Node {report.identity.environment.node} /{" "}
          {report.identity.environment.platform}
          {report.identity.environment.ci ? " / CI" : ""} · Build {report.identity.commit}
        </p>
      </header>

      {/* 2. Prüfidentität */}
      <section className="tr-sec">
        <h2>1. Prüfidentität</h2>
        <table className="tr-kv">
          <tbody>
            <Row k="Report-ID" v={report.id ?? "—"} mono />
            <Row k="Reportversion" v={String(report.version ?? "—")} />
            <Row k="Vorgängerbericht" v={report.parentReportId ?? "—"} mono />
            <Row k="Schema" v={report.schemaVersion ?? "—"} />
            <Row k="Dashboard-Version" v={report.identity.dashboardVersion} />
            <Row k="Commit" v={report.identity.commit} mono />
            <Row k="Build-Tag" v={report.identity.buildTag ?? "—"} />
            <Row k="DB-Migrationsstand" v={report.identity.dbMigrationHead ?? "—"} />
            <Row k="Testzeitpunkt" v={report.identity.testTime} />
            <Row
              k="Laufzeitumgebung"
              v={`Node ${report.identity.environment.node} · ${report.identity.environment.platform}${
                report.identity.environment.ci ? " · CI" : ""
              }`}
            />
            <Row k="Integritätsalgorithmus" v={report.integrity?.algo ?? "—"} />
            <Row k="Integritäts-Hash" v={report.integrity?.value ?? "—"} mono wrap />
          </tbody>
        </table>
      </section>

      {/* 3. Freigabestufe */}
      <section className="tr-sec">
        <h2>2. Freigabestufe</h2>
        <table className="tr-kv">
          <tbody>
            <Row k="Vorgeschlagene Stufe" v={stage?.proposed ?? "—"} />
            <Row k="Effektive Stufe" v={stage?.effective ?? stage?.proposed ?? "—"} />
            <Row k="Begründung" v={stage?.reason ?? "—"} wrap />
            {stage?.overridden && (
              <>
                <Row k="Override durch" v={`${stage.overridden.by} (${stage.overridden.at})`} />
                <Row k="Override-Grund" v={stage.overridden.reason} wrap />
                <Row k="Ticket" v={stage.overridden.ticket ?? "—"} />
              </>
            )}
          </tbody>
        </table>
      </section>

      {/* 4. Gesamtstatus */}
      <section className="tr-sec">
        <h2>3. Gesamtstatus</h2>
        <table className="tr-kv">
          <tbody>
            <Row k="Gesamtstatus" v={statusText(report.status)} />
            <Row k="Findings gesamt" v={String(report.summary.total)} />
            <Row k="Kritisch" v={String(report.summary.critical)} />
            <Row k="Hoch" v={String(report.summary.high)} />
            <Row k="Mittel" v={String(report.summary.medium)} />
            <Row k="Niedrig" v={String(report.summary.low)} />
            <Row k="Akzeptiert" v={String(report.summary.accepted)} />
            <Row k="Geschlossen seit Vorlauf" v={String(closed)} />
            <Row k="Gate-Blocker" v={blockers === 0 ? "keine (0)" : String(blockers)} />
            <Row
              k="Historische Empfehlung (Kompatibilität)"
              v={`${REC_LABEL[report.recommendation.level] ?? report.recommendation.level} — ${report.recommendation.reason}`}
              wrap
            />
          </tbody>
        </table>
      </section>

      {/* 5. Management Summary */}
      <section className="tr-sec">
        <h2>4. Management Summary</h2>
        <ul className="tr-list">
          <li>
            Gesamtstatus <strong>{statusText(report.status)}</strong> mit{" "}
            {report.summary.total} Findings ({report.summary.critical} kritisch,{" "}
            {report.summary.high} hoch, {report.summary.medium} mittel, {report.summary.low}{" "}
            niedrig).
          </li>
          <li>
            Freigabefähigkeit: effektive Stufe{" "}
            <strong>{stage?.effective ?? stage?.proposed ?? "—"}</strong>
            {stage?.reason ? ` — ${stage.reason}` : ""}.
          </li>
          <li>
            Offene Risiken: {blockers} Gate-Blocker,{" "}
            {report.findings.filter((f) => !f.accepted && f.severity === "HIGH").length} offene
            HIGH-Findings.
          </li>
          <li>Akzeptierte technische Schulden: {report.summary.accepted}.</li>
          <li>
            Logging: {loggerOpen.length} offene Logger-Findings, {loggerAccepted.length}{" "}
            dokumentierte Ausnahmen.
          </li>
          <li>
            Änderungen gegenüber dem Vorgängerbericht: {report.diff?.new.length ?? 0} neu,{" "}
            {closed} geschlossen, {report.diff?.reappeared.length ?? 0} wieder geöffnet.
          </li>
        </ul>
      </section>

      {/* 6. Prüfbereiche */}
      <section className="tr-sec">
        <h2>5. Prüfbereiche</h2>
        <table className="tr-table">
          <thead>
            <tr>
              <th>Bereich</th>
              <th>Status</th>
              <th>Offen (Krit./Hoch)</th>
              <th>Nachweis</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(report.sections ?? {}).map(([key, sec]) => (
              <tr key={`sec-${key}`}>
                <td>{label(key)}</td>
                <td>{statusText(sec.status)}</td>
                <td>—</td>
                <td className="tr-wrap">{sec.evidence ?? sec.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 7. Testergebnisse */}
      <section className="tr-sec">
        <h2>6. Testergebnisse</h2>
        <table className="tr-table">
          <thead>
            <tr>
              <th>Testbereich</th>
              <th>Status</th>
              <th>Offen Kritisch</th>
              <th>Offen Hoch</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(report.areas).map(([key, a]) => (
              <tr key={`area-${key}`}>
                <td>{label(key)}</td>
                <td>{statusText(a.status)}</td>
                <td>{a.openCritical}</td>
                <td>{a.openHigh}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tr-note">
          Bereiche mit Status „nicht ausgeführt“ gelten ausdrücklich als nicht verifiziert.
        </p>
      </section>

      {/* 8. Änderungen */}
      <section className="tr-sec">
        <h2>7. Änderungen gegenüber dem Vorgängerbericht</h2>
        <table className="tr-kv">
          <tbody>
            <Row k="Neue Findings" v={report.diff?.new.join(", ") || "keine"} wrap />
            <Row k="Geschlossene Findings" v={report.diff?.fixed.join(", ") || "keine"} wrap />
            <Row
              k="Wieder geöffnet"
              v={report.diff?.reappeared.join(", ") || "keine"}
              wrap
            />
            <Row
              k="Schweregrad geändert"
              v={
                (report.diff?.severityChanged ?? [])
                  .map((c) => `${c.id}: ${c.from} → ${c.to}`)
                  .join("; ") || "keine"
              }
              wrap
            />
            <Row
              k="Gate-Relevanz geändert"
              v={
                (report.diff?.gateChanged ?? [])
                  .map((c) => `${c.id}: ${c.from} → ${c.to}`)
                  .join("; ") || "keine"
              }
              wrap
            />
            <Row
              k="Status geändert"
              v={
                (report.diff?.statusChanged ?? [])
                  .map((c) => `${c.id}: ${c.from} → ${c.to}`)
                  .join("; ") || "keine"
              }
              wrap
            />
            <Row
              k="Sicherheitsregressionen"
              v={
                (report.diff?.securityRegressions ?? []).map((r) => `${r.id} (${r.kind})`).join(
                  "; ",
                ) || "keine"
              }
              wrap
            />
          </tbody>
        </table>
      </section>

      {/* 9. Findings */}
      <section className="tr-sec">
        <h2>8. Findings ({report.findings.length})</h2>
        {report.findings.map((f) => (
          <article className="tr-finding" key={f.id}>
            <h3>
              [{SEV_LABEL[f.severity] ?? f.severity}] {f.title}
            </h3>
            <table className="tr-kv">
              <tbody>
                <Row k="ID" v={f.id} mono wrap />
                <Row k="Bereich / Kategorie" v={`${label(f.area)} · ${f.category}`} />
                <Row k="Bucket" v={f.bucket} />
                <Row k="Status" v={f.status} />
                <Row k="Klassifikation" v={f.classification ?? "—"} />
                <Row k="Gate-relevant" v={f.gateRelevant ? "ja" : "nein"} />
                <Row k="Beschreibung" v={f.description ?? "—"} wrap />
                <Row k="Ursache / Auswirkung" v={f.rootCause ?? "—"} wrap />
                <Row k="Betroffene Komponenten" v={(f.components ?? []).join(", ") || "—"} wrap />
                <Row
                  k="Nachweis"
                  v={f.evidence?.file ?? f.evidence?.reportRef ?? "—"}
                  mono
                  wrap
                />
                <Row k="Empfehlung" v={f.recommendation ?? "—"} wrap />
                <Row k="Aufwand" v={f.effort} />
                <Row k="Quelle" v={f.source === "auto" ? "automatisch" : "manuell"} />
                <Row k="ADR-Referenz" v={f.adrRef ?? "—"} />
                {f.accepted && <Row k="Akzeptiert" v="ja (akzeptierte technische Schuld)" />}
              </tbody>
            </table>
          </article>
        ))}
      </section>

      {/* 10. Maßnahmenliste */}
      <section className="tr-sec">
        <h2>9. Maßnahmenliste</h2>
        <table className="tr-table">
          <thead>
            <tr>
              <th>Finding-ID</th>
              <th>Maßnahme</th>
              <th>Priorität</th>
              <th>Aufwand</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortActions(report.findings).map((f) => (
              <tr key={`act-${f.id}`}>
                <td className="tr-mono tr-wrap">{f.id}</td>
                <td className="tr-wrap">{f.recommendation ?? f.title}</td>
                <td>
                  {f.gateRelevant && !f.accepted
                    ? "Gate-Blocker"
                    : f.accepted
                      ? "Akzeptierte Schuld"
                      : (SEV_LABEL[f.severity] ?? f.severity)}
                </td>
                <td>{f.effort}</td>
                <td>{f.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 11. Technische Schulden / ADR-0019 */}
      <section className="tr-sec">
        <h2>10. Technische Schulden und ADR-0019</h2>
        <ul className="tr-list">
          <li>
            Logger-Bereinigung: {loggerOpen.length} offene Findings, {loggerAccepted.length}{" "}
            dokumentierte Ausnahmen (siehe docs/LOGGING.md).
          </li>
          <li>Akzeptierte technische Schulden gesamt: {report.summary.accepted}.</li>
          <li>
            Modulgrößen und ADR-0019-Status werden über die Oversize-Findings dieses Berichts
            nachgewiesen.
          </li>
        </ul>
      </section>

      {/* 12. Integritäts- und Freigabenachweis */}
      <section className="tr-sec">
        <h2>11. Integritäts- und Freigabenachweis</h2>
        <table className="tr-kv">
          <tbody>
            <Row k="Report-ID" v={report.id ?? "—"} mono wrap />
            <Row k="Reportversion" v={String(report.version ?? "—")} />
            <Row k="SHA-256" v={report.integrity?.value ?? "—"} mono wrap />
            <Row k="Effektive Freigabestufe" v={stage?.effective ?? stage?.proposed ?? "—"} />
            <Row k="Datum" v={report.generatedAt} />
          </tbody>
        </table>
        <p className="tr-note">
          Maschinelle Verifikation: <code>node scripts/technical-report/verify.mjs</code>. Die
          Reporthistorie liegt unter <code>test-report/history/</code>.
        </p>
      </section>

      <footer className="tr-print-foot">
        Sysing Dashboard · Technischer Prüfbericht {report.identity.dashboardVersion} · Report{" "}
        {report.id ?? "—"}
      </footer>
    </div>
  );
}

function Row({
  k,
  v,
  mono,
  wrap,
}: {
  k: string;
  v: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <tr>
      <th scope="row">{k}</th>
      <td className={`${mono ? "tr-mono" : ""} ${wrap ? "tr-wrap" : ""}`.trim()}>{v}</td>
    </tr>
  );
}
