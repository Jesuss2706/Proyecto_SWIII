import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegisterRequest, User, UserRole } from '../models';

const TOKEN_KEY = 'pa_token';
const USER_KEY = 'pa_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  /** Usuario en sesión. Se lee de localStorage al arrancar la app. */
  readonly user = signal<User | null>(this.readStoredUser());
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed<UserRole | null>(() => this.user()?.roleUser ?? null);

  readonly fullName = computed(() => {
    const u = this.user();
    return u ? `${u.nameUser} ${u.lastNameUser}`.trim() : '';
  });

  readonly welcomeMessage = signal<string | null>(null);

  login(payload: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.base}/login`, payload).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        if (res.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.user.set(res.user);
          this.welcomeMessage.set(`Bienvenido, ${this.fullName()}`);
          setTimeout(() => this.welcomeMessage.set(null), 4000);
        }
      }),
    );
  }

  register(payload: RegisterRequest) {
    return this.http.post<User>(`${this.base}/register`, payload);
  }

  findByCedula(cedula: number) {
    return this.http.get<User>(`${this.base}/users/${cedula}`);
  }

  findByRole(role: UserRole) {
    return this.http.get<User[]>(`${this.base}/users`, { params: { role } });
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: UserRole[]): boolean {
    const current = this.role();
    return current !== null && roles.includes(current);
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
