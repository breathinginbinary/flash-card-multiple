import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login-service';

/** Sends logged-out users to `/login`, remembering where they were going. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(LoginService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
