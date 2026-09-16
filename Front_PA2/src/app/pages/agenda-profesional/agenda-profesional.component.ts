import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeroComponent } from '../../shared/hero/hero.component';
import { AppointmentService } from '../../core/services/appointment.service';
import { PeopleService } from '../../core/services/people.service';
import {
  Appointment,
  AppointmentStatus,
  Patient,
  Professional,
  SPECIALITY_LABELS,
  STATUS_LABELS,
} from '../../core/models';
import { asList, byTimeAsc, formatDate, formatTime, todayISO } from '../../core/utils';

interface AppointmentRow extends Appointment {
  patientName: string;
  patientId: string;
}

@Component({
  selector: 'app-agenda-profesional',
  imports: [FormsModule, HeroComponent],
  templateUrl: './agenda-profesional.component.html',
  styleUrl: './agenda-profesional.component.css',
})
export class AgendaProfesionalComponent {
  private appointments = inject(AppointmentService);
  private people = inject(PeopleService);

  // ---- Filtros ----
  protected codProf = signal<number | null>(null);
  protected date = signal<string>(todayISO());
  protected statusFilter = signal<AppointmentStatus | 'all'>('all');

  // ---- Estado ----
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly rows = signal<AppointmentRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly error = signal<string | null>(null);

  private patientCache = new Map<number, Patient>();

  protected readonly visibleRows = computed(() => {
    const status = this.statusFilter();
    const list = this.rows();
    return status === 'all' ? list : list.filter((r) => r.statusApp === status);
  });

  protected readonly counts = computed(() => {
    const all = this.rows();
    return {
      total: all.length,
      scheduled: all.filter((a) => a.statusApp === 'Scheduled').length,
      completed: all.filter((a) => a.statusApp === 'Completed').length,
      cancelled: all.filter((a) => a.statusApp === 'Cancelled').length,
    };
  });

  protected readonly selectedProfessional = computed(() =>
    this.professionals().find((p) => p.codProf === this.codProf()) ?? null,
  );

  constructor() {
    this.people.listProfessionals().subscribe({
      next: (res) => this.professionals.set(asList(res).filter((p) => p.statusProf === 'Active')),
      error: () => this.error.set('No fue posible cargar la lista de profesionales.'),
    });
  }

  search() {
    const codProf = this.codProf();
    const date = this.date();
    if (codProf == null || !date) {
      this.error.set('Elige un profesional y una fecha para buscar.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.appointments.findByProfessionalAndDate(codProf, date).subscribe({
      next: (res) => {
        const list = asList(res).sort(byTimeAsc);
        this.rows.set(list.map((a) => ({ ...a, patientName: '—', patientId: '—' })));
        this.loading.set(false);
        this.searched.set(true);
        this.resolvePatients(list);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
        this.searched.set(true);
        this.error.set('La búsqueda falló. Revisa la conexión con el servidor e inténtalo otra vez.');
      },
    });
  }

  clear() {
    this.codProf.set(null);
    this.date.set(todayISO());
    this.statusFilter.set('all');
    this.rows.set([]);
    this.searched.set(false);
    this.error.set(null);
  }

  cancelAppointment(row: AppointmentRow) {
    this.appointments.updateStatus(row.codApp, 'CANCELADA').subscribe({
      next: () => this.patchRow(row.codApp, 'Cancelled'),
      error: () => this.error.set('No se pudo cancelar la cita. Inténtalo de nuevo.'),
    });
  }

  completeAppointment(row: AppointmentRow) {
    this.appointments.updateStatus(row.codApp, 'ATENDIDA').subscribe({
      next: () => this.patchRow(row.codApp, 'Completed'),
      error: () => this.error.set('No se pudo marcar la cita como atendida.'),
    });
  }

  export(format: 'csv' | 'json' | 'html') {
    const ids = this.visibleRows().map((r) => r.codApp);
    if (!ids.length) return;

    this.appointments.exportByIds(ids, format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `citas_${this.date()}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('La exportación falló.'),
    });
  }

  // ---- helpers de plantilla ----
  protected label(p: Professional): string {
    const nombre = `${p.userRef?.nameUser ?? ''} ${p.userRef?.lastNameUser ?? ''}`.trim();
    return `${nombre || 'Profesional ' + p.codProf} — ${SPECIALITY_LABELS[p.specialityProf]}`;
  }

  protected statusLabel = (s: AppointmentStatus) => STATUS_LABELS[s];
  protected time = formatTime;
  protected prettyDate = formatDate;

  protected badgeClass(s: AppointmentStatus): string {
    switch (s) {
      case 'Scheduled': return 'pa-badge pa-badge-scheduled';
      case 'Completed': return 'pa-badge pa-badge-completed';
      case 'Cancelled': return 'pa-badge pa-badge-cancelled';
      default: return 'pa-badge pa-badge-rescheduled';
    }
  }

  private patchRow(codApp: number, statusApp: AppointmentStatus) {
    this.rows.update((rows) =>
      rows.map((r) => (r.codApp === codApp ? { ...r, statusApp } : r)),
    );
  }

  /** Resuelve el nombre del paciente de cada fila; el endpoint solo devuelve codPatient. */
  private resolvePatients(list: Appointment[]) {
    const pending = [...new Set(list.map((a) => a.codPatient))].filter(
      (cod) => !this.patientCache.has(cod),
    );

    for (const cod of pending) {
      this.people.findPatientByCod(cod).subscribe({
        next: (p) => {
          this.patientCache.set(cod, p);
          this.applyPatient(cod, p);
        },
        error: () => { /* la fila conserva el guion */ },
      });
    }

    for (const cod of list.map((a) => a.codPatient)) {
      const cached = this.patientCache.get(cod);
      if (cached) this.applyPatient(cod, cached);
    }
  }

  private applyPatient(codPatient: number, p: Patient) {
    const nombre = `${p.namePatient} ${p.lastNamePatient}`.trim();
    this.rows.update((rows) =>
      rows.map((r) =>
        r.codPatient === codPatient
          ? { ...r, patientName: nombre, patientId: String(p.idPatient) }
          : r,
      ),
    );
  }
}
