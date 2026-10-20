import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authTestProviders, TEST_API } from '../../testing/auth-testing';
import { Register } from './register';

describe('Register', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: authTestProviders() });
  });

  async function render() {
    const fixture = TestBed.createComponent(Register);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const set = (sel: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(sel)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const fillValid = async () => {
      set('#register-email', 'ann@example.com');
      set('#register-display-name', 'Ann');
      set('#register-password', 'secret123');
      set('#register-confirm-password', 'secret123');
      await fixture.whenStable();
    };
    const submit = async () => {
      el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };
    return { fixture, el, set, fillValid, submit };
  }

  const http = () => TestBed.inject(HttpTestingController);

  it('FR-REG-1: has labelled email, display name and password fields', async () => {
    const { el } = await render();
    expect(el.querySelector('label[for=register-email]')?.textContent).toBe('Registration email');
    expect(el.querySelector('label[for=register-display-name]')?.textContent).toBe('Display name');
    expect(el.querySelector('label[for=register-password]')?.textContent).toBe('Create password');
    expect(el.querySelector('label[for=register-confirm-password]')?.textContent).toBe(
      'Confirm password',
    );
    expect(el.querySelector<HTMLInputElement>('#register-password')!.type).toBe('password');
    expect(el.querySelector<HTMLInputElement>('#register-confirm-password')!.type).toBe('password');
  });

  it('FR-REG-2/3: enables submit only when valid and passwords match', async () => {
    const { fixture, el, set } = await render();
    const button = el.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(button.disabled).toBe(true);

    set('#register-email', 'a@b.com');
    set('#register-display-name', 'Ann');
    set('#register-password', 'secret123');
    set('#register-confirm-password', 'secret124');
    await fixture.whenStable();
    expect(button.disabled).toBe(true);
    expect(el.querySelector('#register-confirm-password-error')?.textContent).toContain(
      'Passwords do not match',
    );

    set('#register-confirm-password', 'secret123');
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
  });

  it('FR-REG-2: requires a display name', async () => {
    const { fixture, el, set } = await render();
    set('#register-email', 'a@b.com');
    set('#register-password', 'secret123');
    set('#register-confirm-password', 'secret123');
    await fixture.whenStable();
    expect(el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
  });

  it('FR-REG-2: rejects a password without a digit and explains why', async () => {
    const { fixture, el, set } = await render();
    set('#register-email', 'a@b.com');
    set('#register-display-name', 'Ann');
    set('#register-password', 'secretpass');
    set('#register-confirm-password', 'secretpass');
    await fixture.whenStable();
    expect(el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    expect(el.querySelector('#register-password-error')?.textContent).toContain('one digit');
  });

  it('FR-REG-4: on 201 goes to /login?registered=1', async () => {
    const r = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await r.fillValid();

    await r.submit();
    const req = http().expectOne(`${TEST_API}/auth/register`);
    expect(req.request.body).toEqual({
      email: 'ann@example.com',
      displayName: 'Ann',
      password: 'secret123', // confirmPassword is not sent
    });
    req.flush(
      { id: 'u1', email: 'ann@example.com', displayName: 'Ann' },
      { status: 201, statusText: 'Created' },
    );

    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: 1 } });
  });

  it('FR-REG-3: is busy and sends only one request while in flight', async () => {
    const r = await render();
    await r.fillValid();

    await r.submit();
    await r.submit();

    http().expectOne(`${TEST_API}/auth/register`);
    expect(r.el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    expect(r.el.querySelector('.spinner-border')).not.toBeNull();
  });

  it('FR-REG-5: a 409 shows the error on the email field', async () => {
    const r = await render();
    await r.fillValid();
    await r.submit();

    http()
      .expectOne(`${TEST_API}/auth/register`)
      .flush(
        { status: 409, errors: { email: ['That email is already registered.'] } },
        { status: 409, statusText: 'Conflict' },
      );
    await r.fixture.whenStable();

    expect(r.el.querySelector('#register-email-error')?.textContent).toContain(
      'already registered',
    );
    expect(r.el.querySelector('#register-email')?.classList).toContain('is-invalid');
    expect(r.el.querySelector('.alert-danger')).toBeNull();
    expect(r.el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true); // email now invalid until edited
  });

  it('FR-REG-6: a 400 maps errors to controls and shows the rest in an alert', async () => {
    const r = await render();
    await r.fillValid();
    await r.submit();

    http()
      .expectOne(`${TEST_API}/auth/register`)
      .flush(
        {
          status: 400,
          errors: {
            displayName: ['Display name must be 1-50 characters.'],
            somethingElse: ['Unmapped problem.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await r.fixture.whenStable();

    expect(r.el.querySelector('#register-display-name-error')?.textContent).toContain('1-50');
    expect(r.el.querySelector('.alert-danger')?.textContent).toContain('Unmapped problem.');
  });

  it('a server field error clears when the user edits the field', async () => {
    const r = await render();
    await r.fillValid();
    await r.submit();
    http()
      .expectOne(`${TEST_API}/auth/register`)
      .flush(
        { status: 409, errors: { email: ['That email is already registered.'] } },
        { status: 409, statusText: 'Conflict' },
      );
    await r.fixture.whenStable();

    r.set('#register-email', 'other@example.com');
    await r.fixture.whenStable();

    expect(r.el.querySelector('#register-email-error')?.textContent?.trim()).toBe('');
    expect(r.el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('shows a generic alert for unexpected errors and re-enables the form', async () => {
    const r = await render();
    await r.fillValid();
    await r.submit();

    http()
      .expectOne(`${TEST_API}/auth/register`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await r.fixture.whenStable();

    expect(r.el.querySelector('.alert-danger')?.textContent).toContain('Something went wrong');
    expect(r.el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('FR-REG-7: links to the login page', async () => {
    const { el } = await render();
    expect(el.querySelector('a[href="/login"]')?.textContent).toBe('Log in');
  });
});
