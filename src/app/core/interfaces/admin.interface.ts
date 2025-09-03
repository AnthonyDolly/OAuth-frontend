export interface ListUsersQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  q?: string;
  email_verified?: boolean;
  two_factor_enabled?: boolean;
  from?: string;
  to?: string;
}

// Interfaz para la respuesta real del backend
export interface BackendPaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

// Interfaz legacy para compatibilidad (deprecated)
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListAuditLogsQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  success?: boolean;
  from?: string;
  to?: string;
}

export interface UpdateUserStatusRequest {
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
}

export interface UpdateUserAdminRequest {
  is_admin: boolean;
}

export interface AdminStats {
  userCount: number;
  oauthCount: number;
  activeSessions: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  ip_address: string;
  user_agent: string;
  success: boolean;
  created_at: string;
  user?: {
    email: string;
    display_name?: string;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  phone?: string;
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  is_admin: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  oauth_accounts_count?: number;
  sessions_count?: number;
}
