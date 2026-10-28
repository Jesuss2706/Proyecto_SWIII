import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // El token solo se envía a NUESTRO backend, nunca a Keycloak ni a otros dominios.
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  return from(auth.freshToken()).pipe(
    switchMap((token) => {
      const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(request).pipe(
        catchError((err: HttpErrorResponse) => {
          // 401 con token = sesión vencida o inválida
          if (err.status === 401 && token) {
            auth.clearSession();
            router.navigate(['/ingresar'], { queryParams: { expirado: '1' } });
          }
          return throwError(() => err);
        }),
      );
    }),
  );
};
