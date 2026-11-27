import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { HeroComponent } from '../../shared/hero/hero.component';
import { CancelDialogComponent } from '../../shared/cancel-dialog/cancel-dialog.component';
import { AppointmentService } from '../../core/services/appointment.service';
import { PeopleService } from '../../core/services/people.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Appointment,
  AppointmentStatus,
  Professional,
  SPECIALITY_LABELS,
  STATUS_LABELS,
  professionalFullName,
} from '../../core/models';
import { asList, formatDate, formatTime, todayISO } from '../../core/utils';

/** Días mínimos de anticipación con los que un paciente puede cancelar (igual que en el backend). */
export const MIN_CANCEL_DAYS = 2;

/** 'YYYY-MM-DD' + n días, sin desfases de zona horaria. */
function addDaysISO(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return dt.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-mis-citas',
  imports: [RouterLink, HeroComponent, CancelDialogComponent],
  templateUrl: './mis-citas.component.html',
  styleUrl: './mis-citas.component.css',
})
export class MisCitasComponent {
  private appointments = inject(AppointmentService);
  private people = inject(PeopleService);
  private auth = inject(AuthService);

  protected readonly rows = signal<Appointment[]>([]);
  protected readonly professionals = signal<Map<number, Professional>>(new Map());
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly appToCancel = signal<Appointment | null>(null);
  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal<string | null>(null);

  protected readonly minCancelDays = MIN_CANCEL_DAYS;
  /** Primera fecha de cita que todavía se puede cancelar desde la web. */
  private readonly cancelLimit = addDaysISO(todayISO(), MIN_CANCEL_DAYS);

  /** Próximas citas agendadas primero; luego el resto, de la más reciente a la más antigua. */
  protected readonly sortedRows = computed(() => {
    const key = (a: Appointment) => a.dateApp + a.timeApp;
    const upcoming = this.rows().filter((a) => a.statusApp === 'Scheduled').sort((a, b) => key(a).localeCompare(key(b)));
    const past = this.rows().filter((a) => a.statusApp !== 'Scheduled').sort((a, b) => key(b).localeCompare(key(a)));
    return [...upcoming, ...past];
  });

  constructor() {
    const ced = this.auth.user()?.cedUser;
    if (!ced) {
      this.loading.set(false);
      this.error.set('Inicia sesión para ver tus citas.');
      return;
    }

    this.people.listProfessionals().subscribe({
      next: (res) => this.professionals.set(new Map(asList(res).map((p) => [p.codProf, p]))),
      error: () => { /* las tarjetas se muestran sin el nombre del profesional */ },
    });

    this.people.findPatientByCedula(ced).subscribe({
      next: (p) =>
        this.appointments.findByPatient(p.codPatient).subscribe({
          next: (res) => {
            this.rows.set(asList(res));
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.error.set('No pudimos cargar tus citas.');
          },
        }),
      error: () => {
        this.loading.set(false);
        this.error.set('Todavía no tienes citas con nosotros. Agenda la primera para empezar.');
      },
    });
  }

  protected canCancel(app: Appointment): boolean {
    return app.statusApp === 'Scheduled' && app.dateApp >= this.cancelLimit;
  }

  askCancel(app: Appointment) {
    this.success.set(null);
    this.cancelError.set(null);
    this.appToCancel.set(app);
  }

  closeCancel() {
    if (this.cancelling()) return;
    this.appToCancel.set(null);
  }

  confirmCancel(reason: string) {
    const app = this.appToCancel();
    if (!app) return;

    this.cancelling.set(true);
    this.cancelError.set(null);

    this.appointments.cancel(app.codApp, reason).subscribe({
      next: () => {
        this.rows.update((rows) =>
          rows.map((r) =>
            r.codApp === app.codApp
              ? { ...r, statusApp: 'Cancelled' as AppointmentStatus, cancelReason: reason }
              : r,
          ),
        );
        this.cancelling.set(false);
        this.appToCancel.set(null);
        this.success.set(`Cancelaste tu cita del ${this.prettyDate(app.dateApp)} a las ${this.time(app.timeApp)}; el horario quedó libre.`);
      },
      error: (err: HttpErrorResponse) => {
        this.cancelling.set(false);
        this.cancelError.set(err?.error?.error ?? 'No se pudo cancelar la cita. Inténtalo de nuevo.');
      },
    });
  }

  protected summary(app: Appointment): string {
    return `${this.prettyDate(app.dateApp)} a las ${this.time(app.timeApp)}`;
  }

  protected professionalLabel(app: Appointment): string | null {
    const p = this.professionals().get(app.codProf);
    if (!p) return null;
    const name = professionalFullName(p);
    return `${name} · ${SPECIALITY_LABELS[p.specialityProf] ?? p.specialityProf}`;
  }

  protected badgeClass(s: AppointmentStatus): string {
    switch (s) {
      case 'Scheduled': return 'pa-badge pa-badge-scheduled';
      case 'Completed': return 'pa-badge pa-badge-completed';
      case 'Cancelled': return 'pa-badge pa-badge-cancelled';
      default: return 'pa-badge pa-badge-rescheduled';
    }
  }

  protected statusLabel = (s: AppointmentStatus) => STATUS_LABELS[s];
  protected time = formatTime;
  protected prettyDate = formatDate;
}
