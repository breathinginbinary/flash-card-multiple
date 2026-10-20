import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginService } from '../../core/auth/login-service';

@Component({
  selector: 'app-logout',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logout.html',
})
export class Logout {
  constructor() {
    // FR-OUT-1/3: opening the page ends the session; safe to repeat when already logged out.
    inject(LoginService).logout();
  }
}
