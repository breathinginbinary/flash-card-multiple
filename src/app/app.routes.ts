import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { guestGuard } from './core/auth/guest-guard';

// TODO (milestone 4): add unsavedChangesGuard to cards/new and cards/:id/edit per SPEC §5.3.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'study' },

  {
    path: 'login',
    title: 'Log in',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'logout',
    title: 'Logged out',
    loadComponent: () => import('./pages/logout/logout').then((m) => m.Logout),
  },

  {
    path: 'study',
    title: 'Study',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/study/study').then((m) => m.Study),
  },

  {
    path: 'cards',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Edit cards',
        loadComponent: () => import('./pages/card-list/card-list').then((m) => m.CardList),
      },
      {
        path: 'new',
        title: 'New series',
        loadComponent: () => import('./pages/card-editor/card-editor').then((m) => m.CardEditor),
      },
      {
        path: ':id/edit',
        title: 'Edit series',
        loadComponent: () => import('./pages/card-editor/card-editor').then((m) => m.CardEditor),
      },
    ],
  },

  {
    path: '**',
    title: 'Not found',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];
