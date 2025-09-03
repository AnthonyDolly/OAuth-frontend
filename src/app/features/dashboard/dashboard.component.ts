import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/interfaces/auth.interface';
import { UserSession, SecurityInfo } from '../../core/interfaces/user.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly destroy$ = new Subject<void>();

  // Exponer AuthService para el template
  protected readonly authServicePublic = this.authService;

  user: User | null = null;
  securityInfo: SecurityInfo | null = null;
  activeSessions: UserSession[] = [];
  loading = true;
  private dataLoaded = false; // Flag para evitar carga múltiple

  ngOnInit(): void {
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserData(): void {
    // Primero verificar si estamos autenticados
    if (!this.authService.isAuthenticated()) {
      this.authService.logout(); // Esto redirigirá al login
      return;
    }

    // Obtener usuario actual con limpieza automática de subscription
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        // Si el usuario es null, significa que se hizo logout - detener todo
        if (user === null) {
          this.user = null;
          this.securityInfo = null;
          this.activeSessions = [];
          this.loading = false;
          this.dataLoaded = false;
          return;
        }

        this.user = user;

        // Si tenemos usuario, cargar datos de seguridad
        if (user && !this.dataLoaded) {
          this.dataLoaded = true;
          this.loadSecurityData();
        }
      });

    // Si no tenemos usuario pero estamos autenticados, intentar cargarlo
    if (!this.user && this.authService.isAuthenticated()) {
      this.loading = true;
      this.attemptManualUserLoad();
    }
  }

  private attemptManualUserLoad(): void {
    if (!this.authService.isAuthenticated() || this.dataLoaded) {
      this.loading = false;
      return;
    }

    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fetchedUser) => {
          if (fetchedUser) {
            // El AuthService ya actualizó el BehaviorSubject, no necesitamos hacerlo aquí
            if (!this.dataLoaded) {
              this.dataLoaded = true;
              this.loadSecurityData();
            }
          }
        },
        error: (error) => {
          this.loading = false;
          // El AuthService debería manejar el logout automáticamente si hay error
        }
      });
  }

  private loadSecurityData(): void {
    // Verificar que aún estamos autenticados antes de hacer requests
    if (!this.authService.isAuthenticated()) {
      this.loading = false;
      return;
    }

    // Obtener información de seguridad
    this.userService.getSecurityInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (info) => {
          // Solo procesar si aún estamos autenticados
          if (this.authService.isAuthenticated()) {
            this.securityInfo = info;
          }
        },
        error: (error) => {
          // Solo loggear si aún estamos autenticados
          if (this.authService.isAuthenticated()) {
            console.error('❌ Dashboard: Error loading security info:', error);
          }
          this.securityInfo = null;
        }
      });

    // Obtener sesiones activas
    this.userService.listSessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => {
          // Solo procesar si aún estamos autenticados
          if (this.authService.isAuthenticated()) {
            this.activeSessions = sessions;
          }
          this.loading = false;
        },
        error: (error) => {
          // Solo loggear si aún estamos autenticados
          if (this.authService.isAuthenticated()) {
            console.error('❌ Dashboard: Error loading sessions:', error);
          }
          this.activeSessions = [];
          this.loading = false;
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }

  trackBySessionId(index: number, session: any): string {
    return session.id || index;
  }

  revokeSession(sessionId: string): void {
    // Encontrar la sesión que se va a cerrar
    const sessionToRevoke = this.activeSessions.find(s => s.id === sessionId);

    // Si es la sesión actual, confirmar y hacer logout
    if (sessionToRevoke?.is_current) {
      if (!confirm('¿Estás seguro de que quieres cerrar tu sesión actual? Tendrás que iniciar sesión nuevamente.')) {
        return;
      }
    }

    this.userService.revokeSession(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Si se cerró la sesión actual, hacer logout
          if (sessionToRevoke?.is_current) {
            this.authService.logout();
          } else {
            // Solo filtrar la sesión cerrada
            this.activeSessions = this.activeSessions.filter(s => s.id !== sessionId);
          }
        },
        error: (error) => {
          alert('Error al cerrar la sesión. Inténtalo nuevamente.');
        }
      });
  }

  refreshSessions(): void {
    this.loadSecurityData();
  }

  revokeAllSessions(): void {
    // Confirmar antes de cerrar todas las sesiones
    if (!confirm('¿Estás seguro de que quieres cerrar TODAS las sesiones? Esto cerrará tu sesión actual y tendrás que iniciar sesión nuevamente.')) {
      return;
    }

    this.loading = true;
    this.userService.revokeAllSessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Limpiar las sesiones localmente antes del logout
          this.activeSessions = [];
          this.loading = false;

          // Cuando se cierran todas las sesiones, hacer logout automático
          setTimeout(() => {
            this.authService.logout();
          }, 100); // Pequeño delay para asegurar que el estado se actualice
        },
        error: (error) => {
          this.loading = false;
          // Mostrar error al usuario
          alert('Error al cerrar las sesiones. Inténtalo nuevamente.');
        }
      });
  }

  getInitials(user: User): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.display_name) {
      const names = user.display_name.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0].substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
