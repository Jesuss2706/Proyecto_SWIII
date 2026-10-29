import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeroComponent } from '../../shared/hero/hero.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models';
import { asList } from '../../core/utils';

@Component({
  selector: 'app-admin-agendadores',
  imports: [ReactiveFormsModule, HeroComponent],
  templateUrl: './admin-agendadores.component.html',
  styleUrl: './admin-agendadores.component.css',
})
export class AdminAgendadoresComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  protected readonly schedulers = signal<User[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    cedUser: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    nameUser: ['', Validators.required],
    secondNameUser: [''],
    lastNameUser: ['', Validators.required],
    secondLastNameUser: [''],
    email: ['', [Validators.required, Validators.email]],
    passUser: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.loadSchedulers();
  }

  submit() {
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos marcados antes de continuar.');
      return;
    }

    const v = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);

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
          this.busy.set(false);
          this.success.set(
            `Agendador creado. Ya puede iniciar sesión con la cédula ${v.cedUser} y la contraseña que definiste.`,
          );
          this.form.reset();
          this.loadSchedulers();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.error ?? 'No fue posible crear el agendador.');
        },
      });
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected fullName(u: User): string {
    return [u.nameUser, u.secondNameUser, u.lastNameUser, u.secondLastNameUser].filter(Boolean).join(' ');
  }

  private loadSchedulers() {
    this.auth.findByRole('Scheduler').subscribe({
      next: (res) => {
        this.schedulers.set(asList(res));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
