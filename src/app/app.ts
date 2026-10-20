import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoginService } from './core/auth/login-service';
import { ThemeService } from './core/theme/theme-service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly isDark = computed(() => this.theme.theme() === 'dark');

  private readonly loginService = inject(LoginService);
  protected readonly user = this.loginService.currentUser;

  /** FR-NAV-1: the links before the user's name differ by session; "Log out" always follows it. */
  protected readonly links = computed(() =>
    this.loginService.isLoggedIn()
      ? [
          { path: '/study', label: 'Study', exact: false },
          { path: '/cards', label: 'Edit cards', exact: true },
        ]
      : [
          { path: '/login', label: 'Log in', exact: false },
          { path: '/register', label: 'Register', exact: false },
        ],
  );
}
