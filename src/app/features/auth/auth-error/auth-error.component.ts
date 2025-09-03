import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-auth-error',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './auth-error.component.html',
  styleUrls: ['./auth-error.component.css']
})
export class AuthErrorComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  error = '';
  message = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.error = params['error'] || 'Error desconocido';
      this.message = params['message'] || 'Ha ocurrido un error durante la autenticación.';
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  retry(): void {
    // Volver a intentar OAuth (puedes personalizar esto)
    this.router.navigate(['/auth/login']);
  }
}
