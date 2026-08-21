/**
 * Globaler Test-Stub für `@/integrations/supabase/client`.
 *
 * Zweck: Unit- und Component-Tests dürfen NIEMALS eine echte Supabase-Instanz
 * kontaktieren — weder produktiv noch lokal. Der Stub verhält sich wie ein
 * "verbundener, aber leerer" Client:
 *   - keine Session (`getSession`/`getUser` → null) → `useCurrentUser()` liefert
 *     null, die RBAC-/Auth-Erwartungen der Security-Tests bleiben unverändert
 *     gültig (kein Zugriff ohne Session).
 *   - alle Query-Builder-Ketten sind awaitbar und liefern leere Ergebnisse.
 *
 * Tests, die anderes Verhalten brauchen, überschreiben den Stub weiterhin mit
 * einem eigenen `vi.mock(...)` in der jeweiligen Testdatei.
 */

type Result = { data: unknown; error: null; count: number | null; status: number };

function makeResult(data: unknown): Result {
  return { data, error: null, count: null, status: 200 };
}

/** Awaitbarer, beliebig verkettbarer Query-Builder-Stub. */
function createQueryBuilder(): unknown {
  const listResult = makeResult([]);
  const builder: Record<string, unknown> = {
    then: (resolve: (value: Result) => unknown) => Promise.resolve(listResult).then(resolve),
    catch: () => Promise.resolve(listResult),
    finally: (fn: () => void) => Promise.resolve(listResult).finally(fn),
    single: async () => makeResult(null),
    maybeSingle: async () => makeResult(null),
    csv: async () => makeResult(""),
  };
  const chainable = [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "is",
    "in",
    "contains",
    "not",
    "or",
    "filter",
    "match",
    "order",
    "limit",
    "range",
    "returns",
    "abortSignal",
    "throwOnError",
  ];
  for (const name of chainable) {
    builder[name] = () => builder;
  }
  return builder;
}

export function createSupabaseClientStub() {
  return {
    from: () => createQueryBuilder(),
    rpc: async () => makeResult(null),
    channel: () => ({
      on: function on() {
        return this;
      },
      subscribe: () => ({ unsubscribe: () => {} }),
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        download: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "http://127.0.0.1:54321/storage" } }),
      }),
    },
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error: null }),
      signUp: async () => ({ data: { session: null, user: null }, error: null }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  };
}
