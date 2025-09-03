import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/tokens';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-api-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './api-explorer.component.html',
  styleUrls: ['./api-explorer.component.css']
})
export class ApiExplorerComponent {
  private http = inject(HttpClient);
  private baseUrl = inject(API_BASE_URL);

  accessToken: string = localStorage.getItem('access_token') ?? '';
  base: string = this.baseUrl;
  loading = false;
  output: unknown | null = null;
  error: unknown | null = null;

  setToken(): void {
    localStorage.setItem('access_token', this.accessToken);
  }

  clearToken(): void {
    localStorage.removeItem('access_token');
    this.accessToken = '';
  }

  setBase(): void {
    // runtime override for testing different environments
  }

  // System
  getHealth() { return this.http.get(`${this.base}/health`); }
  getVersion() { return this.http.get(`${this.base}/version`); }
  getDocs() { return this.http.get(`${this.base}/docs`, { responseType: 'text' }); }

  // Auth endpoints
  authRegister(body: { email: string; password: string; }) {
    return this.http.post(`${this.base}/auth/register`, body);
  }
  authLogin(body: { email: string; password: string; code?: string; backup_code?: string; }) {
    return this.http.post(`${this.base}/auth/login`, body);
  }
  authRefresh(body: { refresh_token: string; }) {
    return this.http.post(`${this.base}/auth/refresh`, body);
  }
  authLogout(body: { refresh_token?: string; revoke_all?: boolean; }) {
    return this.http.post(`${this.base}/auth/logout`, body);
  }
  authVerifyEmail(body: { token: string; }) {
    return this.http.post(`${this.base}/auth/verify-email`, body);
  }
  authResendVerification(body: { email: string; }) {
    return this.http.post(`${this.base}/auth/resend-verification`, body);
  }
  authForgotPassword(body: { email: string; }) {
    return this.http.post(`${this.base}/auth/forgot-password`, body);
  }
  authResetPassword(body: { token: string; new_password: string; }) {
    return this.http.post(`${this.base}/auth/reset-password`, body);
  }
  authChangePassword(body: { current_password: string; new_password: string; }) {
    return this.http.post(`${this.base}/auth/change-password`, body);
  }

  // User endpoints
  getUserProfile() { return this.http.get(`${this.base}/user/profile`); }
  putUserProfile(body: { first_name?: string; last_name?: string; }) { return this.http.put(`${this.base}/user/profile`, body); }
  deleteUserProfile() { return this.http.delete(`${this.base}/user/profile`); }
  getUserSessions() { return this.http.get(`${this.base}/user/sessions`); }
  deleteUserSession(sessionId: string) { return this.http.delete(`${this.base}/user/sessions/${sessionId}`); }
  deleteUserSessionsAll() { return this.http.delete(`${this.base}/user/sessions`); }
  getUserOauthAccounts() { return this.http.get(`${this.base}/user/oauth-accounts`); }
  linkUserOauthAccount(body: { provider: string; provider_id: string; provider_email?: string; }) { return this.http.post(`${this.base}/user/oauth-accounts/link`, body); }
  deleteUserOauthAccount(accountId: string) { return this.http.delete(`${this.base}/user/oauth-accounts/${accountId}`); }
  postEnable2fa() { return this.http.post(`${this.base}/user/enable-2fa`, {}); }
  postDisable2fa() { return this.http.post(`${this.base}/user/disable-2fa`, {}); }
  postVerify2fa(body: { code: string; }) { return this.http.post(`${this.base}/user/verify-2fa`, body); }
  postRegenerateBackupCodes() { return this.http.post(`${this.base}/user/backup-codes/regenerate`, {}); }

  // OAuth providers
  getOauthGoogle() { return this.http.get(`${this.base}/oauth/google`); }
  getOauthGoogleCallback() { return this.http.get(`${this.base}/oauth/google/callback`); }
  getOauthMicrosoft() { return this.http.get(`${this.base}/oauth/microsoft`); }
  getOauthMicrosoftCallback() { return this.http.get(`${this.base}/oauth/microsoft/callback`); }
  getOauthGithub() { return this.http.get(`${this.base}/oauth/github`); }
  getOauthGithubCallback() { return this.http.get(`${this.base}/oauth/github/callback`); }
  getOauthLinkedin() { return this.http.get(`${this.base}/oauth/linkedin`); }
  getOauthLinkedinCallback() { return this.http.get(`${this.base}/oauth/linkedin/callback`); }

  // Admin
  getAdminUsers(params: { page?: number; limit?: number; status?: string; q?: string; email_verified?: boolean; two_factor_enabled?: boolean; from?: string; to?: string; } = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ) as Record<string, string>
    ).toString();
    const url = `${this.base}/admin/users${query ? `?${query}` : ''}`;
    return this.http.get(url);
  }
  getAdminUserById(userId: string) { return this.http.get(`${this.base}/admin/users/${userId}`); }
  putAdminUserStatus(userId: string, body: { status: string; }) { return this.http.put(`${this.base}/admin/users/${userId}/status`, body); }
  putAdminUserAdmin(userId: string, body: { is_admin: boolean; }) { return this.http.put(`${this.base}/admin/users/${userId}/admin`, body); }
  getAdminAuditLogs(params: { page?: number; limit?: number; userId?: string; action?: string; success?: boolean; from?: string; to?: string; } = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ) as Record<string, string>
    ).toString();
    const url = `${this.base}/admin/audit-logs${query ? `?${query}` : ''}`;
    return this.http.get(url);
  }
  getAdminStats() { return this.http.get(`${this.base}/admin/stats`); }

  runObservable<T>(obs: Observable<T>) {
    this.loading = true;
    this.error = null;
    this.output = null;
    const subscription = obs.subscribe({
      next: (res) => { this.output = res; },
      error: (err) => { this.error = err?.error ?? err; this.loading = false; subscription.unsubscribe(); },
      complete: () => { this.loading = false; subscription.unsubscribe(); }
    });
  }
}


