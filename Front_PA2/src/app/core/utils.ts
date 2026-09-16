import { Appointment, Speciality, SPECIALITY_LABELS } from './models';

/** El backend responde 204 sin cuerpo; Angular lo entrega como null. */
export function asList<T>(value: T[] | null): T[] {
  return value ?? [];
}

/** '14:30:00' -> '2:30 p. m.' */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** '2026-03-14' -> 'sábado, 14 de marzo' (sin desfase de zona horaria) */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d));
}

export function todayISO(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function specialityLabel(s: Speciality): string {
  return SPECIALITY_LABELS[s] ?? s;
}

/** Ordena por hora ascendente para la tabla del agendador. */
export function byTimeAsc(a: Appointment, b: Appointment): number {
  return a.timeApp.localeCompare(b.timeApp);
}
