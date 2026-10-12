export class CoreException extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly module: string;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: string; // e.g., 'ACC001', 'TXN_UNBALANCED'
    message: string; // Human-readable message
    httpStatus?: number; // Optional HTTP status for API layer (defaults to 400)
    layer?: string; // e.g 'LIBRARY', 'PORTAL'...
    module?: string; // e.g., 'ACCOUNT', 'TRANSACTION', 'LOAN'
    details?: Record<string, unknown>; // Extra metadata for debugging/auditing
  }) {
    super(params.message);
    this.name = 'CoreException';
    this.code = params.code;
    this.httpStatus = params.httpStatus ?? 400;
    this.module = params.module || 'CORE';
    this.details = params.details;
    this.cause = {
      layer: params.layer,
      module: params.module || 'CORE',
      details: params.details,
      httpStatus: params.httpStatus ?? 400,
    };

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
