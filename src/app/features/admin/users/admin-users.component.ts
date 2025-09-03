import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser, ListUsersQuery, PaginatedResponse, UpdateUserStatusRequest, UpdateUserAdminRequest } from '../../../core/interfaces/admin.interface';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  users: AdminUser[] = [];
  totalUsers = 0;
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  loading = false;
  error = '';
  success = '';

  filterForm: FormGroup;

  constructor() {
    this.filterForm = this.fb.group({
      q: [''],
      status: [''],
      email_verified: [''],
      two_factor_enabled: [''],
      from: [''],
      to: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    
    // Auto-filtrar cuando cambian los filtros
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage = 1;
      this.loadUsers();
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    const filters = this.filterForm.value;
    const query: ListUsersQuery = {
      page: this.currentPage,
      limit: this.pageSize,
      ...(filters.q && { q: filters.q }),
      ...(filters.status && { status: filters.status }),
      ...(filters.email_verified !== '' && { email_verified: filters.email_verified === 'true' }),
      ...(filters.two_factor_enabled !== '' && { two_factor_enabled: filters.two_factor_enabled === 'true' }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to })
    };

    this.adminService.listUsers(query).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.users = response.data.items || [];
          this.totalUsers = response.data.totalItems || 0;
          this.totalPages = response.data.totalPages || 1;
          this.currentPage = response.data.page || 1;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
        this.error = 'Error cargando usuarios';
      }
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadUsers();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.changePageSize(+target.value);
  }

  onStatusChange(event: Event, userId: string): void {
    const target = event.target as HTMLSelectElement;
    this.updateUserStatus(userId, target.value as any);
  }

  updateUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended' | 'pending_verification'): void {
    const request: UpdateUserStatusRequest = { status };
    
    this.adminService.updateUserStatus(userId, request).subscribe({
      next: () => {
        this.success = `Estado del usuario actualizado a ${status}`;
        this.loadUsers();
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        this.error = error.error?.message || 'Error actualizando estado del usuario';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  updateUserAdmin(userId: string, isAdmin: boolean): void {
    const request: UpdateUserAdminRequest = { is_admin: isAdmin };
    
    this.adminService.updateUserAdmin(userId, request).subscribe({
      next: () => {
        this.success = `Privilegios de administrador ${isAdmin ? 'otorgados' : 'removidos'}`;
        this.loadUsers();
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        this.error = error.error?.message || 'Error actualizando privilegios de administrador';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  onAdminToggle(event: Event, userId: string): void {
    const target = event.target as HTMLInputElement;
    this.updateUserAdmin(userId, target.checked);
  }

  clearFilters(): void {
    this.filterForm.reset({
      q: '',
      status: '',
      email_verified: '',
      two_factor_enabled: '',
      from: '',
      to: ''
    });
  }

  exportUsers(): void {
    // Implementación básica de exportación
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generateCSV(): string {
    const headers = ['ID', 'Email', 'Nombre', 'Estado', 'Email Verificado', '2FA', 'Admin', 'Creado'];
    const rows = this.users.map(user => [
      user.id,
      user.email,
      `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.display_name || '-',
      user.status,
      user.email_verified ? 'Sí' : 'No',
      user.two_factor_enabled ? 'Sí' : 'No',
      user.is_admin ? 'Sí' : 'No',
      new Date(user.created_at).toLocaleDateString('es-ES')
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#10B981';
      case 'inactive': return '#6B7280';
      case 'suspended': return '#EF4444';
      case 'pending_verification': return '#F59E0B';
      default: return '#6B7280';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'suspended': return 'Suspendido';
      case 'pending_verification': return 'Pendiente';
      default: return status;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
    return Math.min(this.currentPage * this.pageSize, this.totalUsers);
  }
}
