import { Routes } from '@angular/router';

import { authGuard, guestGuard } from '@core/auth/auth.guard';
import { NAV_ITEMS } from '@layout/nav-items';

const comingSoon = () =>
  import('@features/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent);

/** Módulos del menú que ya tienen pantalla propia. Al construir uno, agregarlo aquí y a `children`. */
const READY_MODULES = new Set(['dashboard']);

/** El resto de los módulos del menú muestran la pantalla "en construcción". */
const pendingModules: Routes = NAV_ITEMS.filter((item) => !READY_MODULES.has(item.path)).map(
  (item) => ({
    path: item.path,
    title: `${item.label} | GastroBI`,
    loadComponent: comingSoon,
    data: { heading: item.label },
  }),
);

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | GastroBI',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard | GastroBI',
        loadComponent: () =>
          import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      ...pendingModules,
    ],
  },
  { path: '**', redirectTo: '' },
];
