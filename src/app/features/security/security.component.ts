import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { SecurityInfo, Enable2FAResponse } from '../../core/interfaces/user.interface';
import { ChangePasswordRequest } from '../../core/interfaces/auth.interface';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.css']
})
export class SecurityComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  changePasswordForm: FormGroup;
  phoneVerificationForm: FormGroup;
  
  securityInfo: SecurityInfo | null = null;
  loading = false;
  error = '';
  success = '';
  passwordError = ''; // Error específico para el formulario de cambio de contraseña
  passwordSuccess = ''; // Éxito específico para el formulario de cambio de contraseña

  // 2FA
  show2FASetup = false;
  show2FAVerification = false;
  qrCode = '';
  backupCodes: string[] = [];
  verificationCode = '';
  verificationError = '';

  // Phone verification
  showPhoneVerification = false;
  showPhoneVerificationSection = false;
  phoneVerificationSent = false;

  constructor() {
    this.changePasswordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      confirm_password: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.phoneVerificationForm = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{9,14}$/)]],
      code: ['']
    });
  }

  ngOnInit(): void {
    this.loadSecurityInfo();
  }

  private loadSecurityInfo(): void {
    this.userService.getSecurityInfo().subscribe({
      next: (info) => {
        this.securityInfo = info;
      },
      error: (error) => {
        this.error = 'Error cargando información de seguridad';
      }
    });
  }

  onChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.markFormGroupTouched(this.changePasswordForm);
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.passwordError = ''; // Limpiar error específico del formulario
    this.passwordSuccess = ''; // Limpiar éxito específico del formulario

    const formData = this.changePasswordForm.value;
    const request: ChangePasswordRequest = {
      current_password: formData.current_password,
      new_password: formData.new_password
    };

    this.authService.changePassword(request).subscribe({
      next: () => {
        this.passwordSuccess = 'Contraseña cambiada exitosamente';
        this.changePasswordForm.reset();
        this.loading = false;
        this.passwordError = ''; // Limpiar error en caso de éxito
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error.error?.message || 'Error al cambiar contraseña';

        // Si es error de credenciales inválidas, mostrar en el formulario específico y limpiar campos
        if (errorMessage === 'Invalid credentials' || error.status === 401) {
          this.passwordError = 'La contraseña actual es incorrecta';
          this.passwordSuccess = ''; // Limpiar mensaje de éxito
          this.changePasswordForm.patchValue({
            current_password: '', // Limpiar solo contraseña actual
            new_password: this.changePasswordForm.value.new_password, // Mantener nueva contraseña
            confirm_password: this.changePasswordForm.value.confirm_password // Mantener confirmación
          });
        } else {
          // Para otros errores, mostrar en la alerta general
          this.error = errorMessage;
          this.passwordSuccess = ''; // Limpiar mensaje de éxito
        }
      }
    });
  }

  enable2FA(): void {
    this.loading = true;
    this.userService.enable2FA().subscribe({
      next: (response: Enable2FAResponse) => {
        this.qrCode = response.qrcode_data_url;
        this.backupCodes = response.backup_codes;
        this.show2FASetup = true;
        this.show2FAVerification = false;
        this.verificationCode = '';
        this.verificationError = '';
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al habilitar 2FA';
      }
    });
  }

  proceedToVerification(): void {
    this.show2FAVerification = true;
    this.verificationError = '';
  }

  verifyTOTPCode(): void {
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.verificationError = 'Por favor ingresa un código de 6 dígitos';
      return;
    }

    this.loading = true;
    this.verificationError = '';

    this.userService.verify2FA(this.verificationCode).subscribe({
      next: () => {
        this.success = '2FA habilitado exitosamente';
        this.show2FASetup = false;
        this.show2FAVerification = false;
        this.loadSecurityInfo();
        this.loading = false;
        this.verificationCode = '';
        this.twoFAMessage = '';
      },
      error: (error) => {
        this.loading = false;
        this.verificationError = error.error?.message || 'Código inválido. Inténtalo de nuevo.';
      }
    });
  }

  cancel2FASetup(): void {
    this.show2FASetup = false;
    this.show2FAVerification = false;
    this.verificationCode = '';
    this.verificationError = '';
    this.twoFAMessage = '';
  }

  disable2FA(): void {
    if (confirm('¿Estás seguro de que quieres deshabilitar la autenticación de dos factores?')) {
      this.loading = true;
      this.userService.disable2FA().subscribe({
        next: () => {
          this.success = '2FA deshabilitado exitosamente';
          this.loadSecurityInfo();
          this.loading = false;
        },
        error: (error) => {
          this.loading = false;
          this.error = error.error?.message || 'Error al deshabilitar 2FA';
        }
      });
    }
  }

  navigateToPhoneVerification(): void {
    this.showPhoneVerificationSection = true;
    this.showPhoneVerification = false;
    this.phoneVerificationSent = false;
    this.phoneVerificationForm.reset();
    this.error = '';
    this.success = '';

    // Scroll to phone verification section
    setTimeout(() => {
      const element = document.querySelector('.phone-verification-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  sendPhoneVerification(): void {
    const phone = this.phoneVerificationForm.value.phone?.trim();

    if (!phone || phone === '') {
      this.error = 'Por favor ingresa un número de teléfono';
      return;
    }

    // Validación básica del formato
    if (phone.length < 8) {
      this.error = 'El número de teléfono debe tener al menos 8 dígitos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.userService.sendPhoneVerification({ phone }).subscribe({
      next: () => {
        this.phoneVerificationSent = true;
        this.success = `Código de verificación enviado al ${phone}`;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error al enviar código de verificación';
      }
    });
  }

  verifyPhone(): void {
    const code = this.phoneVerificationForm.value.code?.trim();

    if (!code || code === '') {
      this.error = 'Por favor ingresa el código de verificación';
      return;
    }

    // Validación básica del código
    if (code.length !== 6) {
      this.error = 'El código debe tener exactamente 6 dígitos';
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      this.error = 'El código solo puede contener números';
      return;
    }

    this.loading = true;
    this.error = '';

    this.userService.verifyPhone({ code }).subscribe({
      next: () => {
        this.success = 'Teléfono verificado exitosamente';
        this.showPhoneVerification = false;
        this.showPhoneVerificationSection = false;
        this.phoneVerificationSent = false;
        this.phoneVerificationForm.reset();
        this.loadSecurityInfo();
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Código de verificación inválido';
      }
    });
  }

  cancelPhoneVerification(): void {
    this.showPhoneVerificationSection = false;
    this.showPhoneVerification = false;
    this.phoneVerificationSent = false;
    this.phoneVerificationForm.reset();
    this.error = '';
  }

  onPhoneInputChange(): void {
    // Forzar la detección de cambios en el formulario
    this.phoneVerificationForm.updateValueAndValidity();
  }

  onCodeInputChange(): void {
    // Forzar la detección de cambios en el formulario
    this.phoneVerificationForm.updateValueAndValidity();
  }

  isSendButtonDisabled(): boolean {
    if (this.loading) {
      return true;
    }

    const phoneValue = this.phoneVerificationForm.value.phone;

    if (!phoneValue) {
      return true;
    }

    const trimmedValue = phoneValue.trim();

    if (trimmedValue === '') {
      return true;
    }

    return false;
  }

  isVerifyButtonDisabled(): boolean {
    if (this.loading) return true;

    const codeValue = this.phoneVerificationForm.value.code;
    if (!codeValue) return true;

    const trimmedValue = codeValue.trim();
    if (trimmedValue === '') return true;

    // Si llegamos aquí, el campo tiene un valor válido
    return false;
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return `${this.getFieldDisplayName(fieldName)} es requerido`;
    if (field.errors['minlength']) return `${this.getFieldDisplayName(fieldName)} debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
    if (field.errors['weakPassword']) return 'La contraseña debe contener al menos una mayúscula, una minúscula y un número';
    if (field.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      current_password: 'Contraseña actual',
      new_password: 'Nueva contraseña',
      confirm_password: 'Confirmar contraseña',
      phone: 'Teléfono',
      code: 'Código'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markFormGroupTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }

  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return { weakPassword: true };
    }

    return null;
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('new_password');
    const confirmPassword = control.get('confirm_password');

    if (!newPassword || !confirmPassword) return null;

    if (newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      if (confirmPassword.hasError('passwordMismatch')) {
        confirmPassword.setErrors(null);
      }
    }

    return null;
  }

  // Mensaje específico para operaciones de 2FA
  twoFAMessage = '';

  copyBackupCodes(): void {
    const codesText = this.backupCodes.join('\n');
    navigator.clipboard.writeText(codesText).then(() => {
      this.twoFAMessage = 'Códigos de respaldo copiados al portapapeles';
      setTimeout(() => this.twoFAMessage = '', 3000);
    }).catch(() => {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = codesText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.twoFAMessage = 'Códigos de respaldo copiados al portapapeles';
      setTimeout(() => this.twoFAMessage = '', 3000);
    });
  }

  downloadBackupCodes(): void {
    const codesText = `Códigos de respaldo para 2FA - ${new Date().toLocaleDateString()}\n\n${this.backupCodes.join('\n')}`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Mostrar mensaje de confirmación
    this.twoFAMessage = 'Códigos de respaldo descargados exitosamente';
    setTimeout(() => this.twoFAMessage = '', 3000);
  }

  trackByCode(index: number, code: string): string {
    return code;
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
