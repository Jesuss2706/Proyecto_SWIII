import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  it('usa valores por defecto cuando no hay nada guardado en localStorage', () => {
    expect(service.settings()).toEqual({ bookingWindowWeeks: 4, blockWeekends: true });
  });

  it('guarda la configuración en localStorage y actualiza la señal', () => {
    service.save({ bookingWindowWeeks: 8, blockWeekends: false });

    expect(service.settings()).toEqual({ bookingWindowWeeks: 8, blockWeekends: false });
    expect(JSON.parse(localStorage.getItem('pa_scheduling_settings')!)).toEqual({
      bookingWindowWeeks: 8,
      blockWeekends: false,
    });
  });

  it('carga la configuración persistida al crear una nueva instancia', () => {
    localStorage.setItem('pa_scheduling_settings', JSON.stringify({ bookingWindowWeeks: 2, blockWeekends: false }));

    // Nueva instancia para simular un arranque fresco de la app leyendo localStorage.
    const fresh = new SettingsService();

    expect(fresh.settings()).toEqual({ bookingWindowWeeks: 2, blockWeekends: false });
  });

  it('vuelve a los valores por defecto si el contenido guardado es JSON inválido', () => {
    localStorage.setItem('pa_scheduling_settings', '{json-invalido');

    const fresh = new SettingsService();

    expect(fresh.settings()).toEqual({ bookingWindowWeeks: 4, blockWeekends: true });
  });

  it('minBookingDate retorna la fecha de hoy en formato YYYY-MM-DD', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(service.minBookingDate()).toBe(today);
  });

  it('maxBookingDate suma bookingWindowWeeks * 7 días a la fecha actual', () => {
    service.save({ bookingWindowWeeks: 1, blockWeekends: true });

    const expected = new Date();
    expected.setDate(expected.getDate() + 7);
    expect(service.maxBookingDate()).toBe(expected.toISOString().slice(0, 10));
  });
});
