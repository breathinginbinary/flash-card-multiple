import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-form-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="invalid-feedback d-block" aria-live="polite"></div>',
})
export class FormError {}
