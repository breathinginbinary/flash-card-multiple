import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LoginService } from './login-service';

/** Keeps logged-in users off `/login` and `/register` (FR-LOG-6, FR-REG-8). */
export const guestGuard: CanActivateFn = () =>
  inject(LoginService).isLoggedIn() ? inject(Router).createUrlTree(['/study']) : true;
