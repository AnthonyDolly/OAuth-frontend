import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();
  
  // Agregar token a la request si existe
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si es error 401 en change-password, no intentar refresh (es porque la contraseña actual es incorrecta)
      if (error.status === 401 && req.url.includes('/auth/change-password')) {
        return throwError(() => error);
      }

      // Si es error 401 y no es una request de refresh o logout, intentar refrescar token
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/logout')) {

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((tokens: any) => {
              isRefreshing = false;
              const newAccessToken = tokens.access_token;
              refreshTokenSubject.next(newAccessToken);

              // Asegurar que el estado de autenticación esté consistente
              authService['isAuthenticatedSubject'].next(true);

              // Retry la request original con el nuevo token
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newAccessToken}` }
              });
              return next(newReq);
            }),
            catchError((err) => {
              isRefreshing = false;
              console.error('❌ Interceptor: Token refresh failed:', err);

              // Determinar si es un error que requiere logout
              const shouldLogout = err.status === 401 ||
                                   err.status === 403 ||
                                   err.message?.includes('jwt malformed') ||
                                   err.message?.includes('invalid token') ||
                                   err.message?.includes('jwt expired');

              if (shouldLogout) {
                authService.logout();
              }
              // Para errores de red u otros, no hacer logout automático
              // El usuario podría intentar nuevamente

              return throwError(() => err);
            })
          );
        } else {
          // Ya hay un refresh en progreso, esperar
          return refreshTokenSubject.pipe(
            filter(token => token != null),
            take(1),
            switchMap(jwt => {
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${jwt}` }
              });
              return next(newReq);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};