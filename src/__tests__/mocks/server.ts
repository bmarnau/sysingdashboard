/**
 * MSW-Node-Server für Tests, die HTTP-Layer isolieren müssen (Azure,
 * externe APIs). Wird opt-in importiert:
 *
 *   import { server } from '@/__tests__/mocks/server';
 *   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 *
 * Kein globales Setup — bestehende Tests bleiben unberührt.
 */
import { setupServer } from "msw/node";
import { azureHandlers } from "./handlers/azure";
import { apiHandlers } from "./handlers/api";

export const server = setupServer(...azureHandlers, ...apiHandlers);
