export const logger: {
  debug: (m: string, c?: Record<string, unknown>) => void;
  info: (m: string, c?: Record<string, unknown>) => void;
  warn: (m: string, c?: Record<string, unknown>) => void;
  error: (m: string, err?: unknown, c?: Record<string, unknown>) => void;
};
export function redact(
  context: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined;
