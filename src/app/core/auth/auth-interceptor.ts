import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { LoginService } from './login-service';

/** A 401 from these just means bad credentials or an already-dead session, not an expired one. */
const UNAUTHORIZED_OK = ['/auth/login', '/auth/logout'];

/** Adds the bearer token to API requests only, and ends the session on a 401 (SPEC §6.4). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (req.url !== base && !req.url.startsWith(`${base}/`)) return next(req);

  const loginService = inject(LoginService);
  const token = loginService.token();
  const authed = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        token &&
        !UNAUTHORIZED_OK.some((p) => req.url.endsWith(p))
      ) {
        loginService.handleUnauthorized();
      }
      return throwError(() => err);
    }),
  );
};
