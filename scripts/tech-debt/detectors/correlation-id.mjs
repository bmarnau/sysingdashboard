/**
 * Detektor: Correlation-ID-Abdeckung (Prompt 2A.4B).
 *
 * Prüft aktive TSS-Server-Routes in `src/routes/api/**` und meldet:
 *  - Route ohne `withCorrelation`-Wrapper oder Header-Handling.
 *  - Fehlerantwort ohne `correlationId`-Feld.
 *  - Verdacht auf ungeprüfte Client-ID (direktes `.headers.get("x-correlation-id")`
 *    ohne `acceptOrGenerateCorrelationId`/`withCorrelation`).
 *
 * Archivierte Routen (`archive/legacy-standalone-backend/**`) werden
 * bewusst ignoriert — Prompt-Vorgabe.
 */
import { rel, read, walk, stableId } from "../util.mjs";

export function detectCorrelationId(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const files = walk(`${ROOT}/src/routes/api`, /\.(ts|tsx)$/);

  for (const abs of files) {
    const relPath = rel(ROOT, abs);
    const text = read(abs);

    const usesWrapper = /withCorrelation\s*\(/.test(text);
    const usesErrorHelper = /jsonErrorWithCorrelation\s*\(/.test(text);
    const hasErrorResponse =
      /new\s+Response\(\s*JSON|Response\.json\(\s*\{\s*error/i.test(text) ||
      /jsonError/i.test(text);
    const rawClientHeader =
      /headers\.get\(\s*["'`]x-correlation-id["'`]/i.test(text) &&
      !/acceptOrGenerateCorrelationId|withCorrelation/.test(text);
    const isPublic = /\/api\/public\//.test(relPath);

    if (!usesWrapper) {
      findings.push({
        id: stableId("correlation-missing", relPath),
        title: "Aktive API-Route ohne Correlation-ID-Middleware",
        category: "API",
        location: relPath,
        description:
          "Handler ist nicht mit `withCorrelation` umschlossen; Requests laufen ohne nachverfolgbare Referenz-ID.",
        rootCause:
          "Neue Route wurde ohne Anschluss an `src/lib/correlation-context.server.ts` angelegt.",
        impact:
          "Support-Anfragen können nicht eindeutig zugeordnet werden; Logs/Fehlerantworten/Azure-Aufrufe sind nicht korrelierbar.",
        severity: isPublic ? "Medium" : "High",
        likelihood: "Hoch",
        recommendation:
          "Handler durch `withCorrelation(...)` wickeln und Fehlerpfade auf `jsonErrorWithCorrelation` umstellen.",
        recommendedOrder: 5,
        effort: "klein",
        status: "offen",
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: "correlation-id-wrapper-missing",
        priorityTag: isPublic ? "stability" : "open-privileged-endpoint",
      });
    }

    if (hasErrorResponse && !usesErrorHelper) {
      findings.push({
        id: stableId("correlation-err-shape", relPath),
        title: "Fehlerantwort ohne Correlation-ID",
        category: "API",
        location: relPath,
        description:
          "Handler antwortet mit unstrukturierter Fehler-Response ohne `correlationId`.",
        rootCause:
          "Direkter `Response.json({error})`-Aufruf statt `jsonErrorWithCorrelation(status, code, message)`.",
        impact: "Client kann Fehler nicht mit einem Server-Log-Eintrag verknüpfen.",
        severity: "High",
        likelihood: "Mittel",
        recommendation:
          "Alle Fehlerpfade auf `jsonErrorWithCorrelation(status, code, message)` umstellen.",
        recommendedOrder: 10,
        effort: "klein",
        status: "offen",
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: "correlation-id-error-shape",
        priorityTag: "functional-bug",
      });
    }

    if (rawClientHeader) {
      findings.push({
        id: stableId("correlation-raw-client", relPath),
        title: "Correlation-ID ungeprüft aus Client übernommen",
        category: "API",
        location: relPath,
        description:
          "Route liest den Correlation-ID-Header direkt, ohne die zentrale Validierung.",
        rootCause: "Direkter Zugriff auf `headers.get('x-correlation-id')`.",
        impact:
          "Client kann beliebige Zeichen, überlange Werte oder gefährliche Inhalte in Logs und Antworten einschleusen.",
        severity: "High",
        likelihood: "Mittel",
        recommendation:
          "`acceptOrGenerateCorrelationId(...)` oder `withCorrelation(...)` verwenden.",
        recommendedOrder: 4,
        effort: "klein",
        status: "offen",
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: "correlation-id-unvalidated-client",
        priorityTag: "security-vuln",
      });
    }
  }

  return findings;
}
