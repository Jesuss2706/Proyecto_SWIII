import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    cedUser: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expired = signal(this.route.snapshot.queryParamMap.has('expirado'));

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { cedUser, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);

    this.auth.login({ cedUser: Number(cedUser), password }).subscribe({
      next: () => {
        this.busy.set(false);
        const back = this.route.snapshot.queryParamMap.get('volverA');
        this.router.navigateByUrl(back ?? '/');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error ?? 'Cédula o contraseña incorrectas.');
      },
    });
  }

  protected invalid(name: 'cedUser' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }
}
