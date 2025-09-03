import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser, UpdateUserStatusRequest, UpdateUserAdminRequest } from '../../../core/interfaces/admin.interface';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-user-detail.component.html',
  styleUrls: ['./admin-user-detail.component.css']
})
export class AdminUserDetailComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);

  user: AdminUser | null = null;
  userId: string = '';
  loading = true;
  error = '';
  success = '';

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = params['id'];
      if (this.userId) {
        this.loadUser();
      }
    });
  }

  private loadUser(): void {
    this.loading = true;
    this.error = '';

    this.adminService.getUser(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error cargando información del usuario';
      }
    });
  }

  updateUserStatus(status: 'active' | 'inactive' | 'suspended' | 'pending_verification'): void {
    if (!this.user) return;

    const request: UpdateUserStatusRequest = { status };
    
    this.adminService.updateUserStatus(this.user.id, request).subscribe({
      next: () => {
        this.success = `Estado del usuario actualizado a ${this.getStatusText(status)}`;
        this.loadUser();
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        this.error = error.error?.message || 'Error actualizando estado del usuario';
        setTimeout(() => this.error = '', 3000);
      }
    });
  }

  updateUserAdmin(isAdmin: boolean): void {
    if (!this.user) return;

    const request: UpdateUserAdminRequest = { is_admin: isAdmin };
    
    this.adminService.updateUserAdmin(this.user.id, request).subscribe({
      next: () => {
        this.success = `Privilegios de administrador ${isAdmin ? 'otorgados' : 'removidos'}`;
        this.loadUser();
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        this.error = error.error?.message || 'Error actualizando privilegios de administrador';
        setTimeout(() => this.error = '', 3000);
      }
    });
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
      case 'pending_verification': return 'Pendiente de Verificación';
      default: return status;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUserInitials(): string {
    if (!this.user) return '';
    
    if (this.user.first_name && this.user.last_name) {
      return `${this.user.first_name[0]}${this.user.last_name[0]}`.toUpperCase();
    }
    if (this.user.display_name) {
      const names = this.user.display_name.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0].substring(0, 2).toUpperCase();
    }
    return this.user.email.substring(0, 2).toUpperCase();
  }

  getUserDisplayName(): string {
    if (!this.user) return '';
    
    if (this.user.display_name) return this.user.display_name;
    if (this.user.first_name || this.user.last_name) {
      return `${this.user.first_name || ''} ${this.user.last_name || ''}`.trim();
    }
    return this.user.email.split('@')[0];
  }

  getDaysSinceRegistration(): number {
    if (!this.user) return 0;
    return Math.floor((new Date().getTime() - new Date(this.user.created_at).getTime()) / (1000 * 3600 * 24));
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.updateUserStatus(target.value as any);
  }

  onAdminToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.updateUserAdmin(target.checked);
  }
}
