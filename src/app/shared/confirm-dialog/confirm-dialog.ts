import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="border-0 rounded-3 shadow p-0">
      <div class="modal-content">
        <div class="modal-body">Confirm dialog placeholder.</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary">Cancel</button>
          <button type="button" class="btn btn-danger">Confirm</button>
        </div>
      </div>
    </dialog>
  `,
})
export class ConfirmDialog {}
