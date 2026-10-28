import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { LoginResponse, User } from '../models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    codUser: 1,
    cedUser: 123456,
    nameUser: 'Ana',
    lastNameUser: 'Ruiz',
    statusUser: 'Active',
    roleUser: 'Patient',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('no hay usuario en sesión al arrancar sin datos en localStorage', () => {
    expect(service.user()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.role()).toBeNull();
  });

  it('login hace POST a /auth/login y guarda el token y el usuario', () => {
    const response: LoginResponse = { token: 'jwt-token', user: mockUser };

    service.login({ cedUser: 123456, password: 'secreto' }).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(response);

    expect(service.token).toBe('jwt-token');
    expect(service.user()).toEqual(mockUser);
    expect(service.isLoggedIn()).toBe(true);
    expect(service.role()).toBe('Patient');
  });

  it('login establece un mensaje de bienvenida con el nombre completo', () => {
    const response: LoginResponse = { token: 'jwt-token', user: mockUser };

    service.login({ cedUser: 123456, password: 'secreto' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(response);

    expect(service.welcomeMessage()).toBe('Bienvenido, Ana Ruiz');
  });

  it('logout limpia el token, el usuario y localStorage', () => {
    service.login({ cedUser: 123456, password: 'secreto' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 'jwt-token', user: mockUser });

    service.logout();

    expect(service.token).toBeNull();
    expect(service.user()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('pa_token')).toBeNull();
  });

  it('hasRole retorna true solo si el rol actual está entre los indicados', () => {
    service.login({ cedUser: 123456, password: 'secreto' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 'jwt-token', user: mockUser });

    expect(service.hasRole('Patient', 'Admin')).toBe(true);
    expect(service.hasRole('Admin', 'Scheduler')).toBe(false);
  });

  it('hasRole retorna false si no hay sesión iniciada', () => {
    expect(service.hasRole('Patient')).toBe(false);
  });

  it('register hace POST a /auth/register sin tocar la sesión actual', () => {
    service.register({
      cedUser: 999,
      passUser: '1234',
      nameUser: 'Luis',
      lastNameUser: 'Gómez',
      roleUser: 'Patient',
      securityQuestion: '¿Mascota?',
      securityAnswer: 'Firulais',
    }).subscribe((res) => {
      expect(res).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush(mockUser);

    expect(service.isLoggedIn()).toBe(false);
  });

  it('findByCedula hace GET a /auth/users/:cedula', () => {
    service.findByCedula(123456).subscribe((res) => expect(res).toEqual(mockUser));

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/users/123456`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('findByRole hace GET a /auth/users con el rol como query param', () => {
    service.findByRole('Admin').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/auth/users` && r.params.get('role') === 'Admin'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockUser]);
  });
});
