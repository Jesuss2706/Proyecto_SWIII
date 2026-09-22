import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HeroComponent } from '../../shared/hero/hero.component';
import { AppointmentService } from '../../core/services/appointment.service';
import { PeopleService } from '../../core/services/people.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { Patient, SPECIALITY_LABELS, Slot, Speciality } from '../../core/models';
import { asList, formatDate, formatTime, todayISO } from '../../core/utils';

type Step = 1 | 2 | 3;

/**
 * Requisito 2 — El paciente agenda su cita desde la web.
 * Flujo: verificar cédula (en patient.idPatient y, si no está, en auth.users.cedUser)
 *        → datos del paciente → elegir franja y confirmar.
 * Endpoints: GET /people/patients/:idPatient, GET /auth/users/:cedula,
 *            POST /people/patients, GET /appointments/generated, POST /appointments
 */
@Component({
  selector: 'app-agendar',
  imports: [ReactiveFormsModule, RouterLink, HeroComponent],
  templateUrl: './agendar.component.html',
  styleUrl: './agendar.component.css',
})
export class AgendarComponent {
  private fb = inject(FormBuilder);
  private people = inject(PeopleService);
  private appointments = inject(AppointmentService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  protected settings = inject(SettingsService);

  protected readonly step = signal<Step>(1);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly busy = signal(false);

  // ---------- Paso 1: verificación ----------
  protected readonly cedula = signal('');
  protected readonly patient = signal<Patient | null>(null);
  protected readonly isReturning = signal(false);

  // ---------- Paso 2: datos del paciente ----------
  protected readonly patientForm = this.fb.nonNullable.group({
    idPatient: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    namePatient: ['', [Validators.required, Validators.maxLength(40)]],
    secondNamePatient: [''],
    lastNamePatient: ['', [Validators.required, Validators.maxLength(40)]],
    secondLastNamePatient: [''],
    genderPatient: ['', Validators.required],
    phonePatient: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
    dateBirthPatient: ['', Validators.required],
    descApp: [''],
  });

  /** La edad se deriva de la fecha de nacimiento, no se pide aparte. */
  protected readonly age = signal<number | null>(null);

  // ---------- Paso 3: horario ----------
   protected readonly specialities: Speciality[] = ['General', 'Neural_Therapy', 'Chiropractor', 'Physiotherapy'];
  protected readonly speciality = signal<Speciality | ''>('');
  protected readonly date = signal<string>(todayISO());
  protected readonly slots = signal<Slot[]>([]);
  protected readonly selectedSlot = signal<Slot | null>(null);
  protected readonly loadingSlots = signal(false);
  protected readonly confirmed = signal<{ slot: Slot; codApp: number } | null>(null);

  protected readonly minDate = this.settings.minBookingDate();
  protected readonly maxDate = this.settings.maxBookingDate();

  /** Agrupa las franjas por profesional para que el paciente elija con contexto. */
  protected readonly slotsByProfessional = computed(() => {
    const groups = new Map<number, { name: string; speciality: Speciality; slots: Slot[] }>();
    for (const s of this.slots()) {
      const g = groups.get(s.codProf) ?? {
        name: s.professionalName || `Profesional ${s.codProf}`,
        speciality: s.specialityProf,
        slots: [],
      };
      g.slots.push(s);
      groups.set(s.codProf, g);
    }
    return [...groups.values()];
  });

  constructor() {
    const pre = this.route.snapshot.queryParamMap.get('especialidad') as Speciality | null;
    if (pre && this.specialities.includes(pre)) this.speciality.set(pre);

    this.patientForm.controls.dateBirthPatient.valueChanges.subscribe((v) =>
      this.age.set(this.calcAge(v)),
    );
  }

  // ================= Paso 1 =================
  lookup() {
    const ced = this.cedula().trim();
    if (!/^\d{6,12}$/.test(ced)) {
      this.error.set('Escribe un número de cédula válido (entre 6 y 12 dígitos).');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.people.findPatientByCedula(ced).subscribe({
      next: (p) => {
        // Ya tiene historia clínica: se usa tal cual, como antes.
        this.patient.set(p);
        this.isReturning.set(true);
        this.patientForm.patchValue({
          idPatient: String(p.idPatient),
          namePatient: p.namePatient,
          secondNamePatient: p.secondNamePatient ?? '',
          lastNamePatient: p.lastNamePatient,
          secondLastNamePatient: p.secondLastNamePatient ?? '',
          genderPatient: p.genderPatient,
          phonePatient: p.phonePatient ? String(p.phonePatient) : '',
          dateBirthPatient: p.dateBirthPatient ?? '',
        });
        this.notice.set('Encontramos tu historia clínica. Revisa que los datos sigan vigentes.');
        this.busy.set(false);
        this.step.set(2);
      },
      error: () => {
        // No tiene historia clínica todavía: busca si al menos existe como
        // usuario registrado (auth.users, por cedUser) para no pedirle de
        // nuevo el nombre y el apellido — igual se va a guardar en patient.
        this.auth.findByCedula(Number(ced)).subscribe({
          next: (u) => {
            this.patient.set(null);
            this.isReturning.set(false);
            this.patientForm.reset();
            this.patientForm.patchValue({
              idPatient: ced,
              namePatient: u.nameUser,
              secondNamePatient: u.secondNameUser ?? '',
              lastNamePatient: u.lastNameUser,
              secondLastNamePatient: u.secondLastNameUser ?? '',
            });
            this.notice.set('Encontramos tu cuenta. Completa los datos que falten para agendar tu primera cita.');
            this.busy.set(false);
            this.step.set(2);
          },
          error: () => {
            // Tampoco existe como usuario: paciente totalmente nuevo, formulario en blanco.
            this.patient.set(null);
            this.isReturning.set(false);
            this.patientForm.reset();
            this.patientForm.patchValue({ idPatient: ced });
            this.notice.set('Es tu primera cita con nosotros. Completa tus datos para continuar.');
            this.busy.set(false);
            this.step.set(2);
          },
        });
      },
    });
  }

  skipLookup() {
    this.patient.set(null);
    this.isReturning.set(false);
    this.notice.set(null);
    this.step.set(2);
  }

  // ================= Paso 2 =================
  savePatient() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      this.error.set('Revisa los campos marcados antes de continuar.');
      return;
    }

    this.error.set(null);

    // Paciente ya registrado: se continúa sin volver a crearlo.
    if (this.isReturning() && this.patient()) {
      this.step.set(3);
      this.loadSlots();
      return;
    }

    const v = this.patientForm.getRawValue();
    this.busy.set(true);

    this.people
      .createPatient({
        idPatient: Number(v.idPatient),
        namePatient: v.namePatient,
        secondNamePatient: v.secondNamePatient || null,
        lastNamePatient: v.lastNamePatient,
        secondLastNamePatient: v.secondLastNamePatient || null,
        genderPatient: v.genderPatient,
        phonePatient: Number(v.phonePatient),
        dateBirthPatient: v.dateBirthPatient,
      })
      .subscribe({
        next: (p) => {
          this.patient.set(p);
          this.busy.set(false);
          this.notice.set(null);
          this.step.set(3);
          this.loadSlots();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(
            err?.error?.error ?? 'No fue posible guardar tus datos. Verifica la información e inténtalo otra vez.',
          );
        },
      });
  }

  // ================= Paso 3 =================
  loadSlots() {
    const spec = this.speciality();
    this.selectedSlot.set(null);
    this.loadingSlots.set(true);
    this.error.set(null);

    this.appointments
      .availableSlots({ date: this.date(), speciality: spec || undefined })
      .subscribe({
        next: (res) => {
          this.slots.set(asList(res));
          this.loadingSlots.set(false);
        },
        error: () => {
          this.slots.set([]);
          this.loadingSlots.set(false);
          this.error.set('No pudimos consultar los horarios disponibles.');
        },
      });
  }

  pick(slot: Slot) {
    this.selectedSlot.set(slot);
  }

  confirm() {
    const slot = this.selectedSlot();
    const patient = this.patient();

    if (!slot) {
      this.error.set('Elige una franja horaria para confirmar.');
      return;
    }
    if (!patient) {
      this.error.set('Faltan los datos del paciente. Vuelve al paso anterior.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.appointments
      .create({
        codProf: slot.codProf,
        codPatient: patient.codPatient,
        dateApp: slot.dateApp,
        timeApp: slot.timeApp,
        descApp: this.patientForm.controls.descApp.value || undefined,
      })
      .subscribe({
        next: (app) => {
          this.confirmed.set({ slot, codApp: app.codApp });
          this.busy.set(false);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(
            err?.error?.error ?? 'No se pudo agendar la cita. Es posible que esa franja acabe de ocuparse.',
          );
          this.loadSlots();
        },
      });
  }

  back() {
    this.error.set(null);
    this.step.update((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  restart() {
    this.confirmed.set(null);
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.patient.set(null);
    this.patientForm.reset();
    this.cedula.set('');
    this.notice.set(null);
    this.step.set(1);
  }

  // ---- helpers de plantilla ----
  protected specLabel = (s: Speciality) => SPECIALITY_LABELS[s];
  protected time = formatTime;
  protected prettyDate = formatDate;

  protected invalid(name: keyof typeof this.patientForm.controls): boolean {
    const c = this.patientForm.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  private calcAge(iso: string): number | null {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y) return null;
    const today = new Date();
    let age = today.getFullYear() - y;
    const before = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
    if (before) age--;
    return age >= 0 && age < 130 ? age : null;
  }
}
