/**
 * Server-seitiger Correlation-ID-Kontext (Prompt 2A.4B).
 *
 * Setzt eine `AsyncLocalStorage` als Request-Kontext auf und liefert
 * einen Handler-Wrapper `withCorrelation(handler)` für TSS-Server-Routes.
 * Innerhalb des Wrappers gilt:
 *  - Eingehender `X-Correlation-Id`-Header wird validiert (siehe
 *    `src/lib/correlation.ts`) und übernommen oder verworfen.
 *  - Neue ID wird bei fehlendem/ungültigem Header erzeugt.
 *  - ID ist im gesamten Request-Baum via `getCurrentCorrelationId()`
 *    lesbar — auch aus dem Backend-Logger (`backend/services/logger.mjs`),
 *    der denselben Speicher liest.
 *  - Response bekommt den Header zurückgespielt.
 *  - Unerwartete Exceptions werden in eine strukturierte Fehlerantwort
 *    `{ ok:false, code, message, correlationId, timestamp }` gewandelt
 *    (Status 500) — nie Stack, nie Secrets.
 *
 * Kein Import von `.server.ts`-Modulen; diese Datei ist als reines
 * Server-Modul über den TSS-Bundler geschützt (Handler-Body-Split).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import {
  CORRELATION_HEADER,
  acceptOrGenerateCorrelationId,
} from "./correlation";

interface CorrelationContext {
  correlationId: string;
  route?: string;
  method?: string;
  startedAt: number;
}

// Singleton — auf globalThis, damit Hot-Reload und mehrfaches Import
// aus verschiedenen Chunks denselben Speicher benutzen.
const KEY = "__dashboardCorrelationStore__";
const g = globalThis as unknown as { [KEY]?: AsyncLocalStorage<CorrelationContext> };
if (!g[KEY]) g[KEY] = new AsyncLocalStorage<CorrelationContext>();
const store = g[KEY]!;

export function getCurrentCorrelationId(): string | undefined {
  return store.getStore()?.correlationId;
}

export function getCurrentCorrelationContext(): CorrelationContext | undefined {
  return store.getStore();
}

type RouteHandler = (ctx: {
  request: Request;
  params?: Record<string, string>;
}) => Promise<Response> | Response;

/**
 * Wickelt einen TSS-Handler mit Correlation-ID-Verarbeitung ein.
 * Die Handler-Signatur bleibt identisch — reines Add-on.
 */
export function withCorrelation(handler: RouteHandler): RouteHandler {
  return async (ctx) => {
    const correlationId = acceptOrGenerateCorrelationId(
      ctx.request.headers.get(CORRELATION_HEADER),
    );
    const url = new URL(ctx.request.url);
    const context: CorrelationContext = {
      correlationId,
      route: url.pathname,
      method: ctx.request.method,
      startedAt: Date.now(),
    };

    return store.run(context, async () => {
      let res: Response;
      try {
        res = await handler(ctx);
      } catch (err) {
        // Handler-Exception → strukturierte Antwort, niemals Stack leaken.
        const body = {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "Internal Server Error",
          correlationId,
          timestamp: new Date().toISOString(),
        };
        return new Response(JSON.stringify(body), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            [CORRELATION_HEADER]: correlationId,
          },
        });
      }
      // Response klonen und Header nachrüsten (ohne Body zu materialisieren).
      const headers = new Headers(res.headers);
      headers.set(CORRELATION_HEADER, correlationId);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    });
  };
}

/**
 * Baut einen einheitlichen Fehler-Body mit Correlation-ID. Wird von
 * den Route-Handlern anstelle `jsonError()` verwendet.
 */
export function jsonErrorWithCorrelation(
  status: number,
  code: string,
  message: string,
): Response {
  const correlationId = getCurrentCorrelationId() ?? "unknown";
  const body = {
    ok: false,
    code,
    message,
    correlationId,
    timestamp: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      [CORRELATION_HEADER]: correlationId,
    },
  });
}
