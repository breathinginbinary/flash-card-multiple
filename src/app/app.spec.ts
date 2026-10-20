import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { LoginService } from './core/auth/login-service';
import { authTestProviders, seedSession } from './testing/auth-testing';
import { makeSeries, sampleDeck } from './testing/card-testing';

function navLinks(el: HTMLElement): (string | undefined)[] {
  return Array.from(el.querySelectorAll('nav li a')).map((a) => a.textContent?.trim());
}

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: authTestProviders(routes),
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('switches to the dark theme from the nav button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'nav button',
    ) as HTMLButtonElement;
    expect(button.querySelector('circle')).toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
    button.click();
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
    expect(button.querySelector('circle')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
  });

  it('FR-NAV-1: logged out, the nav shows Log in and Register only', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(navLinks(el)).toEqual(['Log in', 'Register']);
    expect(el.querySelector('.navbar-text')).toBeNull();
  });

  it('FR-NAV-1: logged in, the nav shows Study, Edit cards and Log out as links', async () => {
    seedSession();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(navLinks(el)).toEqual(['Study', 'Edit cards', 'Log out']);
    const items = Array.from(el.querySelectorAll('nav li')).map((li) => li.textContent?.trim());
    expect(items).toEqual(['Study', 'Edit cards', 'Log out']); // the name is not a list item
  });

  it('FR-NAV-1: logged in, "Logged in as <name>" sits beside the theme toggle', async () => {
    seedSession();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const label = el.querySelector('.navbar-text')!;
    expect(label.textContent?.trim()).toBe('Logged in as Ann');
    expect(label.parentElement).toBe(el.querySelector('nav button')!.parentElement);
  });

  it('FR-NAV-1: the nav updates when the session ends', async () => {
    seedSession();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(LoginService).logout();
    await fixture.whenStable();
    expect(navLinks(fixture.nativeElement as HTMLElement)).toEqual(['Log in', 'Register']);
  });
});

describe('routes', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [...authTestProviders(), provideRouter(routes, withComponentInputBinding())],
    });
  });

  /** Pages that load data get an answer: the sample deck for study, an empty list otherwise. */
  async function answerPendingRequests(harness: RouterTestingHarness) {
    TestBed.inject(HttpTestingController)
      .match((r) => r.url === '/api/card-series')
      .forEach((r) => r.flush(r.request.params.has('include') ? sampleDeck() : []));
    await harness.fixture.whenStable();
  }

  async function headingAt(url: string): Promise<string | null | undefined> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await answerPendingRequests(harness);
    return harness.routeNativeElement?.querySelector('h1')?.textContent;
  }

  describe('logged in', () => {
    beforeEach(() => seedSession());

    const cases: [url: string, heading: string][] = [
      ['/', 'Dog'],
      ['/study', 'Dog'],
      ['/cards', 'Edit cards'],
      ['/cards/new', 'New series'],
      ['/cards/abc/edit', 'Edit series'],
      ['/logout', 'You have successfully logged out'],
      ['/does-not-exist', 'Page not found'],
    ];
    for (const [url, heading] of cases) {
      it(`${url} renders "${heading}"`, async () => {
        expect(await headingAt(url)).toBe(heading);
      });
    }

    it('FR-LOG-6/FR-REG-8: /login and /register redirect to /study', async () => {
      const harness = await RouterTestingHarness.create();
      for (const url of ['/login', '/register']) {
        await harness.navigateByUrl(url);
        await answerPendingRequests(harness);
        expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Dog');
        expect(TestBed.inject(Router).url).toMatch(/^\/study(\?|$)/);
      }
    });

    it('FR-OUT-1: opening /logout ends the session', async () => {
      await headingAt('/logout');
      expect(TestBed.inject(LoginService).isLoggedIn()).toBe(false);
      expect(localStorage.getItem('fcm.session')).toBeNull();
    });

    it('binds :id to the editor input', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/cards/abc/edit');
      // The bound id drives the load request.
      const req = TestBed.inject(HttpTestingController).expectOne('/api/card-series/abc');
      req.flush(makeSeries('abc', 'Dog', [['f', 'b']]));
      await harness.fixture.whenStable();
      expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#topic')?.value).toBe(
        'Dog',
      );
    });
  });

  describe('logged out', () => {
    const cases: [url: string, heading: string][] = [
      ['/login', 'Log in'],
      ['/register', 'Register'],
      ['/logout', 'You have successfully logged out'],
      ['/does-not-exist', 'Page not found'],
    ];
    for (const [url, heading] of cases) {
      it(`${url} renders "${heading}"`, async () => {
        expect(await headingAt(url)).toBe(heading);
      });
    }

    it('protected routes redirect to /login with the returnUrl', async () => {
      const harness = await RouterTestingHarness.create();
      for (const [url, expected] of [
        ['/study', '/login?returnUrl=%2Fstudy'],
        ['/', '/login?returnUrl=%2Fstudy'],
        ['/cards', '/login?returnUrl=%2Fcards'],
        ['/cards/new', '/login?returnUrl=%2Fcards%2Fnew'],
        ['/cards/abc/edit', '/login?returnUrl=%2Fcards%2Fabc%2Fedit'],
      ]) {
        await harness.navigateByUrl(url);
        expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Log in');
        expect(TestBed.inject(Router).url).toBe(expected);
      }
    });
  });

  it('FR-OUT-2: logout page links to the login page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/logout');
    const link = harness.routeNativeElement?.querySelector('a');
    expect(link?.textContent).toBe('login page');
    expect(link?.getAttribute('href')).toBe('/login');
  });
});
