import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { API_BASE_URL } from '../core/api/api-config';
import { Session } from '../core/auth/auth.models';
import { authInterceptor } from '../core/auth/auth-interceptor';

export const TEST_API = '/api';

/** HTTP (with the auth interceptor), router and API base URL for specs. */
export function authTestProviders(routes: Routes = []): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API },
  ];
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    accessToken: 'token-123',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { id: 'u1', email: 'ann@example.com', displayName: 'Ann' },
    ...overrides,
  };
}

/** Puts a session where `TokenStorage` will find it; call before `LoginService` is first injected. */
export function seedSession(session: Session = makeSession()): Session {
  localStorage.setItem('fcm.session', JSON.stringify(session));
  return session;
}
