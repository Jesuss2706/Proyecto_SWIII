import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeroComponent } from '../../shared/hero/hero.component';
import { AuthService } from '../../core/services/auth.service';
import { PeopleService } from '../../core/services/people.service';
import { SettingsService } from '../../core/services/settings.service';
import {
  ProfType,
  Professional,
  SPECIALITY_LABELS,
  Speciality,
  User,
  WEEKDAYS,
  professionalFullName,
} from '../../core/models';
import { asList } from '../../core/utils';

@Component({
  selector: 'app-admin-config',
  imports: [FormsModule, ReactiveFormsModule, HeroComponent],
  templateUrl: './admin-config.component.html',
  styleUrl: './admin-config.component.css',
})
export class AdminConfigComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private people = inject(PeopleService);
  protected settings = inject(SettingsService);

  protected readonly weekdays = WEEKDAYS;
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly selectedCod = signal<number | null>(null);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);

  /** Pestaña activa dentro de Configuración. */
  protected readonly tab = signal<'agenda' | 'profesional' | 'agendador'>('agenda');

  // ---- Alta de profesionales ----
  protected readonly specialities = (Object.keys(SPECIALITY_LABELS) as Speciality[]).map((value) => ({
    value,
    label: SPECIALITY_LABELS[value],
  }));
  protected readonly types: { value: ProfType; label: string }[] = [
    { value: 'Doctor', label: 'Médico/a' },
    { value: 'Therapist', label: 'Terapeuta' },
  ];
  protected readonly profBusy = signal(false);
  protected readonly profError = signal<string | null>(null);
  protected readonly profSuccess = signal<string | null>(null);
  /** Días en los que SÍ atiende el profesional nuevo (por defecto, lunes a viernes). */
  protected readonly profDays = signal<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  protected readonly profDaysInvalid = computed(() => this.profDays().length === 0);

  protected readonly profForm = this.fb.nonNullable.group({
    cedUser: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    nameUser: ['', Validators.required],
    secondNameUser: [''],
    lastNameUser: ['', Validators.required],
    secondLastNameUser: [''],
    email: ['', [Validators.required, Validators.email]],
    passUser: ['', [Validators.required, Validators.minLength(8)]],
    genProf: ['', Validators.required],
    phoneProf: [''],
    typeProf: ['' as ProfType | '', Validators.required],
    specialityProf: ['' as Speciality | '', Validators.required],
    arrivalTime: ['08:00', Validators.required],
    departureTime: ['16:00', Validators.required],
    attentionInterval: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
    imageProf: [''],
  });

  // ---- Alta de agendadores ----
  protected readonly schedulers = signal<User[]>([]);
  protected readonly schedLoading = signal(true);
  protected readonly schedBusy = signal(false);
  protected readonly schedError = signal<string | null>(null);
  protected readonly schedSuccess = signal<string | null>(null);

  protected readonly schedForm = this.fb.nonNullable.group({
    cedUser: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    nameUser: ['', Validators.required],
    secondNameUser: [''],
    lastNameUser: ['', Validators.required],
    secondLastNameUser: [''],
    email: ['', [Validators.required, Validators.email]],
    passUser: ['', [Validators.required, Validators.minLength(8)]],
  });

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
    this.loadSchedulers();
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

  // ---- Alta de profesionales ----
  toggleProfDay(key: string) {
    this.profDays.update((days) => (days.includes(key) ? days.filter((d) => d !== key) : [...days, key]));
  }

  submitProfessional() {
    this.profSuccess.set(null);

    if (this.profForm.invalid || this.profDaysInvalid()) {
      this.profForm.markAllAsTouched();
      this.profError.set('Revisa los campos marcados y elige al menos un día de atención.');
      return;
    }

    const v = this.profForm.getRawValue();
    if (v.departureTime <= v.arrivalTime) {
      this.profError.set('La hora de salida debe ser posterior a la de entrada.');
      return;
    }

    const unavailableDays = this.weekdays
      .map((d) => d.key)
      .filter((k) => !this.profDays().includes(k))
      .join(',');

    this.profBusy.set(true);
    this.profError.set(null);

    this.people
      .createProfessionalWithAccount({
        cedUser: Number(v.cedUser),
        passUser: v.passUser,
        email: v.email,
        nameUser: v.nameUser,
        secondNameUser: v.secondNameUser || undefined,
        lastNameUser: v.lastNameUser,
        secondLastNameUser: v.secondLastNameUser || undefined,
        genProf: v.genProf,
        phoneProf: v.phoneProf || undefined,
        typeProf: v.typeProf as ProfType,
        specialityProf: v.specialityProf as Speciality,
        arrivalTime: `${v.arrivalTime}:00`,
        departureTime: `${v.departureTime}:00`,
        attentionInterval: Number(v.attentionInterval),
        unavailableDays,
        imageProf: v.imageProf || undefined,
      })
      .subscribe({
        next: () => {
          this.profBusy.set(false);
          this.profSuccess.set(
            `Profesional creado. Ya puede iniciar sesión con la cédula ${v.cedUser} y la contraseña que definiste.`,
          );
          this.profForm.reset();
          this.profForm.patchValue({ arrivalTime: '08:00', departureTime: '16:00', attentionInterval: 30 });
          this.profDays.set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
          this.refreshProfessionals();
        },
        error: (err) => {
          this.profBusy.set(false);
          this.profError.set(err?.error?.error ?? 'No fue posible crear el profesional.');
        },
      });
  }

  protected invalidProf(name: keyof typeof this.profForm.controls): boolean {
    const c = this.profForm.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  // ---- Alta de agendadores ----
  submitScheduler() {
    this.schedSuccess.set(null);

    if (this.schedForm.invalid) {
      this.schedForm.markAllAsTouched();
      this.schedError.set('Revisa los campos marcados antes de continuar.');
      return;
    }

    const v = this.schedForm.getRawValue();
    this.schedBusy.set(true);
    this.schedError.set(null);

    this.auth
      .createScheduler({
        cedUser: Number(v.cedUser),
        passUser: v.passUser,
        email: v.email,
        nameUser: v.nameUser,
        secondNameUser: v.secondNameUser || undefined,
        lastNameUser: v.lastNameUser,
        secondLastNameUser: v.secondLastNameUser || undefined,
      })
      .subscribe({
        next: () => {
          this.schedBusy.set(false);
          this.schedSuccess.set(
            `Agendador creado. Ya puede iniciar sesión con la cédula ${v.cedUser} y la contraseña que definiste.`,
          );
          this.schedForm.reset();
          this.loadSchedulers();
        },
        error: (err) => {
          this.schedBusy.set(false);
          this.schedError.set(err?.error?.error ?? 'No fue posible crear el agendador.');
        },
      });
  }

  protected invalidSched(name: keyof typeof this.schedForm.controls): boolean {
    const c = this.schedForm.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected schedulerName(u: User): string {
    return [u.nameUser, u.secondNameUser, u.lastNameUser, u.secondLastNameUser].filter(Boolean).join(' ');
  }

  private loadSchedulers() {
    this.auth.findByRole('Scheduler').subscribe({
      next: (res) => {
        this.schedulers.set(asList(res));
        this.schedLoading.set(false);
      },
      error: () => this.schedLoading.set(false),
    });
  }

  /** Recarga la lista de profesionales sin mover la selección de la pestaña de agenda. */
  private refreshProfessionals() {
    this.people.listProfessionals().subscribe({
      next: (res) => this.professionals.set(asList(res)),
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
