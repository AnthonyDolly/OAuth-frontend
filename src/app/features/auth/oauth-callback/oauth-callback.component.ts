import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./oauth-callback.component.css']
})
export class OAuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  loading = true;
  error = '';
  success = false;

  ngOnInit(): void {
    this.handleOAuthCallback();
  }

  private handleOAuthCallback(): void {
    // Leer tokens del hash fragment (más seguro que query params)
    const hashFragment = window.location.hash.substring(1); // Quitar el #
    const params = new URLSearchParams(hashFragment);
    
    if (params.get('error')) {
      this.error = params.get('error_description') || params.get('error') || 'Error en autenticación OAuth';
      this.loading = false;
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    if (accessToken && refreshToken) {
      const tokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer' as const
      };
      
      this.handleTokens(tokens);
    } else {
      // No hay tokens válidos
      this.error = 'No se recibieron tokens válidos';
      this.loading = false;
    }
  }

  private handleTokens(tokens: any): void {
    try {
      // Usar el método privado del AuthService para guardar tokens
      // Acceder al método privado setTokens
      (this.authService as any).setTokens(tokens);
      (this.authService as any).isAuthenticatedSubject.next(true);
      
      // Obtener información del usuario
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          // El usuario también fue cargado en el servicio
          this.success = true;
          this.loading = false;
          
          // Limpiar el hash de la URL por seguridad
          window.location.hash = '';
          
          // Redirigir al dashboard después de un breve retraso
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error getting user info:', error);
          this.error = 'Error al obtener información del usuario';
          this.loading = false;
          
          // Limpiar tokens si hay error
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      });
    } catch (error) {
      console.error('Error processing OAuth tokens:', error);
      this.error = 'Error procesando tokens de autenticación';
      this.loading = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
