import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeroComponent } from '../../shared/hero/hero.component';
import { PeopleService } from '../../core/services/people.service';
import { SettingsService } from '../../core/services/settings.service';
import { Professional, SPECIALITY_LABELS, WEEKDAYS, professionalFullName } from '../../core/models';
import { asList } from '../../core/utils';

@Component({
  selector: 'app-admin-config',
  imports: [FormsModule, HeroComponent],
  templateUrl: './admin-config.component.html',
  styleUrl: './admin-config.component.css',
})
export class AdminConfigComponent {
  private people = inject(PeopleService);
  protected settings = inject(SettingsService);

  protected readonly weekdays = WEEKDAYS;
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly selectedCod = signal<number | null>(null);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);

  // ---- Parámetros globales ----
  protected windowWeeks = signal(this.settings.settings().bookingWindowWeeks);
  protected blockWeekends = signal(this.settings.settings().blockWeekends);

  // ---- Agenda del profesional seleccionado ----
  protected arrivalTime = signal('07:00');
  protected departureTime = signal('18:00');
  protected attentionInterval = signal(30);
  /** Días en los que SÍ atiende. */
  protected workingDays = signal<string[]>([]);

  protected readonly selected = computed(
    () => this.professionals().find((p) => p.codProf === this.selectedCod()) ?? null,
  );

  /** Cuántas citas caben al día con la configuración actual. */
  protected readonly slotsPerDay = computed(() => {
    const start = this.toMinutes(this.arrivalTime());
    const end = this.toMinutes(this.departureTime());
    const step = this.attentionInterval();
    if (!step || end <= start) return 0;
    return Math.floor((end - start) / step);
  });

  protected readonly scheduleValid = computed(
    () =>
      this.toMinutes(this.departureTime()) > this.toMinutes(this.arrivalTime()) &&
      this.attentionInterval() >= 5 &&
      this.workingDays().length > 0,
  );

  constructor() {
    this.people.listProfessionals().subscribe({
      next: (res) => {
        const list = asList(res);
        this.professionals.set(list);
        this.loading.set(false);
        if (list.length) this.select(list[0].codProf);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No fue posible cargar los profesionales. Verifica que tu sesión siga activa.');
      },
    });
  }

  select(codProf: number) {
    this.selectedCod.set(codProf);
    this.saved.set(null);
    const p = this.professionals().find((x) => x.codProf === codProf);
    if (!p) return;

    this.arrivalTime.set(this.toHHMM(p.arrivalTime));
    this.departureTime.set(this.toHHMM(p.departureTime));
    this.attentionInterval.set(p.attentionInterval ?? 30);

    const unavailable = (p.unavailableDays ?? '')
      .split(',')
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean);
    this.workingDays.set(this.weekdays.map((d) => d.key).filter((k) => !unavailable.includes(k)));
  }

  toggleDay(key: string) {
    this.workingDays.update((days) =>
      days.includes(key) ? days.filter((d) => d !== key) : [...days, key],
    );
    this.saved.set(null);
  }

  saveGlobal() {
    const weeks = Number(this.windowWeeks());
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      this.error.set('La ventana de agendamiento debe estar entre 1 y 52 semanas.');
      return;
    }
    this.error.set(null);
    this.settings.save({ bookingWindowWeeks: weeks, blockWeekends: this.blockWeekends() });
    this.saved.set('Parámetros generales guardados.');
  }

  saveSchedule() {
    const prof = this.selected();
    if (!prof) return;

    if (!this.scheduleValid()) {
      this.error.set(
        'Revisa la agenda: la hora de salida debe ser posterior a la de entrada, el intervalo mínimo es de 5 minutos y debe atender al menos un día.',
      );
      return;
    }

    const unavailableDays = this.weekdays
      .map((d) => d.key)
      .filter((k) => !this.workingDays().includes(k))
      .join(',');

    this.saving.set(true);
    this.error.set(null);

    this.people
      .updateSchedule(prof.codProf, {
        arrivalTime: `${this.arrivalTime()}:00`,
        departureTime: `${this.departureTime()}:00`,
        attentionInterval: Number(this.attentionInterval()),
        unavailableDays,
      })
      .subscribe({
        next: (updated) => {
          this.professionals.update((list) =>
            list.map((p) => (p.codProf === updated.codProf ? { ...p, ...updated } : p)),
          );
          this.saving.set(false);
          this.saved.set('Agenda actualizada. Las nuevas franjas ya están disponibles para los pacientes.');
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.error ?? 'No se pudo guardar la agenda del profesional.');
        },
      });
  }

  // ---- helpers ----
  protected name(p: Professional): string {
    const n = professionalFullName(p);
    return n || `Profesional ${p.codProf}`;
  }

  protected specLabel(p: Professional): string {
    return SPECIALITY_LABELS[p.specialityProf];
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  /** '07:00:00' → '07:00' para que lo acepte <input type="time"> */
  private toHHMM(value: string | null | undefined): string {
    return (value ?? '07:00').slice(0, 5);
  }
}
