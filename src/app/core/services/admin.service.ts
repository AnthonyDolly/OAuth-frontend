import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../tokens';
import {
  ListUsersQuery,
  ListAuditLogsQuery,
  UpdateUserStatusRequest,
  UpdateUserAdminRequest,
  AdminStats,
  AdminUser
} from '../interfaces/admin.interface';
import { ApiResponse } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_BASE_URL);

  // User management
  listUsers(query: ListUsersQuery = {}): Observable<any> {
    let params = new HttpParams();
    
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.status) params = params.set('status', query.status);
    if (query.q) params = params.set('q', query.q);
    if (query.email_verified !== undefined) params = params.set('email_verified', query.email_verified.toString());
    if (query.two_factor_enabled !== undefined) params = params.set('two_factor_enabled', query.two_factor_enabled.toString());
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);

    // Retorna directamente la respuesta sin desempaquetar
    return this.http.get<any>(`${this.apiUrl}/admin/users`, { params });
  }

  getUser(userId: string): Observable<AdminUser> {
    return this.http.get<ApiResponse<AdminUser>>(`${this.apiUrl}/admin/users/${userId}`).pipe(
      map(response => response.data!)
    );
  }

  updateUserStatus(userId: string, request: UpdateUserStatusRequest): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/users/${userId}/status`, request);
  }

  updateUserAdmin(userId: string, request: UpdateUserAdminRequest): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/admin/users/${userId}/admin`, request);
  }

  // Audit logs
  listAuditLogs(query: ListAuditLogsQuery = {}): Observable<any> {
    let params = new HttpParams();
    
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.userId) params = params.set('userId', query.userId);
    if (query.action) params = params.set('action', query.action);
    if (query.success !== undefined) params = params.set('success', query.success.toString());
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);

    // Retorna directamente la respuesta sin desempaquetar
    return this.http.get<any>(`${this.apiUrl}/admin/audit-logs`, { params });
  }

  // Statistics
  getStats(): Observable<AdminStats> {
    return this.http.get<ApiResponse<AdminStats>>(`${this.apiUrl}/admin/stats`).pipe(
      map(response => response.data!)
    );
  }
}
