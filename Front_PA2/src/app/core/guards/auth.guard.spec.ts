import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { authGuard, roleGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  function run(url = '/agendar') {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url } as any)
    );
  }

  it('permite el acceso si hay sesión iniciada', () => {
    authService.user.set({
      codUser: 1,
      cedUser: 1,
      nameUser: 'Ana',
      lastNameUser: 'Ruiz',
      statusUser: 'Active',
      roleUser: 'Patient',
    });

    expect(run()).toBe(true);
  });

  it('redirige a /ingresar si no hay sesión, conservando la URL de retorno', () => {
    const result = run('/agendar') as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/ingresar?volverA=%2Fagendar');
  });
});

describe('roleGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  function run(roles: any[], url = '/agenda') {
    const guard = roleGuard(...roles);
    return TestBed.runInInjectionContext(() => guard({} as any, { url } as any));
  }

  it('redirige a /ingresar si no hay sesión iniciada', () => {
    const result = run(['Admin']) as UrlTree;
    expect(router.serializeUrl(result)).toContain('/ingresar');
  });

  it('permite el acceso si el rol del usuario está entre los permitidos', () => {
    authService.user.set({
      codUser: 1,
      cedUser: 1,
      nameUser: 'Ana',
      lastNameUser: 'Ruiz',
      statusUser: 'Active',
      roleUser: 'Admin',
    });

    expect(run(['Admin', 'Scheduler'])).toBe(true);
  });

  it('redirige a la raíz si el usuario tiene sesión pero no el rol requerido', () => {
    authService.user.set({
      codUser: 1,
      cedUser: 1,
      nameUser: 'Ana',
      lastNameUser: 'Ruiz',
      statusUser: 'Active',
      roleUser: 'Patient',
    });

    const result = run(['Admin']) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/');
  });
});
