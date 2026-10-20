import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoginService } from '../../core/auth/login-service';
import { controlError } from '../../shared/form-error/control-error';

/** FR-LOG-2: only follow `returnUrl` when it is an in-app path (starts with `/`, not `//` or `/\`). */
export function safeReturnUrl(url: string | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')
    ? url
    : '/study';
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
})
export class Login {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  /** Bound from `?returnUrl=`, `?registered=` and `?expired=` (FR-LOG-2, FR-LOG-4). */
  readonly returnUrl = input<string>();
  readonly registered = input<string>();
  readonly expired = input<string>();

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly busy = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected emailError(): string | null {
    return controlError(this.form.controls.email, 'Email');
  }

  protected submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    this.loginService.login(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
      error: (err: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(loginErrorMessage(err));
      },
    });
  }
}

function loginErrorMessage(err: unknown): string {
  const status = err instanceof HttpErrorResponse ? err.status : -1;
  switch (status) {
    case 401:
      // FR-LOG-3: never say which of the two was wrong.
      return 'Email or password is incorrect.';
    case 429:
      return 'Too many attempts. Please wait a minute and try again.';
    case 0:
      return 'Cannot reach the server. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
