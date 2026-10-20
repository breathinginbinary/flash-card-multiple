import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authTestProviders, makeSession, TEST_API } from '../../testing/auth-testing';
import { Login, safeReturnUrl } from './login';

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: authTestProviders() });
  });

  async function render(inputs: Record<string, string> = {}) {
    const fixture = TestBed.createComponent(Login);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const set = (sel: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(sel)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };
    return { fixture, el, set, submit };
  }

  async function fillValid(r: Awaited<ReturnType<typeof render>>) {
    r.set('#login-email', 'ann@example.com');
    r.set('#login-password', 'secret123');
    await r.fixture.whenStable();
  }

  it('FR-LOG-1: has labelled email and password fields with placeholders', async () => {
    const { el } = await render();
    const email = el.querySelector<HTMLInputElement>('#login-email')!;
    const password = el.querySelector<HTMLInputElement>('#login-password')!;
    expect(el.querySelector('label[for=login-email]')?.textContent).toBe('Login email');
    expect(el.querySelector('label[for=login-password]')?.textContent).toBe('Password');
    expect(email.placeholder).toBe('Enter Email');
    expect(password.placeholder).toBe('Enter Password');
    expect(password.type).toBe('password');
  });

  it('FR-LOG-1: the show/hide toggle reveals the password', async () => {
    const { fixture, el } = await render();
    const toggle = el.querySelector<HTMLButtonElement>('.input-group button')!;
    const password = el.querySelector<HTMLInputElement>('#login-password')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    toggle.click();
    await fixture.whenStable();
    expect(password.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    await fixture.whenStable();
    expect(password.type).toBe('password');
  });

  it('disables submit until the form is valid', async () => {
    const r = await render();
    const button = r.el.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(button.disabled).toBe(true);
    await fillValid(r);
    expect(button.disabled).toBe(false);
  });

  it('FR-LOG-5: links to the register page', async () => {
    const { el } = await render();
    expect(el.querySelector('a[href="/register"]')).not.toBeNull();
  });

  it('FR-LOG-2: logs in and goes to /study by default', async () => {
    const r = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fillValid(r);

    await r.submit();
    const req = TestBed.inject(HttpTestingController).expectOne(`${TEST_API}/auth/login`);
    expect(req.request.body).toEqual({ email: 'ann@example.com', password: 'secret123' });
    req.flush(makeSession());

    expect(navigate).toHaveBeenCalledWith('/study');
  });

  it('FR-LOG-2: follows a safe returnUrl', async () => {
    const r = await render({ returnUrl: '/cards/new' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fillValid(r);

    await r.submit();
    TestBed.inject(HttpTestingController).expectOne(`${TEST_API}/auth/login`).flush(makeSession());

    expect(navigate).toHaveBeenCalledWith('/cards/new');
  });

  it('FR-LOG-2: safeReturnUrl rejects anything that could leave the app', () => {
    expect(safeReturnUrl('/cards')).toBe('/cards');
    expect(safeReturnUrl('/cards?x=1')).toBe('/cards?x=1');
    for (const bad of [undefined, '', 'cards', '//evil.com', '/\\evil.com', 'https://evil.com']) {
      expect(safeReturnUrl(bad)).toBe('/study');
    }
  });

  it('FR-LOG-3: a 401 shows the generic message and re-enables the form', async () => {
    const r = await render();
    await fillValid(r);
    await r.submit();

    TestBed.inject(HttpTestingController)
      .expectOne(`${TEST_API}/auth/login`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await r.fixture.whenStable();

    expect(r.el.querySelector('.alert-danger')?.textContent).toContain(
      'Email or password is incorrect.',
    );
    expect(r.el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('shows a rate-limit message on 429', async () => {
    const r = await render();
    await fillValid(r);
    await r.submit();

    TestBed.inject(HttpTestingController)
      .expectOne(`${TEST_API}/auth/login`)
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    await r.fixture.whenStable();

    expect(r.el.querySelector('.alert-danger')?.textContent).toContain('Too many attempts');
  });

  it('is busy and ignores a second submit while the request is in flight', async () => {
    const r = await render();
    await fillValid(r);

    await r.submit();
    await r.submit();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${TEST_API}/auth/login`); // exactly one
    expect(r.el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    expect(r.el.querySelector('.spinner-border')).not.toBeNull();
  });

  it('FR-LOG-4: shows the registered and expired banners', async () => {
    const registered = await render({ registered: '1' });
    expect(registered.el.querySelector('.alert-success')?.textContent).toContain('Account created');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: authTestProviders() });
    const expired = await render({ expired: '1' });
    expect(expired.el.querySelector('.alert-info')?.textContent).toContain('session expired');
  });

  it('shows no banners by default', async () => {
    const { el } = await render();
    expect(el.querySelector('.alert')).toBeNull();
  });
});
