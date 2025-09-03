import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, take, switchMap, of, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      switchMap(isAuthenticated => {
        if (!isAuthenticated) {
          // Usuario no autenticado
          return of(this.router.createUrlTree(['/auth/login']));
        }

        // Usuario está autenticado, verificar si tenemos su información
        return this.authService.currentUser$.pipe(
          take(1),
          switchMap(user => {
            if (user) {
              // Ya tenemos la información del usuario
              if (user.is_admin) {
                return of(true);
              } else {
                return of(this.router.createUrlTree(['/dashboard']));
              }
            } else {
              // No tenemos la información del usuario, necesitamos cargarla
              return this.authService.getCurrentUser().pipe(
                map(loadedUser => {
                  if (loadedUser && loadedUser.is_admin) {
                    return true;
                  } else {
                    return this.router.createUrlTree(['/dashboard']);
                  }
                }),
                // Si falla la carga del usuario, redirigir a login
                catchError(() => {
                  return of(this.router.createUrlTree(['/auth/login']));
                })
              );
            }
          })
        );
      })
    );
  }
}
