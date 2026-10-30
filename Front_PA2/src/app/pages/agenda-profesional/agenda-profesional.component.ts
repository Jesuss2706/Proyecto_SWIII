import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HeroComponent } from '../../shared/hero/hero.component';
import { DateFieldComponent } from '../../shared/date-field/date-field.component';
import { AppointmentService } from '../../core/services/appointment.service';
import { PeopleService } from '../../core/services/people.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Appointment,
  AppointmentStatus,
  Patient,
  PatientHistory,
  Professional,
  SPECIALITY_LABELS,
  STATUS_LABELS,
  Speciality,
  professionalFullName,
} from '../../core/models';
import { asList, byTimeAsc, formatDate, formatTime, todayISO } from '../../core/utils';

interface AppointmentRow extends Appointment {
  patientName: string;
  patientId: string;
}

type AgendaTab = 'day' | 'patient';

@Component({
  selector: 'app-agenda-profesional',
  imports: [FormsModule, HeroComponent, DateFieldComponent],
  templateUrl: './agenda-profesional.component.html',
  styleUrl: './agenda-profesional.component.css',
})
export class AgendaProfesionalComponent {
  private appointments = inject(AppointmentService);
  private people = inject(PeopleService);
  private auth = inject(AuthService);

  protected readonly tab = signal<AgendaTab>('day');

  /** Perfil del profesional en sesión; null si quien entra es agendador o admin. */
  protected readonly myProfessional = signal<Professional | null>(null);

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

  // ---- Historial por paciente ----
  protected cedula = signal('');
  protected readonly history = signal<PatientHistory | null>(null);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal<string | null>(null);
  protected readonly historyStatus = signal<AppointmentStatus | 'all'>('all');

  protected readonly visibleHistory = computed(() => {
    const status = this.historyStatus();
    const list = this.history()?.appointments ?? [];
    return status === 'all' ? list : list.filter((a) => a.statusApp === status);
  });

  protected readonly historyCounts = computed(() => {
    const all = this.history()?.appointments ?? [];
    return {
      total: all.length,
      completed: all.filter((a) => a.statusApp === 'Completed').length,
      cancelled: all.filter((a) => a.statusApp === 'Cancelled').length,
      upcoming: all.filter((a) => a.statusApp === 'Scheduled').length,
    };
  });

  constructor() {
    this.people.listProfessionals().subscribe({
      next: (res) => this.professionals.set(asList(res).filter((p) => p.statusProf === 'Active')),
      error: () => this.error.set('No fue posible cargar la lista de profesionales.'),
    });

    // Un profesional entra directo a su propia agenda de hoy, sin tocar filtros.
    const user = this.auth.user();
    if (user?.roleUser === 'Professional') {
      this.loading.set(true);
      this.people.findProfessionalByUser(user.codUser).subscribe({
        next: (prof) => {
          this.myProfessional.set(prof);
          this.codProf.set(prof.codProf);
          this.search();
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No encontramos tu perfil de profesional. Elige uno de la lista para ver su agenda.');
        },
      });
    }
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

  searchHistory() {
    const cedula = this.cedula().replace(/\D/g, '');
    if (!/^\d{6,12}$/.test(cedula)) {
      this.historyError.set('Escribe una cédula de 6 a 12 dígitos, sin puntos.');
      return;
    }

    this.historyLoading.set(true);
    this.historyError.set(null);
    this.historyStatus.set('all');

    this.appointments.findHistoryByPatientCedula(cedula).subscribe({
      next: (res) => {
        this.history.set(res);
        this.historyLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.history.set(null);
        this.historyLoading.set(false);
        this.historyError.set(
          err.status === 404
            ? `No hay ningún paciente registrado con la cédula ${cedula}.`
            : 'La búsqueda falló. Revisa la conexión con el servidor e inténtalo otra vez.',
        );
      },
    });
  }

  clearHistory() {
    this.cedula.set('');
    this.history.set(null);
    this.historyError.set(null);
    this.historyStatus.set('all');
  }

  clear() {
    // El profesional en sesión vuelve a su propia agenda en lugar de quedar sin selección.
    const mine = this.myProfessional();
    if (mine) {
      this.codProf.set(mine.codProf);
      this.date.set(todayISO());
      this.statusFilter.set('all');
      this.search();
      return;
    }
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
    const nombre = professionalFullName(p);
    return `${nombre || 'Profesional ' + p.codProf} — ${SPECIALITY_LABELS[p.specialityProf]}`;
  }

  protected specLabel(s: Speciality | null): string {
    return s ? SPECIALITY_LABELS[s] : '—';
  }

  /** '2026-03-14' -> '14 mar 2026': el historial cruza años, así que el año sí importa. */
  protected historyDate(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(y, m - 1, d))
      .replace('.', '');
  }

  protected isToday(date: string): boolean {
    return date === todayISO();
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
