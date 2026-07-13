/**
 * Detektor: API-Endpoint-Guards.
 *
 * Prüft TSS-Server-Routes in `src/routes/api/**` auf grundlegende Schutz-
 * mechanismen. Meldet fehlende Hinweise auf Auth, Zod-Validierung und
 * strukturierte Fehlerantworten. Erzeugt bewusst höchstens ein Finding
 * pro Datei/Regel, um Rauschen zu vermeiden.
 */
import { rel, read, walk, stableId } from "../util.mjs";

export function detectEndpointGuards(ROOT) {
  const findings = [];
  const now = new Date().toISOString();
  const files = walk(`${ROOT}/src/routes/api`, /\.(ts|tsx)$/);

  for (const abs of files) {
    const relPath = rel(ROOT, abs);
    const text = read(abs);

    const hasAuth =
      /X-Sync-Token|requireSupabaseAuth|Authorization|x-webhook-signature|process\.env\.\w+_TOKEN/i.test(
        text,
      );
    const hasValidation = /\.parse\s*\(|\.safeParse\s*\(|zod|Response\.json\s*\(/i.test(text);
    const hasErrorStructure =
      /new\s+Response\(\s*JSON|Response\.json\(\s*\{\s*error/i.test(text) ||
      /status\s*:\s*(4|5)\d\d/.test(text);
    const isPublic = /\/api\/public\//.test(relPath);

    if (!hasAuth && !isPublic) {
      findings.push({
        id: stableId("endpoint-auth", relPath),
        title: "API-Endpoint ohne erkennbaren Auth-Guard",
        category: "API",
        location: relPath,
        description:
          "Handler enthält weder `X-Sync-Token`, `requireSupabaseAuth` noch einen anderen Auth-Marker.",
        rootCause: "Endpoint wurde ohne Authentifizierungs-Prüfung angelegt.",
        impact: "Unbefugter Zugriff möglich, sobald der Endpoint öffentlich erreichbar wird.",
        severity: "High",
        likelihood: "Hoch",
        recommendation:
          "Auth-Middleware oder Token-Prüfung ergänzen; für externe Caller `/api/public/*` + Signaturprüfung nutzen.",
        recommendedOrder: 3,
        effort: "klein",
        status: "offen",
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: "endpoint-auth-missing",
        priorityTag: "open-privileged-endpoint",
      });
    }

    if (!hasValidation) {
      findings.push({
        id: stableId("endpoint-zod", relPath),
        title: "API-Endpoint ohne Eingabevalidierung",
        category: "API",
        location: relPath,
        description: "Kein `.parse()`/`.safeParse()`-Aufruf im Handler erkennbar.",
        rootCause: "Request-Body wird ohne Schema-Prüfung verarbeitet.",
        impact:
          "Malformierte Payloads erreichen Business-Logik; potenziell inkonsistente Speicherung.",
        severity: "Medium",
        likelihood: "Mittel",
        recommendation: "Zod-Schema am Handler-Eingang ergänzen und bei Fehler 400 zurückgeben.",
        recommendedOrder: 20,
        effort: "klein",
        status: "offen",
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: "endpoint-validation-missing",
        priorityTag: "functional-bug",
      });
    }

    if (!hasErrorStructure) {
      findings.push({
        id: stableId("endpoint-err", relPath),
        title: "API-Endpoint ohne strukturierte Fehlerantwort",
        category: "API",
        location: relPath,
        description: "Kein erkennbarer 4xx/5xx-Response-Pfad.",
        rootCause: "Handler wirft ungefangen; Framework antwortet mit generischer 500-Antwort.",
        impact: "Client kann Fehler nicht klassifizieren, Correlation erschwert.",
        severity: "Low",
        likelihood: "Mittel",
        recommendation: "try/catch mit `Response.json({error, code}, {status: 4xx|5xx})` ergänzen.",
        recommendedOrder: 90,
        effort: "klein",
        status: "offen",
        firstDetected: now,
        lastChecked: now,
        version: process.env.TECH_DEBT_VERSION ?? "unknown",
        source: "automated",
        automatedRule: "endpoint-error-shape",
        priorityTag: "stability",
      });
    }
  }

  return findings;
}
