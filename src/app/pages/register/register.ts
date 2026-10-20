import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fieldErrorsOf } from '../../core/api/problem-details';
import { LoginService } from '../../core/auth/login-service';
import { controlError } from '../../shared/form-error/control-error';

/** FR-REG-2: confirm password must match password. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, confirmPassword } = group.value as Record<string, string>;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

const LABELS = {
  email: 'Email',
  displayName: 'Display name',
  password: 'Password',
  confirmPassword: 'Confirm password',
} as const;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.html',
})
export class Register {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', [Validators.required, Validators.maxLength(50)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).*$/),
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected readonly busy = signal(false);
  /** FR-REG-6: server errors that match no form control. */
  protected readonly formErrors = signal<string[]>([]);

  protected error(name: keyof typeof LABELS): string | null {
    return controlError(this.form.controls[name], LABELS[name]);
  }

  /** Shown on the confirm field once the user has typed in it. */
  protected mismatch(): boolean {
    const confirm = this.form.controls.confirmPassword;
    return this.form.hasError('passwordMismatch') && (confirm.touched || confirm.dirty);
  }

  protected submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.formErrors.set([]);
    const { email, displayName, password } = this.form.getRawValue();
    this.loginService.register({ email, displayName, password }).subscribe({
      // FR-REG-4: registering does not log the user in.
      next: () => void this.router.navigate(['/login'], { queryParams: { registered: 1 } }),
      error: (err: unknown) => {
        this.busy.set(false);
        this.showServerErrors(err);
      },
    });
  }

  private showServerErrors(err: unknown): void {
    const status = err instanceof HttpErrorResponse ? err.status : -1;
    if (status === 0) {
      this.formErrors.set(['Cannot reach the server. Please try again.']);
      return;
    }
    if (status === 429) {
      this.formErrors.set(['Too many attempts. Please wait a minute and try again.']);
      return;
    }

    // FR-REG-5/6: map each errors[field] to its control (the API uses the same camelCase names);
    // anything left over goes in the form-level alert.
    const unmapped: string[] = [];
    for (const [field, messages] of Object.entries(fieldErrorsOf(err))) {
      const control = (this.form.controls as Record<string, AbstractControl | undefined>)[field];
      if (control) {
        control.setErrors({ server: messages.join(' ') });
        control.markAsTouched();
      } else {
        unmapped.push(...messages);
      }
    }
    if (status !== 400 && status !== 409) unmapped.push('Something went wrong. Please try again.');
    this.formErrors.set(unmapped);
  }
}
