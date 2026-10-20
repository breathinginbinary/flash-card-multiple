import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authTestProviders, seedSession, TEST_API } from '../../testing/auth-testing';
import { LoginService } from './login-service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: authTestProviders() });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('adds the bearer token to API requests', () => {
    seedSession();
    http.get(`${TEST_API}/card-series`).subscribe();
    const req = controller.expectOne(`${TEST_API}/card-series`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush([]);
  });

  it('sends no header when logged out', () => {
    http.get(`${TEST_API}/card-series`).subscribe();
    const req = controller.expectOne(`${TEST_API}/card-series`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('never adds the header to third-party or look-alike URLs', () => {
    seedSession();
    http.get('https://example.com/api/x').subscribe();
    http.get('/apifoo/x').subscribe();
    for (const url of ['https://example.com/api/x', '/apifoo/x']) {
      const req = controller.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    }
  });

  it('a 401 on an authenticated request ends the session', () => {
    seedSession();
    const handle = vi
      .spyOn(TestBed.inject(LoginService), 'handleUnauthorized')
      .mockImplementation(() => {});
    let status = 0;
    http.get(`${TEST_API}/card-series`).subscribe({ error: (e) => (status = e.status) });

    controller
      .expectOne(`${TEST_API}/card-series`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(handle).toHaveBeenCalledOnce();
    expect(status).toBe(401); // re-thrown for the page
  });

  it('a 401 from /auth/login is left alone (just bad credentials)', () => {
    seedSession();
    const handle = vi
      .spyOn(TestBed.inject(LoginService), 'handleUnauthorized')
      .mockImplementation(() => {});
    http.post(`${TEST_API}/auth/login`, {}).subscribe({ error: () => {} });

    controller
      .expectOne(`${TEST_API}/auth/login`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(handle).not.toHaveBeenCalled();
  });

  it('a 401 on an anonymous request does not trigger handleUnauthorized', () => {
    const handle = vi
      .spyOn(TestBed.inject(LoginService), 'handleUnauthorized')
      .mockImplementation(() => {});
    http.get(`${TEST_API}/card-series`).subscribe({ error: () => {} });

    controller
      .expectOne(`${TEST_API}/card-series`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(handle).not.toHaveBeenCalled();
  });

  it('non-401 errors pass through untouched', () => {
    seedSession();
    const handle = vi
      .spyOn(TestBed.inject(LoginService), 'handleUnauthorized')
      .mockImplementation(() => {});
    let status = 0;
    http.get(`${TEST_API}/card-series`).subscribe({ error: (e) => (status = e.status) });

    controller
      .expectOne(`${TEST_API}/card-series`)
      .flush(null, { status: 500, statusText: 'Boom' });

    expect(handle).not.toHaveBeenCalled();
    expect(status).toBe(500);
  });
});
