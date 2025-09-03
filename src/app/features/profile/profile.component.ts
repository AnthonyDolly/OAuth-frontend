import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UpdateProfileRequest } from '../../core/interfaces/user.interface';
import { User } from '../../core/interfaces/auth.interface';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  profileForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  user: User | null = null;

  constructor() {
    this.profileForm = this.fb.group({
      first_name: [''],
      last_name: [''],
      display_name: [''],
      phone: ['', [Validators.pattern(/^\+?[1-9]\d{9,14}$/)]],
      date_of_birth: [''],
      gender: [''],
      locale: [''],
      timezone: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProfile(): void {
    // Primero intentar obtener el usuario del authService
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        // Si el usuario es null, significa que se hizo logout - no intentar cargar datos
        if (user === null) {
          this.user = null;
          this.error = '';
          this.success = '';
          return;
        }

        if (user) {
          this.setUserData(user);
        } else {
          // Si no hay usuario en el authService, obtenerlo directamente de la API
          // Pero solo si aún estamos autenticados
          if (this.authService.isAuthenticated()) {
            this.userService.getProfile()
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (apiUser) => {
                  // Verificar que aún estamos autenticados antes de procesar
                  if (this.authService.isAuthenticated()) {
                    this.setUserData(apiUser);
                    // Actualizar también el authService con el usuario obtenido
                    this.authService['currentUserSubject'].next(apiUser);
                  }
                },
                error: (error) => {
                  // Solo loggear error si aún estamos autenticados
                  if (this.authService.isAuthenticated()) {
                    this.error = 'Error al cargar el perfil';
                    console.error('❌ Profile: Error loading profile:', error);
                  }
                }
              });
          }
        }
      });
  }

  private setUserData(user: User): void {
    this.user = user;
    this.profileForm.patchValue({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      display_name: user.display_name || '',
      phone: user.phone || '',
      date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
      gender: user.gender || '',
      locale: user.locale || '',
      timezone: user.timezone || ''
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Verificar que aún estamos autenticados antes de hacer el request
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = this.profileForm.value;
    const updateData: UpdateProfileRequest = {
      first_name: formData.first_name?.trim() || null,
      last_name: formData.last_name?.trim() || null,
      display_name: formData.display_name?.trim() || null,
      phone: formData.phone?.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      locale: formData.locale?.trim() || null,
      timezone: formData.timezone?.trim() || null
    };

    this.userService.updateProfile(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          // Solo procesar si aún estamos autenticados
          if (this.authService.isAuthenticated()) {
            this.user = updatedUser;
            this.authService['currentUserSubject'].next(updatedUser);
            this.success = 'Perfil actualizado exitosamente';
          }
          this.loading = false;
        },
        error: (error) => {
          // Solo loggear error si aún estamos autenticados
          if (this.authService.isAuthenticated()) {
            this.loading = false;
            this.error = error.error?.message || 'Error al actualizar perfil';
          } else {
            this.loading = false;
          }
        }
      });
  }

  deleteAccount(): void {
    if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      // Verificar que aún estamos autenticados antes de hacer el request
      if (!this.authService.isAuthenticated()) {
        return;
      }

      this.userService.deleteAccount()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.authService.logout();
          },
          error: (error) => {
            // Solo loggear error si aún estamos autenticados
            if (this.authService.isAuthenticated()) {
              this.error = error.error?.message || 'Error al eliminar cuenta';
            }
          }
        });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return `${fieldName} es requerido`;
    if (field.errors['pattern']) return 'Formato inválido';
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
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
}
