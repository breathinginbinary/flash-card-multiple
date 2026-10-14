import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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

  // TODO (milestone 2): show auth-dependent links from LoginService.isLoggedIn (FR-NAV-1).
  protected readonly links = [
    { path: '/study', label: 'Study', exact: false },
    { path: '/cards', label: 'Edit cards', exact: true },
    { path: '/login', label: 'Log in', exact: false },
    { path: '/register', label: 'Register', exact: false },
    { path: '/logout', label: 'Log out', exact: false },
  ];
}
