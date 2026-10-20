import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authTestProviders, seedSession } from '../../testing/auth-testing';
import { authGuard } from './auth-guard';
import { guestGuard } from './guest-guard';

describe('guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = (url: string) => ({ url }) as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: authTestProviders() });
  });

  const run = (guard: typeof authGuard, url = '/cards') =>
    TestBed.runInInjectionContext(() => guard(route, state(url)));

  it('authGuard lets a logged-in user through', () => {
    seedSession();
    expect(run(authGuard)).toBe(true);
  });

  it('authGuard sends a logged-out user to /login with the returnUrl', () => {
    const result = run(authGuard, '/cards/new') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fcards%2Fnew');
  });

  it('FR-LOG-6/FR-REG-8: guestGuard lets a logged-out user through', () => {
    expect(run(guestGuard, '/login')).toBe(true);
  });

  it('FR-LOG-6/FR-REG-8: guestGuard sends a logged-in user to /study', () => {
    seedSession();
    const result = run(guestGuard, '/login') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/study');
  });
});
