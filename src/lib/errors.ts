/**
 * Dashboard-Error-Klassen.
 *
 * Zweck: einheitliches, serialisierbares Fehlerobjekt für kritische
 * Services (Sync, Import, Export, Backup, Azure, RBAC). Jede Instanz
 * trägt einen stabilen `code` (z. B. `IMPORT_PARSE_FAILED`), einen
 * menschenlesbaren `message` und einen strukturierten `context`, den der
 * Logger direkt ausgeben kann. `cause` bleibt erhalten, damit
 * Original-Stacks im DEV-Modus sichtbar sind.
 *
 * WICHTIG: Der `context` darf keine Secrets enthalten — dafür sorgt der
 * Logger zusätzlich via Redaction. `toJSON()` gibt eine flache Struktur
 * zurück, die sicher in Log-Buffern (auch IndexedDB) landen kann.
 */

export interface DashboardErrorInit {
  cause?: unknown;
  context?: Record<string, unknown>;
}

export class DashboardError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public override readonly cause?: unknown;

  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(message);
    this.name = "DashboardError";
    this.code = code;
    this.context = init?.context;
    this.cause = init?.cause;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause:
        this.cause instanceof Error
          ? { name: this.cause.name, message: this.cause.message }
          : this.cause,
    };
  }
}

export class SyncError extends DashboardError {
  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(code, message, init);
    this.name = "SyncError";
  }
}

export class ValidationError extends DashboardError {
  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(code, message, init);
    this.name = "ValidationError";
  }
}

export class ImportError extends DashboardError {
  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(code, message, init);
    this.name = "ImportError";
  }
}

export class ExportError extends DashboardError {
  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(code, message, init);
    this.name = "ExportError";
  }
}

export class AzureError extends DashboardError {
  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(code, message, init);
    this.name = "AzureError";
  }
}

export class BackupError extends DashboardError {
  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(code, message, init);
    this.name = "BackupError";
  }
}

export class RbacError extends DashboardError {
  constructor(code: string, message: string, init?: DashboardErrorInit) {
    super(code, message, init);
    this.name = "RbacError";
  }
}

export function isDashboardError(x: unknown): x is DashboardError {
  return x instanceof DashboardError;
}

/**
 * Hüllt einen beliebigen Fehler in einen DashboardError. Existierende
 * DashboardError bleiben unverändert, ihr Kontext wird nur ergänzt.
 */
export function wrapError(
  code: string,
  message: string,
  cause: unknown,
  context?: Record<string, unknown>,
): DashboardError {
  if (cause instanceof DashboardError) {
    return cause;
  }
  return new DashboardError(code, message, { cause, context });
}
