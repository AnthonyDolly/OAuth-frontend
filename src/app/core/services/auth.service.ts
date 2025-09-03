import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap, catchError, throwError, timer, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../tokens';
import {
  AuthTokens,
  RegisterRequest,
  LoginRequest,
  RefreshRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  User,
  ApiResponse,
  LoginResponse
} from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly ngZone = inject(NgZone);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  // Para el refresh proactivo
  private refreshTimer?: Subscription;
  private readonly REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000; // Refrescar 2 minutos antes

  constructor() {
    this.initializeAuth();
  }

  ngOnDestroy(): void {
    this.refreshTimer?.unsubscribe();
  }

  private initializeAuth(): void {
    const token = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    if (token && refreshToken) {
      // Verificar si el token es válido antes de marcar como autenticado
      const expirationTime = this.getTokenExpirationTime(token);
      const currentTime = Date.now();

      if (expirationTime && expirationTime > currentTime) {
        // Token válido, marcar como autenticado pero sin usuario cargado aún
        this.isAuthenticatedSubject.next(true);
        this.scheduleTokenRefresh(token);
        // NO cargar usuario aquí - se hará de forma lazy cuando sea necesario
        // Esto permite que los guards funcionen correctamente en refresh
      } else if (expirationTime && expirationTime <= currentTime) {
        // Token expirado, intentar refresh silencioso
        this.attemptSilentRefresh();
      } else {
        // Token malformado
        console.warn('⚠️ AuthService: Malformed token, clearing session');
        this.logout();
      }
    } else {
      // No hay tokens, usuario no autenticado
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
    }
  }

  private attemptSilentRefresh(): void {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      console.warn('⚠️ AuthService: No refresh token available for silent refresh');
      this.logout();
      return;
    }

    // Solo intentar refresh si el refresh token parece válido
    try {
      const refreshPayload = this.decodeJWT(refreshToken);
      if (!refreshPayload || !refreshPayload.exp) {
        console.warn('⚠️ AuthService: Invalid refresh token format');
        this.logout();
        return;
      }

      const refreshExpiry = refreshPayload.exp * 1000;
      if (refreshExpiry <= Date.now()) {
        console.warn('⚠️ AuthService: Refresh token expired');
        this.logout();
        return;
      }

      // Intentar refresh silencioso
      this.refreshToken().subscribe({
        next: (tokens) => {
          this.isAuthenticatedSubject.next(true);
          this.scheduleTokenRefresh(tokens.access_token);
          // NOTA: No cargamos usuario aquí para mantener consistencia con initializeAuth
        },
        error: (error) => {
          console.error('❌ AuthService: Silent token refresh failed:', error);
          this.logout();
        }
      });
    } catch (error) {
      console.error('❌ AuthService: Error decoding refresh token:', error);
      this.logout();
    }
  }

  register(request: RegisterRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/register`, request);
  }

  login(request: LoginRequest): Observable<AuthTokens> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.apiUrl}/auth/login`, request).pipe(
      map(response => response.data!.tokens), // Extraer tokens de response.data.tokens
      tap(tokens => {
        this.setTokens(tokens);
        this.isAuthenticatedSubject.next(true);
        // Obtener información del usuario después del login
        this.getCurrentUser().subscribe({
          next: (user) => this.currentUserSubject.next(user),
          error: (error) => console.error('Error getting user info:', error)
        });
      }),
      catchError(this.handleError)
    );
  }

  refreshToken(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      console.error('🔄 AuthService: No refresh token available');
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshRequest = { refresh_token: refreshToken };
    return this.http.post<ApiResponse<{ tokens: AuthTokens }>>(`${this.apiUrl}/auth/refresh`, request).pipe(
      map(response => {
        return response.data!.tokens; // Extraer tokens de response.data.tokens
      }),
      tap(tokens => {
        this.setTokens(tokens);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => {
        console.error('❌ AuthService: Token refresh failed:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    const token = this.getAccessToken();
    if (token && this.isAuthenticated()) {
      // Solo intentar logout en el servidor si estamos autenticados
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
        next: () => this.performLogout(),
        error: () => this.performLogout() // Si falla, limpiar igual
      });
    } else {
      // No hay token válido, limpiar directamente
      this.performLogout();
    }
  }

  private performLogout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/auth/login']);
  }

  verifyEmail(request: VerifyEmailRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/verify-email`, request);
  }

  resendVerification(request: ResendVerificationRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/resend-verification`, request);
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/forgot-password`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/reset-password`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/auth/change-password`, request);
  }

  // Métodos auxiliares
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh_token);
    this.scheduleTokenRefresh(tokens.access_token);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCurrentUser(): Observable<User> {
    // Si ya tenemos el usuario cargado, devolverlo inmediatamente
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      return new Observable(subscriber => {
        subscriber.next(currentUser);
        subscriber.complete();
      });
    }

    // Si no tenemos usuario, hacer la petición HTTP
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/user/profile`).pipe(
      map(response => response.data!),
      tap(user => {
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('❌ AuthService: Failed to load user from API:', error);
        // Si falla la carga del usuario, probablemente el token es inválido
        this.logout();
        return throwError(() => error);
      })
    );
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }

  // Métodos para el refresh proactivo
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  private getTokenExpirationTime(token: string): number | null {
    const decoded = this.decodeJWT(token);
    return decoded?.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
  }

  private scheduleTokenRefresh(accessToken: string): void {
    // Cancelar refresh timer anterior si existe
    this.refreshTimer?.unsubscribe();

    const expirationTime = this.getTokenExpirationTime(accessToken);
    if (!expirationTime) {
      console.warn('⚠️ AuthService: No se pudo obtener tiempo de expiración del token');
      return;
    }

    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;
    const timeUntilRefresh = timeUntilExpiry - this.REFRESH_BEFORE_EXPIRY_MS;

    if (timeUntilRefresh <= 0) {
      // El token ya expiró o está por expirar, refrescar inmediatamente
      this.performTokenRefresh();
    } else {
      // Programar refresh para antes de que expire
      this.ngZone.runOutsideAngular(() => {
        this.refreshTimer = timer(timeUntilRefresh).subscribe(() => {
          this.ngZone.run(() => {
            this.performTokenRefresh();
          });
        });
      });
    }
  }

  private performTokenRefresh(): void {
    const currentRefreshToken = this.getRefreshToken();
    const currentAccessToken = this.getAccessToken();

    if (!currentRefreshToken) {
      console.warn('⚠️ AuthService: No refresh token disponible para refresh proactivo');
      this.logout();
      return;
    }

    // Verificar si el token aún es válido (puede haber sido refrescado por el interceptor)
    if (!currentAccessToken) {
      console.warn('⚠️ AuthService: No access token disponible para verificar expiración');
      this.logout();
      return;
    }

    const expirationTime = this.getTokenExpirationTime(currentAccessToken);
    if (expirationTime && expirationTime > Date.now() + this.REFRESH_BEFORE_EXPIRY_MS) {
      this.scheduleTokenRefresh(currentAccessToken);
      return;
    }

    this.refreshToken().subscribe({
      next: (tokens) => {
        // El método refreshToken() ya llama a setTokens() que programa el próximo refresh
      },
      error: (error) => {
        console.error('❌ AuthService: Error al refrescar token automáticamente:', error);

        // Determinar si es un error que requiere logout inmediato
        const shouldLogout = error.status === 401 ||
                             error.status === 403 ||
                             error.message?.includes('jwt malformed') ||
                             error.message?.includes('invalid token') ||
                             error.message?.includes('refresh token expired') ||
                             error.message?.includes('refresh token not found');

        if (shouldLogout) {
          this.logout();
        } else {
          // Para errores de red u otros temporales, programar un reintento
          this.scheduleRetryRefresh(60000);
        }
      }
    });
  }

  private scheduleRetryRefresh(delayMs: number): void {
    this.ngZone.runOutsideAngular(() => {
      this.refreshTimer = timer(delayMs).subscribe(() => {
        this.ngZone.run(() => {
          this.performTokenRefresh();
        });
      });
    });
  }

  // OAuth methods
  initiateOAuth(provider: 'google' | 'microsoft' | 'github' | 'linkedin'): void {
    window.location.href = `${this.apiUrl}/oauth/${provider}`;
  }
}
