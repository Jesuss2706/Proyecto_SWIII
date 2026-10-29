import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeroComponent } from '../../shared/hero/hero.component';
import { PeopleService } from '../../core/services/people.service';
import {
  ProfType,
  Professional,
  SPECIALITY_LABELS,
  Speciality,
  WEEKDAYS,
  professionalFullName,
} from '../../core/models';
import { asList } from '../../core/utils';

@Component({
  selector: 'app-admin-profesionales',
  imports: [ReactiveFormsModule, HeroComponent],
  templateUrl: './admin-profesionales.component.html',
  styleUrl: './admin-profesionales.component.css',
})
export class AdminProfesionalesComponent {
  private fb = inject(FormBuilder);
  private people = inject(PeopleService);

  protected readonly weekdays = WEEKDAYS;
  protected readonly specialities = (Object.keys(SPECIALITY_LABELS) as Speciality[]).map((value) => ({
    value,
    label: SPECIALITY_LABELS[value],
  }));
  protected readonly types: { value: ProfType; label: string }[] = [
    { value: 'Doctor', label: 'Médico/a' },
    { value: 'Therapist', label: 'Terapeuta' },
  ];

  protected readonly professionals = signal<Professional[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  /** Días en los que SÍ atiende (por defecto, lunes a viernes). */
  protected readonly workingDays = signal<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  protected readonly daysInvalid = computed(() => this.workingDays().length === 0);

  protected readonly form = this.fb.nonNullable.group({
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

  constructor() {
    this.loadProfessionals();
  }

  toggleDay(key: string) {
    this.workingDays.update((days) => (days.includes(key) ? days.filter((d) => d !== key) : [...days, key]));
  }

  submit() {
    this.success.set(null);

    if (this.form.invalid || this.daysInvalid()) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos marcados y elige al menos un día de atención.');
      return;
    }

    const v = this.form.getRawValue();
    if (v.departureTime <= v.arrivalTime) {
      this.error.set('La hora de salida debe ser posterior a la de entrada.');
      return;
    }

    const unavailableDays = this.weekdays
      .map((d) => d.key)
      .filter((k) => !this.workingDays().includes(k))
      .join(',');

    this.busy.set(true);
    this.error.set(null);

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
          this.busy.set(false);
          this.success.set(
            `Profesional creado. Ya puede iniciar sesión con la cédula ${v.cedUser} y la contraseña que definiste.`,
          );
          this.form.reset();
          this.form.patchValue({ arrivalTime: '08:00', departureTime: '16:00', attentionInterval: 30 });
          this.workingDays.set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
          this.loadProfessionals();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.error ?? 'No fue posible crear el profesional.');
        },
      });
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected name(p: Professional): string {
    return professionalFullName(p) || `Profesional ${p.codProf}`;
  }

  protected specLabel(p: Professional): string {
    return SPECIALITY_LABELS[p.specialityProf];
  }

  private loadProfessionals() {
    this.people.listProfessionals().subscribe({
      next: (res) => {
        this.professionals.set(asList(res));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
