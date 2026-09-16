import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

/** Exige sesión iniciada. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/ingresar'], { queryParams: { volverA: state.url } });
};

/** Exige sesión iniciada con uno de los roles indicados. */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/ingresar'], { queryParams: { volverA: state.url } });
    }
    return auth.hasRole(...roles) ? true : router.createUrlTree(['/']);
  };
}
