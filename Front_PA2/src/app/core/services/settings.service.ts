import { Injectable, signal } from '@angular/core';
import { SchedulingSettings } from '../models';

const KEY = 'pa_scheduling_settings';

const DEFAULTS: SchedulingSettings = {
  bookingWindowWeeks: 4,
  blockWeekends: true,
};

/**
 * Requisito 3 — parte global.
 * El backend de Back_PA2 guarda la agenda por profesional (arrivalTime,
 * departureTime, attentionInterval, unavailableDays) pero NO tiene todavía
 * un endpoint para la ventana de agendamiento en semanas. Mientras se crea
 * (por ejemplo GET/PUT /api/settings), este servicio la mantiene en el
 * navegador con la misma interfaz, así el cambio solo toca este archivo.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<SchedulingSettings>(this.read());

  save(value: SchedulingSettings) {
    localStorage.setItem(KEY, JSON.stringify(value));
    this.settings.set(value);
  }

  /** Fecha máxima seleccionable, en formato YYYY-MM-DD. */
  maxBookingDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + this.settings().bookingWindowWeeks * 7);
    return d.toISOString().slice(0, 10);
  }

  minBookingDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private read(): SchedulingSettings {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }
}
