/**
 * Endpoint-Contract-Registry — Typen.
 *
 * Ein `EndpointContract` beschreibt eine Server-Route (aus `src/routes/api/`)
 * einmal deklarativ. Der Runner (`src/__tests__/api/runner.test.ts`) erzeugt
 * daraus positive und negative Testfälle plus eine Matrix (`api-matrix.md`).
 */
import type { z } from "zod";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

/** Handler-Signatur wie sie TanStack-Server-Routen intern haben. */
export type RouteHandler = (ctx: {
  request: Request;
  params?: Record<string, string>;
}) => Promise<Response>;

export type RouteModule = {
  Route: {
    options: {
      server: {
        handlers:
          | Partial<Record<HttpMethod, RouteHandler>>
          | ((ctx: { createHandlers: <T>(h: T) => T }) => unknown);
      };
    };
  };
};

export interface EndpointContract {
  /** Pfad wie in `createFileRoute("/api/...")`. */
  path: string;
  /** Kurz-ID für den Report (`status`, `sync`, ...). */
  id: string;
  /** Nur bekannte Methoden ausführen; nicht gelistete gelten als „nicht erlaubt". */
  methods: HttpMethod[];
  /** Ob Auth erforderlich ist. Bei `true` wird der Runner Auth-Negativfälle erzeugen. */
  authRequired: boolean;
  /** Optional: benannte Permission (rein informativ für die Matrix). */
  permission?: string;
  /** Optional: Scope-Ebene (`global` | `tenant` | `customer`). */
  scope?: string;
  /** Zod-Schema für den Request-Body (nur bei POST/PUT/PATCH). */
  requestSchema?: z.ZodTypeAny;
  /** Zod-Schema für Success-Response (Runner asserted structural). */
  responseSchema?: z.ZodTypeAny;
  /** Zod-Schema für Fehler-Response (`{ok:false, error, ...}`). */
  errorSchema?: z.ZodTypeAny;
  /** Beispiel-Body für Positiv-Fälle. */
  validRequest?: () => unknown;
  /** Loader für den Route-Handler (lazy, damit Test-Import billig bleibt). */
  loadRoute: () => Promise<RouteModule>;
  /** Reifegrad. `planned` → Runner überspringt mit `test.todo`. */
  status: "active" | "planned" | "archived";
  /** Freitext: bekannte Risiken für die Matrix. */
  knownRisks?: string[];
  /** Ob CORS-Header erwartet werden (Default: false — same-origin). */
  corsExpected?: boolean;
}
