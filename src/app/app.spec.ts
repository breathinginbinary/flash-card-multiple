import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { API_BASE_URL } from './core/api/api-config';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes, withComponentInputBinding())],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('switches to the dark theme from the nav button', async () => {
    localStorage.clear();
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

  it('FR-NAV-1: renders the nav links', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav li a'),
    ).map((a) => a.textContent?.trim());
    expect(links).toEqual(['Study', 'Edit cards', 'Log in', 'Register', 'Log out']);
  });
});

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
  });

  const cases: [url: string, heading: string][] = [
    ['/', 'Dog'],
    ['/study', 'Dog'],
    ['/login', 'Log in'],
    ['/register', 'Register'],
    ['/logout', 'You have successfully logged out'],
    ['/cards', 'Edit cards'],
    ['/cards/new', 'New series'],
    ['/cards/abc/edit', 'Edit series'],
    ['/does-not-exist', 'Page not found'],
  ];

  for (const [url, heading] of cases) {
    it(`${url} renders "${heading}"`, async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(heading);
    });
  }

  it('FR-OUT-2: logout page links to the login page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/logout');
    const link = harness.routeNativeElement?.querySelector('a');
    expect(link?.textContent).toBe('login page');
    expect(link?.getAttribute('href')).toBe('/login');
  });

  it('binds :id to the editor input', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/cards/abc/edit');
    expect(harness.routeNativeElement?.textContent).toContain('abc');
  });
});
