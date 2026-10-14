import { TestBed } from '@angular/core/testing';
import { Login } from './login';

describe('Login', () => {
  async function render() {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
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

  it('disables submit until the form is valid', async () => {
    const { fixture, el } = await render();
    const button = el.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(button.disabled).toBe(true);

    const set = (sel: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(sel)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('#login-email', 'a@b.com');
    set('#login-password', 'secret123');
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
  });
});
