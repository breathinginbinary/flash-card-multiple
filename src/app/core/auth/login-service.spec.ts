import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authTestProviders, makeSession, seedSession, TEST_API } from '../../testing/auth-testing';
import { LoginService } from './login-service';

describe('LoginService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: authTestProviders() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('starts logged out when nothing is stored', () => {
    const service = TestBed.inject(LoginService);
    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.token()).toBeNull();
  });

  it('register posts to /auth/register and returns the user', () => {
    const service = TestBed.inject(LoginService);
    let result: unknown;
    service
      .register({ email: 'a@b.com', displayName: 'Ann', password: 'secret123' })
      .subscribe((u) => (result = u));

    const req = http.expectOne(`${TEST_API}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'a@b.com',
      displayName: 'Ann',
      password: 'secret123',
    });
    req.flush({ id: 'u1', email: 'a@b.com', displayName: 'Ann' });
    expect(result).toEqual({ id: 'u1', email: 'a@b.com', displayName: 'Ann' });
    expect(TestBed.inject(LoginService).isLoggedIn()).toBe(false); // D2: no auto-login
  });

  it('login saves the session, sets the signals and stores it', () => {
    const service = TestBed.inject(LoginService);
    const session = makeSession();
    service.login({ email: 'ann@example.com', password: 'secret123' }).subscribe();

    http.expectOne(`${TEST_API}/auth/login`).flush(session);

    expect(service.isLoggedIn()).toBe(true);
    expect(service.currentUser()).toEqual(session.user);
    expect(service.token()).toBe('token-123');
    expect(JSON.parse(localStorage.getItem('fcm.session')!)).toEqual(session);
  });

  it('a failed login leaves the user logged out', () => {
    const service = TestBed.inject(LoginService);
    service.login({ email: 'a@b.com', password: 'wrong' }).subscribe({ error: () => {} });

    http
      .expectOne(`${TEST_API}/auth/login`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('fcm.session')).toBeNull();
  });

  it('restores a stored, unexpired session at startup', () => {
    const session = seedSession();
    const service = TestBed.inject(LoginService);
    expect(service.isLoggedIn()).toBe(true);
    expect(service.currentUser()).toEqual(session.user);
    expect(service.token()).toBe('token-123');
  });

  it('drops an expired stored session at startup', () => {
    seedSession(makeSession({ expiresAt: new Date(Date.now() - 1000).toISOString() }));
    const service = TestBed.inject(LoginService);
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('fcm.session')).toBeNull();
  });

  it('ignores corrupt stored data', () => {
    localStorage.setItem('fcm.session', '{"accessToken": 5}');
    expect(TestBed.inject(LoginService).isLoggedIn()).toBe(false);
    localStorage.setItem('fcm.session', 'not json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: authTestProviders() });
    expect(TestBed.inject(LoginService).isLoggedIn()).toBe(false);
  });

  it('token() returns null once the token has expired', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    seedSession(makeSession({ expiresAt: '2026-01-01T01:00:00Z' }));
    const service = TestBed.inject(LoginService);
    expect(service.token()).toBe('token-123');

    vi.setSystemTime(new Date('2026-01-01T01:00:01Z'));
    expect(service.token()).toBeNull();
  });

  it('logs out automatically at expiresAt and goes to the login page', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    seedSession(makeSession({ expiresAt: '2026-01-01T01:00:00Z' }));
    const service = TestBed.inject(LoginService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('fcm.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { expired: 1, returnUrl: expect.any(String) },
    });
  });

  it('logout clears the session and tells the API with the token', () => {
    seedSession();
    const service = TestBed.inject(LoginService);

    service.logout();

    const req = http.expectOne(`${TEST_API}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(service.isLoggedIn()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('fcm.session')).toBeNull();
  });

  it('FR-OUT-3: logout works when the API call fails or nobody is logged in', () => {
    seedSession();
    const service = TestBed.inject(LoginService);
    service.logout();
    http.expectOne(`${TEST_API}/auth/logout`).error(new ProgressEvent('error'));
    expect(service.isLoggedIn()).toBe(false);

    service.logout(); // already logged out: no request, no error
    http.expectNone(`${TEST_API}/auth/logout`);
  });

  it('handleUnauthorized clears the session and redirects with expired and returnUrl', () => {
    seedSession();
    const service = TestBed.inject(LoginService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/cards');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    service.handleUnauthorized();

    expect(service.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { expired: 1, returnUrl: '/cards' },
    });
  });

  it('handleUnauthorized does nothing when already logged out', () => {
    const service = TestBed.inject(LoginService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.handleUnauthorized();
    expect(navigate).not.toHaveBeenCalled();
  });
});
