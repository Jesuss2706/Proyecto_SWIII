import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, LOCALE_ID } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

registerLocaleData(localeEsCO);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Los enlaces del navbar usan fragmentos (#servicios) sobre la portada
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Restaura la sesión de Keycloak ANTES de que corran los guards.
    provideAppInitializer(() => inject(AuthService).init()),
    { provide: LOCALE_ID, useValue: 'es-CO' },
  ],
};
