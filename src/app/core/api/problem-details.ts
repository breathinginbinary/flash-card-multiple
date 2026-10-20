import { HttpErrorResponse } from '@angular/common/http';

/** RFC 9457 problem details as returned by the ASP.NET Core API. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

/** Returns the problem-details body of an HTTP error, or `null` if the body is not one. */
export function problemOf(err: unknown): ProblemDetails | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const body: unknown = err.error;
  return body !== null && typeof body === 'object' ? (body as ProblemDetails) : null;
}

/** The `errors` map of a problem-details body, or an empty object. */
export function fieldErrorsOf(err: unknown): Record<string, string[]> {
  return problemOf(err)?.errors ?? {};
}
