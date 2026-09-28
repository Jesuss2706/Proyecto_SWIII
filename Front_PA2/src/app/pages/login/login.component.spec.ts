import { TestBed } from '@angular/core/testing';

import {
  provideRouter,
  Router,
  ActivatedRoute,
  convertToParamMap
} from '@angular/router';

import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';

import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {

  let authServiceMock: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  function setup(queryParams: Record<string, string> = {}) {

    authServiceMock = {
      login: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [LoginComponent],

      providers: [
        provideRouter([]),

        {
          provide: AuthService,
          useValue: authServiceMock
        },

        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(queryParams)
            }
          }
        }
      ]
    });

    router = TestBed.inject(Router);

    const fixture = TestBed.createComponent(LoginComponent);

    fixture.detectChanges();

    return fixture;
  }

  it('marca el formulario como inválido si los campos están vacíos', () => {

    const fixture = setup();

    const component = fixture.componentInstance as any;

    expect(component.form.valid).toBe(false);
  });

  it('no llama a AuthService.login si el formulario es inválido', () => {

    const fixture = setup();

    const component = fixture.componentInstance as any;

    component.submit();

    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('rechaza una cédula con letras o con menos de 6 dígitos', () => {

    const fixture = setup();

    const component = fixture.componentInstance as any;

    component.form.controls.cedUser.setValue('abc');

    expect(component.form.controls.cedUser.invalid).toBe(true);

    component.form.controls.cedUser.setValue('123');

    expect(component.form.controls.cedUser.invalid).toBe(true);

    component.form.controls.cedUser.setValue('123456');

    expect(component.form.controls.cedUser.invalid).toBe(false);
  });

  it('llama a AuthService.login con la cédula convertida a número y navega al éxito', () => {

    const fixture = setup();

    const component = fixture.componentInstance as any;

    // Configuramos el mock DESPUÉS de ejecutar setup()
    authServiceMock.login.mockReturnValue(
      of({ token: 'jwt' })
    );

    const navigateSpy = vi
      .spyOn(router, 'navigateByUrl')
      .mockResolvedValue(true);

    component.form.controls.cedUser.setValue('123456');

    component.form.controls.password.setValue('secreto');

    component.submit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      cedUser: 123456,
      password: 'secreto'
    });

    expect(navigateSpy).toHaveBeenCalledWith('/');

    expect(component.busy()).toBe(false);
  });

  it('navega a la URL de retorno (volverA) tras un login exitoso', () => {

    const fixture = setup({
      volverA: '/agendar'
    });

    const component = fixture.componentInstance as any;

    // Configuramos el mock DESPUÉS de setup()
    authServiceMock.login.mockReturnValue(
      of({ token: 'jwt' })
    );

    const navigateSpy = vi
      .spyOn(router, 'navigateByUrl')
      .mockResolvedValue(true);

    component.form.controls.cedUser.setValue('123456');

    component.form.controls.password.setValue('secreto');

    component.submit();

    expect(navigateSpy).toHaveBeenCalledWith('/agendar');
  });

  it('muestra un mensaje de error cuando el login falla', () => {

    const fixture = setup();

    const component = fixture.componentInstance as any;

    // Configuramos el error DESPUÉS de setup()
    authServiceMock.login.mockReturnValue(
      throwError(() => ({
        error: {
          error: 'Cédula o contraseña incorrectas.'
        }
      }))
    );

    component.form.controls.cedUser.setValue('123456');

    component.form.controls.password.setValue('mala');

    component.submit();

    expect(component.busy()).toBe(false);

    expect(component.error()).toBe(
      'Cédula o contraseña incorrectas.'
    );
  });

  it('usa un mensaje de error genérico si el backend no envía detalle', () => {

    const fixture = setup();

    const component = fixture.componentInstance as any;

    // Configuramos el error DESPUÉS de setup()
    authServiceMock.login.mockReturnValue(
      throwError(() => ({}))
    );

    component.form.controls.cedUser.setValue('123456');

    component.form.controls.password.setValue('mala');

    component.submit();

    expect(component.error()).toBe(
      'Cédula o contraseña incorrectas.'
    );
  });

  it('marca la alerta de sesión expirada cuando el query param "expirado" está presente', () => {

    const fixture = setup({
      expirado: '1'
    });

    const component = fixture.componentInstance as any;

    expect(component.expired()).toBe(true);
  });

});

