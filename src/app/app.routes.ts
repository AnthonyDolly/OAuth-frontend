import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { GuestGuard } from './core/guards/guest.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Redirect root to dashboard or login
  { 
    path: '', 
    redirectTo: '/dashboard', 
    pathMatch: 'full' 
  },
  
  // Auth routes (for guests only)
  {
    path: 'auth',
    canActivate: [GuestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(c => c.RegisterComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(c => c.ResetPasswordComponent)
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(c => c.VerifyEmailComponent)
      },
      {
        path: 'error',
        loadComponent: () => import('./features/auth/auth-error/auth-error.component').then(c => c.AuthErrorComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // OAuth callback route
  {
    path: 'oauth/callback',
    loadComponent: () => import('./features/auth/oauth-callback/oauth-callback.component').then(c => c.OAuthCallbackComponent)
  },

  // Protected routes
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent)
  },
  
  // User profile routes
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/profile/profile.component').then(c => c.ProfileComponent)
  },
  
  // Security settings
  {
    path: 'security',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/security/security.component').then(c => c.SecurityComponent)
  },
  
  // OAuth accounts management
  {
    path: 'oauth-accounts',
    canActivate: [AuthGuard],
    loadComponent: () => import('./features/oauth-accounts/oauth-accounts.component').then(c => c.OAuthAccountsComponent)
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users.component').then(c => c.AdminUsersComponent)
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./features/admin/user-detail/admin-user-detail.component').then(c => c.AdminUserDetailComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./features/admin/audit-logs/admin-audit-logs.component').then(c => c.AdminAuditLogsComponent)
      },
      {
        path: 'stats',
        loadComponent: () => import('./features/admin/stats/admin-stats.component').then(c => c.AdminStatsComponent)
      },
      { path: '', redirectTo: 'users', pathMatch: 'full' }
    ]
  },

  // API Explorer (for development/testing)
  {
    path: 'api-explorer',
    loadComponent: () => import('./features/api-explorer/api-explorer.component').then(c => c.ApiExplorerComponent)
  },

  // 404 fallback
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(c => c.NotFoundComponent)
  }
];
