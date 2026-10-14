import { TestBed } from '@angular/core/testing';
import { Register } from './register';

describe('Register', () => {
  async function render() {
    const fixture = TestBed.createComponent(Register);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const set = (sel: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(sel)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    return { fixture, el, set };
  }

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

  it('FR-REG-2: rejects a password without a digit', async () => {
    const { fixture, el, set } = await render();
    set('#register-email', 'a@b.com');
    set('#register-display-name', 'Ann');
    set('#register-password', 'secretpass');
    set('#register-confirm-password', 'secretpass');
    await fixture.whenStable();
    expect(el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
  });
});
