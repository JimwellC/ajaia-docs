// Errors the API is allowed to show to users. Anything else becomes a generic 500.

export type ErrorCode =
  | "unauthenticated"
  | "not_found"
  | "forbidden"
  | "validation"
  | "conflict"
  | "too_large"
  | "unsupported_file";

const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  too_large: 413,
  unsupported_file: 415,
  validation: 400,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export const notFound = (what = "Document") => new AppError("not_found", `${what} not found.`);
