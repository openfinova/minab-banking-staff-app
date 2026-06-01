export interface ApiErrorPayload {
  status: number;
  title?: string;
  detail?: string;
  message?: string;
  errors?: Array<{ field?: string; message?: string; defaultMessage?: string }>;
  fieldErrors?: Record<string, string>;
  traceId?: string;
  errorReferenceId?: string;
}

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload;
  fieldErrors: Record<string, string>;
  referenceId?: string;

  constructor(message: string, status: number, payload: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.referenceId = payload.errorReferenceId ?? payload.traceId;
    this.fieldErrors = normalizeFieldErrors(payload);
  }

  get isValidation(): boolean {
    return this.status === 400;
  }
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isServer(): boolean {
    return this.status >= 500;
  }
}

function normalizeFieldErrors(payload: ApiErrorPayload): Record<string, string> {
  if (payload.fieldErrors) return payload.fieldErrors;
  if (Array.isArray(payload.errors)) {
    const map: Record<string, string> = {};
    for (const entry of payload.errors) {
      const field = entry.field;
      const message = entry.message ?? entry.defaultMessage;
      if (field && message) map[field] = message;
    }
    return map;
  }
  return {};
}

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.payload.detail ?? error.payload.title ?? error.message ?? "Request failed";
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}
