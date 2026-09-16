import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroComponent } from '../../shared/hero/hero.component';
import { AppointmentService } from '../../core/services/appointment.service';
import { PeopleService } from '../../core/services/people.service';
import { AuthService } from '../../core/services/auth.service';
import { Appointment, AppointmentStatus, STATUS_LABELS } from '../../core/models';
import { asList, formatDate, formatTime } from '../../core/utils';


@Component({
  selector: 'app-mis-citas',
  imports: [RouterLink, HeroComponent],
  templateUrl: './mis-citas.component.html',
  styleUrl: './mis-citas.component.css',
})
export class MisCitasComponent {
  private appointments = inject(AppointmentService);
  private people = inject(PeopleService);
  private auth = inject(AuthService);

  protected readonly rows = signal<Appointment[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    const ced = this.auth.user()?.cedUser;
    if (!ced) {
      this.loading.set(false);
      this.error.set('Inicia sesión para ver tus citas.');
      return;
    }

    this.people.findPatientByCedula(ced).subscribe({
      next: (p) =>
        this.appointments.findByPatient(p.codPatient).subscribe({
          next: (res) => {
            this.rows.set(
              asList(res).sort((a, b) => (a.dateApp + a.timeApp).localeCompare(b.dateApp + b.timeApp)),
            );
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.error.set('No pudimos cargar tus citas.');
          },
        }),
      error: () => {
        this.loading.set(false);
        this.error.set('Todavía no tienes historia clínica con nosotros. Agenda tu primera cita para crearla.');
      },
    });
  }

  cancel(app: Appointment) {
    this.appointments.updateStatus(app.codApp, 'CANCELADA').subscribe({
      next: () =>
        this.rows.update((rows) =>
          rows.map((r) => (r.codApp === app.codApp ? { ...r, statusApp: 'Cancelled' as AppointmentStatus } : r)),
        ),
      error: () => this.error.set('No se pudo cancelar la cita.'),
    });
  }

  protected statusLabel = (s: AppointmentStatus) => STATUS_LABELS[s];
  protected time = formatTime;
  protected prettyDate = formatDate;
}
