export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "ALLOCATION_EXCEEDS_BALANCE"
  | "INVALID_TRANSFER"
  | "RATE_LIMITED"
  | "INVESTMENT_NOT_ACTIVE"
  | "PRINCIPAL_EXCEEDS_AVAILABLE"
  | "INSUFFICIENT_BALANCE"
  | "RESERVATION_CONSENT_REQUIRED"
  | "LOAN_EXCEEDS_UNALLOCATED_BALANCE"
  | "LOAN_ALREADY_CLOSED"
  | "REPAYMENT_EXCEEDS_OUTSTANDING";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ALLOCATION_EXCEEDS_BALANCE: 409,
  INVALID_TRANSFER: 400,
  RATE_LIMITED: 429,
  INVESTMENT_NOT_ACTIVE: 409,
  PRINCIPAL_EXCEEDS_AVAILABLE: 409,
  INSUFFICIENT_BALANCE: 409,
  RESERVATION_CONSENT_REQUIRED: 409,
  LOAN_EXCEEDS_UNALLOCATED_BALANCE: 409,
  LOAN_ALREADY_CLOSED: 409,
  REPAYMENT_EXCEEDS_OUTSTANDING: 409,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export function toErrorResponse(error: unknown): { status: number; body: { error: { code: string; message: string; details?: unknown } } } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, details: error.details } },
    };
  }

  return {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
  };
}
