import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Registro de la cuenta con la que el paciente inicia sesión.
 * POST /api/auth/register crea el usuario con rol 'Patient'; los datos clínicos
 * se capturan después, en el paso 2 de /agendar.
 */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly questions = [
    '¿Cuál es el nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es el nombre de tu mejor amigo de la infancia?',
    '¿Cuál fue tu primer colegio?',
  ];

  protected readonly form = this.fb.nonNullable.group({
    cedUser: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    nameUser: ['', Validators.required],
    secondNameUser: [''],
    lastNameUser: ['', Validators.required],
    secondLastNameUser: [''],
    passUser: ['', [Validators.required, Validators.minLength(8)]],
    securityQuestion: ['', Validators.required],
    securityAnswer: ['', Validators.required],
  });

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos marcados antes de continuar.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();

    this.auth
      .register({ ...v, cedUser: Number(v.cedUser), roleUser: 'Patient' })
      .subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
        setTimeout(() => this.router.navigate(['/ingresar']), 1800);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error ?? 'No fue posible crear la cuenta.');
      },
    });
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }
}
