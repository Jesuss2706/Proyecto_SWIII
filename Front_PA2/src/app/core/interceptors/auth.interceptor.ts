import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isPublic = req.url.includes('/auth/login') || req.url.includes('/auth/register');
  const token = auth.token;

  const request =
    !isPublic && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isPublic) {
        auth.logout();
        router.navigate(['/ingresar'], { queryParams: { expirado: '1' } });
      }
      return throwError(() => err);
    }),
  );
};
