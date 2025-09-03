import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import {
  UpdateProfileRequest,
  UserSession,
  OAuthAccount,
  LinkOAuthRequest,
  Enable2FAResponse,
  BackupCodesResponse,
  PhoneVerificationRequest,
  PhoneVerificationResponse,
  VerifyPhoneRequest,
  VerifyPhoneResponse,
  SecurityInfo
} from '../interfaces/user.interface';
import { ApiResponse, User } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);

  // Profile management
  getProfile(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/user/profile`).pipe(
      map(response => response.data!)
    );
  }

  updateProfile(request: UpdateProfileRequest): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/user/profile`, request).pipe(
      map(response => response.data!)
    );
  }

  deleteAccount(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/user/profile`);
  }

  // Session management
  listSessions(): Observable<UserSession[]> {
    return this.http.get<ApiResponse<UserSession[]>>(`${this.apiUrl}/user/sessions`).pipe(
      map(response => response.data!)
    );
  }

  revokeSession(sessionId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/user/sessions/${sessionId}`);
  }

  revokeAllSessions(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/user/sessions`);
  }

  // OAuth account management
  listOAuthAccounts(): Observable<OAuthAccount[]> {
    return this.http.get<ApiResponse<OAuthAccount[]>>(`${this.apiUrl}/user/oauth-accounts`).pipe(
      map(response => response.data!)
    );
  }

  linkOAuthAccount(request: LinkOAuthRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/user/oauth-accounts/link`, request);
  }

  unlinkOAuthAccount(accountId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/user/oauth-accounts/${accountId}`);
  }

  // 2FA management
  enable2FA(): Observable<Enable2FAResponse> {
    return this.http.post<ApiResponse<Enable2FAResponse>>(`${this.apiUrl}/user/enable-2fa`, {}).pipe(
      map(response => response.data!)
    );
  }

  disable2FA(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/user/disable-2fa`, {});
  }

  verify2FA(code: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/user/verify-2fa`, { code });
  }

  generateBackupCodes(): Observable<BackupCodesResponse> {
    return this.http.post<ApiResponse<BackupCodesResponse>>(`${this.apiUrl}/user/backup-codes/regenerate`, {}).pipe(
      map(response => response.data!)
    );
  }

  // Phone verification
  sendPhoneVerification(request: PhoneVerificationRequest): Observable<PhoneVerificationResponse> {
    return this.http.post<ApiResponse<PhoneVerificationResponse>>(`${this.apiUrl}/user/send-phone-verification`, request).pipe(
      map(response => response.data!)
    );
  }

  verifyPhone(request: VerifyPhoneRequest): Observable<VerifyPhoneResponse> {
    return this.http.post<ApiResponse<VerifyPhoneResponse>>(`${this.apiUrl}/user/verify-phone`, request).pipe(
      map(response => response.data!)
    );
  }

  // Security information
  getSecurityInfo(): Observable<SecurityInfo> {
    return this.http.get<ApiResponse<SecurityInfo>>(`${this.apiUrl}/user/security-info`).pipe(
      map(response => response.data!)
    );
  }
}
