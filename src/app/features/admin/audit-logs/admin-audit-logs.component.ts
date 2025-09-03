import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AuditLog, ListAuditLogsQuery, PaginatedResponse } from '../../../core/interfaces/admin.interface';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-audit-logs.component.html',
  styleUrls: ['./admin-audit-logs.component.css']
})
export class AdminAuditLogsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  logs: AuditLog[] = [];
  totalLogs = 0;
  currentPage = 1;
  pageSize = 50;
  totalPages = 0;
  loading = false;
  error = '';
  success = '';

  filterForm: FormGroup;

  constructor() {
    this.filterForm = this.fb.group({
      userId: [''],
      action: [''],
      success: [''],
      from: [''],
      to: ['']
    });
  }

  ngOnInit(): void {
    // Check for query params (like userId from user detail page)
    this.route.queryParams.subscribe(params => {
      if (params['userId']) {
        this.filterForm.patchValue({ userId: params['userId'] });
      }
      this.loadLogs();
    });
    
    // Auto-filtrar cuando cambian los filtros
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage = 1;
      this.loadLogs();
    });
  }

  loadLogs(): void {
    this.loading = true;
    this.error = '';

    const filters = this.filterForm.value;
    const query: ListAuditLogsQuery = {
      page: this.currentPage,
      limit: this.pageSize,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.success !== '' && { success: filters.success === 'true' }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to })
    };

    this.adminService.listAuditLogs(query).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.logs = response.data.items || [];
          this.totalLogs = response.data.totalItems || 0;
          this.totalPages = response.data.totalPages || 1;
          this.currentPage = response.data.page || 1;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading audit logs:', error);
        this.loading = false;
        this.error = 'Error cargando logs de auditoría';
      }
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadLogs();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.changePageSize(+target.value);
  }

  clearFilters(): void {
    this.filterForm.reset({
      userId: '',
      action: '',
      success: '',
      from: '',
      to: ''
    });
  }

  exportLogs(): void {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCSV(): string {
    const headers = ['Fecha', 'Usuario', 'Acción', 'Estado', 'IP', 'Detalles'];
    const rows = this.logs.map(log => [
      new Date(log.created_at).toLocaleString('es-ES'),
      log.user?.email || log.user_id,
      log.action,
      log.success ? 'Éxito' : 'Error',
      log.ip_address,
      JSON.stringify(log.details).replace(/,/g, ';')
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  getActionIcon(action: string): string {
    const actionIcons: { [key: string]: string } = {
      'login': '🔑',
      'logout': '🚪',
      'register': '📝',
      'password_change': '🔒',
      'profile_update': '👤',
      '2fa_enable': '🔐',
      '2fa_disable': '🔓',
      'oauth_link': '🔗',
      'oauth_unlink': '🔗',
      'admin_action': '👑',
      'user_suspend': '⛔',
      'user_activate': '✅',
      'email_verify': '📧',
      'phone_verify': '📱',
      'session_revoke': '🚫'
    };

    return actionIcons[action] || '📋';
  }

  getActionColor(success: boolean): string {
    return success ? '#10B981' : '#EF4444';
  }

  getActionText(action: string): string {
    const actionTexts: { [key: string]: string } = {
      'login': 'Inicio de sesión',
      'logout': 'Cierre de sesión',
      'register': 'Registro',
      'password_change': 'Cambio de contraseña',
      'profile_update': 'Actualización de perfil',
      '2fa_enable': 'Habilitar 2FA',
      '2fa_disable': 'Deshabilitar 2FA',
      'oauth_link': 'Vincular OAuth',
      'oauth_unlink': 'Desvincular OAuth',
      'admin_action': 'Acción administrativa',
      'user_suspend': 'Suspender usuario',
      'user_activate': 'Activar usuario',
      'email_verify': 'Verificar email',
      'phone_verify': 'Verificar teléfono',
      'session_revoke': 'Revocar sesión'
    };

    return actionTexts[action] || action;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDetails(details: any): string {
    if (!details || typeof details !== 'object') return '-';
    
    const formatted = Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return formatted.length > 100 ? formatted.substring(0, 100) + '...' : formatted;
  }

  getPaginationRange(): number[] {
    const range: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }

  getEndRange(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalLogs);
  }
}
