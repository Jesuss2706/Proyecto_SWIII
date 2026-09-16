import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'Piedra Azul — Terapia neural, quiropraxia y fisioterapia',
  },
  {
    path: 'ingresar',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
    title: 'Iniciar sesión — Piedra Azul',
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.component').then((m) => m.RegistroComponent),
    title: 'Crear cuenta — Piedra Azul',
  },
  {
    // Requisito 2
    path: 'agendar',
    loadComponent: () => import('./pages/agendar/agendar.component').then((m) => m.AgendarComponent),
    title: 'Agendar cita — Piedra Azul',
  },
  {
    path: 'mis-citas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/mis-citas/mis-citas.component').then((m) => m.MisCitasComponent),
    title: 'Mis citas — Piedra Azul',
  },
  {
    // Requisito 1
    path: 'agenda',
    canActivate: [roleGuard('Scheduler', 'Admin', 'Professional')],
    loadComponent: () =>
      import('./pages/agenda-profesional/agenda-profesional.component').then(
        (m) => m.AgendaProfesionalComponent,
      ),
    title: 'Agenda del día — Piedra Azul',
  },
  {
    // Requisito 3
    path: 'configuracion',
    canActivate: [roleGuard('Admin')],
    loadComponent: () =>
      import('./pages/admin-config/admin-config.component').then((m) => m.AdminConfigComponent),
    title: 'Configuración — Piedra Azul',
  },
  { path: '**', redirectTo: '' },
];
