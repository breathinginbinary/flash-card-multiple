import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api/api-config';
import { CurrentUser, LoginRequest, LoginResponse, RegisterRequest, Session } from './auth.models';
import { TokenStorage } from './token-storage';

// setTimeout fires immediately for delays above 2^31-1 ms.
const MAX_TIMER_MS = 2 ** 31 - 1;

// TODO (milestone 3): call CardService.clearCache() in logout() once CardService caches lists (SPEC §6.3).
@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorage);
  private readonly baseUrl = `${inject(API_BASE_URL)}/auth`;

  private readonly session = signal<Session | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly currentUser = computed<CurrentUser | null>(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  constructor() {
    const stored = this.storage.read();
    if (stored && Date.parse(stored.expiresAt) > Date.now()) {
      this.startSession(stored);
    } else if (stored) {
      this.storage.clear();
    }
  }

  /** The bearer token, or `null` when logged out or expired. */
  token(): string | null {
    const s = this.session();
    return s && Date.parse(s.expiresAt) > Date.now() ? s.accessToken : null;
  }

  register(req: RegisterRequest): Observable<CurrentUser> {
    return this.http.post<CurrentUser>(`${this.baseUrl}/register`, req);
  }

  login(req: LoginRequest): Observable<CurrentUser> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, req).pipe(
      tap((res) => {
        this.storage.write(res);
        this.startSession(res);
      }),
      map((res) => res.user),
    );
  }

  logout(): void {
    // Subscribe first so the auth interceptor still attaches the token; the result is ignored.
    if (this.token()) {
      this.http.post<void>(`${this.baseUrl}/logout`, null).subscribe({ error: () => {} });
    }
    this.endSession();
  }

  /** Session rejected or expired: clear it and send the user to the login page. */
  handleUnauthorized(): void {
    if (!this.isLoggedIn()) return;
    const returnUrl = this.router.url;
    this.endSession();
    void this.router.navigate(['/login'], { queryParams: { expired: 1, returnUrl } });
  }

  private startSession(session: Session): void {
    clearTimeout(this.expiryTimer);
    this.session.set(session);
    const msLeft = Date.parse(session.expiresAt) - Date.now();
    this.expiryTimer = setTimeout(() => this.handleUnauthorized(), Math.min(msLeft, MAX_TIMER_MS));
  }

  private endSession(): void {
    clearTimeout(this.expiryTimer);
    this.storage.clear();
    this.session.set(null);
  }
}
