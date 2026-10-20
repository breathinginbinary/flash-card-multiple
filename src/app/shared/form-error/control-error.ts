import { AbstractControl } from '@angular/forms';

/**
 * The first message for a control's errors, shown once the user has touched or edited it.
 * A `server` error (set from an API response) wins over client-side ones.
 */
export function controlError(control: AbstractControl | null, label: string): string | null {
  if (!control?.errors || !(control.touched || control.dirty)) return null;
  const e = control.errors;
  if (typeof e['server'] === 'string') return e['server'];
  if (e['required']) return `${label} is required.`;
  if (e['email']) return 'Enter a valid email address.';
  if (e['minlength'])
    return `${label} must be at least ${e['minlength'].requiredLength} characters.`;
  if (e['maxlength'])
    return `${label} must be at most ${e['maxlength'].requiredLength} characters.`;
  if (e['pattern']) return `${label} needs at least one letter and one digit.`;
  return null;
}
