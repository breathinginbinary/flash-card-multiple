import { Routes } from '@angular/router';

// TODO (milestone 2/4): add authGuard, guestGuard and unsavedChangesGuard per SPEC §5.3.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'study' },

  {
    path: 'login',
    title: 'Log in',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Register',
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
    loadComponent: () => import('./pages/study/study').then((m) => m.Study),
  },

  {
    path: 'cards',
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
