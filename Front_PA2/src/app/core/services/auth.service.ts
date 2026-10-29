import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, NewSchedulerRequest, RegisterRequest, User, UserRole } from '../models';

const TOKENS_KEY = 'pa_tokens';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Momento (ms desde epoch) en que vence el access token. */
  accessExpiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;
  private oidc = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect`;
  private clientId = environment.keycloak.clientId;

  private tokens: StoredTokens | null = this.readTokens();
  private refreshing: Promise<string | null> | null = null;

  /** Usuario en sesión (copia local que devuelve GET /auth/me). */
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly role = computed<UserRole | null>(() => this.user()?.roleUser ?? null);

  readonly fullName = computed(() => {
    const u = this.user();
    return u ? `${u.nameUser} ${u.lastNameUser}`.trim() : '';
  });

  readonly welcomeMessage = signal<string | null>(null);

  /** Se ejecuta UNA vez al arrancar la app (provideAppInitializer): restaura la sesión guardada. */
  async init(): Promise<void> {
    if (!this.tokens) return;
    try {
      if (!(await this.freshToken())) return;
      this.user.set(await firstValueFrom(this.http.get<User>(`${this.base}/me`)));
    } catch {
      this.clearSession();
    }
  }

  /** Login con el formulario propio: cédula + contraseña contra Keycloak. */
  login(payload: LoginRequest): Observable<User> {
    const body = new HttpParams({
      fromObject: {
        grant_type: 'password',
        client_id: this.clientId,
        username: String(payload.cedUser),
        password: payload.password,
        scope: 'openid',
      },
    });

    return this.http.post<KeycloakTokenResponse>(`${this.oidc}/token`, body).pipe(
      catchError((err: HttpErrorResponse) => throwError(() => this.loginError(err))),
      tap((res) => this.storeTokens(res)),
      // El interceptor agrega el Bearer; el backend crea/actualiza la copia local del usuario.
      switchMap(() => this.http.get<User>(`${this.base}/me`)),
      tap((user) => {
        this.user.set(user);
        this.welcomeMessage.set(`Bienvenido, ${this.fullName()}`);
        setTimeout(() => this.welcomeMessage.set(null), 4000);
      }),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      }),
    );
  }

  /** Crea la cuenta (el backend la registra en Keycloak). */
  registerAccount(payload: RegisterRequest) {
    return this.http.post<{ codUser: number }>(`${environment.apiUrl}/public/auth/register`, payload);
  }

  /** Admin: crea una cuenta de agendador (Scheduler) en Keycloak y en la base local. */
  createScheduler(payload: NewSchedulerRequest) {
    return this.http.post<{ codUser: number }>(`${this.base}/schedulers`, payload);
  }

  findByCedula(cedula: number) {
    return this.http.get<User>(`${this.base}/users/${cedula}`);
  }

  findByRole(role: UserRole) {
    return this.http.get<User[]>(`${this.base}/users`, { params: { role } });
  }

  logout() {
    const refreshToken = this.tokens?.refreshToken;
    this.clearSession();
    if (refreshToken) {
      // Cierra también la sesión en Keycloak (si falla, no importa: ya se limpió local).
      this.http
        .post(`${this.oidc}/logout`, new HttpParams({ fromObject: { client_id: this.clientId, refresh_token: refreshToken } }))
        .subscribe({ error: () => undefined });
    }
  }

  /** Borra tokens y usuario (también lo usa el interceptor cuando el backend responde 401). */
  clearSession() {
    this.tokens = null;
    try {
      localStorage.removeItem(TOKENS_KEY);
    } catch {
      /* sin acceso a localStorage */
    }
    this.user.set(null);
  }

  /** Access token vigente; si le quedan menos de 30 s lo renueva con el refresh token. */
  async freshToken(): Promise<string | null> {
    const t = this.tokens;
    if (!t) return null;
    if (t.accessExpiresAt - Date.now() > 30_000) return t.accessToken;

    this.refreshing ??= this.refresh(t.refreshToken).finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  hasRole(...roles: UserRole[]): boolean {
    const current = this.role();
    return current !== null && roles.includes(current);
  }

  private async refresh(refreshToken: string): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<KeycloakTokenResponse>(
          `${this.oidc}/token`,
          new HttpParams({
            fromObject: { grant_type: 'refresh_token', client_id: this.clientId, refresh_token: refreshToken },
          }),
        ),
      );
      this.storeTokens(res);
      return res.access_token;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private storeTokens(res: KeycloakTokenResponse) {
    this.tokens = {
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      accessExpiresAt: Date.now() + res.expires_in * 1000,
    };
    try {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(this.tokens));
    } catch {
      /* sin acceso a localStorage */
    }
  }

  private readTokens(): StoredTokens | null {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      return raw ? (JSON.parse(raw) as StoredTokens) : null;
    } catch {
      return null;
    }
  }

  /** Traduce el error de Keycloak al formato { error: { error: mensaje } } que ya lee el login. */
  private loginError(err: HttpErrorResponse) {
    let message = 'Cédula o contraseña incorrectas.';
    if (err.status === 0) {
      message = 'No se pudo conectar con Keycloak. ¿Está encendido?';
    } else if (String(err.error?.error_description).includes('not fully set up')) {
      message = 'Tu cuenta está incompleta en Keycloak (falta nombre, apellido o correo).';
    } else if (err.status >= 500) {
      message = 'Keycloak no está disponible en este momento.';
    }
    return { status: err.status, error: { error: message } };
  }
}
