import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
  });

  it('no hay usuario en sesión al arrancar', () => {
    expect(service.user()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.role()).toBeNull();
  });

  it('hasRole refleja el rol del usuario en sesión', () => {
    service.user.set({
      codUser: 1, cedUser: 123456, nameUser: 'Ana', lastNameUser: 'Ruiz',
      statusUser: 'Active', roleUser: 'Admin',
    });
    expect(service.fullName()).toBe('Ana Ruiz');
    expect(service.hasRole('Admin')).toBe(true);
    expect(service.hasRole('Patient')).toBe(false);
  });

  it('freshToken devuelve null si no hay sesión de Keycloak', async () => {
    expect(await service.freshToken()).toBeNull();
  });
});
